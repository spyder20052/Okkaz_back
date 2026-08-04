/**
 * @module modules/listings/listings.routes
 */

import { Router } from 'express';
import * as controller from './listings.controller';
import * as schemas from './listings.validator';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { upload } from '../../middlewares/upload';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get('/', validateRequest({ query: schemas.listListingsQuerySchema }), asyncHandler(controller.list));
router.get('/featured', asyncHandler(controller.featured));
router.get('/:id', validateRequest({ params: schemas.listingIdParamSchema }), asyncHandler(controller.detail));

// Consultation ouverte à tout compte consommateur : un vendeur peut aussi louer
// (cahier des charges : « création de compte obligatoire pour toute action »).
router.post(
  '/:id/contact',
  authenticate,
  authorize('SELLER', 'SELLER_PRO', 'ADMIN'),
  validateRequest({ params: schemas.listingIdParamSchema }),
  asyncHandler(controller.revealContact),
);

router.post(
  '/',
  authenticate,
  authorize('SELLER', 'SELLER_PRO', 'ADMIN'),
  validateRequest({ body: schemas.createListingSchema }),
  asyncHandler(controller.create),
);
router.patch(
  '/:id',
  authenticate,
  authorize('SELLER', 'SELLER_PRO', 'ADMIN'),
  validateRequest({ params: schemas.listingIdParamSchema, body: schemas.updateListingSchema }),
  asyncHandler(controller.update),
);
router.delete(
  '/:id',
  authenticate,
  authorize('SELLER', 'SELLER_PRO', 'ADMIN'),
  validateRequest({ params: schemas.listingIdParamSchema }),
  asyncHandler(controller.remove),
);

router.post(
  '/:id/photos',
  authenticate,
  authorize('SELLER', 'SELLER_PRO', 'ADMIN'),
  validateRequest({ params: schemas.listingIdParamSchema }),
  upload.array('photos', 20),
  asyncHandler(controller.uploadPhotos),
);
router.delete(
  '/:id/photos/:photo_id',
  authenticate,
  authorize('SELLER', 'SELLER_PRO', 'ADMIN'),
  validateRequest({ params: schemas.photoIdParamSchema }),
  asyncHandler(controller.deletePhoto),
);

router.patch(
  '/:id/pause',
  authenticate,
  authorize('SELLER', 'SELLER_PRO', 'ADMIN'),
  validateRequest({ params: schemas.listingIdParamSchema }),
  asyncHandler(controller.pause),
);
router.patch(
  '/:id/resume',
  authenticate,
  authorize('SELLER', 'SELLER_PRO', 'ADMIN'),
  validateRequest({ params: schemas.listingIdParamSchema }),
  asyncHandler(controller.resume),
);

export default router;
