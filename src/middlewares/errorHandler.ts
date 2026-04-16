/**
 * @module middlewares/errorHandler
 * @description Middleware final Express qui formate toutes les erreurs au
 *   format §7.2 du cahier des charges :
 *     { success: false, error: { code, message, details? } }
 *
 *   - En dev : inclut la stack trace dans les logs.
 *   - En prod : message générique pour les erreurs non opérationnelles.
 *
 * @author KOUTON Spynel
 */

import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { sendError } from "../utils/apiResponse";
import { logger } from "../config/logger";
import { isProduction } from "../config/env";

export function notFoundHandler(req: Request, res: Response): Response {
  return sendError(
    res,
    404,
    "ROUTE_NOT_FOUND",
    `Route introuvable : ${req.method} ${req.originalUrl}`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  // Erreurs applicatives connues → on leur fait confiance.
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.originalUrl }, "Application error");
    } else {
      logger.warn({ code: err.code, path: req.originalUrl }, err.message);
    }
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  // Zod (peut surgir en dehors de validateRequest).
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    return sendError(
      res,
      422,
      "VALIDATION_ERROR",
      "Requête invalide.",
      details,
    );
  }

  // Prisma — erreurs connues.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.warn(
      { code: err.code, meta: err.meta, path: req.originalUrl },
      "Prisma known error",
    );
    if (err.code === "P2002") {
      return sendError(
        res,
        409,
        "UNIQUE_CONSTRAINT",
        "Conflit : une ressource avec ces valeurs existe déjà.",
        err.meta,
      );
    }
    if (err.code === "P2025") {
      return sendError(
        res,
        404,
        "RESOURCE_NOT_FOUND",
        "Ressource introuvable.",
      );
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.warn({ path: req.originalUrl }, "Prisma validation error");
    return sendError(
      res,
      400,
      "DB_VALIDATION_ERROR",
      "Paramètres invalides pour la base de données.",
    );
  }

  // Fallback — tout le reste.
  logger.error({ err, path: req.originalUrl }, "Unhandled error");
  const message = isProduction
    ? "Erreur serveur interne."
    : err instanceof Error
      ? err.message
      : "Erreur inconnue.";
  return sendError(res, 500, "INTERNAL_ERROR", message);
}
