/**
 * @module modules/kyc/kyc.validator
 * @description Schémas Zod pour le module KYC (§4.3).
 */

import { z } from 'zod';

export const uploadKycSchema = z.object({
  documentType: z.enum(['ID_CARD', 'PASSPORT', 'DRIVER_LICENSE']),
});

export const listKycQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const kycIdParamSchema = z.object({ kyc_id: z.string().uuid() });

export const rejectKycSchema = z.object({
  rejectionReason: z.string().min(5).max(500),
});
