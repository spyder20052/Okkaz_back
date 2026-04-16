/**
 * @module modules/payments/payments.controller
 */

import type { Request, Response } from 'express';
import * as service from './payments.service';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';

export async function initiateContactAccess(req: Request, res: Response): Promise<Response> {
  const result = await service.initiateContactAccess({
    userId: req.user!.id,
    listingId: req.body.listingId,
    method: req.body.method,
    provider: req.body.provider,
  });
  return sendCreated(res, result, 'Paiement initié.');
}

export async function webhook(req: Request, res: Response): Promise<Response> {
  await service.handleWebhook(req.body);
  return sendSuccess(res, { received: true });
}

export async function paymentStatus(req: Request, res: Response): Promise<Response> {
  const payment = await service.getPaymentStatus(req.params.payment_id!, req.user!.id);
  return sendSuccess(res, { payment });
}

export async function contactAccess(req: Request, res: Response): Promise<Response> {
  const data = await service.getContactAccess(req.user!.id, req.params.listing_id!);
  return sendSuccess(res, data);
}
