/**
 * @module modules/listings/listings.validator
 * @description Schémas Zod pour les annonces (§4.5).
 */

import { z } from 'zod';

/** Expression régulière pour numéros de téléphone : 8 à 15 chiffres, préfixe + optionnel. */
const phoneRegex = /^\+?\d{8,15}$/;

/**
 * Schéma de validation du body pour `POST /listings`.
 *
 * @property title             - Titre (5-255 caractères).
 * @property description       - Description (10-5000 caractères).
 * @property categoryId        - UUID de la catégorie.
 * @property rentalPrice       - Prix de location (positif).
 * @property rentalPeriod      - Période : `DAY`, `WEEK`, `MONTH`.
 * @property condition         - État : `NEW`, `GOOD`, `FAIR`.
 * @property locationCity      - Ville (2-100 caractères).
 * @property locationAddress   - Adresse optionnelle (max 500).
 * @property contactPhone      - Numéro de contact (validé par regex).
 * @property purchasePrice     - Prix d'achat optionnel.
 * @property isLoa             - Option LOA (booléen, optionnel).
 * @property loaDurationMonths - Durée LOA en mois.
 */
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

/** Schéma de modification partielle d'une annonce. Tous les champs sont optionnels. */
export const updateListingSchema = createListingSchema.partial();

/** Param de route `:id` (UUID de l'annonce). */
export const listingIdParamSchema = z.object({ id: z.string().uuid() });
/** Params de route pour suppression de photo : `:id` + `:photo_id`. */
export const photoIdParamSchema = z.object({ id: z.string().uuid(), photo_id: z.string().uuid() });

/**
 * Schéma de validation des query params pour `GET /listings`.
 *
 * Fourchette de prix : les deux bornes sont refusées si elles sont négatives
 * ou non numériques, et `minPrice` ne peut pas dépasser `maxPrice` — sinon le
 * filtre renverrait silencieusement une liste vide.
 *
 * @property categoryId - Filtre par catégorie (UUID).
 * @property city       - Filtre par ville.
 * @property minPrice / maxPrice - Fourchette de prix (≥ 0, min ≤ max).
 * @property isLoa      - Filtre LOA.
 * @property sort       - Tri : `recent`, `price_asc`, `price_desc`, `featured`.
 * @property q          - Recherche textuelle (max 100).
 * @property page/limit - Pagination.
 */
export const listListingsQuerySchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    city: z.string().optional(),
    minPrice: z.coerce
      .number({ invalid_type_error: 'Le prix minimum doit être un nombre.' })
      .min(0, 'Le prix minimum ne peut pas être négatif.')
      .optional(),
    maxPrice: z.coerce
      .number({ invalid_type_error: 'Le prix maximum doit être un nombre.' })
      .min(0, 'Le prix maximum ne peut pas être négatif.')
      .optional(),
    isLoa: z.coerce.boolean().optional(),
    sort: z.enum(['recent', 'price_asc', 'price_desc', 'featured']).default('recent'),
    q: z.string().max(100).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.minPrice !== undefined &&
      value.maxPrice !== undefined &&
      value.minPrice > value.maxPrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minPrice'],
        message: 'Le prix minimum ne peut pas dépasser le prix maximum.',
      });
    }
  });

/**
 * Schéma pour l'upload de photos. `coverIndex` désigne la couverture.
 */
export const uploadPhotosSchema = z.object({
  coverIndex: z.coerce.number().int().min(0).optional(),
});
