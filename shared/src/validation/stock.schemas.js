import { z } from '../zod.js';
import { optionalNumber, optionalText } from './common.js';

const reasonSchema = optionalText(
  z.string().trim().max(255, 'Le motif ne doit pas dépasser 255 caractères'),
);

const quantitySchema = (label) =>
  z.coerce
    .number({ error: `${label} est obligatoire` })
    .int('Nombre entier attendu')
    .min(0, `${label} ne peut pas être négatif`)
    .max(100_000, `${label} est trop élevé`);

/** POST /stock/:productId/add — réapprovisionnement */
export const addStockSchema = z.object({
  quantity: z.coerce
    .number({ error: 'La quantité est obligatoire' })
    .int('Nombre entier attendu')
    .min(1, 'La quantité doit être au moins 1')
    .max(100_000, 'Quantité trop élevée'),
  reason: reasonSchema,
});

/** PATCH /stock/:productId — correction de la quantité et/ou du seuil d'alerte */
export const adjustStockSchema = z
  .object({
    quantity: optionalNumber(quantitySchema('La quantité')),
    lowStockThreshold: optionalNumber(quantitySchema("Le seuil d'alerte")),
    reason: reasonSchema,
  })
  .refine((values) => values.quantity !== undefined || values.lowStockThreshold !== undefined, {
    path: ['quantity'],
    message: "Indiquez une nouvelle quantité ou un nouveau seuil d'alerte",
  });
