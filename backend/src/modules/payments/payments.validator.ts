/**
 * @module modules/payments/payments.validator
 * @description Schémas Zod pour les paiements (§4.6).
 */

import { z } from 'zod';

/** Paramètre URL `:payment_id` (UUID). */
export const paymentIdParamSchema = z.object({ payment_id: z.string().uuid() });
