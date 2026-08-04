/**
 * @module middlewares/authorize
 * @description Middleware d'autorisation par rôle.
 *
 *   Doit être utilisé **après** `authenticate()` (qui injecte `req.user`).
 *   Vérifie que le rôle de l'utilisateur authentifié fait partie des rôles
 *   autorisés pour la route.
 *
 * @author KOUTON Spynel
 */

import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@prisma/client";
import { AppError } from "../utils/AppError";

/**
 * Factory de middleware qui autorise uniquement les utilisateurs dont le rôle
 * figure dans la liste des rôles passés en paramètre.
 *
 * @param roles - Liste des rôles autorisés (ex : `'ADMIN'`, `'SELLER_PRO'`, `'SELLER'`).
 * @returns Middleware Express qui bloque avec une 403 si le rôle ne correspond pas.
 *
 * @example
 * ```ts
 * // Seuls les admins peuvent accéder à cette route :
 * router.get('/admin/users', authenticate, authorize('ADMIN'), handler);
 *
 * // Vendeurs et vendeurs pro :
 * router.post('/listings', authenticate, authorize('SELLER', 'SELLER_PRO'), handler);
 * ```
 *
 * @throws {AppError} 403 si `req.user.role` ne fait pas partie des rôles autorisés.
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw AppError.forbidden(
        "INSUFFICIENT_ROLE",
        "Vous n'avez pas les droits nécessaires.",
      );
    }
    next();
  };
}
