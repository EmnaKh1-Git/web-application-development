import { containsAny, normalizeText, sentimentScore, splitSentences } from './text.js';

/*
 * Résumé des avis « par aspects » : chaque phrase d'un avis est rattachée aux aspects qu'elle
 * évoque (qualité, taille, livraison...) et reçoit une polarité. On obtient ainsi les points
 * forts et les points faibles réellement cités par les clients, avec leur nombre de mentions.
 */

const list = (expressions) => expressions.split('|');

const ASPECTS = [
  {
    key: 'quality',
    label: 'la qualité',
    words: list(
      'qualite|fabrication|finition|finitions|solide|robuste|matiere|tissu|resistant|resistante|use|usee|casse',
    ),
  },
  {
    key: 'price',
    label: 'le rapport qualité-prix',
    words: list('prix|cher|chere|rapport qualite prix|vaut'),
  },
  {
    key: 'delivery',
    label: 'la livraison',
    words: list('livraison|livre|livree|colis|emballage|emballe|emballee|recu|recue|arrive'),
  },
  {
    key: 'size',
    label: 'la taille',
    words: list('taille|tailles|grand|grande|petit|petite|coupe|ajuste|ajustee'),
  },
  {
    key: 'comfort',
    label: 'le confort',
    words: list('confortable|confort|agreable|doux|douce|leger|legere|lourd|lourde'),
  },
  {
    key: 'battery',
    label: 'l’autonomie',
    words: list('batterie|autonomie|charge|decharge|chargeur'),
  },
  { key: 'screen', label: 'l’écran', words: list('ecran|affichage') },
  { key: 'sound', label: 'le son', words: list('son|audio|basses|volume|bruyant') },
  { key: 'scent', label: 'le parfum', words: list('parfum|odeur|senteur|tient|tenue|flacon') },
  {
    key: 'look',
    label: 'le design',
    words: list(
      'design|joli|jolie|beau|belle|elegant|elegante|couleur|couleurs|style|photo|compliments',
    ),
  },
  {
    key: 'usability',
    label: 'la facilité d’utilisation',
    words: list('facile|pratique|simple|montage|monter|utilisation|prise en main|complique'),
  },
  {
    key: 'content',
    label: 'le contenu',
    words: list('lecture|histoire|ecrit|passionnant|passionnante|roman|pages|page'),
  },
  {
    key: 'performance',
    label: 'les performances',
    words: list('rapide|lent|lente|puissant|puissante|performance|fluide|chauffe'),
  },
];

function verdict(average) {
  if (average >= 4.3) return 'Les clients sont très satisfaits';
  if (average >= 3.6) return 'Les clients sont globalement satisfaits';
  if (average >= 2.8) return 'Les avis sont partagés';
  return 'Les clients sont plutôt déçus';
}

function joinLabels(labels) {
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} et ${labels.at(-1)}`;
}

/**
 * Résumé local d'une liste d'avis.
 * @param {{ rating: number, comment: string }[]} reviews
 */
export function summarizeReviews(reviews) {
  const count = reviews.length;
  const average =
    Math.round((reviews.reduce((total, review) => total + review.rating, 0) / count) * 10) / 10;
  const stats = new Map(
    ASPECTS.map((aspect) => [aspect.key, { ...aspect, positive: 0, negative: 0 }]),
  );

  for (const review of reviews) {
    // Une phrase sans mot de sentiment prend la tendance de la note
    const ratingPolarity = review.rating >= 4 ? 1 : review.rating <= 2 ? -1 : 0;
    for (const sentence of splitSentences(review.comment)) {
      const normalized = normalizeText(sentence);
      const polarity = Math.sign(sentimentScore(sentence)) || ratingPolarity;
      if (polarity === 0) continue;
      for (const aspect of ASPECTS) {
        if (!containsAny(normalized, aspect.words)) continue;
        const entry = stats.get(aspect.key);
        if (polarity > 0) entry.positive += 1;
        else entry.negative += 1;
      }
    }
  }

  const aspects = [...stats.values()].filter((aspect) => aspect.positive + aspect.negative > 0);
  const pros = aspects
    .filter((aspect) => aspect.positive > aspect.negative)
    .sort((a, b) => b.positive - a.positive)
    .slice(0, 3);
  const cons = aspects
    .filter((aspect) => aspect.negative > 0 && aspect.negative >= aspect.positive / 2)
    .sort((a, b) => b.negative - a.negative)
    .slice(0, 3);

  const positiveShare = Math.round(
    (reviews.filter((review) => review.rating >= 4).length / count) * 100,
  );
  let summary = `${verdict(average)} (${average.toLocaleString('fr-FR')}/5 sur ${count} avis, ${positiveShare} % de recommandations).`;
  if (pros.length > 0)
    summary += ` Ils apprécient surtout ${joinLabels(pros.map((aspect) => aspect.label))}.`;
  if (cons.length > 0)
    summary += ` Point(s) de vigilance : ${joinLabels(cons.map((aspect) => aspect.label))}.`;

  const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  return {
    summary,
    pros: pros.map(
      (aspect) =>
        `${capitalize(aspect.label)} (${aspect.positive} mention${aspect.positive > 1 ? 's' : ''})`,
    ),
    cons: cons.map(
      (aspect) =>
        `${capitalize(aspect.label)} (${aspect.negative} mention${aspect.negative > 1 ? 's' : ''})`,
    ),
    positiveShare,
  };
}
