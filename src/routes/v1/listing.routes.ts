/**
 * @module listingRoutes
 * @description Routes des annonces — /api/v1/listings
 *
 * @author Spynel KOUTON
 */

import { Router } from 'express';
import * as listingController from '../../controllers/listing.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createListingSchema,
  updateListingSchema,
  listingQuerySchema,
} from '../../validators/listing.validator';

const router = Router();

router.get('/', validate({ query: listingQuerySchema }), listingController.getAll);
router.get('/:id', listingController.getOne);
router.post('/', authenticate, validate({ body: createListingSchema }), listingController.create);
router.patch('/:id', authenticate, validate({ body: updateListingSchema }), listingController.update);
router.delete('/:id', authenticate, listingController.remove);

export default router;
