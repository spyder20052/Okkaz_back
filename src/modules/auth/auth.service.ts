/**
 * @module modules/auth/auth.service
 * @description Logique métier de l'authentification (§4.1, §5.2).
 *   Hachage bcrypt, émission JWT + refresh token, rotation sécurisée.
 *
 * @author KOUTON Spynel
 */

import bcrypt from "bcrypt";
import { UserRole, UserStatus } from "@prisma/client";
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
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  kycStatus: string;
  isEmailVerified: boolean;
}

function toPublicUser(u: {
  id: string;
  email: string;
  phone: string;
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

  // Un SELLER démarre en statut PENDING_KYC — il doit soumettre son KYC.
  const status: UserStatus =
    input.role === "SELLER" ? UserStatus.PENDING_KYC : UserStatus.ACTIVE;

  const user = await prisma.user.create({
    data: {
      email: input.email,
      phone: input.phone,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role as UserRole,
      status,
      emailVerificationToken,
    },
  });

  logger.info({ userId: user.id, role: user.role }, "🟡 User registered");

  const mail = buildVerifyEmailHtml(emailVerificationToken, user.firstName);
  void sendMail({ to: user.email, ...mail });

  const tokens = await issueTokens(user.id, user.role);
  return { user: toPublicUser(user), tokens };
}

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

export async function logout(refreshToken: string): Promise<void> {
  const hash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

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
