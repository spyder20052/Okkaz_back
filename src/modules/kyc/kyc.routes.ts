/**
 * @module modules/kyc/kyc.routes
 * @description Routes /api/v1/kyc (§4.3).
 */

import { Router } from 'express';
import * as controller from './kyc.controller';
import * as schemas from './kyc.validator';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { upload } from '../../middlewares/upload';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.post(
  '/upload',
  authenticate,
  authorize('SELLER', 'SELLER_PRO'),
  upload.fields([
    { name: 'front_file', maxCount: 1 },
    { name: 'back_file', maxCount: 1 },
  ]),
  validateRequest({ body: schemas.uploadKycSchema }),
  asyncHandler(controller.upload),
);

router.get('/status', authenticate, authorize('SELLER', 'SELLER_PRO'), asyncHandler(controller.myStatus));

router.get(
  '/admin/list',
  authenticate,
  authorize('ADMIN'),
  validateRequest({ query: schemas.listKycQuerySchema }),
  asyncHandler(controller.list),
);

router.patch(
  '/admin/:kyc_id/approve',
  authenticate,
  authorize('ADMIN'),
  validateRequest({ params: schemas.kycIdParamSchema }),
  asyncHandler(controller.approve),
);

router.patch(
  '/admin/:kyc_id/reject',
  authenticate,
  authorize('ADMIN'),
  validateRequest({ params: schemas.kycIdParamSchema, body: schemas.rejectKycSchema }),
  asyncHandler(controller.reject),
);

export default router;
