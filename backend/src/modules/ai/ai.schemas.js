import { idSchema, optionalNumber, z } from '@smart-ecommerce/shared';
import { optionalIdQuery } from '../../core/utils/query.js';

// Paramètres d'URL et de requête du module IA.
// (Corps de requête : assistantSchema, receptionSchema... dans @smart-ecommerce/shared.)

export const productIdParamsSchema = z.object({ productId: idSchema });
export const idParamsSchema = z.object({ id: idSchema });

/** Liste d'identifiants « 1,2,3 » (100 au maximum). */
const idListQuery = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() !== ''
      ? value.split(',').map((item) => item.trim())
      : undefined,
  z.array(idSchema).max(100, '100 identifiants au maximum').optional(),
);

export const recommendationsQuerySchema = z.object({
  productId: optionalIdQuery,
  productIds: idListQuery,
  limit: optionalNumber(z.coerce.number().int().min(1).max(12)).default(4),
});

export const orderRiskQuerySchema = z.object({ ids: idListQuery });

export const productForecastQuerySchema = z.object({
  horizon: optionalNumber(z.coerce.number().int().min(7).max(90)).default(30),
});
