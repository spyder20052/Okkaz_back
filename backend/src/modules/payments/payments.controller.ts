/**
 * @module modules/payments/payments.controller
 */

import type { Request, Response } from 'express';
import * as service from './payments.service';
import { sendSuccess } from '../../utils/apiResponse';

/**
 * `POST /payments/webhook` — Webhook KKiapay (signature HMAC vérifiée en middleware).
 *
 * @param req - Body brut du webhook.
 * @param res - 200 OK (toujours, idempotent).
 */
export async function webhook(req: Request, res: Response): Promise<Response> {
  await service.handleWebhook(req.body);
  return sendSuccess(res, { received: true });
}

/**
 * `GET /payments/:payment_id/status` — Statut d'un paiement.
 *
 * @param req - Param `:payment_id` (UUID). Requiert `req.user`.
 * @param res - 200 OK avec `{ payment }`.
 */
export async function paymentStatus(req: Request, res: Response): Promise<Response> {
  const payment = await service.getPaymentStatus(req.params.payment_id!, req.user!.id);
  return sendSuccess(res, { payment });
}
