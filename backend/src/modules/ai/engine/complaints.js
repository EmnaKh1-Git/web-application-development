import { AI_LEVEL, COMPLAINT_CATEGORY, COMPLAINT_STATUS } from '@smart-ecommerce/shared';
import { countMatches, normalizeText, sentimentScore } from './text.js';

/*
 * Analyse automatique des réclamations : catégorie, priorité et brouillon de réponse.
 * Règles explicables (mots-clés pondérés + polarité + ancienneté) : l'administrateur voit
 * toujours POURQUOI une réclamation est jugée urgente.
 */

/** Liste d'expressions normalisées séparées par « | ». */
const list = (expressions) => expressions.split('|');

/**
 * Nombre de mots-clés présents. Un mot-clé d'un seul mot (4 lettres ou plus) est une racine :
 * « rembours » reconnaît « remboursement », « remboursée », « remboursez »...
 * Une expression de plusieurs mots doit apparaître telle quelle.
 */
function keywordHits(normalizedText, keywords) {
  const tokens = normalizedText.split(' ');
  return keywords.filter((keyword) =>
    keyword.includes(' ') || keyword.length < 4
      ? countMatches(normalizedText, [keyword]) > 0
      : tokens.some((token) => token.startsWith(keyword)),
  ).length;
}

const CATEGORY_KEYWORDS = {
  [COMPLAINT_CATEGORY.DELIVERY]: list(
    'livr|colis|retard|transporteur|recu|expedi|suivi|arriv|delai|depot',
  ),
  [COMPLAINT_CATEGORY.DEFECTIVE]: list(
    'cass|defectu|abim|panne|ne fonctionne|fonctionne pas|fonctionne plus|marche pas|allume pas|endommag|raye|fissur|defaut|qualite|dechir|tache|fuite|coule',
  ),
  [COMPLAINT_CATEGORY.WRONG_ITEM]: list(
    'erreur|mauvais|taille|couleur|manqu|pas le bon|pas la bonne|autre produit|echang|different|pas commande',
  ),
  [COMPLAINT_CATEGORY.REFUND]: list(
    'rembours|argent|paiement|paye|facture|avoir|debit|double|prix|retour',
  ),
  [COMPLAINT_CATEGORY.ACCOUNT]: list(
    'compte|connexion|connect|mot de passe|site|bug|email|inscription|application|page|erreur technique',
  ),
};

const URGENCY_EXPRESSIONS = list(
  'urgent|urgence|immediatement|inadmissible|scandaleux|inacceptable|avocat|plainte|toujours pas|depuis|honte|colere|furieux|furieuse|derniere fois|plus jamais|arnaque|remboursez|aucune reponse|sans reponse|cadeau',
);

const CATEGORY_WEIGHT = {
  [COMPLAINT_CATEGORY.DEFECTIVE]: 12,
  [COMPLAINT_CATEGORY.REFUND]: 12,
  [COMPLAINT_CATEGORY.DELIVERY]: 10,
  [COMPLAINT_CATEGORY.WRONG_ITEM]: 10,
  [COMPLAINT_CATEGORY.ACCOUNT]: 4,
  [COMPLAINT_CATEGORY.OTHER]: 4,
};

/** Catégorie la plus probable (l'objet compte double) et niveau de confiance. */
export function classifyComplaint({ subject, description }) {
  const subjectText = normalizeText(subject);
  const descriptionText = normalizeText(description);
  const scores = Object.entries(CATEGORY_KEYWORDS).map(([category, keywords]) => ({
    category,
    score: 2 * keywordHits(subjectText, keywords) + keywordHits(descriptionText, keywords),
  }));
  scores.sort((a, b) => b.score - a.score);
  const [best, second] = scores;
  if (!best || best.score === 0) {
    return { category: COMPLAINT_CATEGORY.OTHER, confidence: 0 };
  }
  const confidence = Math.min(0.95, 0.5 + 0.5 * ((best.score - (second?.score ?? 0)) / best.score));
  return { category: best.category, confidence: Math.round(confidence * 100) / 100 };
}

/**
 * Priorité de traitement (0 à 100) avec ses raisons :
 * ton du message, mots d'urgence, ancienneté sans réponse et gravité de la catégorie.
 */
