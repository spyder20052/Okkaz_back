/**
 * @module middlewares/authenticate
 * @description Middleware d'authentification JWT.
 *
 *   Vérifie le token Bearer dans le header `Authorization`. En cas de succès,
 *   injecte `req.user` (`{ id, role }`) pour les middlewares et contrôleurs
 *   en aval. En cas d'échec, retourne une erreur 401.
 *
 * @author KOUTON Spynel
 */

import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import type { UserRole } from "@prisma/client";

/**
 * Middleware Express qui extrait et vérifie le JWT dans le header
 * `Authorization: Bearer <token>`.
 *
 * Flux :
 * 1. Extrait le token du header `Authorization`.
 * 2. Vérifie la signature et l'expiration via `verifyAccessToken()`.
 * 3. Injecte `req.user = { id, role }` pour les couches suivantes.
 * 4. Si le token est absent ou invalide, lève une `AppError.unauthorized()`.
 *
 * @param req  - Requête Express (doit contenir le header `Authorization`).
 * @param _res - Réponse Express (non utilisée).
 * @param next - Callback Express next — propage l'erreur ou passe au middleware suivant.
 * @throws {AppError} 401 si le token est absent, mal formé ou expiré.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw AppError.unauthorized();
  }
  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    req.user = { id: payload.userId, role: payload.role as UserRole };
    next();
    } catch {
      throw AppError.unauthorized("TOKEN_INVALID", "Token invalide ou expiré.");
    }
}
