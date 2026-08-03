import type { Request, Response } from 'express';
import * as service from './demands.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/apiResponse';

/**
 * `POST /demands` — Initie une demande avec paiement.
 *
 * @param req - Body : `{ categoryId, title, description, maxBudget?, city, type, propertyValue?, method, provider? }`.
 * @param res - 201 Created avec `{ demand, payment }`.
 */
export async function initiate(req: Request, res: Response): Promise<Response> {
  const result = await service.initiate({ userId: req.user!.id, ...req.body });
  return sendCreated(res, result, 'Demande initiée, paiement requis.');
}

/**
 * `GET /demands/pro` — Demandes actives pour SELLER_PRO (STANDARD + EXPRESS).
 *
 * @param req - Query params de pagination. Requiert `req.user` (SELLER_PRO).
 * @param res - 200 OK avec items paginés.
 */
export async function listPro(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.listForPro(req.user!.id, req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

/**
 * `GET /demands` — Demandes STANDARD actives (public).
 *
 * @param req - Query params de pagination.
 * @param res - 200 OK avec items paginés.
 */
export async function listStandard(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.listStandard(req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

/**
 * `GET /demands/:id` — Détail d'une demande.
 *
 * @param req - Param `:id` (UUID). Requiert `req.user` pour contrôle d'accès Express.
 * @param res - 200 OK avec `{ demand }`.
 */
export async function detail(req: Request, res: Response): Promise<Response> {
  const demand = await service.getDetail(req.params.id!, req.user!.role);
  return sendSuccess(res, { demand });
}

/**
 * `GET /demands/mine` — Demandes de l'utilisateur connecté.
 *
 * @param req - Query params de pagination. Requiert `req.user`.
 * @param res - 200 OK avec items paginés.
 */
export async function mine(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.listMine(req.user!.id, req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

/**
 * `PATCH /demands/:id/close` — Clôture une demande.
 *
 * @param req - Param `:id` (UUID). Requiert `req.user`.
 * @param res - 200 OK avec `{ demand }`.
 */
export async function close(req: Request, res: Response): Promise<Response> {
  const demand = await service.close(req.params.id!, req.user!.id, req.user!.role);
  return sendSuccess(res, { demand }, 'Demande clôturée.');
}
