import { z } from '@smart-ecommerce/shared';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Schéma Zod des paramètres de pagination (?page=1&limit=20).
 * À étendre dans chaque module pour ajouter ses filtres :
 *
 * @example
 * const listProductsQuerySchema = paginationQuerySchema.extend({
 *   search: z.string().trim().max(100).optional(),
 * });
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

/** Convertit { page, limit } en options Sequelize { limit, offset }. */
export function toSequelizePagination({ page, limit }) {
  return { limit, offset: (page - 1) * limit };
}

/** Construit le bloc « meta » d'une réponse paginée. */
export function buildPaginationMeta({ page, limit }, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
