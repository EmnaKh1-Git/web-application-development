import { z } from '../zod.js';
import { idSchema, optionalNumber, optionalText } from './common.js';

/** Taille maximale d'une photo envoyée (encodée en base64) : environ 6 Mo. */
export const AI_MAX_IMAGE_BASE64_LENGTH = 8_000_000;
export const AI_IMAGE_MEDIA_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);

/** POST /ai/assistant — conversation avec l'assistant d'achat (derniers messages). */
export const assistantSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z
          .string()
          .trim()
          .min(1, 'Le message est vide')
          .max(1000, 'Le message ne doit pas dépasser 1000 caractères'),
      }),
    )
    .min(1, 'Écrivez un message')
    .max(12, 'Conversation trop longue')
    .refine((messages) => messages.at(-1)?.role === 'user', {
      message: 'Le dernier message doit venir de l’utilisateur',
    }),
});

/** POST /ai/stock/reception — bon de livraison : texte collé OU photo. */
export const receptionSchema = z
  .object({
    text: optionalText(
      z.string().trim().max(5000, 'Le texte ne doit pas dépasser 5000 caractères'),
    ),
    image: optionalText(
      z
        .string()
        .max(AI_MAX_IMAGE_BASE64_LENGTH, 'La photo est trop lourde (6 Mo au maximum)')
        .regex(/^[A-Za-z0-9+/=]+$/, 'Image invalide'),
    ),
    mediaType: z
      .enum(AI_IMAGE_MEDIA_TYPES, { error: 'Format d’image non pris en charge' })
      .optional(),
  })
  .refine((values) => values.text || values.image, {
    path: ['text'],
    message: 'Collez le contenu du bon de livraison ou envoyez une photo',
  })
  .refine((values) => !values.image || values.mediaType, {
    path: ['mediaType'],
    message: 'Précisez le format de la photo',
  });

/** POST /ai/products/describe — rédaction d'une description de produit. */
export const productDescriptionRequestSchema = z.object({
  name: z
    .string({ error: 'Indiquez le nom du produit' })
    .trim()
    .min(2, 'Indiquez le nom du produit')
    .max(150),
  categoryId: optionalNumber(idSchema),
  price: optionalNumber(z.coerce.number().positive().max(1_000_000)),
  sizes: z.array(z.string().trim().max(20)).max(20).default([]),
  colors: z.array(z.string().trim().max(40)).max(20).default([]),
});

/** POST /ai/products/categorize — catégorie suggérée pour un produit. */
export const productCategorizeSchema = z.object({
  name: z
    .string({ error: 'Indiquez le nom du produit' })
    .trim()
    .min(2, 'Indiquez le nom du produit')
    .max(150),
  description: optionalText(z.string().trim().max(5000)),
});
