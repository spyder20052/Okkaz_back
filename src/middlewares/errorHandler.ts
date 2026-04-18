/**
 * @module middlewares/errorHandler
 * @description Middleware global de gestion des erreurs Express.
 *
 *   Transforme toute erreur (opérationnelle ou inattendue) en une réponse
 *   JSON normalisée via `sendError()`. Gère spécifiquement :
 *   - Les `AppError` (erreurs métier intentionnelles).
 *   - Les erreurs Prisma (contraintes d'unicité, relations manquantes…).
 *   - Les erreurs de parsing JSON.
 *   - Les erreurs `multer` (upload de fichiers).
 *   - Les erreurs imprévues (crash, bug) → 500 avec log `error`.
 *
 * @author KOUTON Spynel
 */

import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { logger } from "../config/logger";
import { AppError } from "../utils/AppError";
import { sendError } from "../utils/apiResponse";

/**
 * Middleware Express de gestion centralisée des erreurs.
 *
 * **Important** : doit être enregistré **en dernier** parmi les middlewares
 * Express (via `app.use(errorHandler)`) pour intercepter toutes les erreurs
 * propagées par `asyncHandler` ou `next(err)`.
 *
 * Flux de traitement :
 * 1. Si l'erreur est une `AppError` → retourne le `statusCode` et le `code` métier.
 * 2. Si c'est une erreur Prisma connue → convertit en réponse HTTP adaptée :
 *    - `P2002` (contrainte unique) → 409 Conflict.
 *    - `P2025` (record not found) → 404 Not Found.
 *    - `P2003` (foreign key violation) → 400 Bad Request.
 * 3. Si c'est une `SyntaxError` de parsing JSON → 400.
 * 4. Si c'est une erreur `multer` → 400 avec message descriptif.
 * 5. Sinon → 500 Internal Server Error + log `error` level.
 *
 * @param err  - L'erreur capturée (de n'importe quel type).
 * @param req  - Requête Express (utilisée pour le contexte dans les logs).
 * @param res  - Réponse Express.
 * @param _next - Callback `next` Express (requis par la signature du error handler, non utilisé).
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── AppError (erreur métier) ──────────────────────────────────────
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // ── Prisma : contrainte d'unicité ────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[])?.join(", ") ?? "champ";
      sendError(res, 409, "DUPLICATE_ENTRY", `La valeur de ${target} existe déjà.`);
      return;
    }
    if (err.code === "P2025") {
      sendError(res, 404, "RECORD_NOT_FOUND", "Ressource introuvable.");
      return;
    }
    if (err.code === "P2003") {
      const field = (err.meta?.field_name as string) ?? "relation";
      sendError(res, 400, "FOREIGN_KEY_VIOLATION", `Référence invalide : ${field}.`);
      return;
    }
  }

  // ── Prisma : erreur de validation interne ────────────────────────
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.warn({ err }, "Prisma validation error");
    sendError(res, 400, "DB_VALIDATION_ERROR", "Données invalides pour la base de données.");
    return;
  }

  // ── JSON malformé ────────────────────────────────────────────────
  if (err instanceof SyntaxError && "body" in err) {
    sendError(res, 400, "INVALID_JSON", "Le corps de la requête n'est pas du JSON valide.");
    return;
  }

  // ── Multer (upload) ──────────────────────────────────────────────
  if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "LIMIT_FILE_SIZE") {
    sendError(res, 400, "FILE_TOO_LARGE", "Le fichier dépasse la taille maximale autorisée.");
    return;
  }

  // ── Erreur imprévue (bug, crash) ─────────────────────────────────
  logger.error(
    { err, method: req.method, url: req.originalUrl },
    "🔴 Unhandled error",
  );
  sendError(res, 500, "INTERNAL_ERROR", "Erreur serveur interne.");
}
