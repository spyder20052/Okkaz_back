/**
 * @module modules/auth/auth.routes
 * @description Définition des routes /api/v1/auth (§4.1).
 */

import { Router } from 'express';
import * as controller from './auth.controller';
import * as schemas from './auth.validator';
import { validateRequest } from '../../middlewares/validateRequest';
import { authLimiter } from '../../middlewares/rateLimit';
import { authenticate } from '../../middlewares/authenticate';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.post(
  '/register',
  authLimiter,
  validateRequest({ body: schemas.registerSchema }),
  asyncHandler(controller.register),
);

router.post(
  '/login',
  authLimiter,
  validateRequest({ body: schemas.loginSchema }),
  asyncHandler(controller.login),
);

router.post(
  '/oauth/google',
  authLimiter,
  validateRequest({ body: schemas.googleAuthSchema }),
  asyncHandler(controller.googleAuth),
);

router.post(
  '/refresh-token',
  validateRequest({ body: schemas.refreshTokenSchema }),
  asyncHandler(controller.refresh),
);

router.post('/logout', authenticate, asyncHandler(controller.logout));

router.get(
  '/verify-email/:token',
  validateRequest({ params: schemas.verifyEmailParamsSchema }),
  asyncHandler(controller.verifyEmail),
);

router.post(
  '/forgot-password',
  authLimiter,
  validateRequest({ body: schemas.forgotPasswordSchema }),
  asyncHandler(controller.forgotPassword),
);

router.post(
  '/reset-password/:token',
  validateRequest({ params: schemas.resetPasswordParamsSchema, body: schemas.resetPasswordSchema }),
  asyncHandler(controller.resetPassword),
);

export default router;
