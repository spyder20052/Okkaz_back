/**
 * @module modules/listings/listings.controller
 */

import type { Request, Response } from 'express';
import * as service from './listings.service';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

/**
 * `GET /listings` — Liste les annonces actives avec filtres et pagination (publique).
 *
 * @param req - Query params de filtrage et pagination.
 * @param res - 200 OK avec les annonces paginées (sans `contactPhone`).
 */
export async function list(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.listPublic(req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

/**
 * `GET /listings/featured` — Annonces mises en avant (SELLER_PRO, max 20).
 *
 * @param _req - Aucun paramètre requis.
 * @param res  - 200 OK avec `{ items }`.
 */
export async function featured(_req: Request, res: Response): Promise<Response> {
  const items = await service.listFeatured();
  return sendSuccess(res, { items });
}

/**
 * `GET /listings/:id` — Détail d'une annonce active.
 *
 * @param req - Param `:id` (UUID).
 * @param res - 200 OK avec `{ listing }`.
 */
export async function detail(req: Request, res: Response): Promise<Response> {
  const listing = await service.getDetail(req.params.id!);
  return sendSuccess(res, { listing });
}

/**
 * `POST /listings/:id/contact` — Consulte (gratuitement) le contact d'une annonce.
 *
 * Enregistre la consultation et renvoie le numéro réel de l'annonceur s'il est
 * abonné, sinon le numéro intermédiaire de la plateforme.
 *
 * @param req - Param `:id` (UUID). Requiert `req.user` (BUYER).
 * @param res - 200 OK avec `{ contactPhone, isOwnerNumber, watermark }`.
 */
export async function revealContact(req: Request, res: Response): Promise<Response> {
  const data = await service.revealContact(req.user!.id, req.params.id!);
  return sendSuccess(res, data);
}

/**
 * `POST /listings` — Crée une annonce (SELLER/SELLER_PRO, KYC requis).
 *
 * @param req - Body validé par `createListingSchema`. Requiert `req.user`.
 * @param res - 201 Created avec `{ listing }`.
 */
export async function create(req: Request, res: Response): Promise<Response> {
  const listing = await service.createListing(req.user!.id, req.user!.role, req.body);
  return sendCreated(res, { listing }, 'Annonce créée, en attente de validation.');
}

/**
 * `PATCH /listings/:id` — Met à jour une annonce.
 *
 * @param req - Param `:id` + body partiel.
 * @param res - 200 OK avec `{ listing }`.
 */
export async function update(req: Request, res: Response): Promise<Response> {
  const listing = await service.updateListing(req.params.id!, req.user!.id, req.user!.role, req.body);
  return sendSuccess(res, { listing }, 'Annonce mise à jour.');
}

/**
 * `DELETE /listings/:id` — Supprime une annonce (soft delete).
 *
 * @param req - Param `:id` (UUID).
 * @param res - 204 No Content.
 */
export async function remove(req: Request, res: Response): Promise<Response> {
  await service.softDeleteListing(req.params.id!, req.user!.id, req.user!.role);
  return sendNoContent(res);
}

/**
 * `POST /listings/:id/photos` — Ajoute des photos à une annonce.
 *
 * @param req - Param `:id` + fichiers multipart. Body optionnel : `{ coverIndex }`.
 * @param res - 201 Created avec `{ photos }`.
 * @throws {AppError} 400 si aucun fichier envoyé.
 */
export async function uploadPhotos(req: Request, res: Response): Promise<Response> {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) throw AppError.badRequest('NO_FILES', 'Aucun fichier envoyé.');

  const coverIndex = req.body?.coverIndex !== undefined ? Number(req.body.coverIndex) : undefined;
  const photos = await service.addPhotos(req.params.id!, req.user!.id, req.user!.role, files, coverIndex);
  return sendCreated(res, { photos }, 'Photos ajoutées.');
}

/**
 * `DELETE /listings/:id/photos/:photo_id` — Supprime une photo.
 *
 * @param req - Params `:id` et `:photo_id` (UUIDs).
 * @param res - 204 No Content.
 */
export async function deletePhoto(req: Request, res: Response): Promise<Response> {
  await service.deletePhoto(req.params.id!, req.params.photo_id!, req.user!.id, req.user!.role);
  return sendNoContent(res);
}

/**
 * `PATCH /listings/:id/pause` — Met une annonce en pause.
 *
 * @param req - Param `:id` (UUID). Requiert `req.user`.
 * @param res - 200 OK avec `{ listing }`.
 */
export async function pause(req: Request, res: Response): Promise<Response> {
  const listing = await service.pauseListing(req.params.id!, req.user!.id, req.user!.role);
  return sendSuccess(res, { listing }, 'Annonce mise en pause.');
}

/**
 * `PATCH /listings/:id/resume` — Réactive une annonce en pause.
 *
 * @param req - Param `:id` (UUID). Requiert `req.user`.
 * @param res - 200 OK avec `{ listing }`.
 */
export async function resume(req: Request, res: Response): Promise<Response> {
  const listing = await service.resumeListing(req.params.id!, req.user!.id, req.user!.role);
  return sendSuccess(res, { listing }, 'Annonce réactivée.');
}
