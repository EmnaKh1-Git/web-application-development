import { normalizeText, textSimilarity, tokenize } from './text.js';

/*
 * Réception intelligente : lecture d'un bon de livraison (texte) et rapprochement de chaque
 * ligne avec un produit du catalogue, même écrit différemment par le fournisseur
 * (« IPHONE13PRO 128GB » → « Apple iPhone 13 Pro 128 Go »).
 */

const MATCH_THRESHOLD = 0.42;
const AMBIGUITY_MARGIN = 0.04;

// Lignes d'en-tête ou de pied de page à ignorer
const IGNORED_LINE =
  /^(bon de livraison|bl\b|date|fournisseur|client|adresse|total|sous total|tva|signature|page|ref(erence)?\s*:|designation|article|qte|quantite|merci)/;

const QUANTITY_FIRST = /^\s*(\d{1,5})\s*(?:x|×|\*|pcs?|pieces?|unites?|u)?\s*[-:]?\s+(.{2,})$/i;
const QUANTITY_LAST =
  /^(.{2,}?)\s*(?:[-:;|,=]|x|×|\*|qte|quantite)\s*(\d{1,5})\s*(?:pcs?|pieces?|unites?|u)?\s*$/i;

/** Référence du bon (« BL n° 4521 », « Bon de livraison : FR-2026-118 »). */
function findReference(text) {
  const match = text.match(
    /(?:\bBL\b|bon de livraison|livraison)\s*(?:n[°o]\.?|#|:)?\s*([A-Z0-9][A-Z0-9-]{2,})/i,
  );
  return match ? match[1] : null;
}

/**
 * Extrait les lignes « produit + quantité » d'un bon de livraison saisi ou collé.
 * Formats acceptés : « 10 x iPhone 13 », « iPhone 13 - 10 », « iPhone 13;10 », « 10 iPhone 13 ».
 */
export function parseDeliveryNote(text) {
  const lines = [];
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (!line || !/[a-z]/i.test(line)) continue;
    if (IGNORED_LINE.test(normalizeText(line))) continue;

    const first = line.match(QUANTITY_FIRST);
    const last = line.match(QUANTITY_LAST);
    // « 10 x Produit » est prioritaire ; sinon la quantité en fin de ligne
    if (first && !/^\d+\s*(go|gb|mo|ml|cm|l|kg|g|pouces?)\b/i.test(line)) {
      lines.push({ label: first[2].trim(), quantity: Number(first[1]), raw: line });
    } else if (last) {
      lines.push({ label: last[1].trim(), quantity: Number(last[2]), raw: line });
    }
  }
  return {
    reference: findReference(String(text)),
    lines: lines.filter((line) => line.quantity > 0),
  };
}

/** Part des mots de la ligne retrouvés dans le nom du produit (les nombres comptent double). */
function tokenCoverage(labelTokens, productTokens) {
  if (labelTokens.length === 0) return 0;
  const productSet = new Set(productTokens);
  let total = 0;
  let found = 0;
  for (const token of labelTokens) {
    const weight = /\d/.test(token) ? 2 : 1;
    total += weight;
    if (
      productSet.has(token) ||
      [...productSet].some((other) => other.startsWith(token) || token.startsWith(other))
    ) {
      found += weight;
    }
  }
  return found / total;
}

/**
 * Produits du catalogue les plus proches d'un libellé, avec un score de confiance (0 à 1).
 * @returns {{ status: 'matched'|'ambiguous'|'unknown', candidates: { productId, name, score }[] }}
 */
export function matchProduct(label, products) {
  const labelTokens = tokenize(label);
  const candidates = products
    .map((product) => {
      const score =
        0.55 * textSimilarity(label, product.name) +
        0.45 * tokenCoverage(labelTokens, tokenize(product.name));
      return { productId: product.id, name: product.name, score: Math.round(score * 100) / 100 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const [best, second] = candidates;
  let status = 'unknown';
  if (best && best.score >= MATCH_THRESHOLD) {
    status = second && best.score - second.score < AMBIGUITY_MARGIN ? 'ambiguous' : 'matched';
  }
  return { status, candidates };
}
