/**
 * @module modules/reviews/reviews.service
 * @description Avis sur annonces (§4.9).
 *   Règle : un avis n'est possible qu'après un accès contact payé et valide
 *   (actif ou expiré), et un seul par (reviewer, listing).
 */

import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';

/**
 * Crée un avis sur une annonce.
 *
 * Règles : un avis n'est possible qu'après un accès contact payé (actif ou expiré),
 * et un seul par couple (reviewer, listing).
 *
 * @param input - `{ reviewerId, listingId, rating (1-5), comment? }`.
 * @returns L'avis créé.
 * @throws {AppError} 404 si l'annonce est introuvable.
 * @throws {AppError} 403 si l'utilisateur n'a jamais payé l'accès contact.
 * @throws {PrismaClientKnownRequestError} P2002 si un avis existe déjà.
 */
export async function create(input: { reviewerId: string; listingId: string; rating: number; comment?: string }) {
  const listing = await prisma.listing.findUnique({ where: { id: input.listingId } });
  if (!listing || listing.deletedAt) throw AppError.notFound('LISTING_NOT_FOUND', 'Annonce introuvable.');

  const hadAccess = await prisma.contactAccess.findFirst({
    where: { userId: input.reviewerId, listingId: input.listingId },
  });
  if (!hadAccess) {
    throw AppError.forbidden('NO_CONTACT_ACCESS', "Vous devez avoir payé l'accès au contact pour laisser un avis.");
  }

  return prisma.review.create({
    data: {
      reviewerId: input.reviewerId,
      listingId: input.listingId,
      rating: input.rating,
      comment: input.comment ?? null,
    },
  });
}

/**
 * Liste les avis d'une annonce avec statistiques (moyenne, count).
 *
 * @param listingId - UUID de l'annonce.
 * @returns `{ reviews, stats: { average, count } }`.
 */
export async function listForListing(listingId: string) {
  const [reviews, agg] = await Promise.all([
    prisma.review.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
      },
    }),
    prisma.review.aggregate({
      where: { listingId },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);
  return { reviews, stats: { average: agg._avg.rating ?? 0, count: agg._count._all } };
}

/**
 * Supprime un avis (admin uniquement).
 *
 * @param id - UUID de l'avis.
 * @throws {AppError} 404 si l'avis est introuvable.
 */
export async function remove(id: string): Promise<void> {
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('REVIEW_NOT_FOUND', 'Avis introuvable.');
  await prisma.review.delete({ where: { id } });
}
