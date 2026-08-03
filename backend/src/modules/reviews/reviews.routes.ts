import { Router } from 'express';
import * as controller from './reviews.controller';
import * as schemas from './reviews.validator';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize('BUYER', 'SELLER', 'SELLER_PRO', 'ADMIN'),
  validateRequest({ body: schemas.createReviewSchema }),
  asyncHandler(controller.create),
);

router.get(
  '/listing/:listing_id',
  validateRequest({ params: schemas.listingIdParamSchema }),
  asyncHandler(controller.forListing),
);

router.patch(
  '/:id/moderate',
  authenticate,
  authorize('ADMIN'),
  validateRequest({ params: schemas.reviewIdParamSchema, body: schemas.moderateReviewSchema }),
  asyncHandler(controller.moderate),
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validateRequest({ params: schemas.reviewIdParamSchema }),
  asyncHandler(controller.remove),
);

export default router;