export function complaintPriority({
  subject,
  description,
  status,
  createdAt,
  category,
  now = Date.now(),
}) {
  if (status === COMPLAINT_STATUS.RESOLVED || status === COMPLAINT_STATUS.REJECTED) {
    return { level: AI_LEVEL.LOW, score: 0, sentiment: 0, reasons: ['Réclamation clôturée'] };
  }
  const text = `${subject}. ${description}`;
  const normalized = normalizeText(text);
  const reasons = [];
  let score = 0;

  const sentiment = sentimentScore(text);
  if (sentiment < 0) {
    const points = Math.round(Math.abs(sentiment) * 30);
    score += points;
    if (points >= 15) reasons.push('Ton très mécontent');
  }
  const urgency = countMatches(normalized, URGENCY_EXPRESSIONS);
  const exclamations = (text.match(/!/g) ?? []).length;
  if (urgency > 0 || exclamations >= 2) {
    score += Math.min(30, urgency * 10 + (exclamations >= 2 ? 8 : 0));
    reasons.push('Expressions d’urgence ou d’exaspération');
  }
  const ageDays = (now - new Date(createdAt).getTime()) / 86_400_000;
  if (status === COMPLAINT_STATUS.OPEN && ageDays >= 2) {
    score += Math.min(25, Math.round(ageDays * 3));
    reasons.push(`Sans réponse depuis ${Math.floor(ageDays)} jour(s)`);
  }
  score += CATEGORY_WEIGHT[category] ?? 0;
  if (category === COMPLAINT_CATEGORY.DEFECTIVE || category === COMPLAINT_CATEGORY.REFUND) {
    reasons.push('Catégorie sensible (produit défectueux ou argent)');
  }

  score = Math.min(100, score);
  const level = score >= 55 ? AI_LEVEL.HIGH : score >= 30 ? AI_LEVEL.MEDIUM : AI_LEVEL.LOW;
  return {
    level,
    score,
    sentiment: Math.round(sentiment * 100) / 100,
    reasons: reasons.length > 0 ? reasons : ['Aucun signal d’urgence'],
  };
}

const REPLY_BODIES = {
  [COMPLAINT_CATEGORY.DELIVERY]:
    'Nous sommes désolés pour ce désagrément concernant votre livraison. Nous avons contacté le transporteur pour localiser votre colis et nous revenons vers vous sous 48 heures avec une solution (nouvel envoi ou remboursement si le colis est perdu).',
  [COMPLAINT_CATEGORY.DEFECTIVE]:
    'Nous sommes navrés que votre article soit arrivé dans cet état. Nous vous proposons un échange ou un remboursement complet : il vous suffit de nous renvoyer le produit, les frais de retour sont à notre charge.',
  [COMPLAINT_CATEGORY.WRONG_ITEM]:
    'Nous vous présentons nos excuses pour cette erreur dans votre commande. Nous vous envoyons le bon article dès aujourd’hui et un livreur récupérera l’article reçu par erreur, sans frais pour vous.',
  [COMPLAINT_CATEGORY.REFUND]:
    'Nous avons bien pris en compte votre demande de remboursement. Après vérification, le montant concerné vous sera remboursé sous 5 à 7 jours ouvrés ; vous recevrez une confirmation dès que l’opération sera effectuée.',
  [COMPLAINT_CATEGORY.ACCOUNT]:
    'Nous sommes désolés pour cette difficulté. Notre équipe technique a été informée ; en attendant, vous pouvez réinitialiser votre accès ou nous écrire et nous traiterons votre demande manuellement.',
  [COMPLAINT_CATEGORY.OTHER]:
    'Nous avons bien reçu votre message et nous vous remercions de nous l’avoir signalé. Notre équipe étudie votre demande et revient vers vous très rapidement.',
};

/** Brouillon de réponse au client (repli local quand Claude n'est pas configuré). */
export function complaintReplyTemplate({ firstName, category, orderId }) {
  const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
  const reference = orderId ? ` (commande n°${orderId})` : '';
  return `${greeting}\n\nMerci pour votre message${reference}. ${REPLY_BODIES[category] ?? REPLY_BODIES.OTHER}\n\nNous restons à votre disposition.\nL’équipe SmartE-Commerce`;
}
