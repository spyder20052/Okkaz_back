import type { Request, Response } from 'express';
import * as service from './reports.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/apiResponse';

/**
 * `POST /reports` — Crée un signalement.
 *
 * @param req - Body : `{ reportedUserId?, listingId?, reason, description? }`. Requiert `req.user`.
 * @param res - 201 Created avec `{ report }`.
 */
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

/**
 * `GET /admin/reports` — Liste les signalements (admin, paginé).
 *
 * @param req - Query params : `{ status?, page?, limit? }`.
 * @param res - 200 OK avec les signalements paginés.
 */
export async function list(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.listForAdmin(req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

/**
 * `GET /admin/reports/:id` — Détail d'un signalement (admin).
 *
 * @param req - Param `:id` (UUID).
 * @param res - 200 OK avec `{ report }`.
 */
export async function detail(req: Request, res: Response): Promise<Response> {
  const report = await service.getForAdmin(req.params.id!);
  return sendSuccess(res, { report });
}

/**
 * `PATCH /admin/reports/:id/review` — Traite un signalement (admin).
 *
 * @param req - Param `:id` + body `{ status, adminNote? }`.
 * @param res - 200 OK avec `{ report }`.
 */
export async function review(req: Request, res: Response): Promise<Response> {
  const report = await service.review(req.params.id!, req.user!.id, req.body);
  return sendSuccess(res, { report }, 'Signalement mis à jour.');
}
