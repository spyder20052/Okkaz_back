/**
 * @module modules/demands/demands.service
 * @description Annonces « Je recherche » (§4.10).
 *   Prix : STANDARD = 2 500 FCFA ; EXPRESS = max(5 000 FCFA, 3% de la valeur).
 *   L'entrée est créée en statut ACTIVE uniquement après webhook SUCCESS.
 *   Durée par défaut : 30 jours.
 */

import { randomUUID } from 'crypto';
import {
  DemandStatus,
  DemandType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { getSettingNumber } from '../../services/settings.service';

const DEMAND_DURATION_DAYS = 30;

/**
 * Initie une demande "Je recherche" avec paiement.
 *
 * Transactionnel : crée un `Payment PENDING` + une `DemandListing` en statut `CLOSED`
 * (sera passée ACTIVE par le webhook après paiement réussi).
 *
 * Prix : STANDARD = 2 500 FCFA ; EXPRESS = max(5 000 FCFA, 3% de la valeur).
 *
 * @param input - `{ userId, categoryId, title, description, maxBudget?, city, type, propertyValue?, method, provider? }`.
 * @returns `{ demand, payment }` — référence de paiement.
 * @throws {AppError} 400 si la catégorie est invalide.
 */
export async function initiate(input: {
  userId: string;
  categoryId: string;
  title: string;
  description: string;
  maxBudget?: number;
  city: string;
  type: DemandType;
  propertyValue?: number;
  method: PaymentMethod;
  provider?: string;
}) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId, isActive: true } });
  if (!category) throw AppError.badRequest('INVALID_CATEGORY', 'Catégorie invalide.');

  const amount = await computePrice(input.type, input.propertyValue);
  const providerRef = `dmd_${randomUUID()}`;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DEMAND_DURATION_DAYS);

  const { payment, demand } = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        userId: input.userId,
        type: input.type === DemandType.EXPRESS ? PaymentType.EXPRESS_DEMAND : PaymentType.DEMAND_LISTING,
        amount: new Prisma.Decimal(amount),
        currency: 'XOF',
        method: input.method,
        provider: input.provider ?? null,
        providerRef,
        status: PaymentStatus.PENDING,
        metadata: { demandType: input.type },
      },
    });

    const d = await tx.demandListing.create({
      data: {
        userId: input.userId,
        categoryId: input.categoryId,
        title: input.title,
        description: input.description,
        maxBudget: input.maxBudget != null ? new Prisma.Decimal(input.maxBudget) : null,
        city: input.city,
        type: input.type,
        isUrgent: input.type === DemandType.EXPRESS,
        paymentId: p.id,
        status: DemandStatus.CLOSED, // En attente de paiement → réactivée par le webhook.
        expiresAt,
      },
    });

    return { payment: p, demand: d };
  });

  logger.info({ demandId: demand.id, userId: input.userId, type: input.type }, '🟢 Demand initiated');

  return {
    demand,
    payment: {
      id: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      providerRef: payment.providerRef!,
    },
  };
}

/**
 * Calcule le prix d'une demande selon son type.
 *
 * - `STANDARD` : prix fixe depuis `settings_service`.
 * - `EXPRESS`  : max(prix minimum, `propertyValue` × pourcentage).
 *
 * @param type          - Type de demande (STANDARD | EXPRESS).
 * @param propertyValue - Valeur du bien (optionnel, utilisé pour EXPRESS).
 * @returns Le montant en FCFA.
 * @private
 */
async function computePrice(type: DemandType, propertyValue?: number): Promise<number> {
  if (type === DemandType.STANDARD) {
    return getSettingNumber('demand_listing_price', 2500);
  }
  const [minPrice, percent] = await Promise.all([
    getSettingNumber('express_demand_min_price', 5000),
    getSettingNumber('express_demand_percent', 3),
  ]);
  if (!propertyValue) return minPrice;
  return Math.max(minPrice, Math.round((propertyValue * percent) / 100));
}

/**
 * Liste les demandes actives visibles par un SELLER_PRO (STANDARD + EXPRESS).
 *
 * @param userId - ID du SELLER_PRO consultant.
 * @param query  - Params de pagination `{ page?, limit? }`.
 * @returns `{ items, meta }`.
 */
export async function listForPro(userId: string, query: Record<string, unknown>) {
  return listActive(query, { onlyProVisible: true, userId });
}

/**
 * Liste les demandes STANDARD actives (visibles par tous).
 *
 * @param query - Params de pagination `{ page?, limit? }`.
 * @returns `{ items, meta }`.
 */
export async function listStandard(query: Record<string, unknown>) {
  return listActive(query, { onlyProVisible: false });
}

/**
 * Fonction interne : liste les demandes actives avec filtres optionnels.
 *
 * @param query - Params de pagination.
 * @param opts  - `{ onlyProVisible, userId? }`.
 * @private
 */
async function listActive(query: Record<string, unknown>, opts: { onlyProVisible: boolean; userId?: string }) {
  const { page, limit, skip } = parsePagination(query);

  const where: Prisma.DemandListingWhereInput = {
    status: DemandStatus.ACTIVE,
    expiresAt: { gt: new Date() },
    ...(opts.onlyProVisible ? {} : { type: DemandType.STANDARD }),
  };

  const [items, total] = await Promise.all([
    prisma.demandListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { category: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.demandListing.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta(page, limit, total) };
}

/**
 * Détail d'une demande avec contrôle d'accès Express.
 *
 * Les demandes EXPRESS ne sont visibles que par les SELLER_PRO et ADMIN.
 *
 * @param id         - UUID de la demande.
 * @param viewerRole - Rôle de l'utilisateur consultant.
 * @returns La demande avec catégorie et infos utilisateur.
 * @throws {AppError} 404 si introuvable.
 * @throws {AppError} 403 si EXPRESS et viewer non-PRO.
 */
export async function getDetail(id: string, viewerRole: UserRole) {
  const demand = await prisma.demandListing.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, phone: true, city: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!demand) throw AppError.notFound('DEMAND_NOT_FOUND', 'Demande introuvable.');
  if (demand.type === DemandType.EXPRESS && viewerRole !== UserRole.SELLER_PRO && viewerRole !== UserRole.ADMIN) {
    throw AppError.forbidden('EXPRESS_PRO_ONLY', "Les demandes Express sont réservées aux SELLER_PRO.");
  }
  return demand;
}

/**
 * Liste les demandes de l'utilisateur connecté.
 *
 * @param userId - ID de l'utilisateur.
 * @param query  - Params de pagination.
 * @returns `{ items, meta }`.
 */
export async function listMine(userId: string, query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    prisma.demandListing.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { category: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.demandListing.count({ where: { userId } }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

/**
 * Clôture une demande (par le propriétaire ou un admin).
 *
 * @param id     - UUID de la demande.
 * @param userId - ID de l'utilisateur.
 * @param role   - Rôle de l'utilisateur.
 * @returns La demande mise à jour.
 * @throws {AppError} 404 si introuvable.
 * @throws {AppError} 403 si non-propriétaire et non-admin.
 */
export async function close(id: string, userId: string, role: UserRole) {
  const demand = await prisma.demandListing.findUnique({ where: { id } });
  if (!demand) throw AppError.notFound('DEMAND_NOT_FOUND', 'Demande introuvable.');
  if (demand.userId !== userId && role !== UserRole.ADMIN) {
    throw AppError.forbidden('NOT_OWNER', "Vous n'êtes pas propriétaire de cette demande.");
  }
  return prisma.demandListing.update({ where: { id }, data: { status: DemandStatus.CLOSED } });
}
