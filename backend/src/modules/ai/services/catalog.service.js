import { AI_SOURCE } from '@smart-ecommerce/shared';
import { cached } from '../ai.cache.js';
import { getCatalog, getCategories, withClaude } from '../ai.data.js';
import { productDescriptionTemplate } from '../engine/copywriting.js';
import { leaveOneOutAccuracy, predictNaiveBayes, trainNaiveBayes } from '../engine/naiveBayes.js';
import { tokenize } from '../engine/text.js';
import { generateStructured } from '../llm/claude.js';

/** Document d'apprentissage : le nom compte double (plus discriminant que la description). */
const toTokens = (name, description = '') => [
  ...tokenize(name),
  ...tokenize(name),
  ...tokenize(description),
];

async function categoryDocuments() {
  const catalog = await getCatalog();
  return catalog
    .filter((product) => product.category)
    .map((product) => ({
      tokens: toTokens(product.name, product.description),
      label: product.category.id,
    }));
}

function getCategoryModel() {
  return cached('catalog:model:categories', 5 * 60_000, async () =>
    trainNaiveBayes(await categoryDocuments()),
  );
}

/** Catégories les plus probables pour un nouveau produit (bayésien naïf entraîné sur le catalogue). */
export async function suggestCategory({ name, description }) {
  const [model, categories] = await Promise.all([getCategoryModel(), getCategories()]);
  const predictions = predictNaiveBayes(model, toTokens(name, description ?? ''));
  const knownWords = predictions[0]?.knownTokens ?? 0;
  return {
    source: AI_SOURCE.LOCAL,
    // Aucun mot connu : le modèle ne peut rien affirmer
    suggestions:
      knownWords === 0
        ? []
        : predictions.slice(0, 3).map(({ label, probability }) => ({
            categoryId: label,
            name: categories.find((category) => category.id === label)?.name,
            probability,
          })),
  };
}

export async function evaluateCategoryModel() {
  const documents = await categoryDocuments();
  return { documents: documents.length, accuracy: leaveOneOutAccuracy(documents) };
}

const DESCRIPTION_SCHEMA = {
  type: 'object',
  properties: { description: { type: 'string', description: 'Description de 2 à 4 phrases' } },
  required: ['description'],
  additionalProperties: false,
};

/** Rédaction d'une description de fiche produit. */
export async function describeProduct({ name, categoryId, price, sizes, colors }) {
  const categories = await getCategories();
  const category = categories.find((item) => item.id === categoryId);
  return withClaude(
    () =>
      generateStructured({
        system:
          'Tu rédiges des fiches produits pour une boutique en ligne tunisienne. En français, 2 à 4 phrases, ' +
          'ton chaleureux et précis. N’invente aucune caractéristique technique chiffrée absente des informations ' +
          'fournies, pas de superlatifs excessifs, pas de prix dans le texte.',
        content: [
          `Nom : ${name}`,
          category && `Rayon : ${category.name}`,
          price && `Prix : ${price} DT`,
          sizes?.length && `Tailles : ${sizes.join(', ')}`,
          colors?.length && `Couleurs : ${colors.join(', ')}`,
        ]
          .filter(Boolean)
          .join('\n'),
        schema: DESCRIPTION_SCHEMA,
      }),
    async () => ({
      description: productDescriptionTemplate({
        name,
        categorySlug: category?.slug,
        sizes,
        colors,
      }),
    }),
  );
}
