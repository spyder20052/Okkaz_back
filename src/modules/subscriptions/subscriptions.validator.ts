import { z } from 'zod';

/**
 * @module modules/subscriptions/subscriptions.validator
 * @description Schémas Zod pour les abonnements (§4.7).
 */

/**
 * Schéma de validation pour la souscription d'un abonnement.
 * - `plan` : Plan choisi (WEEKLY | MONTHLY).
 * - `method` : Méthode de paiement.
 * - `provider` : Fournisseur optionnel.
 */
export const subscribeSchema = z.object({
  plan: z.enum(['WEEKLY', 'MONTHLY']),
  method: z.enum(['MOBILE_MONEY', 'CARD']),
  provider: z.string().max(50).optional(),
});
