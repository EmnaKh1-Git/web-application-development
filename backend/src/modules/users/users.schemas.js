import { idSchema, ROLE_LIST, z } from '@smart-ecommerce/shared';
import { paginationQuerySchema } from '../../core/utils/pagination.js';
import { enumQuery, searchQuery } from '../../core/utils/query.js';

// Paramètres d'URL et de requête du module Utilisateurs.
// (Corps de requête : profileSchema, changePasswordSchema, addressSchema... dans @smart-ecommerce/shared.)

export const idParamsSchema = z.object({ id: idSchema });

export const listUsersQuerySchema = paginationQuerySchema.extend({
  search: searchQuery,
  role: enumQuery(ROLE_LIST),
  status: enumQuery(['all', 'active', 'blocked'], 'all'),
});
