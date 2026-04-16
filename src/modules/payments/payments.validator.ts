/**
 * @module modules/payments/payments.validator
 * @description Schémas Zod pour les paiements (§4.6).
 */

import { z } from 'zod';

export const initiateContactAccessSchema = z.object({
  listingId: z.string().uuid(),
  method: z.enum(['MOBILE_MONEY', 'CARD']),
  provider: z.string().max(50).optional(),
});

export const paymentIdParamSchema = z.object({ payment_id: z.string().uuid() });
export const listingIdParamSchema = z.object({ listing_id: z.string().uuid() });
