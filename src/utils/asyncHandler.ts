/**
 * @module utils/asyncHandler
 * @description Wrapper qui propage les erreurs des handlers async vers
 *   le middleware de gestion d'erreurs d'Express. Évite les
 *   `try { ... } catch (err) { next(err); }` répétitifs.
 *
 * @author KOUTON Spynel
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export function asyncHandler(handler: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
