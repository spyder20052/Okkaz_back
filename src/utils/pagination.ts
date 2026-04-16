/**
 * @module utils/pagination
 * @description Parsing et normalisation des paramètres de pagination.
 *   Toute liste d'API doit être paginée (§4.5, §4.11).
 *
 * @author KOUTON Spynel
 */

import type { PaginationMeta } from "./apiResponse";

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePagination(
  query: Record<string, unknown>,
): PaginationParams {
  const pageRaw = Number(query.page ?? 1);
  const limitRaw = Number(query.limit ?? DEFAULT_LIMIT);

  const page =
    Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const limit =
    Number.isFinite(limitRaw) && limitRaw >= 1
      ? Math.min(Math.floor(limitRaw), MAX_LIMIT)
      : DEFAULT_LIMIT;

  return { page, limit, skip: (page - 1) * limit };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
