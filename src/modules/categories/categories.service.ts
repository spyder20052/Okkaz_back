/**
 * @module modules/categories/categories.service
 * @description Logique métier Catégories (§4.4).
 *   Supporte la hiérarchie (parent / enfants). Suppression = soft (isActive=false).
 */

import { ListingStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';

export async function listActive() {
  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      },
    },
  });
  return categories;
}

export async function getBySlug(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      parent: true,
      children: { where: { isActive: true } },
    },
  });
  if (!category) throw AppError.notFound('CATEGORY_NOT_FOUND', 'Catégorie introuvable.');

  const activeListingsCount = await prisma.listing.count({
    where: { categoryId: category.id, status: ListingStatus.ACTIVE, deletedAt: null },
  });

  return { ...category, activeListingsCount };
}

export async function create(data: {
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  parentId?: string;
  sortOrder?: number;
}) {
  if (data.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
    if (!parent) throw AppError.badRequest('PARENT_NOT_FOUND', 'Catégorie parente introuvable.');
  }
  return prisma.category.create({ data });
}

export async function update(
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
    iconUrl: string;
    parentId: string;
    sortOrder: number;
    isActive: boolean;
  }>,
) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('CATEGORY_NOT_FOUND', 'Catégorie introuvable.');
  if (data.parentId && data.parentId === id) {
    throw AppError.badRequest('CATEGORY_SELF_PARENT', "Une catégorie ne peut pas être son propre parent.");
  }
  return prisma.category.update({ where: { id }, data });
}

export async function deactivate(id: string) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('CATEGORY_NOT_FOUND', 'Catégorie introuvable.');
  return prisma.category.update({ where: { id }, data: { isActive: false } });
}
