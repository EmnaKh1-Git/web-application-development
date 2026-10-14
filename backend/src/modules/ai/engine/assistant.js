import { PRODUCT_SORT, STOCK_STATUS } from '@smart-ecommerce/shared';
import { containsAny, normalizeText, tokenize } from './text.js';

/*
 * Assistant d'achat — compréhension locale du langage (sans modèle de langage) :
 * intention, budget, catégorie, tri et mots-clés, puis recherche classée dans le catalogue.
 * Quand Claude est configuré, il prend le relais et utilise searchCatalog() comme outil.
 */

const list = (expressions) => expressions.split('|');

/** Mots associés à chaque rayon (slug de la catégorie). */
export const CATEGORY_SYNONYMS = {
  'high-tech': list(
    'high tech|tech|electronique|telephone|smartphone|portable|iphone|samsung|ordinateur|pc|laptop|macbook|tablette|ipad|casque|ecouteur|ecouteurs|audio|enceinte|montre connectee|apple|gadget',
  ),
  maison: list(
    'maison|deco|decoration|meuble|canape|lampe|cuisine|blender|micro onde|four|table|fauteuil|pot|fleurs|wok|cadre|salon|bureau',
  ),
  sport: list(
    'sport|sportif|ballon|football|foot|basketball|tennis|raquette|golf|volley|volleyball|fitness|entrainement|panier de basket',
  ),
  mode: list(
    'mode|vetement|vetements|robe|chemise|chaussure|chaussures|baskets|sneakers|sac|sac a main|lunettes|montre|habit|tenue|accessoire',
  ),
  beaute: list(
    'beaute|parfum|maquillage|mascara|rouge a levres|vernis|gel douche|soin|cosmetique|fard|eau de toilette',
  ),
  livres: list('livre|livres|roman|lecture|bouquin|auteur|essai|lire|lecteur'),
};

// Destinataires d'un cadeau → rayons à privilégier
const GIFT_HINTS = [
  {
    words: list('femme|mere|maman|soeur|copine|fille|amie|epouse'),
    categories: ['beaute', 'mode'],
  },
  { words: list('homme|pere|papa|frere|copain|mari|ami'), categories: ['high-tech', 'sport'] },
  { words: list('enfant|fils|ado|adolescent'), categories: ['sport', 'livres'] },
];

export const SHOP_POLICIES = {
  delivery:
    'La livraison est offerte. Une commande est préparée après confirmation par notre équipe, puis livrée en 3 jours ouvrés environ après l’expédition. Vous suivez chaque étape depuis « Mes commandes ».',
  payment:
    'Le paiement se fait à la livraison, directement auprès du livreur : vous ne payez rien en ligne.',
  cancel:
    'Vous pouvez annuler gratuitement une commande tant qu’elle n’est pas expédiée, depuis sa page de détail. Après la livraison, en cas de problème (article abîmé, erreur…), déposez une réclamation : notre équipe vous répond rapidement.',
  reviews:
    'Vous pouvez donner votre avis sur un produit dès que votre commande est livrée, depuis la page du produit.',
};

const INTENTS = [
  {
    intent: 'order_status',
    words: list(
      'ma commande|mes commandes|suivi|suivre|colis|ou en est|quand vais je recevoir|pas encore recu|livree quand',
    ),
  },
  {
    intent: 'policy_delivery',
    words: list('delai|delais|frais de port|livraison|livrez|livrer|expedition'),
  },
  { intent: 'policy_payment', words: list('paiement|payer|carte|especes|cash|paye') },
  {
    intent: 'policy_cancel',
    words: list(
      'annuler|annulation|retour|retourner|rembourse|remboursement|echanger|echange|reclamation',
    ),
  },
  { intent: 'policy_reviews', words: list('avis|noter|note') },
];

/**
 * Analyse un message du client.
 * @returns {{ intent: string, filters: { categorySlug?, minPrice?, maxPrice?, sort?, inStockOnly, keywords: string[] }, gift: boolean }}
 */
