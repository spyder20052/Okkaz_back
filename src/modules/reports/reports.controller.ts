import type { Request, Response } from 'express';
import * as service from './reports.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/apiResponse';

export async function create(req: Request, res: Response): Promise<Response> {
  const report = await service.createReport({
    reporterId: req.user!.id,
    reportedUserId: req.body.reportedUserId,
    listingId: req.body.listingId,
    reason: req.body.reason,
    description: req.body.description,
  });
  return sendCreated(res, { report }, 'Signalement enregistré.');
}

export async function list(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.listForAdmin(req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

export async function detail(req: Request, res: Response): Promise<Response> {
  const report = await service.getForAdmin(req.params.id!);
  return sendSuccess(res, { report });
}

export async function review(req: Request, res: Response): Promise<Response> {
  const report = await service.review(req.params.id!, req.user!.id, req.body);
  return sendSuccess(res, { report }, 'Signalement mis à jour.');
}
