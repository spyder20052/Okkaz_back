/**
 * @module errorHandler
 * @description Middleware global de gestion des erreurs.
 *   Intercepte toutes les erreurs et retourne une réponse structurée.
 *
 * @dependencies AppError, logger, apiResponse
 * @author Spynel KOUTON
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { sendError } from '../utils/apiResponse';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.error(err.message, { code: err.code, statusCode: err.statusCode });
    sendError(res, err.code, err.message, err.statusCode);
    return;
  }

  // Erreur inattendue
  logger.error(err.message, env.NODE_ENV === 'development' ? { stack: err.stack } : undefined);

  sendError(
    res,
    'INTERNAL_SERVER_ERROR',
    env.NODE_ENV === 'production'
      ? 'Une erreur interne est survenue.'
      : err.message,
    500
  );
}
