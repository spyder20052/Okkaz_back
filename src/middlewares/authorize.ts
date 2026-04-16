/**
 * @module middlewares/authorize
 * @description Vérifie que `req.user.role` est dans la liste autorisée.
 *   À utiliser après `authenticate()`. Conforme §5.1.
 *
 * @author KOUTON Spynel
 */

import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@prisma/client";
import { AppError } from "../utils/AppError";

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          "ROLE_FORBIDDEN",
          "Rôle insuffisant pour accéder à cette ressource.",
        ),
      );
    }
    next();
  };
}
