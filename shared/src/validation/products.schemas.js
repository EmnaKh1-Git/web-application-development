import { z } from '../zod.js';
import { optionalText } from './common.js';

/** Prix en dinars : strictement positif, au plus 2 décimales. */
export const priceSchema = z.coerce
  .number({ error: 'Le prix est obligatoire' })
  .positive('Le prix doit être supérieur à 0')
  .max(1_000_000, 'Le prix est trop élevé')
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(String(value)), {
    message: 'Le prix doit avoir au plus 2 décimales',
  });

/** POST et PUT /categories */
export const categorySchema = z.object({
  name: z
    .string({ error: 'Le nom est obligatoire' })
    .trim()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne doit pas dépasser 100 caractères'),
  description: optionalText(
    z.string().trim().max(500, 'La description ne doit pas dépasser 500 caractères'),
  ),
});

/** PUT /products/:id */
export const productSchema = z.object({
  name: z
    .string({ error: 'Le nom est obligatoire' })
    .trim()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(150, 'Le nom ne doit pas dépasser 150 caractères'),
  categoryId: z.coerce
    .number({ error: 'Choisissez une catégorie' })
    .int('Choisissez une catégorie')
    .positive('Choisissez une catégorie'),
  price: priceSchema,
  description: z
    .string({ error: 'La description est obligatoire' })
    .trim()
    .min(10, 'La description doit contenir au moins 10 caractères')
    .max(5000, 'La description ne doit pas dépasser 5000 caractères'),
  imageUrl: optionalText(
    z
      .string()
      .trim()
      .max(500, "L'URL ne doit pas dépasser 500 caractères")
      .pipe(z.url("L'URL de l'image est invalide")),
  ),
  imageUrls: z
    .array(z.string().trim().pipe(z.url("L'URL de l'image est invalide")))
    .max(8)
    .default([]),
  sizes: z.array(z.string().trim().min(1).max(20)).max(20).default([]),
  colors: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  isActive: z.boolean().default(true),
});

/** POST /products : le stock initial est confié au module Stock. */
export const productCreateSchema = productSchema.extend({
  initialStock: z.coerce
    .number()
    .int('Nombre entier attendu')
    .min(0, 'Le stock initial ne peut pas être négatif')
    .max(100_000, 'Quantité trop élevée')
    .default(0),
});
