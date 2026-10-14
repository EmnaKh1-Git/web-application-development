import { describe, expect, it } from 'vitest';
import { formatPrice, pluralize } from './format';

// Intl utilise des espaces insécables : on les normalise pour comparer.
const normalize = (text) => text.replace(/\s/g, ' ');

describe('formatPrice', () => {
  it('affiche les prix en dinars tunisiens avec 2 décimales', () => {
    expect(normalize(formatPrice(1299.5))).toBe('1 299,50 DT');
    expect(normalize(formatPrice(0))).toBe('0,00 DT');
  });

  it('accepte une valeur absente', () => {
    expect(normalize(formatPrice(undefined))).toBe('0,00 DT');
  });
});

describe('pluralize', () => {
  it('accorde selon la quantité', () => {
    expect(pluralize(1, 'article')).toBe('1 article');
    expect(pluralize(3, 'article')).toBe('3 articles');
  });
});
