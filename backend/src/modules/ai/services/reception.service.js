import { AI_SOURCE } from '@smart-ecommerce/shared';
import { AppError, BadRequestError } from '../../../core/errors/index.js';
import { getCatalog, getStockLevels } from '../ai.data.js';
import { matchProduct, parseDeliveryNote } from '../engine/reception.js';
import { generateStructured, isClaudeEnabled } from '../llm/claude.js';

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    reference: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
      description: 'Numéro du bon de livraison, ou null s’il n’est pas visible',
    },
    lines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'Désignation du produit, telle qu’écrite' },
          quantity: { type: 'integer', description: 'Quantité livrée (au moins 1)' },
        },
        required: ['label', 'quantity'],
        additionalProperties: false,
      },
    },
  },
  required: ['reference', 'lines'],
  additionalProperties: false,
};

/** Lecture d'une photo de bon de livraison par Claude (vision). */
async function readPhoto(image, mediaType) {
  if (!isClaudeEnabled()) {
    throw new BadRequestError(
      'La lecture des photos nécessite Claude (clé ANTHROPIC_API_KEY du serveur). Collez plutôt le texte du bon.',
      'AI_VISION_UNAVAILABLE',
    );
  }
  try {
    return await generateStructured({
      system:
        'Tu lis des bons de livraison de fournisseurs (photos, parfois manuscrites). Extrais uniquement les lignes ' +
        'd’articles livrés : désignation exacte et quantité. Ignore en-têtes, adresses, prix et totaux. ' +
        'Si une quantité est illisible, n’invente rien et omets la ligne.',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
        {
          type: 'text',
          text: 'Voici le bon de livraison reçu. Extrais la référence et les lignes.',
        },
      ],
      schema: EXTRACTION_SCHEMA,
    });
  } catch (error) {
    throw new AppError('La lecture de la photo a échoué. Réessayez ou collez le texte du bon.', {
      statusCode: 503,
      code: 'AI_UNAVAILABLE',
      cause: error,
    });
  }
}

/**
 * Analyse d'un bon de livraison : extraction des lignes (texte ou photo) puis rapprochement
 * avec le catalogue. Rien n'est enregistré : le gestionnaire valide ensuite chaque ligne.
 */
export async function analyzeReception({ text, image, mediaType }) {
  const fromPhoto = Boolean(image);
  const extraction = fromPhoto ? await readPhoto(image, mediaType) : parseDeliveryNote(text);
  const [catalog, stocks] = await Promise.all([getCatalog(), getStockLevels()]);

  const lines = (extraction.lines ?? [])
    .filter((line) => Number.isInteger(line.quantity) && line.quantity > 0 && line.label?.trim())
    .map((line, index) => {
      const match = matchProduct(line.label, catalog);
      const best = match.candidates[0];
      return {
        index,
        label: line.label,
        quantity: line.quantity,
        status: match.status,
        candidates: match.candidates,
        productId: match.status === 'unknown' ? null : best.productId,
        currentStock: best ? (stocks.get(best.productId)?.quantity ?? null) : null,
      };
    });
  const count = (status) => lines.filter((line) => line.status === status).length;
  return {
    source: fromPhoto ? AI_SOURCE.CLAUDE : AI_SOURCE.LOCAL,
    reference: extraction.reference ?? null,
    lines,
    summary: {
      matched: count('matched'),
      ambiguous: count('ambiguous'),
      unknown: count('unknown'),
      units: lines.reduce((total, line) => total + line.quantity, 0),
    },
  };
}
