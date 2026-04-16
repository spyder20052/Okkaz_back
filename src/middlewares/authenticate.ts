/**
 * @module middlewares/authenticate
 * @description Middleware d'authentification JWT (§5.1).
 *   Lit le Bearer Token, vérifie la signature, attache `req.user`.
 *
 * @author KOUTON Spynel
 */

import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.header("authorization") ?? req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return next(AppError.unauthorized("MISSING_TOKEN", "Jeton manquant."));
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return next(AppError.unauthorized("MISSING_TOKEN", "Jeton manquant."));
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
}
