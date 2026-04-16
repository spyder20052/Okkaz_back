/**
 * @module utils/apiResponse
 * @description Helpers de réponse HTTP conformes au §7.2 du cahier des
 *   charges. Toutes les réponses suivent la structure :
 *     { success: true, data, message?, meta? }   // succès
 *     { success: false, error: { code, message, details? } }   // erreur
 *
 * @author KOUTON Spynel
 */

import type { Response } from "express";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  status = 200,
): Response {
  return res.status(status).json({
    success: true,
    data,
    ...(message ? { message } : {}),
  });
}

export function sendCreated<T>(
  res: Response,
  data: T,
  message?: string,
): Response {
  return sendSuccess(res, data, message, 201);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message?: string,
): Response {
  return res.status(200).json({
    success: true,
    data,
    meta,
    ...(message ? { message } : {}),
  });
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}
