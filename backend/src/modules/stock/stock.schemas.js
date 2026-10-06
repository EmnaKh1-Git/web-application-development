import { idSchema, STOCK_MOVEMENT_TYPE_LIST, z } from '@smart-ecommerce/shared';
import { paginationQuerySchema } from '../../core/utils/pagination.js';
import { enumQuery, optionalIdQuery, searchQuery } from '../../core/utils/query.js';

// Schémas des paramètres d'URL et de requête du module Stock.
// (Les schémas des corps de requête sont dans @smart-ecommerce/shared : addStockSchema, adjustStockSchema.)

export const STOCK_FILTERS = ['all', 'ok', 'low', 'out', 'alert'];
export const STOCK_SORTS = ['name', 'quantity_asc', 'quantity_desc', 'updated'];

export const productIdParamsSchema = z.object({ productId: idSchema });

export const listStockQuerySchema = paginationQuerySchema.extend({
  search: searchQuery,
  status: enumQuery(STOCK_FILTERS, 'all'),
  categoryId: optionalIdQuery,
  sort: enumQuery(STOCK_SORTS, 'name'),
});

export const listMovementsQuerySchema = paginationQuerySchema.extend({
  productId: optionalIdQuery,
  type: enumQuery(STOCK_MOVEMENT_TYPE_LIST),
});
