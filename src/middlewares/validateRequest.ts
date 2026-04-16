/**
 * @module middlewares/validateRequest
 * @description Validation des entrées (body, query, params) via Zod (§5.1).
 *   Retourne 422 Unprocessable Entity avec le détail des champs invalides.
 *
 * @author KOUTON Spynel
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodError, type ZodSchema } from "zod";
import { AppError } from "../utils/AppError";

export interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validateRequest(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query)
        req.query = schemas.query.parse(req.query) as Request["query"];
      if (schemas.params)
        req.params = schemas.params.parse(req.params) as Request["params"];
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        }));
        return next(
          AppError.unprocessable(
            "VALIDATION_ERROR",
            "Requête invalide.",
            details,
          ),
        );
      }
      next(err);
    }
  };
}
