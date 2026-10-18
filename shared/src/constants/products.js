/** Devise de la boutique (code ISO 4217). Changer ici suffit pour toute l'application. */
export const CURRENCY = 'TND';

/** Tris disponibles dans le catalogue. */
export const PRODUCT_SORT = Object.freeze({
  NEWEST: 'newest',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  POPULARITY: 'popularity',
  RATING: 'rating',
});

export const PRODUCT_SORT_LIST = Object.freeze(Object.values(PRODUCT_SORT));

export const PRODUCT_SORT_LABELS = Object.freeze({
  [PRODUCT_SORT.NEWEST]: 'Nouveautés',
  [PRODUCT_SORT.POPULARITY]: 'Popularité',
  [PRODUCT_SORT.RATING]: 'Mieux notés',
  [PRODUCT_SORT.PRICE_ASC]: 'Prix croissant',
  [PRODUCT_SORT.PRICE_DESC]: 'Prix décroissant',
});
