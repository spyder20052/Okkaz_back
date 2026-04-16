/**
 * @module modules/listings/listings.controller
 */

import type { Request, Response } from 'express';
import * as service from './listings.service';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

export async function list(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.listPublic(req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

export async function featured(_req: Request, res: Response): Promise<Response> {
  const items = await service.listFeatured();
  return sendSuccess(res, { items });
}

export async function detail(req: Request, res: Response): Promise<Response> {
  const listing = await service.getDetail(req.params.id!);
  return sendSuccess(res, { listing });
}

export async function create(req: Request, res: Response): Promise<Response> {
  const listing = await service.createListing(req.user!.id, req.user!.role, req.body);
  return sendCreated(res, { listing }, 'Annonce créée, en attente de validation.');
}

export async function update(req: Request, res: Response): Promise<Response> {
  const listing = await service.updateListing(req.params.id!, req.user!.id, req.user!.role, req.body);
  return sendSuccess(res, { listing }, 'Annonce mise à jour.');
}

export async function remove(req: Request, res: Response): Promise<Response> {
  await service.softDeleteListing(req.params.id!, req.user!.id, req.user!.role);
  return sendNoContent(res);
}

export async function uploadPhotos(req: Request, res: Response): Promise<Response> {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) throw AppError.badRequest('NO_FILES', 'Aucun fichier envoyé.');

  const coverIndex = req.body?.coverIndex !== undefined ? Number(req.body.coverIndex) : undefined;
  const photos = await service.addPhotos(req.params.id!, req.user!.id, req.user!.role, files, coverIndex);
  return sendCreated(res, { photos }, 'Photos ajoutées.');
}

export async function deletePhoto(req: Request, res: Response): Promise<Response> {
  await service.deletePhoto(req.params.id!, req.params.photo_id!, req.user!.id, req.user!.role);
  return sendNoContent(res);
}

export async function pause(req: Request, res: Response): Promise<Response> {
  const listing = await service.pauseListing(req.params.id!, req.user!.id, req.user!.role);
  return sendSuccess(res, { listing }, 'Annonce mise en pause.');
}

export async function resume(req: Request, res: Response): Promise<Response> {
  const listing = await service.resumeListing(req.params.id!, req.user!.id, req.user!.role);
  return sendSuccess(res, { listing }, 'Annonce réactivée.');
}
