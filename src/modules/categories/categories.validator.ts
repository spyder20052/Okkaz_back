/**
 * @module modules/categories/categories.validator
 * @description Schémas Zod pour les catégories (§4.4).
 */

import { z } from 'zod';

/**
 * Schéma de validation du body pour `POST /categories`.
 *
 * @property name        - Nom de la catégorie (2-100 caractères).
 * @property slug        - Slug URL-friendly unique (`[a-z0-9-]+`).
 * @property description - Description optionnelle (max 500).
 * @property iconUrl     - URL optionnelle de l'icône.
 * @property parentId    - UUID de la catégorie parente (optionnel).
 * @property sortOrder   - Ordre de tri (entier >= 0).
 */
export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  iconUrl: z.string().url().max(500).optional(),
  parentId: z.string().uuid().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/**
 * Schéma de validation du body pour `PATCH /categories/:id`.
 * Tous les champs sont optionnels, plus `isActive`.
 */
export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

/** Param de route `:id` (UUID de la catégorie). */
export const categoryIdParamSchema = z.object({ id: z.string().uuid() });
/** Param de route `:slug`. */
export const categorySlugParamSchema = z.object({ slug: z.string().min(1) });
