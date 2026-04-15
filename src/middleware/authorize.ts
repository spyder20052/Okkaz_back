/**
 * @module authorize
 * @description Middleware d'autorisation par rôle.
 *   Restreint l'accès aux utilisateurs ayant un rôle spécifique.
 *
 * @dependencies types, AppError
 * @author Spynel KOUTON
 */

import { Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import type { AuthenticatedRequest, UserRole } from '../types';

/**
 * Factory middleware : vérifie que l'utilisateur connecté possède
 * l'un des rôles autorisés.
 *
 * @param roles - Liste des rôles autorisés
 * @returns Middleware Express
 *
 * @example
 * router.delete('/users/:id', authenticate, authorize('ADMIN'), deleteUser);
 */
export function authorize(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('AUTH_REQUIRED', 'Authentification requise.', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('FORBIDDEN', 'Accès refusé — rôle insuffisant.', 403);
    }

    next();
  };
}
