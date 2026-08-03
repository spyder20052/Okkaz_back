/**
 * @module modules/payments/payments.routes
 * @description Routes de paiements (§4.6).
 *
 * | Méthode | Chemin                           | Rôle(s)  | Description                   |
 * |---------|----------------------------------|----------|-------------------------------|
 * | POST    | /webhook                         | Public   | Webhook KKiapay (HMAC)        |
 * | GET     | /:payment_id/status              | Auth     | Statut d'un paiement          |
 */

import { Router } from 'express';
import * as controller from './payments.controller';
import * as schemas from './payments.validator';
import { authenticate } from '../../middlewares/authenticate';
import { validateRequest } from '../../middlewares/validateRequest';
import { webhookSignature } from '../../middlewares/webhookSignature';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// Webhook public protégé par vérification du secret KKiapay (cf. §5.1).
router.post('/webhook', webhookSignature('x-kkiapay-secret'), asyncHandler(controller.webhook));

router.get(
  '/:payment_id/status',
  authenticate,
  validateRequest({ params: schemas.paymentIdParamSchema }),
  asyncHandler(controller.paymentStatus),
);

export default router;
