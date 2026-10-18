import { CURRENCY } from '@smart-ecommerce/shared';

const LOCALE = 'fr-TN';

const priceFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const numberFormatter = new Intl.NumberFormat(LOCALE);
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * Prix dans la devise de la boutique.
 * @example formatPrice(1299.5) // « 1 299,50 DT »
 */
export function formatPrice(amount) {
  return priceFormatter.format(Number(amount ?? 0));
}

/** @example formatNumber(12500) // « 12 500 » */
export function formatNumber(value) {
  return numberFormatter.format(Number(value ?? 0));
}

/** Date seule (« 13 oct. 2026 ») ; chaîne vide si la date est absente. */
export function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : '';
}

/** Date et heure (« 13 oct. 2026, 14:30 ») ; chaîne vide si la date est absente. */
export function formatDateTime(value) {
  return value ? dateTimeFormatter.format(new Date(value)) : '';
}

/** Accorde un mot selon la quantité : pluralize(2, 'article') → « 2 articles ». */
export function pluralize(count, singular, plural = `${singular}s`) {
  return `${formatNumber(count)} ${Math.abs(count) > 1 ? plural : singular}`;
}
