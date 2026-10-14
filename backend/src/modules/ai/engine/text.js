/*
 * Traitement du texte en français (sans dépendance externe) : normalisation, mots-clés,
 * similarité entre deux textes et polarité (positif / négatif) d'une phrase.
 */

// Mots trop fréquents pour être utiles à la recherche ou à la classification.
const STOPWORDS = new Set(
  (
    'a au aux avec ce ces cet cette dans de des du elle en et eux il ils je la le les leur lui ma mais me ' +
    'meme mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton ' +
    'tu un une vos votre vous c d j l m n s t y est sont ete etre avoir ai as avons avez ont suis es ' +
    'etes fait faire plus tres trop bien aussi comme tout tous toute toutes cela ca si sans sous chez ' +
    'cherche veux voudrais voulais besoin peux pouvez quel quelle quels quelles avez merci svp stp bonjour'
  ).split(' '),
);

/** Minuscules, sans accents ni ponctuation : « Robe d’été ! » → « robe d ete ». */
export function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Racine simplifiée : retire la marque du pluriel (« ballons » → « ballon »). */
export function stem(token) {
  if (token.length > 4 && /[sx]$/.test(token) && !/ss$/.test(token)) return token.slice(0, -1);
  return token;
}

/** Mots significatifs d'un texte (sans mots vides, racinisés). */
export function tokenize(text) {
  return normalizeText(text)
    .split(' ')
    .filter((token) => token && !STOPWORDS.has(token) && (token.length > 1 || /\d/.test(token)))
    .map(stem);
}

function trigrams(text) {
  const padded = `  ${normalizeText(text)} `;
  const grams = new Set();
  for (let index = 0; index < padded.length - 2; index += 1) {
    grams.add(padded.slice(index, index + 3));
  }
  return grams;
}

/**
 * Similarité de Dice sur les trigrammes de caractères (0 à 1).
 * Robuste aux fautes de frappe et aux abréviations : « IPHONE13PRO » ≈ « iPhone 13 Pro ».
 */
export function textSimilarity(a, b) {
  const gramsA = trigrams(a);
  const gramsB = trigrams(b);
  if (gramsA.size === 0 || gramsB.size === 0) return 0;
  let common = 0;
  for (const gram of gramsA) if (gramsB.has(gram)) common += 1;
  return (2 * common) / (gramsA.size + gramsB.size);
}

/** Découpe un texte en phrases (et en propositions séparées par « mais »). */
export function splitSentences(text) {
  return String(text ?? '')
    .split(/[.!?;\n]+|\bmais\b|\bpar contre\b|\bcependant\b/i)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 2);
}

/* ─────────── Polarité (lexique de sentiments) ─────────── */

const POSITIVE_WORDS = new Set(
  (
    'excellent excellente parfait parfaite super genial geniale top bon bonne bons bonnes bien rapide ' +
    'rapides agreable confortable magnifique superbe beau belle beaux joli jolie recommande recommandons ' +
    'satisfait satisfaite ravi ravie content contente solide pratique elegant elegante efficace passionnant ' +
    'passionnante impeccable conforme adore aime fluide puissant puissante clair claire doux douce ' +
    'tient resistant resistante ideal ideale merveilleux incroyable compliments facile simple leger legere ' +
    'soigne soignee vivement'
  ).split(' '),
);

const NEGATIVE_WORDS = new Set(
  (
    'decu decue decevant decevante mauvais mauvaise nul nulle cher chere lent lente retard casse cassee ' +
    'abime abimee defectueux defectueuse probleme problemes panne fragile inadmissible scandaleux ' +
    'scandaleuse inacceptable pire horrible endommage endommagee manquant manquante erreur faux fausse mal ' +
    'difficile complique compliquee froisse decharge chauffe use usee raye rayee sale tache dommage ' +
    'regrette arnaque honte furieux furieuse colere insatisfait insatisfaite fuite tombe tombee lourd ' +
    'lourde bruyant bruyante desagreable forte trompeur'
  ).split(' '),
);

const NEGATIONS = new Set(['pas', 'jamais', 'aucun', 'aucune', 'ni', 'rien', 'sans']);

/**
 * Polarité d'un texte entre -1 (très négatif) et 1 (très positif), 0 si neutre.
 * Gère la négation simple : « pas bon » est négatif, « pas déçu » est positif. La négation ne
 * porte que sur sa proposition : dans « il ne répond pas, c'est inadmissible », « inadmissible »
 * reste négatif.
 */
export function sentimentScore(text) {
  let positive = 0;
  let negative = 0;
  for (const clause of String(text ?? '').split(/[.,;:!?()\n]+/)) {
    const tokens = normalizeText(clause).split(' ').filter(Boolean);
    tokens.forEach((token, index) => {
      const word = POSITIVE_WORDS.has(token) || NEGATIVE_WORDS.has(token) ? token : stem(token);
      const isPositive = POSITIVE_WORDS.has(word);
      const isNegative = NEGATIVE_WORDS.has(word);
      if (!isPositive && !isNegative) return;
      const negated = tokens.slice(Math.max(0, index - 2), index).some((t) => NEGATIONS.has(t));
      if (isPositive !== negated) positive += 1;
      else negative += 1;
    });
  }
  const total = positive + negative;
  return total === 0 ? 0 : (positive - negative) / total;
}

/** Vrai si l'un des mots ou expressions (déjà normalisés) apparaît dans le texte. */
export function containsAny(normalizedText, expressions) {
  const padded = ` ${normalizedText} `;
  return expressions.some((expression) => padded.includes(` ${expression} `));
}

/** Nombre d'expressions (déjà normalisées) présentes dans le texte. */
export function countMatches(normalizedText, expressions) {
  const padded = ` ${normalizedText} `;
  return expressions.filter((expression) => padded.includes(` ${expression} `)).length;
}
