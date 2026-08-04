/**
 * @module utils/jwt
 * @description Gestion des tokens JWT et des refresh tokens.
 *
 *   Stratégie :
 *   - **Access Token** : signé HMAC-SHA256, durée de vie courte (15 min par défaut).
 *   - **Refresh Token** : UUID v4 aléatoire, hashé SHA-256 avant stockage en base
 *     pour éviter toute exploitation en cas de fuite de la BDD.
 *   - **Rotation** : chaque appel à `generateRefreshToken` invalide l'ancien
 *     et en crée un nouveau, limitant la fenêtre d'exploitation d'un token volé.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7519
 * @author KOUTON Spynel
 */

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../config/prisma";
import { env } from "../config/env";

/** Payload embarqué dans chaque JWT access token. */
interface JwtPayload {
  userId: string;
  role: string;
}

/**
 * Génère un access token JWT signé contenant l'identifiant et le rôle
 * de l'utilisateur.
 *
 * @param payload - Données métier à inclure dans le token (`userId`, `role`).
 * @returns Token JWT signé, valide pendant la durée définie par `JWT_EXPIRES_IN`.
 *
 * @example
 * ```ts
 * const token = generateAccessToken({ userId: user.id, role: user.role });
 * res.json({ accessToken: token });
 * ```
 */
export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as unknown as jwt.SignOptions["expiresIn"],
  });
}

/**
 * Vérifie et décode un access token JWT.
 *
 * @param token - Le token JWT reçu dans le header `Authorization`.
 * @returns Le payload décodé (`userId`, `role`).
 * @throws {JsonWebTokenError} Si le token est invalide, expiré ou altéré.
 *
 * @example
 * ```ts
 * try {
 *   const { userId, role } = verifyAccessToken(token);
 * } catch {
 *   throw AppError.unauthorized();
 * }
 * ```
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

/**
 * Hash un refresh token brut en SHA-256 avant de le stocker en base.
 *
 * Le stockage du hash plutôt que du token brut empêche l'exploitation
 * directe d'une fuite de base de données.
 *
 * @param raw - Le refresh token brut (UUID v4).
 * @returns Le hash SHA-256 hexadécimal du token (64 caractères).
 */
export function hashRefreshToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Génère un nouveau refresh token.
 *
 * **Sans argument** : retourne `{ token, hash }` (auth.service gère la DB).
 * **Avec `userId`** : rotation complète en DB + retourne le token brut.
 *
 * @overload
 * @returns `{ token, hash }` — token brut + hash SHA-256.
 *
 * @overload
 * @param userId - ID utilisateur pour la rotation DB.
 * @returns Token brut (Promise\<string\>).
 */
export function generateRefreshToken(): { token: string; hash: string };
export function generateRefreshToken(userId: string): Promise<string>;
export function generateRefreshToken(userId?: string): { token: string; hash: string } | Promise<string> {
  const raw = crypto.randomUUID();
  const hashed = hashRefreshToken(raw);

  if (!userId) {
    return { token: raw, hash: hashed };
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours
  return (async () => {
    // Rotation : supprime les anciens tokens de cet utilisateur.
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.refreshToken.create({
      data: { userId, tokenHash: hashed, expiresAt },
    });
    return raw;
  })();
}

/**
 * Vérifie un refresh token brut : retrouve le hash correspondant en base,
 * vérifie qu'il n'est pas expiré et qu'il est encore actif (non révoqué).
 *
 * @param raw - Le refresh token brut reçu du client (cookie/body).
 * @returns L'enregistrement `RefreshToken` complet (incluant `userId`).
 * @throws Retourne `null` si le token est invalide, expiré ou révoqué.
 *
 * @example
 * ```ts
 * const stored = await verifyRefreshToken(req.body.refreshToken);
 * if (!stored) throw AppError.unauthorized('INVALID_REFRESH_TOKEN');
 * ```
 */
export async function verifyRefreshToken(raw: string) {
  const hashed = hashRefreshToken(raw);
  return prisma.refreshToken.findFirst({
    where: { tokenHash: hashed, revokedAt: null, expiresAt: { gt: new Date() } },
  });
}

// ---------------------------------------------------------------------------
// Aliases utilisés par auth.service
// ---------------------------------------------------------------------------

/**
 * Alias de `generateAccessToken` — utilisé par `auth.service`.
 *
 * @param userId - ID de l'utilisateur.
 * @param role   - Rôle de l'utilisateur.
 * @returns JWT access token signé.
 */
export function signAccessToken(userId: string, role: string): string {
  return generateAccessToken({ userId, role });
}

/**
 * Alias de `hashRefreshToken` — utilisé par `auth.service`.
 *
 * @param raw - Token brut.
 * @returns Hash SHA-256 hexadécimal.
 */
export function hashToken(raw: string): string {
  return hashRefreshToken(raw);
}

/**
 * Calcule la date d'expiration d'un refresh token (7 jours).
 *
 * @returns `Date` d'expiration.
 */
export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

/**
 * Génère un token aléatoire (UUID v4) — utilisé pour l'email verification
 * et le reset password.
 *
 * @returns UUID v4 aléatoire.
 */
export function generateRandomToken(): string {
  return crypto.randomUUID();
}
