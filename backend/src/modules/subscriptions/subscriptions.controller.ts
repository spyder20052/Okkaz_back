import type { Request, Response } from 'express';
import * as service from './subscriptions.service';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';

/**
 * `GET /subscriptions/plans` — Retourne les plans d'abonnement disponibles.
 *
 * @param _req - Aucun paramètre requis.
 * @param res  - 200 OK avec `{ plans }`.
 */
export async function plans(_req: Request, res: Response): Promise<Response> {
  const list = await service.getPlans();
  return sendSuccess(res, { plans: list });
}

/**
 * `POST /subscriptions` — Initie un abonnement SELLER_PRO.
 *
 * @param req - Body : `{ plan, method, provider? }`.
 * @param res - 201 Created avec `{ payment, plan }`.
 */
export async function subscribe(req: Request, res: Response): Promise<Response> {
  const result = await service.subscribe({
    userId: req.user!.id,
    plan: req.body.plan,
    method: req.body.method,
    provider: req.body.provider,
  });
  return sendCreated(res, result, 'Souscription initiée.');
}

/**
 * `GET /subscriptions/me` — Abonnement courant de l'utilisateur.
 *
 * @param req - Requiert `req.user`.
 * @param res - 200 OK avec `{ subscription }`.
 */
export async function me(req: Request, res: Response): Promise<Response> {
  const subscription = await service.getMine(req.user!.id);
  return sendSuccess(res, { subscription });
}

/**
 * `DELETE /subscriptions/cancel` — Désactive le renouvellement automatique.
 *
 * @param req - Requiert `req.user`.
 * @param res - 200 OK avec `{ subscription }`.
 */
export async function cancel(req: Request, res: Response): Promise<Response> {
  const subscription = await service.cancelAutoRenew(req.user!.id);
  return sendSuccess(res, { subscription }, 'Renouvellement automatique désactivé.');
}
