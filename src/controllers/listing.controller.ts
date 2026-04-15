/**
 * @module listingController
 * @description Contrôleurs pour les endpoints d'annonces.
 *   Délègue la logique métier au service listing.
 *
 * @dependencies listingService, apiResponse
 * @author Spynel KOUTON
 */

import { Request, Response, NextFunction } from 'express';
import * as listingService from '../services/listing.service';
import { sendSuccess } from '../utils/apiResponse';
import type { AuthenticatedRequest } from '../types';

/**
 * POST /api/v1/listings
 * Crée une nouvelle annonce.
 *
 * @auth Requis — Bearer Token
 */
export async function create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const listing = await listingService.createListing({
      ...req.body,
      ownerId: req.user!.userId,
    });
    sendSuccess(res, listing, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/listings
 * Liste les annonces actives avec filtres et pagination.
 */
export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await listingService.getListings(req.query as never);
    sendSuccess(res, result.listings, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/listings/:id
 * Récupère le détail d'une annonce.
 */
export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const listing = await listingService.getListingById(req.params.id);
    sendSuccess(res, listing);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/listings/:id
 * Met à jour une annonce (propriétaire uniquement).
 *
 * @auth Requis — Bearer Token
 */
export async function update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const listing = await listingService.updateListing(
      req.params.id,
      req.user!.userId,
      req.body
    );
    sendSuccess(res, listing);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/listings/:id
 * Supprime une annonce (propriétaire ou admin).
 *
 * @auth Requis — Bearer Token
 */
export async function remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await listingService.deleteListing(
      req.params.id,
      req.user!.userId,
      req.user!.role === 'ADMIN'
    );
    sendSuccess(res, null, 204);
  } catch (err) {
    next(err);
  }
}
