/**
 * @module modules/listings/listings.validator
 * @description Schémas Zod pour les annonces (§4.5).
 */

import { z } from 'zod';

const phoneRegex = /^\+?\d{8,15}$/;

export const createListingSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(10).max(5000),
  categoryId: z.string().uuid(),
  rentalPrice: z.coerce.number().positive(),
  rentalPeriod: z.enum(['DAY', 'WEEK', 'MONTH']),
  condition: z.enum(['NEW', 'GOOD', 'FAIR']),
  locationCity: z.string().min(2).max(100),
  locationAddress: z.string().max(500).optional(),
  contactPhone: z.string().regex(phoneRegex, 'Numéro de contact invalide.'),
  purchasePrice: z.coerce.number().positive().optional(),
  isLoa: z.boolean().optional(),
  loaDurationMonths: z.coerce.number().int().positive().optional(),
});

export const updateListingSchema = createListingSchema.partial();

export const listingIdParamSchema = z.object({ id: z.string().uuid() });
export const photoIdParamSchema = z.object({ id: z.string().uuid(), photo_id: z.string().uuid() });

export const listListingsQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  city: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  isLoa: z.coerce.boolean().optional(),
  sort: z.enum(['recent', 'price_asc', 'price_desc', 'featured']).default('recent'),
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const uploadPhotosSchema = z.object({
  coverIndex: z.coerce.number().int().min(0).optional(),
});
