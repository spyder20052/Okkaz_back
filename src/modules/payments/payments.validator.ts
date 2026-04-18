/**
 * @module modules/payments/payments.validator
 * @description Schémas Zod pour les paiements (§4.6).
 */

import { z } from 'zod';

/**
 * Schéma de validation pour l'initiation d'un accès contact.
 * - `listingId` : UUID de l'annonce cible.
 * - `method` : Méthode de paiement (MOBILE_MONEY | CARD).
 * - `provider` : Fournisseur optionnel (max 50 caractères).
 */
export const initiateContactAccessSchema = z.object({
  listingId: z.string().uuid(),
  method: z.enum(['MOBILE_MONEY', 'CARD']),
  provider: z.string().max(50).optional(),
});

/** Paramètre URL `:payment_id` (UUID). */
export const paymentIdParamSchema = z.object({ payment_id: z.string().uuid() });
/** Paramètre URL `:listing_id` (UUID). */
export const listingIdParamSchema = z.object({ listing_id: z.string().uuid() });
