import type { Request, Response } from 'express';
import * as service from './reviews.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/apiResponse';

export async function create(req: Request, res: Response): Promise<Response> {
  const review = await service.create({
    reviewerId: req.user!.id,
    listingId: req.body.listingId,
    rating: req.body.rating,
    comment: req.body.comment,
  });
  return sendCreated(res, { review }, 'Avis publié.');
}

export async function forListing(req: Request, res: Response): Promise<Response> {
  const data = await service.listForListing(req.params.listing_id!);
  return sendSuccess(res, data);
}

export async function remove(req: Request, res: Response): Promise<Response> {
  await service.remove(req.params.id!);
  return sendNoContent(res);
}
