/**
 * @module utils/jwt
 * @description Gestion JWT conforme §5.2 :
 *   - Access token : 15 min, HS256, payload `{ sub, role, iat, exp }`
 *   - Refresh token : 30 jours, stocké en DB (hash), rotation à chaque usage
 *
 * @author KOUTON Spynel
 */

import jwt, { type SignOptions, type JwtPayload } from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";
import type { UserRole } from "@prisma/client";
import { env } from "../config/env";
import { AppError } from "./AppError";

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
}

export function signAccessToken(userId: string, role: UserRole): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign({ sub: userId, role }, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === "string") {
      throw AppError.unauthorized("INVALID_TOKEN", "Jeton invalide.");
    }
    return decoded as AccessTokenPayload;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized("TOKEN_EXPIRED", "Jeton expiré.");
    }
    throw AppError.unauthorized("INVALID_TOKEN", "Jeton invalide.");
  }
}

/** Génère un refresh token opaque (non-JWT) et son hash pour DB. */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString("base64url");
  const hash = hashToken(token);
  return { token, hash };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Calcule la date d'expiration d'un refresh token (durée issue de l'env). */
export function getRefreshTokenExpiry(): Date {
  return parseDurationToDate(env.JWT_REFRESH_EXPIRES_IN);
}

function parseDurationToDate(duration: string): Date {
  // Supporte les formats simples "30d", "15m", "1h", "3600s".
  const match = /^(\d+)\s*([smhd])$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Durée JWT invalide : ${duration}`);
  }
  const value = Number.parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multiplier: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return new Date(Date.now() + value * multiplier[unit]!);
}

export function generateRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}
