/**
 * @module modules/payments/payments.controller
 */

import type { Request, Response } from 'express';
import * as service from './payments.service';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';

/**
 * `POST /payments/contact-access` — Initie un paiement pour accéder au contact.
 *
 * @param req - Body : `{ listingId, method, provider? }`.
 * @param res - 201 Created avec `{ payment, checkoutHint }`.
 */
export async function initiateContactAccess(req: Request, res: Response): Promise<Response> {
  const result = await service.initiateContactAccess({
    userId: req.user!.id,
    listingId: req.body.listingId,
    method: req.body.method,
    provider: req.body.provider,
  });
  return sendCreated(res, result, 'Paiement initié.');
}

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

/**
 * `GET /payments/contact/:listing_id` — Accès au contact révélé d'une annonce.
 *
 * @param req - Param `:listing_id` (UUID). Requiert `req.user`.
 * @param res - 200 OK avec `{ contactPhone, watermark, expiresAt }`.
 */
export async function contactAccess(req: Request, res: Response): Promise<Response> {
  const data = await service.getContactAccess(req.user!.id, req.params.listing_id!);
  return sendSuccess(res, data);
}
