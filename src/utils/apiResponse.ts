/**
 * @module apiResponse
 * @description Helpers pour formater les réponses API de manière cohérente.
 *
 * @author Spynel KOUTON
 */

import { Response } from 'express';
import type { ApiSuccessResponse, ApiErrorResponse } from '../types';

/**
 * Envoie une réponse de succès formatée.
 *
 * @param res - Objet Response Express
 * @param data - Données à retourner
 * @param statusCode - Code HTTP (défaut : 200)
 * @param meta - Métadonnées optionnelles (pagination)
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiSuccessResponse['meta']
): void {
  const response: ApiSuccessResponse<T> = { status: 'success', data };
  if (meta) response.meta = meta;
  res.status(statusCode).json(response);
}

/**
 * Envoie une réponse d'erreur formatée.
 *
 * @param res - Objet Response Express
 * @param code - Code d'erreur applicatif (ex: RESOURCE_NOT_FOUND)
 * @param message - Message lisible
 * @param statusCode - Code HTTP (défaut : 400)
 * @param details - Détails optionnels (erreurs de validation)
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: unknown
): void {
  const response: ApiErrorResponse = { status: 'error', code, message };
  if (details) response.details = details;
  res.status(statusCode).json(response);
}
