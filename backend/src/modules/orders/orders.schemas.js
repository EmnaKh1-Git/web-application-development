import { idSchema, ORDER_STATUS_LIST, z } from '@smart-ecommerce/shared';
import { paginationQuerySchema } from '../../core/utils/pagination.js';
import { enumQuery, searchQuery } from '../../core/utils/query.js';

// Paramètres d'URL et de requête du module Commandes.
// (Corps de requête : addCartItemSchema, checkoutSchema, orderStatusSchema... dans @smart-ecommerce/shared.)

export const idParamsSchema = z.object({ id: idSchema });
export const itemIdParamsSchema = z.object({ itemId: idSchema });

export const listMyOrdersQuerySchema = paginationQuerySchema.extend({
  status: enumQuery(ORDER_STATUS_LIST),
});

export const listOrdersQuerySchema = paginationQuerySchema.extend({
  status: enumQuery(ORDER_STATUS_LIST),
  search: searchQuery, // n° de commande, nom ou email du client
});
