/**
 * @module middlewares/validateRequest
 * @description Middleware de validation des requêtes via Zod.
 *
 *   Vérifie `req.body`, `req.query` et/ou `req.params` contre des schémas
 *   Zod fournis. En cas d'échec, retourne une erreur 422 structurée avec
 *   le détail des champs invalides.
 *
 * @author KOUTON Spynel
 */

import type { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/AppError";

/** Options de validation : un schéma Zod par partie de la requête à valider. */
interface ValidationSchemas {
  /** Schéma pour `req.body`. */
  body?: ZodSchema;
  /** Schéma pour `req.query`. */
  query?: ZodSchema;
  /** Schéma pour `req.params`. */
  params?: ZodSchema;
}

/**
 * Factory de middleware qui valide les données d'une requête HTTP
 * (body, query, params) contre des schémas Zod.
 *
 * En cas de succès, remplace les données brutes par les données parsées
 * (Zod applique les transformations, les defaults…). En cas d'échec,
 * lève une `AppError.unprocessable` avec le détail des champs invalides.
 *
 * @param schemas - Objet contenant un ou plusieurs schémas Zod :
 *   - `body`   : schéma pour le corps de la requête.
 *   - `query`  : schéma pour les paramètres de query string.
 *   - `params` : schéma pour les paramètres de route.
 * @returns Middleware Express.
 *
 * @example
 * ```ts
 * router.post(
 *   '/listings',
 *   validateRequest({ body: createListingSchema }),
 *   asyncHandler(controller.create),
 * );
 *
 * router.get(
 *   '/listings/:id',
 *   validateRequest({ params: listingIdParamSchema }),
 *   asyncHandler(controller.detail),
 * );
 * ```
 *
 * @throws {AppError} 422 avec `details` contenant un tableau `{ path, message }[]`
 *   pour chaque champ en erreur.
 */
export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: Array<{ path: string; message: string }> = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        result.error.issues.forEach((i) =>
          errors.push({ path: `body.${i.path.join(".")}`, message: i.message }),
        );
      } else {
        req.body = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        result.error.issues.forEach((i) =>
          errors.push({
            path: `query.${i.path.join(".")}`,
            message: i.message,
          }),
        );
      } else {
        Object.assign(req, { query: result.data });
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        result.error.issues.forEach((i) =>
          errors.push({
            path: `params.${i.path.join(".")}`,
            message: i.message,
          }),
        );
      } else {
        req.params = result.data;
      }
    }

    if (errors.length > 0) {
      throw AppError.unprocessable("VALIDATION_ERROR", "Données invalides.", errors);
    }

    next();
  };
}
