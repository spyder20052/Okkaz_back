import type { Request, Response } from 'express';
import * as service from './demands.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/apiResponse';

export async function initiate(req: Request, res: Response): Promise<Response> {
  const result = await service.initiate({ userId: req.user!.id, ...req.body });
  return sendCreated(res, result, 'Demande initiée, paiement requis.');
}

export async function listPro(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.listForPro(req.user!.id, req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

export async function listStandard(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.listStandard(req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

export async function detail(req: Request, res: Response): Promise<Response> {
  const demand = await service.getDetail(req.params.id!, req.user!.role);
  return sendSuccess(res, { demand });
}

export async function mine(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.listMine(req.user!.id, req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

export async function close(req: Request, res: Response): Promise<Response> {
  const demand = await service.close(req.params.id!, req.user!.id, req.user!.role);
  return sendSuccess(res, { demand }, 'Demande clôturée.');
}
