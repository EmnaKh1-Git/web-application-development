import {
  idSchema,
  optionalNumber,
  PRODUCT_SORT,
  PRODUCT_SORT_LIST,
  z,
} from '@smart-ecommerce/shared';
import { paginationQuerySchema } from '../../core/utils/pagination.js';
import { booleanQuery, enumQuery, optionalIdQuery, searchQuery } from '../../core/utils/query.js';

// Paramètres d'URL et de requête du module Produits & Catégories.
// (Corps de requête : categorySchema, productSchema, productCreateSchema dans @smart-ecommerce/shared.)

export const idParamsSchema = z.object({ id: idSchema });

const optionalPrice = optionalNumber(
  z.coerce.number({ error: 'Prix invalide' }).min(0, 'Le prix ne peut pas être négatif'),
);

export const listProductsQuerySchema = paginationQuerySchema
  .extend({
    search: searchQuery,
    categoryId: optionalIdQuery,
    minPrice: optionalPrice,
    maxPrice: optionalPrice,
    inStock: booleanQuery,
    sort: enumQuery(PRODUCT_SORT_LIST, PRODUCT_SORT.NEWEST),
    // Réservé aux administrateurs : inclure les produits désactivés
    includeInactive: booleanQuery,
  })
  .refine(
    (query) =>
      query.minPrice === undefined ||
      query.maxPrice === undefined ||
      query.minPrice <= query.maxPrice,
    { path: ['maxPrice'], message: 'Le prix maximum doit être supérieur au prix minimum' },
  );
