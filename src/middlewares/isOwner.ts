/**
 * @module middlewares/isOwner
 * @description Vérifie que l'utilisateur authentifié est propriétaire
 *   de la ressource manipulée (§5.1). Laisse passer les ADMIN.
 *
 * @author KOUTON Spynel
 */

import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";

type OwnableResource = "listing" | "demandListing" | "kycDocument" | "review";

const RESOURCE_QUERIES: Record<
  OwnableResource,
  (id: string) => Promise<{ userId: string } | { reviewerId: string } | null>
> = {
  listing: (id) =>
    prisma.listing.findUnique({ where: { id }, select: { userId: true } }),
  demandListing: (id) =>
    prisma.demandListing.findUnique({
      where: { id },
      select: { userId: true },
    }),
  kycDocument: (id) =>
    prisma.kycDocument.findUnique({ where: { id }, select: { userId: true } }),
  review: (id) =>
    prisma.review.findUnique({ where: { id }, select: { reviewerId: true } }),
};

export function isOwner(resource: OwnableResource, paramName = "id") {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) return next(AppError.unauthorized());
      if (req.user.role === "ADMIN") return next();

      const resourceId = req.params[paramName];
      if (!resourceId)
        return next(
          AppError.badRequest(
            "MISSING_PARAM",
            `Paramètre ${paramName} manquant.`,
          ),
        );

      const result = await RESOURCE_QUERIES[resource](resourceId);
      if (!result)
        return next(
          AppError.notFound("RESOURCE_NOT_FOUND", "Ressource introuvable."),
        );

      const ownerId = "userId" in result ? result.userId : result.reviewerId;
      if (ownerId !== req.user.id) {
        return next(
          AppError.forbidden(
            "NOT_OWNER",
            "Vous n'êtes pas propriétaire de cette ressource.",
          ),
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
