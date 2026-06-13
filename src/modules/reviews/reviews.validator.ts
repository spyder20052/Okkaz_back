import { z } from 'zod';

/**
 * @module modules/reviews/reviews.validator
 * @description Schémas Zod pour les avis (§4.9).
 */

/**
 * Schéma de création d'un avis.
 * - `rating` : Entier de 1 à 5.
 * - `comment` : Texte optionnel (max 2000 caractères).
 */
export const createReviewSchema = z.object({
  listingId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

/** Paramètre URL `:listing_id` (UUID de l'annonce). */
export const listingIdParamSchema = z.object({ listing_id: z.string().uuid() });
/** Paramètre URL `:id` (UUID de l'avis). */
export const reviewIdParamSchema = z.object({ id: z.string().uuid() });

/** Corps de modération d'un avis : `{ isModerated }`. */
export const moderateReviewSchema = z.object({ isModerated: z.boolean() });
