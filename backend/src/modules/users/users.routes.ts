/**
 * @module modules/users/users.routes
 * @description Routes /api/v1/users (§4.2).
 */

import { Router } from 'express';
import * as controller from './users.controller';
import * as schemas from './users.validator';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get('/me', authenticate, asyncHandler(controller.getMe));
router.patch(
  '/me',
  authenticate,
  validateRequest({ body: schemas.updateProfileSchema }),
  asyncHandler(controller.updateMe),
);
router.patch(
  '/me/password',
  authenticate,
  validateRequest({ body: schemas.changePasswordSchema }),
  asyncHandler(controller.changePassword),
);

router.get('/me/listings', authenticate, authorize('SELLER', 'SELLER_PRO'), asyncHandler(controller.getMyListings));
// Un vendeur peut aussi consulter des contacts : historique ouvert à tous les rôles consommateurs.
router.get('/me/contact-reveals', authenticate, authorize('BUYER', 'SELLER', 'SELLER_PRO', 'ADMIN'), asyncHandler(controller.getMyContactReveals));
router.get('/me/payments', authenticate, asyncHandler(controller.getMyPayments));

router.get(
  '/:id/public',
  validateRequest({ params: schemas.userIdParamSchema }),
  asyncHandler(controller.getPublic),
);

export default router;
