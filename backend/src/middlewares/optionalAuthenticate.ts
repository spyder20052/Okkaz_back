/**
 * @module middlewares/optionalAuthenticate
 * @description Middleware d'authentification JWT *facultative*.
 *
 *   Variante non bloquante de `authenticate` : si un token Bearer valide est
 *   présent, `req.user` est injecté ; sinon la requête continue en anonyme.
 *   Aucun 401 n'est jamais levé.
 *
 *   Utilisé sur les routes publiques dont la réponse s'enrichit pour certains
 *   profils — typiquement `GET /listings/:id`, qui reste ouvert à tous pour
 *   une annonce `ACTIVE` mais laisse le propriétaire (ou un ADMIN) consulter
 *   une annonce encore `PENDING` (§4.5, §4.11).
 *
 * @author KOUTON Spynel
 */

import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import type { UserRole } from "@prisma/client";

/**
 * Middleware Express qui tente d'identifier l'appelant sans l'exiger.
 *
 * Flux :
 * 1. Si le header `Authorization` est absent ou mal formé → passe en anonyme.
 * 2. Sinon vérifie la signature/expiration du token.
 * 3. Si le token est valide, injecte `req.user = { id, role }`.
 * 4. Si le token est invalide ou expiré, l'ignore et passe en anonyme.
 *
 * @param req  - Requête Express (header `Authorization` facultatif).
 * @param _res - Réponse Express (non utilisée).
 * @param next - Callback Express next — toujours appelé sans erreur.
 */
export function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = { id: payload.userId, role: payload.role as UserRole };
  } catch {
    // Token expiré ou invalide : la route reste accessible en anonyme.
    // Le front rejouera la requête après un refresh si nécessaire.
  }
  next();
}
