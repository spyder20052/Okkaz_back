import { Router } from 'express';
import * as controller from './reports.controller';
import * as schemas from './reports.validator';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.post(
  '/',
  authenticate,
  validateRequest({ body: schemas.createReportSchema }),
  asyncHandler(controller.create),
);
router.get(
  '/admin/list',
  authenticate,
  authorize('ADMIN'),
  validateRequest({ query: schemas.listReportsQuerySchema }),
  asyncHandler(controller.list),
);
router.get(
  '/admin/:id',
  authenticate,
  authorize('ADMIN'),
  validateRequest({ params: schemas.reportIdParamSchema }),
  asyncHandler(controller.detail),
);
router.patch(
  '/admin/:id/review',
  authenticate,
  authorize('ADMIN'),
  validateRequest({ params: schemas.reportIdParamSchema, body: schemas.reviewReportSchema }),
  asyncHandler(controller.review),
);

export default router;
