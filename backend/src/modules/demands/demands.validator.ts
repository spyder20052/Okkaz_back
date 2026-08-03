import { z } from 'zod';

/**
 * @module modules/demands/demands.validator
 * @description Schémas Zod pour les demandes (§4.10).
 */

/**
 * Schéma d'initiation d'une demande.
 * - `type` STANDARD (défaut) ou EXPRESS.
 * - `propertyValue` requis pour EXPRESS (calcul du prix).
 */
export const initiateDemandSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(5).max(255),
  description: z.string().min(10).max(5000),
  maxBudget: z.coerce.number().positive().optional(),
  city: z.string().min(2).max(100),
  type: z.enum(['STANDARD', 'EXPRESS']).default('STANDARD'),
  propertyValue: z.coerce.number().positive().optional(),
  method: z.enum(['MOBILE_MONEY', 'CARD']),
  provider: z.string().max(50).optional(),
});

/** Paramètre URL `:id` (UUID de la demande). */
export const demandIdParamSchema = z.object({ id: z.string().uuid() });

/** Query de pagination pour la liste des demandes. */
export const listDemandsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
