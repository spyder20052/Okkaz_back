/**
 * @module modules/categories/categories.validator
 * @description Schémas Zod pour les catégories (§4.4).
 */

import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  iconUrl: z.string().url().max(500).optional(),
  parentId: z.string().uuid().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const categoryIdParamSchema = z.object({ id: z.string().uuid() });
export const categorySlugParamSchema = z.object({ slug: z.string().min(1) });