export function parseShopperMessage(message) {
  const text = normalizeText(message);
  const filters = { keywords: [], inStockOnly: true };

  // Budget : « moins de 100 », « entre 50 et 200 », « 150 dt max »
  const between = text.match(/entre (\d+) (?:et|a) (\d+)/);
  const maxMatch =
    text.match(
      /(?:moins de|max|maximum|pas plus de|jusqu a|inferieur a|sous|budget de|budget) (\d+)/,
    ) ?? text.match(/(\d+) (?:dt|dinars?|tnd)? ?(?:max|maximum|au plus)/);
  const minMatch = text.match(/(?:plus de|au moins|minimum|superieur a) (\d+)/);
  if (between) {
    filters.minPrice = Number(between[1]);
    filters.maxPrice = Number(between[2]);
  } else {
    if (maxMatch) filters.maxPrice = Number(maxMatch[1]);
    if (minMatch) filters.minPrice = Number(minMatch[1]);
  }

  if (
    containsAny(
      text,
      list(
        'moins cher|moins chers|moins chere|pas cher|pas chers|petit prix|petits prix|economique|bon marche',
      ),
    )
  ) {
    filters.sort = PRODUCT_SORT.PRICE_ASC;
  } else if (containsAny(text, list('meilleur|meilleurs|mieux note|mieux notes|top|qualite'))) {
    filters.sort = PRODUCT_SORT.RATING;
  } else if (containsAny(text, list('populaire|tendance|plus vendu|plus vendus|succes'))) {
    filters.sort = PRODUCT_SORT.POPULARITY;
  } else if (containsAny(text, list('nouveau|nouveaute|nouveautes|recent'))) {
    filters.sort = PRODUCT_SORT.NEWEST;
  }

  const categoryEntry = Object.entries(CATEGORY_SYNONYMS).find(([, words]) =>
    containsAny(text, words),
  );
  if (categoryEntry) filters.categorySlug = categoryEntry[0];

  const gift = containsAny(text, list('cadeau|offrir|anniversaire|fete'));
  if (gift && !filters.categorySlug) {
    const hint = GIFT_HINTS.find(({ words }) => containsAny(text, words));
    if (hint) filters.categorySlugs = hint.categories;
  }

  // Mots-clés : tout ce qui n'est ni un nombre, ni une indication de budget ou de tri
  const ignored = new Set(
    tokenize(
      'moins plus cher prix budget dt dinar dinars tnd max maximum entre cadeau offrir trouver produit produits ' +
        'article articles idee idees recommande recommander conseille conseiller propose proposer voir montrer ' +
        'meilleur mieux note populaire nouveau disponible stock acheter achat petit bon marche economique pas quelque chose',
    ),
  );
  filters.keywords = tokenize(message).filter(
    (token) => !/^\d+$/.test(token) && !ignored.has(token),
  );

  const intentEntry = INTENTS.find(({ words }) => containsAny(text, words));
  const isProductQuery = Boolean(
    filters.categorySlug || filters.maxPrice || filters.minPrice || gift,
  );
  let intent = 'search';
  if (/^(bonjour|salut|hello|bonsoir|coucou|hey)\b/.test(text) && filters.keywords.length <= 1)
    intent = 'greeting';
  else if (/^(merci|super merci|parfait merci|ok merci)\b/.test(text)) intent = 'thanks';
  else if (intentEntry && !(isProductQuery && intentEntry.intent.startsWith('policy')))
    intent = intentEntry.intent;

  return { intent, filters, gift };
}

/**
 * Recherche classée dans le catalogue (utilisée par l'assistant local ET comme outil de Claude).
 * @param {object[]} products catalogue (réponses produit de l'API)
 */
export function searchCatalog(products, filters, { limit = 4 } = {}) {
  const keywords = filters.keywords ?? [];
  const categorySlugs =
    filters.categorySlugs ?? (filters.categorySlug ? [filters.categorySlug] : null);
  const eligible = products.filter(
    (product) =>
      product.isActive &&
      (!filters.inStockOnly || product.stock.status !== STOCK_STATUS.OUT) &&
      (filters.maxPrice === undefined || product.price <= filters.maxPrice) &&
      (filters.minPrice === undefined || product.price >= filters.minPrice),
  );

  const scoreKeywords = (product) => {
    if (keywords.length === 0) return 0;
    const name = new Set(tokenize(product.name));
    const category = new Set(tokenize(product.category?.name));
    const description = new Set(tokenize(product.description));
    const synonyms = new Set(tokenize((CATEGORY_SYNONYMS[product.category?.slug] ?? []).join(' ')));
    let score = 0;
    for (const keyword of keywords) {
      if (name.has(keyword)) score += 3;
      else if (category.has(keyword) || synonyms.has(keyword)) score += 2;
      else if (description.has(keyword)) score += 1;
    }
    return score;
  };

  const scored = eligible.map((product) => ({ product, relevance: scoreKeywords(product) }));
  let results = scored.filter(
    ({ product }) => !categorySlugs || categorySlugs.includes(product.category?.slug),
  );
  // Rayon déduit des mots-clés mais vide : les mots-clés, plus précis, l'emportent
  if (results.length === 0 && keywords.length > 0) {
    results = scored.filter((result) => result.relevance > 0);
  }
  // Des mots-clés précis : on garde les produits qui en contiennent au moins un
  if (keywords.length > 0 && results.some((result) => result.relevance > 0)) {
    results = results.filter((result) => result.relevance > 0);
  }

  const quality = (product) =>
    Math.log1p(product.salesCount ?? 0) + (product.rating.count > 0 ? product.rating.average : 3.5);
  const sorters = {
    [PRODUCT_SORT.PRICE_ASC]: (a, b) => a.product.price - b.product.price,
    [PRODUCT_SORT.PRICE_DESC]: (a, b) => b.product.price - a.product.price,
    [PRODUCT_SORT.RATING]: (a, b) => b.product.rating.average - a.product.rating.average,
    [PRODUCT_SORT.POPULARITY]: (a, b) => (b.product.salesCount ?? 0) - (a.product.salesCount ?? 0),
    [PRODUCT_SORT.NEWEST]: (a, b) => new Date(b.product.createdAt) - new Date(a.product.createdAt),
  };
  results.sort(
    (a, b) =>
      b.relevance - a.relevance ||
      (sorters[filters.sort] ?? ((x, y) => quality(y.product) - quality(x.product)))(a, b),
  );
  return results.slice(0, limit).map((result) => result.product);
}

/** Phrase décrivant les critères compris (« dans le rayon Mode, à moins de 100 DT »). */
export function describeFilters(filters, categories) {
  const parts = [];
  const categoryName = (slug) => categories.find((category) => category.slug === slug)?.name;
  if (filters.categorySlug)
    parts.push(`dans le rayon ${categoryName(filters.categorySlug) ?? filters.categorySlug}`);
  if (filters.categorySlugs)
    parts.push(`parmi ${filters.categorySlugs.map(categoryName).filter(Boolean).join(' et ')}`);
  if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
    parts.push(`entre ${filters.minPrice} et ${filters.maxPrice} DT`);
  } else if (filters.maxPrice !== undefined) parts.push(`à moins de ${filters.maxPrice} DT`);
  else if (filters.minPrice !== undefined) parts.push(`à plus de ${filters.minPrice} DT`);
  return parts.join(', ');
}
