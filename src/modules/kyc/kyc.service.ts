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

/**
 * Soumet un document KYC (pièce d'identité) pour validation admin.
 *
 * Flux transactionnel :
 * 1. Upload le recto (et verso optionnel) vers le stockage distant.
 * 2. Crée un `KycDocument` en statut `PENDING`.
 * 3. Met à jour le `kycStatus` de l'utilisateur à `PENDING`.
 *
 * @param userId       - ID de l'utilisateur SELLER.
 * @param documentType - Type de document (`ID_CARD`, `PASSPORT`, `DRIVER_LICENSE`).
 * @param frontFile    - Fichier recto (multer, obligatoire).
 * @param backFile     - Fichier verso (multer, optionnel).
 * @returns Le document KYC créé avec statut `PENDING`.
 */
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

/**
 * Récupère le statut KYC courant de l'utilisateur et son dernier document.
 *
 * @param userId - ID de l'utilisateur.
 * @returns `{ kycStatus, latestDocument }` — statut global et dernier document soumis.
 */
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

/**
 * Liste les documents KYC (panneau admin), avec pagination et filtre par statut.
 *
 * @param query - Query string : `{ status?, page?, limit? }`.
 * @returns `{ items, meta }` — documents paginés avec infos utilisateur.
 */
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

/**
 * Approuve un document KYC (admin uniquement).
 *
 * Transactionnel : met à jour le document + active le compte utilisateur.
 *
 * @param kycId   - UUID du document KYC.
 * @param adminId - ID de l'admin approbateur.
 * @returns Le document KYC mis à jour.
 * @throws {AppError} 404 si document introuvable.
 * @throws {AppError} 409 si document déjà traité.
 */
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

/**
 * Rejette un document KYC avec motif obligatoire (admin uniquement).
 *
 * Transactionnel : met à jour le document + passe `kycStatus` à `REJECTED`.
 *
 * @param kycId           - UUID du document KYC.
 * @param adminId         - ID de l'admin.
 * @param rejectionReason - Motif du rejet (5-500 caractères).
 * @returns Le document KYC mis à jour.
 * @throws {AppError} 404 si document introuvable.
 * @throws {AppError} 409 si document déjà traité.
 */
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

/**
 * Garde utilisé par le module Listings : vérifie que le KYC est approuvé
 * avant d'autoriser la publication d'une annonce.
 *
 * @param userId - ID de l'utilisateur.
 * @throws {AppError} 404 si l'utilisateur n'existe pas.
 * @throws {AppError} 403 si le KYC n'est pas approuvé.
 */
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
