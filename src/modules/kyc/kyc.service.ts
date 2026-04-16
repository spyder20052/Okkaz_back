/**
 * @module modules/kyc/kyc.service
 * @description Logique métier KYC (§4.3, §6.5).
 *   - Upload d'une pièce d'identité → entrée PENDING.
 *   - Validation admin → kyc_status=APPROVED, libère la publication d'annonces.
 *   - Rejet admin → motif obligatoire, statut utilisateur inchangé.
 */

import { KycDocumentStatus, KycDocumentType, KycStatus, UserStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { uploadAsset } from '../../services/storage.service';

export async function uploadKyc(
  userId: string,
  documentType: KycDocumentType,
  frontFile: Express.Multer.File,
  backFile?: Express.Multer.File,
) {
  const front = await uploadAsset(frontFile, `kyc/${userId}`);
  const back = backFile ? await uploadAsset(backFile, `kyc/${userId}`) : null;

  const doc = await prisma.$transaction(async (tx) => {
    const created = await tx.kycDocument.create({
      data: {
        userId,
        documentType,
        frontUrl: front.url,
        backUrl: back?.url ?? null,
        status: KycDocumentStatus.PENDING,
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { kycStatus: KycStatus.PENDING },
    });
    return created;
  });

  logger.info({ userId, kycId: doc.id }, '🟢 KYC submitted');
  return doc;
}

export async function getMyKycStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kycStatus: true },
  });
  const latest = await prisma.kycDocument.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return { kycStatus: user?.kycStatus ?? KycStatus.NONE, latestDocument: latest };
}

export async function listKyc(query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const status = (query.status as KycDocumentStatus | undefined) ?? undefined;

  const where = status ? { status } : {};

  const [items, total] = await Promise.all([
    prisma.kycDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, status: true } },
      },
    }),
    prisma.kycDocument.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function approveKyc(kycId: string, adminId: string) {
  const doc = await prisma.kycDocument.findUnique({ where: { id: kycId } });
  if (!doc) throw AppError.notFound('KYC_NOT_FOUND', 'Document KYC introuvable.');
  if (doc.status !== KycDocumentStatus.PENDING) {
    throw AppError.conflict('KYC_NOT_PENDING', 'Document déjà traité.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const d = await tx.kycDocument.update({
      where: { id: kycId },
      data: {
        status: KycDocumentStatus.APPROVED,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });
    await tx.user.update({
      where: { id: doc.userId },
      data: { kycStatus: KycStatus.APPROVED, status: UserStatus.ACTIVE },
    });
    return d;
  });

  logger.info({ kycId, userId: doc.userId, adminId }, '🟢 KYC approved');
  return updated;
}

export async function rejectKyc(kycId: string, adminId: string, rejectionReason: string) {
  const doc = await prisma.kycDocument.findUnique({ where: { id: kycId } });
  if (!doc) throw AppError.notFound('KYC_NOT_FOUND', 'Document KYC introuvable.');
  if (doc.status !== KycDocumentStatus.PENDING) {
    throw AppError.conflict('KYC_NOT_PENDING', 'Document déjà traité.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const d = await tx.kycDocument.update({
      where: { id: kycId },
      data: {
        status: KycDocumentStatus.REJECTED,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason,
      },
    });
    await tx.user.update({
      where: { id: doc.userId },
      data: { kycStatus: KycStatus.REJECTED },
    });
    return d;
  });

  logger.info({ kycId, userId: doc.userId, adminId }, '🟢 KYC rejected');
  return updated;
}

/** Garde utilisé par le module Listings : vérifie le KYC avant publication. */
export async function assertUserKycApproved(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { kycStatus: true } });
  if (!user) throw AppError.notFound('USER_NOT_FOUND', 'Utilisateur introuvable.');
  if (user.kycStatus !== KycStatus.APPROVED) {
    throw AppError.forbidden(
      'KYC_NOT_APPROVED',
      "Votre KYC doit être approuvé avant de publier une annonce.",
    );
  }
}
