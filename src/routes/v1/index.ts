/**
 * @module v1Routes
 * @description Agrégateur des routes API v1.
 *
 * @author Spynel KOUTON
 */

import { Router } from 'express';
import authRoutes from './auth.routes';
import listingRoutes from './listing.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/listings', listingRoutes);

export default router;
