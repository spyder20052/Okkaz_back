import { Router } from 'express';
import * as controller from './demands.controller';
import * as schemas from './demands.validator';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.post(
  '/initiate',
  authenticate,
  authorize('BUYER'),
  validateRequest({ body: schemas.initiateDemandSchema }),
  asyncHandler(controller.initiate),
);

router.get('/', authenticate, authorize('SELLER_PRO'), asyncHandler(controller.listPro));
router.get('/standard', authenticate, authorize('SELLER', 'SELLER_PRO'), asyncHandler(controller.listStandard));

router.get('/me', authenticate, authorize('BUYER'), asyncHandler(controller.mine));
router.get(
  '/:id',
  authenticate,
  authorize('SELLER', 'SELLER_PRO', 'ADMIN'),
  validateRequest({ params: schemas.demandIdParamSchema }),
  asyncHandler(controller.detail),
);
router.patch(
  '/:id/close',
  authenticate,
  authorize('BUYER', 'ADMIN'),
  validateRequest({ params: schemas.demandIdParamSchema }),
  asyncHandler(controller.close),
);

export default router;
