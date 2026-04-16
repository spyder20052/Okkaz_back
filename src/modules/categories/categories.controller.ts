/**
 * @module modules/categories/categories.controller
 */

import type { Request, Response } from 'express';
import * as service from './categories.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/apiResponse';

export async function list(_req: Request, res: Response): Promise<Response> {
  const categories = await service.listActive();
  return sendSuccess(res, { categories });
}

export async function detail(req: Request, res: Response): Promise<Response> {
  const category = await service.getBySlug(req.params.slug!);
  return sendSuccess(res, { category });
}

export async function create(req: Request, res: Response): Promise<Response> {
  const category = await service.create(req.body);
  return sendCreated(res, { category }, 'Catégorie créée.');
}

export async function update(req: Request, res: Response): Promise<Response> {
  const category = await service.update(req.params.id!, req.body);
  return sendSuccess(res, { category }, 'Catégorie mise à jour.');
}

export async function remove(req: Request, res: Response): Promise<Response> {
  await service.deactivate(req.params.id!);
  return sendNoContent(res);
}
