/**
 * @module modules/reports/reports.service
 * @description Signalements (§4.8, §6.2).
 *   Règle clé : à N signalements (default 5), le compte signalé passe en
 *   SUSPENDED. Implémenté côté service (transaction) plutôt que trigger DB
 *   pour rester portable et testable.
 */

import { Prisma, ReportReason, ReportStatus, UserStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { getSettingNumber } from '../../services/settings.service';

export async function createReport(input: {
  reporterId: string;
  reportedUserId?: string;
  listingId?: string;
  reason: ReportReason;
  description?: string;
}) {
  // Résout reportedUserId à partir du listing si nécessaire.
  let targetUserId = input.reportedUserId ?? null;
  if (!targetUserId && input.listingId) {
    const listing = await prisma.listing.findUnique({ where: { id: input.listingId }, select: { userId: true } });
    if (!listing) throw AppError.notFound('LISTING_NOT_FOUND', 'Annonce introuvable.');
    targetUserId = listing.userId;
  }
  if (targetUserId && targetUserId === input.reporterId) {
    throw AppError.badRequest('CANNOT_REPORT_SELF', 'Vous ne pouvez pas vous signaler vous-même.');
  }

  const threshold = await getSettingNumber('max_reports_before_suspend', 5);

  const report = await prisma.$transaction(async (tx) => {
    const created = await tx.report.create({
      data: {
        reporterId: input.reporterId,
        reportedUserId: targetUserId,
        listingId: input.listingId ?? null,
        reason: input.reason,
        description: input.description ?? null,
        status: ReportStatus.OPEN,
      },
    });

    if (targetUserId) {
      const updated = await tx.user.update({
        where: { id: targetUserId },
        data: { reportsCount: { increment: 1 } },
        select: { id: true, reportsCount: true, status: true },
      });
      if (updated.status !== UserStatus.BLOCKED && updated.reportsCount >= threshold && updated.status !== UserStatus.SUSPENDED) {
        await tx.user.update({ where: { id: updated.id }, data: { status: UserStatus.SUSPENDED } });
        logger.warn({ userId: updated.id, reportsCount: updated.reportsCount }, '⚠ Auto-suspension');
      }
    }
    return created;
  });

  logger.info({ reportId: report.id, reporterId: input.reporterId }, '🟢 Report created');
  return report;
}

export async function listForAdmin(query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const where: Prisma.ReportWhereInput = query.status ? { status: query.status as ReportStatus } : {};

  const [items, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        reporter: { select: { id: true, email: true, firstName: true, lastName: true } },
        reportedUser: { select: { id: true, email: true, firstName: true, lastName: true, status: true, reportsCount: true } },
        listing: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function getForAdmin(id: string) {
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      reporter: { select: { id: true, email: true, firstName: true, lastName: true } },
      reportedUser: true,
      listing: true,
      reviewer: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });
  if (!report) throw AppError.notFound('REPORT_NOT_FOUND', 'Signalement introuvable.');
  return report;
}

export async function review(id: string, adminId: string, data: { status: ReportStatus; adminNote?: string }) {
  const existing = await prisma.report.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('REPORT_NOT_FOUND', 'Signalement introuvable.');
  return prisma.report.update({
    where: { id },
    data: { status: data.status, adminNote: data.adminNote ?? null, reviewedBy: adminId },
  });
}
