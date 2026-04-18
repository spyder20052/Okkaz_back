import { z } from 'zod';

/**
 * @module modules/reports/reports.validator
 * @description Schémas Zod pour les signalements (§4.8).
 */

/**
 * Schéma de création d'un signalement.
 * Au moins `reportedUserId` ou `listingId` est requis.
 */
export const createReportSchema = z
  .object({
    reportedUserId: z.string().uuid().optional(),
    listingId: z.string().uuid().optional(),
    reason: z.enum(['FRAUD', 'WRONG_INFO', 'INAPPROPRIATE', 'NO_RESPONSE', 'OTHER']),
    description: z.string().max(2000).optional(),
  })
  .refine((v) => Boolean(v.reportedUserId || v.listingId), {
    message: 'reportedUserId ou listingId est requis.',
    path: ['reportedUserId'],
  });

/** Schéma de query pour lister les signalements (admin). */
export const listReportsQuerySchema = z.object({
  status: z.enum(['OPEN', 'REVIEWED', 'CLOSED']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/** Paramètre URL `:id` (UUID du signalement). */
export const reportIdParamSchema = z.object({ id: z.string().uuid() });

/** Schéma pour traiter un signalement (admin : REVIEWED | CLOSED). */
export const reviewReportSchema = z.object({
  status: z.enum(['REVIEWED', 'CLOSED']),
  adminNote: z.string().max(2000).optional(),
});
