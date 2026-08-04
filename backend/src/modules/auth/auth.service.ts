/**
 * @module modules/auth/auth.service
 * @description Logique métier de l'authentification (§4.1, §5.2).
 *   Hachage bcrypt, émission JWT + refresh token, rotation sécurisée.
 *
 * @author KOUTON Spynel
 */

import bcrypt from "bcrypt";
import { UserRole, UserStatus } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { AppError } from "../../utils/AppError";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
  generateRandomToken,
} from "../../utils/jwt";
import {
  sendMail,
  buildVerifyEmailHtml,
  buildResetPasswordHtml,
} from "../../services/email.service";
import type { RegisterInput, LoginInput } from "./auth.validator";

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface PublicUser {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  kycStatus: string;
  isEmailVerified: boolean;
}

/**
 * Projette un utilisateur DB en objet public (sans `passwordHash`, etc.).
 * @param u - Objet utilisateur brut depuis Prisma.
 * @returns Objet PublicUser sécurisé.
 * @private
 */
function toPublicUser(u: {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  kycStatus: string;
  isEmailVerified: boolean;
}): PublicUser {
  return {
    id: u.id,
    email: u.email,
    phone: u.phone,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    status: u.status,
    kycStatus: u.kycStatus,
    isEmailVerified: u.isEmailVerified,
  };
}

/**
 * Génère un access token JWT + un refresh token stocké en DB.
 * @param userId - ID de l'utilisateur.
 * @param role   - Rôle de l'utilisateur.
 * @returns `{ accessToken, refreshToken }`.
 * @private
 */
async function issueTokens(
  userId: string,
  role: UserRole,
): Promise<AuthTokens> {
  const accessToken = signAccessToken(userId, role);
  const { token, hash } = generateRefreshToken();
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hash, expiresAt: getRefreshTokenExpiry() },
  });
  return { accessToken, refreshToken: token };
}

/**
 * Inscription d'un nouvel utilisateur.
 *
 * Flux : hachage bcrypt → création en DB → envoi email de vérification → émission tokens.
 * Tout nouveau compte démarre comme SELLER actif. Le KYC ne conditionne que la publication.
 *
 * @param input - Données d'inscription (email, phone, password, firstName, lastName).
 * @returns `{ user, tokens }`.
 * @throws {AppError} 409 si un compte existe déjà avec cet email/téléphone.
 */
export async function register(
  input: RegisterInput,
): Promise<{ user: PublicUser; tokens: AuthTokens }> {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
  });
  if (existing) {
    throw AppError.conflict(
      "USER_ALREADY_EXISTS",
      "Un compte existe déjà avec cet email ou ce téléphone.",
    );
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const emailVerificationToken = generateRandomToken();

  const user = await prisma.user.create({
    data: {
      email: input.email,
      phone: input.phone,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: UserRole.SELLER,
      status: UserStatus.ACTIVE,
      emailVerificationToken,
    },
  });

  logger.info({ userId: user.id, role: user.role }, "🟡 User registered");

  const mail = buildVerifyEmailHtml(emailVerificationToken, user.firstName);
  void sendMail({ to: user.email, ...mail });

  const tokens = await issueTokens(user.id, user.role);
  return { user: toPublicUser(user), tokens };
}

/**
 * Connexion par email ou téléphone + mot de passe.
 *
 * Vérifie le statut du compte (bloqué → 403) et compare le hash bcrypt.
 *
 * @param input - `{ email?, phone?, password }`.
 * @returns `{ user, tokens }`.
 * @throws {AppError} 401 si identifiants invalides.
 * @throws {AppError} 403 si compte bloqué.
 */
export async function login(
  input: LoginInput,
): Promise<{ user: PublicUser; tokens: AuthTokens }> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(input.email ? [{ email: input.email }] : []),
        ...(input.phone ? [{ phone: input.phone }] : []),
      ],
      deletedAt: null,
    },
  });
  if (!user) {
    throw AppError.unauthorized(
      "INVALID_CREDENTIALS",
      "Identifiants invalides.",
    );
  }
  if (user.status === UserStatus.BLOCKED) {
    throw AppError.forbidden("ACCOUNT_BLOCKED", "Ce compte est bloqué.");
  }

  // Compte créé via Google : pas de mot de passe local.
  if (!user.passwordHash) {
    throw AppError.unauthorized(
      "PASSWORD_NOT_SET",
      "Ce compte utilise la connexion Google. Utilisez « Continuer avec Google ».",
    );
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok)
    throw AppError.unauthorized(
      "INVALID_CREDENTIALS",
      "Identifiants invalides.",
    );

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info({ userId: user.id }, "🟡 User login");
  const tokens = await issueTokens(user.id, user.role);
  return { user: toPublicUser(user), tokens };
}

/** Payload utile renvoyé par l'endpoint tokeninfo de Google. */
interface GoogleTokenInfo {
  aud: string;
  sub: string;
  email?: string;
  email_verified?: string; // "true" | "false"
  given_name?: string;
  family_name?: string;
  picture?: string;
}

/**
 * Vérifie un ID token Google via l'endpoint officiel `tokeninfo`
 * (Google valide la signature ; on contrôle l'audience et l'email).
 *
 * @param idToken - ID token émis par Google Identity Services côté client.
 * @returns Les informations du compte Google.
 * @throws {AppError} 503 si `GOOGLE_CLIENT_ID` n'est pas configuré.
 * @throws {AppError} 401 si le token est invalide ou destiné à une autre app.
 * @private
 */
