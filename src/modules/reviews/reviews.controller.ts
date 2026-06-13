import type { Request, Response } from 'express';
import * as service from './reviews.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/apiResponse';

/**
 * `POST /reviews` — Publie un avis (requiert un accès contact valide).
 *
 * @param req - Body : `{ listingId, rating (1-5), comment? }`. Requiert `req.user`.
 * @param res - 201 Created avec `{ review }`.
 */
export async function create(req: Request, res: Response): Promise<Response> {
  const review = await service.create({
    reviewerId: req.user!.id,
    listingId: req.body.listingId,
    rating: req.body.rating,
    comment: req.body.comment,
  });
  return sendCreated(res, { review }, 'Avis publié.');
}

/**
 * `GET /reviews/listing/:listing_id` — Avis d'une annonce.
 *
 * @param req - Param `:listing_id` (UUID).
 * @param res - 200 OK avec `{ reviews, stats }`.
 */
export async function forListing(req: Request, res: Response): Promise<Response> {
  const data = await service.listForListing(req.params.listing_id!);
  return sendSuccess(res, data);
}

/**
 * `PATCH /reviews/:id/moderate` — Modère un avis (admin) : le masque/réaffiche.
 *
 * @param req - Param `:id` (UUID). Body : `{ isModerated: boolean }`.
 * @param res - 200 OK avec `{ review }`.
 */
export async function moderate(req: Request, res: Response): Promise<Response> {
  const review = await service.setModeration(req.params.id!, req.body.isModerated);
  return sendSuccess(res, { review }, req.body.isModerated ? 'Avis masqué.' : 'Avis ré-affiché.');
}

/**
 * `DELETE /reviews/:id` — Supprime un avis (admin).
 *
 * @param req - Param `:id` (UUID).
 * @param res - 204 No Content.
 */
export async function remove(req: Request, res: Response): Promise<Response> {
  await service.remove(req.params.id!);
  return sendNoContent(res);
}
