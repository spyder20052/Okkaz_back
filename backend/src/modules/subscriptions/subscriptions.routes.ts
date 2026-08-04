/**
 * @module modules/subscriptions/subscriptions.routes
 * @description Routes d'abonnements Premium SELLER_PRO (§4.7).
 *
 * | Méthode | Chemin      | Rôle(s)              | Description                     |
 * |---------|-------------|----------------------|---------------------------------|
 * | GET     | /plans      | Public               | Plans disponibles               |
 * | POST    | /subscribe  | Tout compte          | Souscription                    |
 * | GET     | /me         | Tout compte          | Mon abonnement                  |
 * | POST    | /cancel     | Tout compte          | Désactive le renouvellement     |
 */
import { Router } from 'express';
import * as controller from './subscriptions.controller';
import * as schemas from './subscriptions.validator';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get('/plans', asyncHandler(controller.plans));
router.post(
  '/subscribe',
  authenticate,
  authorize('SELLER', 'SELLER_PRO', 'ADMIN'),
  validateRequest({ body: schemas.subscribeSchema }),
  asyncHandler(controller.subscribe),
);
router.get('/me', authenticate, authorize('SELLER', 'SELLER_PRO', 'ADMIN'), asyncHandler(controller.me));
router.post('/cancel', authenticate, authorize('SELLER', 'SELLER_PRO', 'ADMIN'), asyncHandler(controller.cancel));

export default router;
