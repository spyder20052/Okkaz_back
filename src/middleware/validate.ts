/**
 * @module validate
 * @description Middleware de validation des entrées via Zod.
 *   Valide body, query et/ou params selon le schéma fourni.
 *
 * @dependencies zod, AppError
 * @author Spynel KOUTON
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Factory middleware : valide les entrées de la requête contre des schémas Zod.
 *
 * @param schemas - Schémas Zod pour body, query et/ou params
 * @returns Middleware Express
 *
 * @example
 * router.post('/users', validate({ body: createUserSchema }), createUser);
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as typeof req.query;
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw new AppError(
          'VALIDATION_ERROR',
          'Données invalides.',
          422
        );
      }
      throw err;
    }
  };
}
