/**
 * @module modules/users/users.service
 * @description Logique métier du module Utilisateurs (§4.2).
 */

import bcrypt from 'bcrypt';
import { KycStatus, ListingStatus, UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';

/** Sélection publique d'un utilisateur (jamais de `passwordHash`). @private */
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

/**
 * Récupère le profil complet de l'utilisateur connecté.
 *
 * @param userId - ID de l'utilisateur.
 * @returns Profil utilisateur (avec `address`, `reportsCount`).
 * @throws {AppError} 404 si l'utilisateur n'existe pas.
 */
export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...PUBLIC_USER_SELECT, address: true, reportsCount: true, lastLoginAt: true },
  });
  if (!user) throw AppError.notFound('USER_NOT_FOUND', 'Utilisateur introuvable.');
  return user;
}

/**
 * Met à jour les informations de profil de l'utilisateur connecté.
 *
 * @param userId - ID de l'utilisateur.
 * @param data   - Champs modifiables : `firstName`, `lastName`, `city`, `address`, `profilePhotoUrl`.
 * @returns Le profil mis à jour.
 */
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

/**
 * Active le mode vendeur sur un compte acheteur.
 *
 * Un BUYER peut devenir SELLER en libre-service : il devra ensuite passer
 * la vérification d'identité (KYC) avant de pouvoir publier, exactement
 * comme un vendeur inscrit directement. Les autres rôles sont refusés.
 *
 * @param userId - ID de l'utilisateur.
 * @returns Le profil mis à jour (role SELLER, status PENDING_KYC).
 * @throws {AppError} 404 si l'utilisateur n'existe pas.
 * @throws {AppError} 409 si le compte est déjà vendeur (ou admin).
 */
export async function becomeSeller(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, kycStatus: true } });
  if (!user) throw AppError.notFound('USER_NOT_FOUND', 'Utilisateur introuvable.');
  if (user.role !== UserRole.BUYER) {
    throw AppError.conflict('ALREADY_SELLER', 'Ce compte peut déjà publier des annonces.');
  }
  return prisma.user.update({
    where: { id: userId },
    data: {
      role: UserRole.SELLER,
      // Même parcours qu'une inscription vendeur : KYC requis avant publication.
      ...(user.kycStatus !== KycStatus.APPROVED ? { status: UserStatus.PENDING_KYC } : {}),
    },
    select: PUBLIC_USER_SELECT,
  });
}

/**
 * Change le mot de passe de l'utilisateur.
 *
 * Vérifie l'ancien password par bcrypt, hash le nouveau,
 * et invalide toutes les sessions actives (refresh tokens).
 *
 * @param userId          - ID de l'utilisateur.
 * @param currentPassword - Mot de passe actuel.
 * @param newPassword     - Nouveau mot de passe.
 * @throws {AppError} 404 si l'utilisateur n'existe pas.
 * @throws {AppError} 400 si le mot de passe actuel est invalide.
 */
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('USER_NOT_FOUND', 'Utilisateur introuvable.');

  // Compte créé via Google : pas de mot de passe local à changer.
  if (!user.passwordHash) {
    throw AppError.badRequest(
      'PASSWORD_NOT_SET',
      'Ce compte utilise la connexion Google et n\'a pas de mot de passe local.',
    );
  }

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

/**
 * Récupère le profil public d'un utilisateur (visible par tous).
 *
 * Inclut les 20 dernières annonces actives et la note moyenne.
 *
 * @param userId - ID de l'utilisateur.
 * @returns Profil public avec `ratingAverage`, `ratingCount`, `activeListings`.
 * @throws {AppError} 404 si l'utilisateur n'existe pas ou est bloqué.
 */
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

/**
 * Liste les annonces de l'utilisateur connecté (tous statuts, paginé).
 *
 * @param userId - ID de l'utilisateur.
 * @param query  - Query params de pagination.
 * @returns `{ items, meta }` — annonces paginées.
 */
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

/**
 * Liste les contacts consultés par l'utilisateur (paginé).
 *
 * @param userId - ID de l'utilisateur (buyer).
 * @param query  - Query params de pagination.
 * @returns `{ items, meta }` — consultations paginées avec l'annonce associée.
 */
export async function getMyContactReveals(userId: string, query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    prisma.contactReveal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        listing: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.contactReveal.count({ where: { userId } }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

/**
 * Liste l'historique de paiements de l'utilisateur (paginé).
 *
 * @param userId - ID de l'utilisateur.
 * @param query  - Query params de pagination.
 * @returns `{ items, meta }` — paiements paginés.
 */
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
