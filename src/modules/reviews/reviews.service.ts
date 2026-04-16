/**
 * @module modules/reviews/reviews.service
 * @description Avis sur annonces (§4.9).
 *   Règle : un avis n'est possible qu'après un accès contact payé et valide
 *   (actif ou expiré), et un seul par (reviewer, listing).
 */

import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';

export async function create(input: { reviewerId: string; listingId: string; rating: number; comment?: string }) {
  const listing = await prisma.listing.findUnique({ where: { id: input.listingId } });
  if (!listing || listing.deletedAt) throw AppError.notFound('LISTING_NOT_FOUND', 'Annonce introuvable.');

  const hadAccess = await prisma.contactAccess.findFirst({
    where: { userId: input.reviewerId, listingId: input.listingId },
  });
  if (!hadAccess) {
    throw AppError.forbidden('NO_CONTACT_ACCESS', "Vous devez avoir payé l'accès au contact pour laisser un avis.");
  }

  try {
    return await prisma.review.create({
      data: {
        reviewerId: input.reviewerId,
        listingId: input.listingId,
        rating: input.rating,
        comment: input.comment ?? null,
      },
    });
  } catch (err) {
    // Prisma unique constraint → géré par le errorHandler (P2002).
    throw err;
  }
}

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

export async function remove(id: string): Promise<void> {
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('REVIEW_NOT_FOUND', 'Avis introuvable.');
  await prisma.review.delete({ where: { id } });
}
