import * as productsModule from '../../products/index.js';
import * as reviewsModule from '../../reviews/index.js';
import { cached } from '../ai.cache.js';
import { withClaude } from '../ai.data.js';
import { summarizeReviews } from '../engine/reviews.js';
import { generateStructured } from '../llm/claude.js';

const MINIMUM_REVIEWS = 2;
const MAX_REVIEWS_FOR_CLAUDE = 40;

const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Synthèse en 2 phrases maximum' },
    pros: { type: 'array', items: { type: 'string' }, description: 'Points forts (3 au maximum)' },
    cons: {
      type: 'array',
      items: { type: 'string' },
      description: 'Points faibles (3 au maximum)',
    },
  },
  required: ['summary', 'pros', 'cons'],
  additionalProperties: false,
};

async function summarizeWithClaude(productName, reviews) {
  const lines = reviews
    .slice(0, MAX_REVIEWS_FOR_CLAUDE)
    .map((review) => `- ${review.rating}/5 : ${review.comment.slice(0, 400)}`)
    .join('\n');
  return generateStructured({
    system:
      'Tu es l’assistant d’une boutique en ligne tunisienne. Tu résumes fidèlement des avis clients, ' +
      'en français, sans rien inventer : chaque point fort ou faible doit être cité par plusieurs avis ' +
      'ou par un avis explicite. Points courts (5 à 8 mots).',
    content: `Produit : ${productName}\nAvis des clients :\n${lines}`,
    schema: SUMMARY_SCHEMA,
  });
}

/** Résumé des avis d'un produit (mis en cache tant que les avis ne changent pas). */
export async function getReviewsSummary(productId) {
  await productsModule.assertProductExists(productId);
  const reviews = await reviewsModule.getReviewsForAnalysis(productId);
  const count = reviews.length;
  if (count < MINIMUM_REVIEWS) return { available: false, count, minimum: MINIMUM_REVIEWS };

  const average =
    Math.round((reviews.reduce((total, review) => total + review.rating, 0) / count) * 10) / 10;
  // Invalidé aussi par l'événement « avis modifié » (voir index.js)
  return cached(`reviews:${productId}:${count}-${average}`, 60 * 60_000, async () => {
    const local = summarizeReviews(reviews);
    const result = await withClaude(
      async () => {
        const [product] = (await productsModule.getProductSummaries([productId])).values();
        return summarizeWithClaude(product?.name ?? '', reviews);
      },
      async () => ({ summary: local.summary, pros: local.pros, cons: local.cons }),
    );
    return { available: true, count, average, positiveShare: local.positiveShare, ...result };
  });
}
