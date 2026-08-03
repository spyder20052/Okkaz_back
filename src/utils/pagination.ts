/**
 * @module utils/pagination
 * @description Utilitaires de pagination normalisés pour toutes les routes
 *   de listing (admin, listings, reports, demands…).
 *
 *   Convention API :
 *   - `page` : numéro de page (1-indexé, défaut 1).
 *   - `limit` : nombre d'éléments par page (défaut 20, max 100).
 *   - `skip` : offset calculé automatiquement pour Prisma.
 *
 * @author KOUTON Spynel
 */

/**
 * Parse les paramètres de pagination depuis un objet de query string.
 *
 * Applique des valeurs par défaut sûres et limite le nombre d'éléments
 * par page à 100 pour éviter les requêtes abusives.
 *
 * @param query - Objet query string brut (`req.query`), contenant optionnellement `page` et `limit`.
 * @returns Un objet `{ page, limit, skip }` prêt à être utilisé avec Prisma.
 *
 * @example
 * ```ts
 * const { page, limit, skip } = parsePagination(req.query);
 * const items = await prisma.listing.findMany({ skip, take: limit });
 * ```
 */
export function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Construit les métadonnées de pagination à retourner au client.
 *
 * @param page  - Numéro de page courante (1-indexé).
 * @param limit - Nombre d'éléments par page.
 * @param total - Nombre total d'éléments correspondant aux filtres.
 * @returns Objet `{ page, limit, total, totalPages }`.
 *
 * @example
 * ```ts
 * const meta = buildPaginationMeta(1, 20, 57);
 * // → { page: 1, limit: 20, total: 57, totalPages: 3 }
 * ```
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