async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo> {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError(
      503,
      "OAUTH_NOT_CONFIGURED",
      "La connexion Google n'est pas configurée sur ce serveur.",
    );
  }
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!res.ok) {
    throw AppError.unauthorized(
      "GOOGLE_TOKEN_INVALID",
      "Jeton Google invalide ou expiré.",
    );
  }
  const info = (await res.json()) as GoogleTokenInfo;
  if (info.aud !== env.GOOGLE_CLIENT_ID || !info.sub || !info.email) {
    throw AppError.unauthorized(
      "GOOGLE_TOKEN_INVALID",
      "Jeton Google invalide (audience ou email manquant).",
    );
  }
  return info;
}

/**
 * Connexion / inscription via Google (Sign in with Google).
 *
 * - Compte trouvé par `googleId` ou par email → connexion (liaison du
 *   `googleId` si première connexion Google sur un compte classique).
 * - Aucun compte → création d'un SELLER actif, sans mot de passe ni téléphone.
 *
 * @param idToken - ID token Google Identity Services.
 * @returns `{ user, tokens }`.
 * @throws {AppError} 401/503 via {@link verifyGoogleIdToken}, 403 si compte bloqué.
 */
export async function loginWithGoogle(
  idToken: string,
): Promise<{ user: PublicUser; tokens: AuthTokens }> {
  const info = await verifyGoogleIdToken(idToken);
  const email = String(info.email).toLowerCase();

  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: info.sub }, { email }], deletedAt: null },
  });

  if (user?.status === UserStatus.BLOCKED) {
    throw AppError.forbidden("ACCOUNT_BLOCKED", "Ce compte est bloqué.");
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        googleId: info.sub,
        firstName: info.given_name ?? "Utilisateur",
        lastName: info.family_name ?? "Google",
        role: UserRole.SELLER,
        status: UserStatus.ACTIVE,
        isEmailVerified: info.email_verified === "true",
        profilePhotoUrl: info.picture ?? null,
      },
    });
    logger.info({ userId: user.id }, "🟡 User registered via Google");
  } else if (!user.googleId) {
    // Compte classique existant avec le même email : liaison du compte Google.
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: info.sub,
        isEmailVerified: user.isEmailVerified || info.email_verified === "true",
      },
    });
    logger.info({ userId: user.id }, "🟡 Google account linked");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info({ userId: user.id }, "🟡 User login via Google");
  const tokens = await issueTokens(user.id, user.role);
  return { user: toPublicUser(user), tokens };
}

/**
 * Rafraîchit les tokens (rotation securisée).
 *
 * L'ancien refresh token est révoqué, un nouveau couple access/refresh est émis.
 *
 * @param refreshToken - Token de rafraîchissement.
 * @returns `{ accessToken, refreshToken }`.
 * @throws {AppError} 401 si token invalide ou expiré.
 */
export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const hash = hashToken(refreshToken);
  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash: hash },
    include: { user: true },
  });
  if (!row || row.revokedAt || row.expiresAt < new Date()) {
    throw AppError.unauthorized(
      "REFRESH_TOKEN_INVALID",
      "Refresh token invalide ou expiré.",
    );
  }
  if (row.user.status === UserStatus.BLOCKED) {
    throw AppError.forbidden("ACCOUNT_BLOCKED", "Ce compte est bloqué.");
  }

  // Rotation : on invalide l'ancien et on en émet un nouveau.
  await prisma.refreshToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date() },
  });
  return issueTokens(row.userId, row.user.role);
}

/**
 * Déconnexion : révoque le refresh token.
 *
 * @param refreshToken - Token à révoquer.
 */
export async function logout(refreshToken: string): Promise<void> {
  const hash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Vérifie l'email de l'utilisateur via un jeton unique.
 *
 * @param token - Jeton de vérification envoyé par email.
 * @throws {AppError} 400 si jeton invalide.
 */
export async function verifyEmail(token: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: token },
  });
  if (!user)
    throw AppError.badRequest(
      "INVALID_TOKEN",
      "Jeton de vérification invalide.",
    );
  await prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true, emailVerificationToken: null },
  });
  logger.info({ userId: user.id }, "🟡 Email verified");
}

/**
 * Initie la procédure de réinitialisation de mot de passe.
 *
 * Génère un token et envoie un email avec le lien de reset.
 * Ne révèle pas si l'email existe (privacy : réponse toujours 200).
 *
 * @param email - Adresse email de l'utilisateur.
 */
export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // On ne révèle pas si l'email existe (privacy). La réponse reste 200.
  if (!user) return;
  const token = generateRandomToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: token,
      resetPasswordExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });
  const mail = buildResetPasswordHtml(token, user.firstName);
  void sendMail({ to: user.email, ...mail });
}

/**
 * Réinitialise le mot de passe via un token.
 *
 * Transactionnel : met à jour le hash + invalide toutes les sessions actives.
 *
 * @param token       - Token de réinitialisation.
 * @param newPassword - Nouveau mot de passe en clair (sera hashé).
 * @throws {AppError} 400 si token invalide ou expiré.
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpiresAt: { gt: new Date() },
    },
  });
  if (!user)
    throw AppError.badRequest(
      "INVALID_OR_EXPIRED_TOKEN",
      "Jeton invalide ou expiré.",
    );

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    }),
    // Invalide toutes les sessions.
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  logger.info({ userId: user.id }, "🟡 Password reset");
}
