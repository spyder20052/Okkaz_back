/**
 * @module modules/categories/categories.service
 * @description Logique métier Catégories (§4.4).
 *   Supporte la hiérarchie (parent / enfants). Suppression = soft (isActive=false).
 */

import { ListingStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';

/**
 * Liste toutes les catégories racines actives avec leurs sous-catégories.
 *
 * Ne retourne que les catégories de premier niveau (`parentId = null`),
 * triées par `sortOrder` puis par `name`, avec enfants actifs.
 *
 * @returns Tableau de catégories racines avec `children[]`.
 */
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

/**
 * Récupère une catégorie par son slug, avec parent, enfants actifs
 * et le nombre d'annonces actives.
 *
 * @param slug - Slug URL-friendly de la catégorie (ex : `'immobilier'`).
 * @returns La catégorie complète avec `activeListingsCount`.
 * @throws {AppError} 404 si la catégorie n'existe pas.
 */
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

/**
 * Crée une nouvelle catégorie (admin uniquement).
 *
 * @param data.name        - Nom affiché (2-100 caractères).
 * @param data.slug        - Slug URL-friendly unique.
 * @param data.description - Description optionnelle (max 500).
 * @param data.iconUrl     - URL de l'icône optionnelle.
 * @param data.parentId    - UUID de la catégorie parente (optionnel).
 * @param data.sortOrder   - Ordre de tri (0-based, optionnel).
 * @returns La catégorie créée.
 * @throws {AppError} 400 si le `parentId` référence une catégorie inexistante.
 */
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

/**
 * Met à jour une catégorie existante (admin uniquement).
 *
 * @param id   - UUID de la catégorie.
 * @param data - Champs à mettre à jour (tous optionnels).
 * @returns La catégorie mise à jour.
 * @throws {AppError} 404 si la catégorie n'existe pas.
 * @throws {AppError} 400 si la catégorie tente de devenir son propre parent.
 */
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

/**
 * Désactive une catégorie (soft delete — `isActive = false`).
 *
 * @param id - UUID de la catégorie.
 * @returns La catégorie mise à jour.
 * @throws {AppError} 404 si la catégorie n'existe pas.
 */
export async function deactivate(id: string) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('CATEGORY_NOT_FOUND', 'Catégorie introuvable.');
  return prisma.category.update({ where: { id }, data: { isActive: false } });
}
