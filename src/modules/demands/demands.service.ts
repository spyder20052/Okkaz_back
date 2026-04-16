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

export async function listForPro(userId: string, query: Record<string, unknown>) {
  return listActive(query, { onlyProVisible: true, userId });
}

export async function listStandard(query: Record<string, unknown>) {
  return listActive(query, { onlyProVisible: false });
}

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

export async function close(id: string, userId: string, role: UserRole) {
  const demand = await prisma.demandListing.findUnique({ where: { id } });
  if (!demand) throw AppError.notFound('DEMAND_NOT_FOUND', 'Demande introuvable.');
  if (demand.userId !== userId && role !== UserRole.ADMIN) {
    throw AppError.forbidden('NOT_OWNER', "Vous n'êtes pas propriétaire de cette demande.");
  }
  return prisma.demandListing.update({ where: { id }, data: { status: DemandStatus.CLOSED } });
}
