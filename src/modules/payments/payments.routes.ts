/**
 * @module modules/payments/payments.routes
 * @description Routes de paiements et accès contacts (§4.6, §5.3).
 *
 * | Méthode | Chemin                           | Rôle(s)  | Description                   |
 * |---------|----------------------------------|----------|-------------------------------|
 * | POST    | /initiate-contact-access         | BUYER    | Initie un paiement contact    |
 * | POST    | /webhook                         | Public   | Webhook KKiapay (HMAC)        |
 * | GET     | /contact-access/:listing_id      | BUYER    | Récupère le contact révélé    |
 * | GET     | /:payment_id/status              | Auth     | Statut d'un paiement          |
 */

import { Router } from 'express';
import * as controller from './payments.controller';
import * as schemas from './payments.validator';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { webhookSignature } from '../../middlewares/webhookSignature';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.post(
  '/initiate-contact-access',
  authenticate,
  authorize('BUYER'),
  validateRequest({ body: schemas.initiateContactAccessSchema }),
  asyncHandler(controller.initiateContactAccess),
);

// Webhook public protégé par signature HMAC (cf. §5.1).
router.post('/webhook', webhookSignature('x-kkiapay-signature'), asyncHandler(controller.webhook));

router.get(
  '/contact-access/:listing_id',
  authenticate,
  authorize('BUYER'),
  validateRequest({ params: schemas.listingIdParamSchema }),
  asyncHandler(controller.contactAccess),
);

router.get(
  '/:payment_id/status',
  authenticate,
  validateRequest({ params: schemas.paymentIdParamSchema }),
  asyncHandler(controller.paymentStatus),
);

export default router;
