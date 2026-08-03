/**
 * @module utils/asyncHandler
 * @description Wrapper pour les fonctions asynchrones des contrôleurs Express.
 *
 *   Express ne capture pas nativement les rejets de Promise dans les handlers
 *   `async`. Ce wrapper appelle `next(err)` automatiquement si la Promise est
 *   rejetée, ce qui permet au middleware `errorHandler` global de traiter
 *   l'erreur de façon centralisée.
 *
 * @author KOUTON Spynel
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Encapsule un contrôleur asynchrone Express pour propager automatiquement
 * les exceptions vers le middleware `errorHandler` via `next(err)`.
 *
 * Sans ce wrapper, une exception non capturée dans un `async handler`
 * provoquerait un crash du process au lieu d'une réponse HTTP d'erreur.
 *
 * @param fn - Fonction asynchrone `(req, res, next) => Promise<any>`.
 * @returns  Un middleware Express classique qui catch les rejets.
 *
 * @example
 * ```ts
 * // Dans le fichier de routes :
 * router.get('/users', asyncHandler(controller.listUsers));
 * ```
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
