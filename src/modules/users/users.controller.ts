/**
 * @module modules/users/users.controller
 * @description Contrôleurs HTTP du module Utilisateurs (§4.2).
 */

import type { Request, Response } from 'express';
import * as service from './users.service';
import { sendSuccess, sendPaginated } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

export async function getMe(req: Request, res: Response): Promise<Response> {
  const user = await service.getMe(req.user!.id);
  return sendSuccess(res, { user });
}

export async function updateMe(req: Request, res: Response): Promise<Response> {
  const user = await service.updateMe(req.user!.id, req.body);
  return sendSuccess(res, { user }, 'Profil mis à jour.');
}

export async function changePassword(req: Request, res: Response): Promise<Response> {
  await service.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  return sendSuccess(res, null, 'Mot de passe modifié.');
}

export async function getPublic(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;
  if (!id) throw AppError.badRequest('MISSING_ID', 'ID utilisateur manquant.');
  const profile = await service.getPublicProfile(id);
  return sendSuccess(res, { profile });
}

export async function getMyListings(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.getMyListings(req.user!.id, req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

export async function getMyContactAccesses(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.getMyContactAccesses(req.user!.id, req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

export async function getMyPayments(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.getMyPayments(req.user!.id, req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}
