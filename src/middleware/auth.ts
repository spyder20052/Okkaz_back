/**
 * @module authMiddleware
 * @description Middleware d'authentification JWT.
 *   Vérifie le token Bearer et injecte l'utilisateur dans la requête.
 *
 * @dependencies jsonwebtoken, env, types
 * @author Spynel KOUTON
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest, JwtPayload } from '../types';

/**
 * Vérifie le JWT access token depuis le header Authorization.
 * Injecte `req.user` avec le payload décodé.
 *
 * @throws {AppError} 401 si le token est absent ou invalide
 */
export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('AUTH_TOKEN_MISSING', 'Token d\'authentification requis.', 401);
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = decoded;
    logger.auth(`Utilisateur authentifié : ${decoded.userId}`);
    next();
  } catch {
    throw new AppError('AUTH_TOKEN_INVALID', 'Token invalide ou expiré.', 401);
  }
}
