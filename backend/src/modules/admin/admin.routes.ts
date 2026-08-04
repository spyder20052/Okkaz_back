/**
 * @module modules/admin/admin.routes
 * @description Routes /api/v1/admin et /api/v1/admin/dashboard (§4.11, §4.12).
 */

import { Router } from 'express';
import * as controller from './admin.controller';
import * as schemas from './admin.validator';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// Toutes les routes admin exigent ADMIN.
router.use(authenticate, authorize('ADMIN'));

// Users
router.get('/users', validateRequest({ query: schemas.listUsersQuerySchema }), asyncHandler(controller.listUsers));
router.get('/users/:id', validateRequest({ params: schemas.userIdParamSchema }), asyncHandler(controller.getUser));
router.patch(
  '/users/:id/suspend',
  validateRequest({ params: schemas.userIdParamSchema, body: schemas.reasonBodySchema }),
  asyncHandler(controller.suspend),
);
router.patch(
  '/users/:id/block',
  validateRequest({ params: schemas.userIdParamSchema, body: schemas.reasonBodySchema }),
  asyncHandler(controller.block),
);
router.patch(
  '/users/:id/activate',
  validateRequest({ params: schemas.userIdParamSchema }),
  asyncHandler(controller.activate),
);
router.patch(
  '/users/:id/role',
  validateRequest({ params: schemas.userIdParamSchema, body: schemas.updateRoleSchema }),
  asyncHandler(controller.updateRole),
);

// Listings
router.get('/listings', validateRequest({ query: schemas.listAdminListingsQuerySchema }), asyncHandler(controller.listListings));
router.patch('/listings/:id/validate', validateRequest({ params: schemas.listingIdParamSchema }), asyncHandler(controller.validateListing));
router.patch(
  '/listings/:id/reject',
  validateRequest({ params: schemas.listingIdParamSchema, body: schemas.rejectionBodySchema }),
  asyncHandler(controller.rejectListing),
);
router.delete('/listings/:id', validateRequest({ params: schemas.listingIdParamSchema }), asyncHandler(controller.deleteListing));

// Payments
router.get('/payments', validateRequest({ query: schemas.listPaymentsQuerySchema }), asyncHandler(controller.listPayments));

// Settings
router.get('/settings', asyncHandler(controller.listSettings));
router.patch(
  '/settings/:key',
  validateRequest({ params: schemas.settingKeyParamSchema, body: schemas.updateSettingSchema }),
  asyncHandler(controller.updateSetting),
);

// Dashboard
router.get('/dashboard/stats', asyncHandler(controller.dashboardStats));
router.get('/dashboard/revenue', validateRequest({ query: schemas.revenueQuerySchema }), asyncHandler(controller.dashboardRevenue));
router.get('/dashboard/users-growth', validateRequest({ query: schemas.revenueQuerySchema }), asyncHandler(controller.dashboardUsersGrowth));
router.get('/dashboard/top-listings', asyncHandler(controller.dashboardTopListings));
router.get('/dashboard/top-categories', asyncHandler(controller.dashboardTopCategories));

export default router;
