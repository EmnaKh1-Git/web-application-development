import { z } from '../zod.js';

/**
 * Champ texte facultatif : une chaîne vide (champ de formulaire laissé vide) devient null.
 * @example phone: optionalText(phoneSchema)
 */
export const optionalText = (schema) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    schema.nullable().optional(),
  );

/**
 * Champ numérique facultatif : une valeur vide devient « non renseigné » (undefined),
 * et non 0 (sinon un champ vidé remettrait par exemple un stock à zéro).
 */
export const optionalNumber = (schema) =>
  z.preprocess((value) => (value === '' || value === null ? undefined : value), schema.optional());

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 .-]{8,20}$/, 'Numéro de téléphone invalide');

export const personNameSchema = (label) =>
  z
    .string({ error: `Le ${label} est obligatoire` })
    .trim()
    .min(2, `Le ${label} doit contenir au moins 2 caractères`)
    .max(100, `Le ${label} ne doit pas dépasser 100 caractères`);

/** Identifiant numérique (paramètre d'URL, clé étrangère...). */
export const idSchema = z.coerce
  .number({ error: 'Identifiant invalide' })
  .int('Identifiant invalide')
  .positive('Identifiant invalide');
