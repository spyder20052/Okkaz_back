/**
 * @module modules/reviews/reviews.service
 * @description Avis sur annonces (§4.9).
 *   Règles :
 *     - un avis n'est possible qu'après avoir consulté le contact de l'annonce
 *       (présence d'un `ContactReveal`) ;
 *     - et seulement après un délai configurable depuis cette consultation
 *       (`review_min_delay_hours`), pour laisser le temps à un vrai contact ;
 *     - un seul avis par (reviewer, listing) ;
 *     - les avis modérés (`isModerated = true`) sont masqués du public.
 */

import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { getSettingNumber } from '../../services/settings.service';

/**
 * Crée un avis sur une annonce.
 *
 * Règles : un avis n'est possible qu'après avoir consulté le contact de
 * l'annonce, et un seul par couple (reviewer, listing).
 *
 * @param input - `{ reviewerId, listingId, rating (1-5), comment? }`.
 * @returns L'avis créé.
 * @throws {AppError} 404 si l'annonce est introuvable.
 * @throws {AppError} 403 si l'utilisateur n'a jamais consulté le contact.
 * @throws {AppError} 403 si le délai depuis la consultation n'est pas écoulé.
 * @throws {PrismaClientKnownRequestError} P2002 si un avis existe déjà.
 */
export async function create(input: { reviewerId: string; listingId: string; rating: number; comment?: string }) {
  const listing = await prisma.listing.findUnique({ where: { id: input.listingId } });
  if (!listing || listing.deletedAt) throw AppError.notFound('LISTING_NOT_FOUND', 'Annonce introuvable.');

  if (listing.userId === input.reviewerId) {
    throw AppError.forbidden('CANNOT_REVIEW_SELF', 'Vous ne pouvez pas évaluer votre propre annonce.');
  }

  const hasConsulted = await prisma.contactReveal.findUnique({
    where: { userId_listingId: { userId: input.reviewerId, listingId: input.listingId } },
  });
  if (!hasConsulted) {
    throw AppError.forbidden('NO_CONTACT_REVEAL', 'Vous devez avoir consulté le contact pour laisser un avis.');
  }

  // Délai minimal entre la consultation du contact et le dépôt de l'avis.
  const delayHours = await getSettingNumber('review_min_delay_hours', 24);
  const eligibleAt = new Date(hasConsulted.createdAt.getTime() + delayHours * 3600 * 1000);
  if (eligibleAt > new Date()) {
    throw AppError.forbidden(
      'REVIEW_TOO_EARLY',
      `Vous pourrez laisser un avis ${delayHours}h après avoir consulté le contact.`,
    );
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
 * Liste les avis publics d'une annonce avec statistiques (moyenne, count).
 *
 * Les avis modérés (`isModerated = true`) sont exclus de la liste et des stats.
 *
 * @param listingId - UUID de l'annonce.
 * @returns `{ reviews, stats: { average, count } }`.
 */
export async function listForListing(listingId: string) {
  const where = { listingId, isModerated: false };
  const [reviews, agg] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
      },
    }),
    prisma.review.aggregate({
      where,
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);
  return { reviews, stats: { average: agg._avg.rating ?? 0, count: agg._count._all } };
}

/**
 * Modère un avis (admin) : le masque du public sans le supprimer.
 *
 * Alternative douce à la suppression définitive — réversible.
 *
 * @param id          - UUID de l'avis.
 * @param isModerated - `true` pour masquer, `false` pour ré-afficher.
 * @returns L'avis mis à jour.
 * @throws {AppError} 404 si l'avis est introuvable.
 */
export async function setModeration(id: string, isModerated: boolean) {
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('REVIEW_NOT_FOUND', 'Avis introuvable.');
  return prisma.review.update({ where: { id }, data: { isModerated } });
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
