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

export async function myStatus(req: Request, res: Response): Promise<Response> {
  const data = await service.getMyKycStatus(req.user!.id);
  return sendSuccess(res, data);
}

export async function list(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.listKyc(req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

export async function approve(req: Request, res: Response): Promise<Response> {
  const doc = await service.approveKyc(req.params.kyc_id!, req.user!.id);
  return sendSuccess(res, { document: doc }, 'KYC approuvé.');
}

export async function reject(req: Request, res: Response): Promise<Response> {
  const doc = await service.rejectKyc(req.params.kyc_id!, req.user!.id, req.body.rejectionReason);
  return sendSuccess(res, { document: doc }, 'KYC rejeté.');
}
