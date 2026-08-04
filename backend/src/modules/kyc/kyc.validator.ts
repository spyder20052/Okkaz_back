/**
 * @module modules/kyc/kyc.validator
 * @description Schémas Zod pour le module KYC (§4.3).
 */

import { z } from 'zod';

/**
 * Schéma de validation du body pour `POST /kyc/upload`.
 *
 * @property documentType - Type de document : `ID_CARD`, `PASSPORT` ou `DRIVER_LICENSE`.
 */
export const uploadKycSchema = z.object({
  documentType: z.enum(['ID_CARD', 'PASSPORT', 'DRIVER_LICENSE']),
});

/**
 * Schéma de validation des query params pour `GET /kyc/admin/list`.
 *
 * @property status - Filtre par statut (`PENDING`, `APPROVED`, `REJECTED`).
 * @property page   - Numéro de page (min 1).
 * @property limit  - Résultats par page (1-100).
 */
export const listKycQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/** Schéma de validation du param de route `:kyc_id` (UUID). */
export const kycIdParamSchema = z.object({ kyc_id: z.string().uuid() });

/**
 * Schéma de validation du body pour `PATCH /kyc/admin/:kyc_id/reject`.
 *
 * @property rejectionReason - Motif de rejet (5-500 caractères).
 */
export const rejectKycSchema = z.object({
  rejectionReason: z.string().min(5).max(500),
});
