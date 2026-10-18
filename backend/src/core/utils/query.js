import { idSchema, optionalNumber, optionalText, z } from '@smart-ecommerce/shared';

/*
 * Briques Zod pour les paramètres de requête (?search=...&status=...).
 * Un paramètre vide (« ?status= ») est traité comme absent.
 */

/** Texte de recherche facultatif (vide → null). */
export const searchQuery = optionalText(z.string().trim().max(100, 'Recherche trop longue'));

/** Identifiant facultatif (ex. ?categoryId=3). */
export const optionalIdQuery = optionalNumber(idSchema);

/** Valeur parmi une liste, avec une valeur par défaut facultative. */
export function enumQuery(values, defaultValue) {
  const schema = z.enum(values, { error: `Valeur attendue : ${values.join(', ')}` });
  return z.preprocess(
    (value) => (value === '' ? undefined : value),
    defaultValue === undefined ? schema.optional() : schema.default(defaultValue),
  );
}

/** Booléen facultatif (« true », « false », « 1 », « 0 »...). */
export const booleanQuery = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.stringbool().optional(),
);

/**
 * Motif LIKE « contient » en échappant les caractères spéciaux % et _
 * (sinon une recherche « 100% » renverrait tout).
 */
export function likeContains(term) {
  return `%${term.replace(/[\\%_]/g, '\\$&')}%`;
}
