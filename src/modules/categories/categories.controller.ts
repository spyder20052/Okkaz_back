/**
 * @module modules/categories/categories.controller
 */

import type { Request, Response } from 'express';
import * as service from './categories.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/apiResponse';

/**
 * `GET /categories` — Liste les catégories racines actives (publique).
 *
 * @param _req - Aucun paramètre requis.
 * @param res  - 200 OK avec `{ categories }`.
 */
export async function list(_req: Request, res: Response): Promise<Response> {
  const categories = await service.listActive();
  return sendSuccess(res, { categories });
}

/**
 * `GET /categories/:slug` — Détail d'une catégorie par slug.
 *
 * @param req - Param `:slug`.
 * @param res - 200 OK avec `{ category }` et `activeListingsCount`.
 */
export async function detail(req: Request, res: Response): Promise<Response> {
  const category = await service.getBySlug(req.params.slug!);
  return sendSuccess(res, { category });
}

/**
 * `POST /categories` — Crée une nouvelle catégorie (admin).
 *
 * @param req - Body : `{ name, slug, description?, iconUrl?, parentId?, sortOrder? }`.
 * @param res - 201 Created avec `{ category }`.
 */
export async function create(req: Request, res: Response): Promise<Response> {
  const category = await service.create(req.body);
  return sendCreated(res, { category }, 'Catégorie créée.');
}

/**
 * `PATCH /categories/:id` — Met à jour une catégorie (admin).
 *
 * @param req - Param `:id` (UUID) + body partiel.
 * @param res - 200 OK avec `{ category }`.
 */
export async function update(req: Request, res: Response): Promise<Response> {
  const category = await service.update(req.params.id!, req.body);
  return sendSuccess(res, { category }, 'Catégorie mise à jour.');
}

/**
 * `DELETE /categories/:id` — Désactive une catégorie (soft delete, admin).
 *
 * @param req - Param `:id` (UUID).
 * @param res - 204 No Content.
 */
export async function remove(req: Request, res: Response): Promise<Response> {
  await service.deactivate(req.params.id!);
  return sendNoContent(res);
}
