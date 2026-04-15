/**
 * @module listingService
 * @description Logique métier des annonces :
 *   création, consultation, mise à jour, suppression, filtrage.
 *
 * @dependencies prisma
 * @author Spynel KOUTON
 */

import { prisma } from '../config';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type { ListingStatus } from '../types';

interface CreateListingData {
  title: string;
  description: string;
  categoryId: string;
  price: number;
  city: string;
  address?: string;
  conditions?: string;
  photos?: string[];
  ownerId: string;
}

interface ListingFilters {
  page: number;
  limit: number;
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sort: string;
}

/**
 * Crée une nouvelle annonce (statut PENDING par défaut — validation admin requise).
 */
export async function createListing(data: CreateListingData) {
  const listing = await prisma.listing.create({
    data: {
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      price: data.price,
      city: data.city,
      address: data.address,
      conditions: data.conditions,
      photos: data.photos ?? [],
      ownerId: data.ownerId,
      status: 'PENDING',
    },
  });

  logger.write(`Annonce créée : ${listing.id} par ${data.ownerId}`);
  return listing;
}

/**
 * Récupère les annonces actives avec pagination et filtres.
 */
export async function getListings(filters: ListingFilters) {
  const { page, limit, category, city, minPrice, maxPrice, sort } = filters;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { status: 'ACTIVE' as ListingStatus };
  if (category) where.categoryId = category;
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { gte: minPrice } : {}),
      ...(maxPrice ? { lte: maxPrice } : {}),
    };
  }

  const orderBy = (() => {
    switch (sort) {
      case 'price_asc': return { price: 'asc' as const };
      case 'price_desc': return { price: 'desc' as const };
      case 'date_asc': return { createdAt: 'asc' as const };
      default: return { createdAt: 'desc' as const };
    }
  })();

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: { category: true, owner: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.listing.count({ where }),
  ]);

  logger.read(`Annonces récupérées : page ${page}, ${listings.length}/${total}`);
  return { listings, total, page, limit };
}

/**
 * Récupère une annonce par son identifiant.
 */
export async function getListingById(id: string) {
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      category: true,
      owner: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
  });

  if (!listing) {
    throw new AppError('LISTING_NOT_FOUND', 'Annonce introuvable.', 404);
  }

  logger.read(`Annonce consultée : ${id}`);
  return listing;
}

/**
 * Met à jour une annonce (propriétaire uniquement).
 */
export async function updateListing(id: string, ownerId: string, data: Partial<CreateListingData>) {
  const listing = await prisma.listing.findUnique({ where: { id } });

  if (!listing) {
    throw new AppError('LISTING_NOT_FOUND', 'Annonce introuvable.', 404);
  }
  if (listing.ownerId !== ownerId) {
    throw new AppError('FORBIDDEN', 'Vous ne pouvez modifier que vos propres annonces.', 403);
  }

  const updated = await prisma.listing.update({
    where: { id },
    data: { ...data, status: 'PENDING' },
  });

  logger.write(`Annonce mise à jour : ${id}`);
  return updated;
}

/**
 * Supprime une annonce (propriétaire ou admin).
 */
export async function deleteListing(id: string, userId: string, isAdmin: boolean) {
  const listing = await prisma.listing.findUnique({ where: { id } });

  if (!listing) {
    throw new AppError('LISTING_NOT_FOUND', 'Annonce introuvable.', 404);
  }
  if (listing.ownerId !== userId && !isAdmin) {
    throw new AppError('FORBIDDEN', 'Vous ne pouvez supprimer que vos propres annonces.', 403);
  }

  await prisma.listing.delete({ where: { id } });
  logger.write(`Annonce supprimée : ${id}`);
}
