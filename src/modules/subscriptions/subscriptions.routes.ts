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
  authorize('SELLER', 'SELLER_PRO'),
  validateRequest({ body: schemas.subscribeSchema }),
  asyncHandler(controller.subscribe),
);
router.get('/me', authenticate, authorize('SELLER', 'SELLER_PRO'), asyncHandler(controller.me));
router.post('/cancel', authenticate, authorize('SELLER', 'SELLER_PRO'), asyncHandler(controller.cancel));

export default router;
