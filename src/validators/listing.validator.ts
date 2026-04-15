/**
 * @module listingValidator
 * @description Schémas de validation Zod pour les annonces.
 *
 * @dependencies zod
 * @author Spynel KOUTON
 */

import { z } from 'zod';

export const createListingSchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères.').max(150),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères.'),
  categoryId: z.string().uuid('Identifiant de catégorie invalide.'),
  price: z.number().positive('Le prix doit être positif.'),
  city: z.string().min(1, 'La ville est requise.'),
  address: z.string().optional(),
  conditions: z.string().optional(),
  photos: z.array(z.string().url()).max(4, 'Maximum 4 photos pour un compte gratuit.').optional(),
});

export const updateListingSchema = createListingSchema.partial();

export const listingQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().uuid().optional(),
  city: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  sort: z.enum(['price_asc', 'price_desc', 'date_asc', 'date_desc']).default('date_desc'),
});
