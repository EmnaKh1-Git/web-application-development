import { COMPLAINT_STATUS_LIST, idSchema, z } from '@smart-ecommerce/shared';
import { paginationQuerySchema } from '../../core/utils/pagination.js';
import { enumQuery, searchQuery } from '../../core/utils/query.js';

// Paramètres d'URL et de requête du module Avis & Réclamations.
// (Corps de requête : reviewSchema, complaintSchema, complaintHandlingSchema dans @smart-ecommerce/shared.)

export const idParamsSchema = z.object({ id: idSchema });
export const productIdParamsSchema = z.object({ productId: idSchema });

export const listComplaintsQuerySchema = paginationQuerySchema.extend({
  status: enumQuery(COMPLAINT_STATUS_LIST),
  search: searchQuery, // objet de la réclamation, nom ou email du client
});
