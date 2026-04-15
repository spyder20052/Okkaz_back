/**
 * @module authRoutes
 * @description Routes d'authentification — /api/v1/auth
 *
 * @author Spynel KOUTON
 */

import { Router } from 'express';
import * as authController from '../../controllers/auth.controller';
import { validate } from '../../middleware/validate';
import { registerSchema, loginSchema, refreshTokenSchema } from '../../validators/auth.validator';

const router = Router();

router.post('/register', validate({ body: registerSchema }), authController.register);
router.post('/login', validate({ body: loginSchema }), authController.login);
router.post('/refresh', validate({ body: refreshTokenSchema }), authController.refresh);

export default router;
