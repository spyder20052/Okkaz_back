/**
 * @module modules/kyc/kyc.controller
 * @description Contrôleurs HTTP du module KYC (§4.3).
 */

import type { Request, Response } from 'express';
import * as service from './kyc.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';
import type { KycDocumentType } from '@prisma/client';

interface MulterFiles {
  front_file?: Express.Multer.File[];
  back_file?: Express.Multer.File[];
}

/**
 * `POST /kyc/upload` — Soumet un document KYC pour validation.
 *
 * Fichiers (multipart) : `front_file` (obligatoire), `back_file` (optionnel).
 * Body : `{ documentType }` (`ID_CARD`, `PASSPORT`, `DRIVER_LICENSE`).
 *
 * @param req - Requiert `req.user` (SELLER/SELLER_PRO). Fichiers dans `req.files`.
 * @param res - 201 Created avec `{ document }`.
 * @throws {AppError} 400 si le fichier recto est manquant.
 */
export async function upload(req: Request, res: Response): Promise<Response> {
  const files = req.files as MulterFiles | undefined;
  const front = files?.front_file?.[0];
  const back = files?.back_file?.[0];
  if (!front) throw AppError.badRequest('MISSING_FRONT_FILE', 'Le fichier recto est requis.');

  const doc = await service.uploadKyc(
    req.user!.id,
    req.body.documentType as KycDocumentType,
    front,
    back,
  );
  return sendCreated(res, { document: doc }, 'Document KYC soumis pour validation.');
}

/**
 * `GET /kyc/status` — Récupère le statut KYC de l'utilisateur connecté.
 *
 * @param req - Requiert `req.user` (SELLER/SELLER_PRO).
 * @param res - 200 OK avec `{ kycStatus, latestDocument }`.
 */
export async function myStatus(req: Request, res: Response): Promise<Response> {
  const data = await service.getMyKycStatus(req.user!.id);
  return sendSuccess(res, data);
}

/**
 * `GET /kyc/admin/list` — Liste les documents KYC (admin uniquement, paginé).
 *
 * @param req - Query params : `{ status?, page?, limit? }`.
 * @param res - 200 OK avec les documents paginés.
 */
export async function list(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.listKyc(req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

/**
 * `PATCH /kyc/admin/:kyc_id/approve` — Approuve un document KYC (admin).
 *
 * @param req - Param `:kyc_id` (UUID). Requiert `req.user` (ADMIN).
 * @param res - 200 OK avec `{ document }`.
 */
export async function approve(req: Request, res: Response): Promise<Response> {
  const doc = await service.approveKyc(req.params.kyc_id!, req.user!.id);
  return sendSuccess(res, { document: doc }, 'KYC approuvé.');
}

/**
 * `PATCH /kyc/admin/:kyc_id/reject` — Rejette un document KYC (admin).
 *
 * @param req - Param `:kyc_id` + body `{ rejectionReason }`. Requiert `req.user` (ADMIN).
 * @param res - 200 OK avec `{ document }`.
 */
export async function reject(req: Request, res: Response): Promise<Response> {
  const doc = await service.rejectKyc(req.params.kyc_id!, req.user!.id, req.body.rejectionReason);
  return sendSuccess(res, { document: doc }, 'KYC rejeté.');
}
