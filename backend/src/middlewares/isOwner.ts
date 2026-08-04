/**
 * @module middlewares/isOwner
 * @description Middleware de vérification de propriété d'une ressource.
 *
 *   Vérifie que l'utilisateur authentifié est bien le propriétaire de la
 *   ressource identifiée par `req.params[paramName]`. Les admins passent
 *   systématiquement la vérification.
 *
 *   Supporte plusieurs modèles Prisma (`listing`, `user`, `demandListing`)
 *   via la configuration `modelName`.
 *
 * @author KOUTON Spynel
 */

import type { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";

/**
 * Configuration optionnelle du middleware `isOwner`.
 *
 * @property modelName - Nom du modèle Prisma à interroger (défaut : `'listing'`).
 * @property paramName - Nom du paramètre de route contenant l'ID (défaut : `'id'`).
 * @property userField - Nom du champ du modèle contenant l'ID propriétaire (défaut : `'userId'`).
 */
interface IsOwnerOptions {
  modelName?: "listing" | "user" | "demandListing";
  paramName?: string;
  userField?: string;
}

/**
 * Factory de middleware qui vérifie que l'utilisateur courant est propriétaire
 * de la ressource demandée.
 *
 * Flux :
 * 1. Si l'utilisateur est `ADMIN`, passe directement (`next()`).
 * 2. Récupère la ressource par son ID dans le modèle Prisma spécifié.
 * 3. Compare `resource[userField]` avec `req.user.id`.
 * 4. Si NON propriétaire → 403 Forbidden.
 * 5. Si ressource introuvable → 404 Not Found.
 *
 * @param options - Configuration : quel modèle, quel paramètre de route, quel champ.
 * @returns Middleware Express vérifiant la propriété.
 *
 * @example
 * ```ts
 * // Vérifie que l'utilisateur est propriétaire de l'annonce (paramètre :id) :
 * router.put('/listings/:id', authenticate, isOwner({ modelName: 'listing' }), handler);
 * ```
 *
 * @throws {AppError} 404 si la ressource n'existe pas.
 * @throws {AppError} 403 si l'utilisateur n'est pas le propriétaire.
 */
export function isOwner(options: IsOwnerOptions = {}) {
  const {
    modelName = "listing",
    paramName = "id",
    userField = "userId",
  } = options;

  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // Les admins passent directement.
    if (req.user?.role === UserRole.ADMIN) {
      next();
      return;
    }

    const resourceId = req.params[paramName];
    if (!resourceId) {
      throw AppError.badRequest("MISSING_PARAM", `Paramètre ${paramName} manquant.`);
    }

    const model = (prisma as unknown as Record<string, { findUnique: (args: unknown) => Promise<Record<string, unknown> | null> }>)[modelName];
    const resource = await model.findUnique({
      where: { id: resourceId },
      select: { [userField]: true },
    });

    if (!resource) {
      throw AppError.notFound("RESOURCE_NOT_FOUND", "Ressource introuvable.");
    }

    if (resource[userField] !== req.user?.id) {
      throw AppError.forbidden(
        "NOT_OWNER",
        "Vous n'êtes pas propriétaire de cette ressource.",
      );
    }

    next();
  };
}
