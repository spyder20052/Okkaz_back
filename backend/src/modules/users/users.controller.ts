/**
 * @module modules/users/users.controller
 * @description Contrôleurs HTTP du module Utilisateurs (§4.2).
 */

import type { Request, Response } from 'express';
import * as service from './users.service';
import { sendSuccess, sendPaginated } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

/**
 * `GET /users/me` — Profil complet de l'utilisateur connecté.
 *
 * @param req - Requiert `req.user`.
 * @param res - 200 OK avec `{ user }`.
 */
export async function getMe(req: Request, res: Response): Promise<Response> {
  const user = await service.getMe(req.user!.id);
  return sendSuccess(res, { user });
}

/**
 * `PATCH /users/me` — Met à jour le profil de l'utilisateur connecté.
 *
 * @param req - Body : `{ firstName?, lastName?, city?, address?, profilePhotoUrl? }`.
 * @param res - 200 OK avec `{ user }`.
 */
export async function updateMe(req: Request, res: Response): Promise<Response> {
  const user = await service.updateMe(req.user!.id, req.body);
  return sendSuccess(res, { user }, 'Profil mis à jour.');
}

/**
 * `POST /users/me/change-password` — Change le mot de passe.
 *
 * @param req - Body : `{ currentPassword, newPassword }`.
 * @param res - 200 OK.
 */
export async function changePassword(req: Request, res: Response): Promise<Response> {
  await service.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  return sendSuccess(res, null, 'Mot de passe modifié.');
}

/**
 * `GET /users/:id` — Profil public d'un utilisateur.
 *
 * @param req - Param `:id` (UUID).
 * @param res - 200 OK avec `{ profile }`.
 * @throws {AppError} 400 si l'ID est manquant.
 */
export async function getPublic(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;
  if (!id) throw AppError.badRequest('MISSING_ID', 'ID utilisateur manquant.');
  const profile = await service.getPublicProfile(id);
  return sendSuccess(res, { profile });
}

/**
 * `GET /users/me/listings` — Liste les annonces de l'utilisateur connecté.
 *
 * @param req - Query params de pagination.
 * @param res - 200 OK avec `{ items, meta }`.
 */
export async function getMyListings(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.getMyListings(req.user!.id, req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

/**
 * `GET /users/me/contact-reveals` — Contacts consultés.
 *
 * @param req - Query params de pagination.
 * @param res - 200 OK avec `{ items, meta }`.
 */
export async function getMyContactReveals(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.getMyContactReveals(req.user!.id, req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

/**
 * `GET /users/me/payments` — Historique de paiements.
 *
 * @param req - Query params de pagination.
 * @param res - 200 OK avec `{ items, meta }`.
 */
export async function getMyPayments(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.getMyPayments(req.user!.id, req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}
