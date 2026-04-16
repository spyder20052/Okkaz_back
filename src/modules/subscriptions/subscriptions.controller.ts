import type { Request, Response } from 'express';
import * as service from './subscriptions.service';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';

export async function plans(_req: Request, res: Response): Promise<Response> {
  const list = await service.getPlans();
  return sendSuccess(res, { plans: list });
}

export async function subscribe(req: Request, res: Response): Promise<Response> {
  const result = await service.subscribe({
    userId: req.user!.id,
    plan: req.body.plan,
    method: req.body.method,
    provider: req.body.provider,
  });
  return sendCreated(res, result, 'Souscription initiée.');
}

export async function me(req: Request, res: Response): Promise<Response> {
  const subscription = await service.getMine(req.user!.id);
  return sendSuccess(res, { subscription });
}

export async function cancel(req: Request, res: Response): Promise<Response> {
  const subscription = await service.cancelAutoRenew(req.user!.id);
  return sendSuccess(res, { subscription }, 'Renouvellement automatique désactivé.');
}
