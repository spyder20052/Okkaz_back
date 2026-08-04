/**
 * @module modules/categories/categories.routes
 */

import { Router } from 'express';
import * as controller from './categories.controller';
import * as schemas from './categories.validator';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(controller.list));
router.get('/:slug', validateRequest({ params: schemas.categorySlugParamSchema }), asyncHandler(controller.detail));

router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validateRequest({ body: schemas.createCategorySchema }),
  asyncHandler(controller.create),
);
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validateRequest({ params: schemas.categoryIdParamSchema, body: schemas.updateCategorySchema }),
  asyncHandler(controller.update),
);
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validateRequest({ params: schemas.categoryIdParamSchema }),
  asyncHandler(controller.remove),
);

export default router;
