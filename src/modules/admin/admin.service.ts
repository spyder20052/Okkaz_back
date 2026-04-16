/**
 * @module modules/admin/admin.service
 * @description Opérations administratives (§4.11, §4.12).
 */

import { KycStatus, ListingStatus, PaymentStatus, Prisma, ReportStatus, UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { invalidateSettingsCache } from '../../services/settings.service';

// --- Users ------------------------------------------------------------------

export async function listUsers(query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(query.role ? { role: query.role as UserRole } : {}),
    ...(query.status ? { status: query.status as UserStatus } : {}),
    ...(query.kycStatus ? { kycStatus: query.kycStatus as KycStatus } : {}),
    ...(query.q
      ? {
          OR: [
            { email: { contains: String(query.q), mode: 'insensitive' } },
            { phone: { contains: String(query.q), mode: 'insensitive' } },
            { firstName: { contains: String(query.q), mode: 'insensitive' } },
            { lastName: { contains: String(query.q), mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        kycStatus: true,
        reportsCount: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      kycDocuments: { orderBy: { createdAt: 'desc' }, take: 5 },
      listings: { take: 10, orderBy: { createdAt: 'desc' } },
      payments: { take: 10, orderBy: { createdAt: 'desc' } },
      subscriptions: { take: 5, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!user) throw AppError.notFound('USER_NOT_FOUND', 'Utilisateur introuvable.');
  return user;
}

export async function setUserStatus(id: string, status: UserStatus, _reason?: string) {
  await assertUserExists(id);
  logger.info({ userId: id, status }, '🟢 Admin: user status updated');
  return prisma.user.update({ where: { id }, data: { status } });
}

export async function setUserRole(id: string, role: UserRole) {
  await assertUserExists(id);
  logger.info({ userId: id, role }, '🟢 Admin: user role updated');
  return prisma.user.update({ where: { id }, data: { role } });
}

async function assertUserExists(id: string): Promise<void> {
  const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw AppError.notFound('USER_NOT_FOUND', 'Utilisateur introuvable.');
}

// --- Listings ---------------------------------------------------------------

export async function listAllListings(query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const where: Prisma.ListingWhereInput = {
    ...(query.status ? { status: query.status as ListingStatus } : {}),
    ...(query.userId ? { userId: String(query.userId) } : {}),
    ...(query.categoryId ? { categoryId: String(query.categoryId) } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.listing.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function validateListing(id: string, adminId: string) {
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('LISTING_NOT_FOUND', 'Annonce introuvable.');
  return prisma.listing.update({
    where: { id },
    data: {
      status: ListingStatus.ACTIVE,
      validatedBy: adminId,
      validatedAt: new Date(),
      rejectionReason: null,
    },
  });
}

export async function rejectListing(id: string, adminId: string, reason: string) {
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('LISTING_NOT_FOUND', 'Annonce introuvable.');
  return prisma.listing.update({
    where: { id },
    data: {
      status: ListingStatus.REJECTED,
      validatedBy: adminId,
      validatedAt: new Date(),
      rejectionReason: reason,
    },
  });
}

export async function deleteListing(id: string): Promise<void> {
  await prisma.listing.delete({ where: { id } }).catch(() => {
    throw AppError.notFound('LISTING_NOT_FOUND', 'Annonce introuvable.');
  });
}

// --- Payments ---------------------------------------------------------------

export async function listPayments(query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const where: Prisma.PaymentWhereInput = {
    ...(query.type ? { type: query.type as Prisma.PaymentWhereInput['type'] } : {}),
    ...(query.status ? { status: query.status as PaymentStatus } : {}),
    ...(query.method ? { method: query.method as Prisma.PaymentWhereInput['method'] } : {}),
    ...(query.userId ? { userId: String(query.userId) } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          createdAt: {
            ...(query.dateFrom ? { gte: new Date(String(query.dateFrom)) } : {}),
            ...(query.dateTo ? { lte: new Date(String(query.dateTo)) } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    }),
    prisma.payment.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta(page, limit, total) };
}

// --- Settings ---------------------------------------------------------------

export async function listSettings() {
  return prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
}

export async function updateSetting(key: string, value: string, adminId: string) {
  const updated = await prisma.systemSetting.upsert({
    where: { key },
    update: { value, updatedBy: adminId },
    create: { key, value, updatedBy: adminId },
  });
  invalidateSettingsCache();
  return updated;
}

// --- Dashboard --------------------------------------------------------------

export async function getDashboardStats() {
  const [
    totalUsers,
    totalListings,
    totalActiveListings,
    totalTransactions,
    totalRevenueAgg,
    pendingKycCount,
    pendingListingsCount,
    openReportsCount,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.listing.count({ where: { deletedAt: null } }),
    prisma.listing.count({ where: { deletedAt: null, status: ListingStatus.ACTIVE } }),
    prisma.payment.count({ where: { status: PaymentStatus.SUCCESS } }),
    prisma.payment.aggregate({ where: { status: PaymentStatus.SUCCESS }, _sum: { amount: true } }),
    prisma.kycDocument.count({ where: { status: 'PENDING' } }),
    prisma.listing.count({ where: { status: ListingStatus.PENDING } }),
    prisma.report.count({ where: { status: ReportStatus.OPEN } }),
  ]);

  return {
    totalUsers,
    totalListings,
    totalActiveListings,
    totalTransactions,
    totalRevenue: Number(totalRevenueAgg._sum.amount ?? 0),
    pendingKycCount,
    pendingListingsCount,
    openReportsCount,
  };
}

export async function getRevenue(params: { period: 'day' | 'week' | 'month' | 'year'; from?: string; to?: string }) {
  const from = params.from ? new Date(params.from) : new Date(Date.now() - 30 * 86400_000);
  const to = params.to ? new Date(params.to) : new Date();

  const truncUnit = params.period === 'day' ? 'day' : params.period === 'week' ? 'week' : params.period === 'month' ? 'month' : 'year';

  // Groupement par période via date_trunc.
  const rows = await prisma.$queryRawUnsafe<Array<{ bucket: Date; amount: number }>>(
    `SELECT date_trunc($1, created_at) AS bucket, SUM(amount)::float AS amount
     FROM payments
     WHERE status = 'SUCCESS' AND created_at BETWEEN $2 AND $3
     GROUP BY bucket
     ORDER BY bucket ASC`,
    truncUnit,
    from,
    to,
  );
  return rows.map((r) => ({ date: r.bucket, amount: Number(r.amount) }));
}

export async function getUsersGrowth(params: { period: 'day' | 'week' | 'month' | 'year'; from?: string; to?: string }) {
  const from = params.from ? new Date(params.from) : new Date(Date.now() - 30 * 86400_000);
  const to = params.to ? new Date(params.to) : new Date();
  const truncUnit = params.period === 'day' ? 'day' : params.period === 'week' ? 'week' : params.period === 'month' ? 'month' : 'year';

  const rows = await prisma.$queryRawUnsafe<Array<{ bucket: Date; count: number }>>(
    `SELECT date_trunc($1, created_at) AS bucket, COUNT(*)::int AS count
     FROM users
     WHERE deleted_at IS NULL AND created_at BETWEEN $2 AND $3
     GROUP BY bucket
     ORDER BY bucket ASC`,
    truncUnit,
    from,
    to,
  );
  return rows.map((r) => ({ date: r.bucket, count: Number(r.count) }));
}

export async function getTopListings() {
  return prisma.listing.findMany({
    where: { status: ListingStatus.ACTIVE, deletedAt: null },
    orderBy: [{ contactsCount: 'desc' }, { viewsCount: 'desc' }],
    take: 10,
    select: { id: true, title: true, slug: true, viewsCount: true, contactsCount: true, userId: true },
  });
}

export async function getTopCategories() {
  const rows = await prisma.listing.groupBy({
    by: ['categoryId'],
    where: { status: ListingStatus.ACTIVE, deletedAt: null },
    _count: { _all: true },
    orderBy: { _count: { categoryId: 'desc' } },
    take: 10,
  });

  const catIds = rows.map((r) => r.categoryId);
  const cats = await prisma.category.findMany({ where: { id: { in: catIds } } });
  const map = new Map(cats.map((c) => [c.id, c]));
  return rows.map((r) => ({
    category: map.get(r.categoryId) ?? null,
    count: r._count._all,
  }));
}
