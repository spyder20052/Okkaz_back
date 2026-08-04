/**
 * @module utils/apiResponse
 * @description Fonctions utilitaires pour envoyer des réponses HTTP
 *   standardisées au format JSON. Chaque réponse respecte la structure :
 *
 *   ```json
 *   {
 *     "success": true | false,
 *     "message": "...",
 *     "data": { ... },
 *     "meta": { ... }          // (optionnel, pagination)
 *     "error": { "code": ... } // (optionnel, en cas d'échec)
 *   }
 *   ```
 *
 * @author KOUTON Spynel
 */

import type { Response } from "express";

/**
 * Envoie une réponse de succès avec le code HTTP 200.
 *
 * @param res     - Objet `Response` Express.
 * @param data    - Données à inclure dans la propriété `data` de la réponse.
 * @param message - Message humain optionnel (défaut : `'Success'`).
 * @returns La réponse Express (pour chaînage ou retour dans le contrôleur).
 *
 * @example
 * ```ts
 * return sendSuccess(res, { user }, 'Profil récupéré.');
 * ```
 */
export function sendSuccess(
  res: Response,
  data: unknown = null,
  message = "Success",
): Response {
  return res.status(200).json({ success: true, message, data });
}

/**
 * Envoie une réponse de création réussie avec le code HTTP 201.
 *
 * @param res     - Objet `Response` Express.
 * @param data    - Données de la ressource nouvellement créée.
 * @param message - Message humain optionnel (défaut : `'Created'`).
 * @returns La réponse Express.
 *
 * @example
 * ```ts
 * return sendCreated(res, { listing }, 'Annonce créée.');
 * ```
 */
export function sendCreated(
  res: Response,
  data: unknown = null,
  message = "Created",
): Response {
  return res.status(201).json({ success: true, message, data });
}

/**
 * Envoie une réponse sans contenu (HTTP 204). Utilisée après une suppression
 * ou une opération qui ne retourne aucun body.
 *
 * @param res - Objet `Response` Express.
 * @returns La réponse Express (body vide, pas de JSON).
 *
 * @example
 * ```ts
 * return sendNoContent(res);
 * ```
 */
export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

/** Structure des métadonnées de pagination retournée au client. */
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Envoie une réponse paginée contenant un tableau d'éléments et des
 * métadonnées de pagination (`page`, `limit`, `total`, `totalPages`).
 *
 * @param res   - Objet `Response` Express.
 * @param items - Tableau d'éléments de la page courante.
 * @param meta  - Métadonnées de pagination (issues de `buildPaginationMeta`).
 * @returns La réponse Express.
 *
 * @example
 * ```ts
 * const { items, meta } = await service.list(query);
 * return sendPaginated(res, items, meta);
 * ```
 */
export function sendPaginated(
  res: Response,
  items: unknown[],
  meta: PaginationMeta,
): Response {
  return res.status(200).json({ success: true, data: items, meta });
}

/**
 * Envoie une réponse d'erreur JSON avec formatage homogène. Utilisée
 * principalement par le middleware `errorHandler` global.
 *
 * @param res        - Objet `Response` Express.
 * @param statusCode - Code HTTP (400, 401, 403, 404, 422, 500…).
 * @param code       - Code machine-readable (ex : `VALIDATION_ERROR`).
 * @param message    - Message humain décrivant l'erreur.
 * @param details    - Détails supplémentaires (champs invalides, contexte…).
 * @returns La réponse Express.
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  return res
    .status(statusCode)
    .json({ success: false, error: { code, message, details } });
}
