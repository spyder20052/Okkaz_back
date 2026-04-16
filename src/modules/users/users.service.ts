/**
 * @module modules/users/users.service
 * @description Logique métier du module Utilisateurs (§4.2).
 */

import bcrypt from 'bcrypt';
import { ListingStatus, UserStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  kycStatus: true,
  profilePhotoUrl: true,
  city: true,
  isEmailVerified: true,
  createdAt: true,
} as const;

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...PUBLIC_USER_SELECT, address: true, reportsCount: true, lastLoginAt: true },
  });
  if (!user) throw AppError.notFound('USER_NOT_FOUND', 'Utilisateur introuvable.');
  return user;
}

export async function updateMe(
  userId: string,
  data: { firstName?: string; lastName?: string; city?: string; address?: string; profilePhotoUrl?: string },
) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: PUBLIC_USER_SELECT,
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('USER_NOT_FOUND', 'Utilisateur introuvable.');

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw AppError.badRequest('INVALID_CURRENT_PASSWORD', 'Mot de passe actuel invalide.');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function getPublicProfile(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null, status: { not: UserStatus.BLOCKED } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      profilePhotoUrl: true,
      city: true,
      createdAt: true,
    },
  });
  if (!user) throw AppError.notFound('USER_NOT_FOUND', 'Utilisateur introuvable.');

  const [activeListings, avgRating] = await Promise.all([
    prisma.listing.findMany({
      where: { userId, status: ListingStatus.ACTIVE, deletedAt: null },
      select: { id: true, title: true, slug: true, rentalPrice: true, rentalPeriod: true, locationCity: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.review.aggregate({
      where: { listing: { userId } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  return {
    ...user,
    ratingAverage: avgRating._avg.rating ?? 0,
    ratingCount: avgRating._count._all,
    activeListings,
  };
}

export async function getMyListings(userId: string, query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { photos: { take: 1, orderBy: { sortOrder: 'asc' } }, category: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.listing.count({ where: { userId, deletedAt: null } }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function getMyContactAccesses(userId: string, query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    prisma.contactAccess.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        listing: { select: { id: true, title: true, slug: true } },
        payment: { select: { id: true, status: true, amount: true, method: true, provider: true } },
      },
    }),
    prisma.contactAccess.count({ where: { userId } }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function getMyPayments(userId: string, query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where: { userId } }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}
