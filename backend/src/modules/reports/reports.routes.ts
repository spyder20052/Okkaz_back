/**
 * @module modules/reports/reports.routes
 * @description Routes des signalements (§4.8, §6.2).
 *
 * | Méthode | Chemin              | Rôle(s) | Description                    |
 * |---------|---------------------|---------|--------------------------------|
 * | POST    | /                   | Auth    | Créer un signalement           |
 * | GET     | /admin/list         | ADMIN   | Liste paginée des signalements |
 * | GET     | /admin/:id          | ADMIN   | Détail d'un signalement        |
 * | PATCH   | /admin/:id/review   | ADMIN   | Traiter un signalement         |
 */
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
  authorize('BUYER', 'SELLER', 'SELLER_PRO'),
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
