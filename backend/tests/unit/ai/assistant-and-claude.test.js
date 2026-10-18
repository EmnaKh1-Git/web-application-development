import { PRODUCT_SORT } from '@smart-ecommerce/shared';
import { describe, expect, it, vi } from 'vitest';
import { parseShopperMessage, searchCatalog } from '../../../src/modules/ai/engine/assistant.js';

// Faux SDK Anthropic : aucun appel réseau pendant les tests
const create = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {}
  class Anthropic {
    static APIError = APIError;
    beta = { messages: { create } };
  }
  return { default: Anthropic };
});

const { AiProviderError, generateStructured, isClaudeEnabled } =
  await import('../../../src/modules/ai/llm/claude.js');

const product = (id, name, slug, price, extra = {}) => ({
  id,
  name,
  description: `${name} de qualité`,
  price,
  isActive: true,
  category: { id, name: slug, slug },
  rating: { average: 4, count: 2 },
  salesCount: 3,
  stock: { status: 'OK' },
  createdAt: '2026-01-01',
  ...extra,
});

describe('Assistant d’achat : compréhension du message', () => {
  it('extrait le budget, le rayon et l’idée cadeau', () => {
    const { intent, filters, gift } = parseShopperMessage(
      'Un cadeau pour ma sœur à moins de 150 DT',
    );
    expect(intent).toBe('search');
    expect(gift).toBe(true);
    expect(filters).toMatchObject({ maxPrice: 150, categorySlugs: ['beaute', 'mode'] });
  });

  it('comprend une fourchette de prix, un rayon et un tri', () => {
    const { filters } = parseShopperMessage('Les écouteurs les moins chers entre 50 et 300 dinars');
    expect(filters).toMatchObject({
      minPrice: 50,
      maxPrice: 300,
      categorySlug: 'high-tech',
      sort: PRODUCT_SORT.PRICE_ASC,
    });
  });

  it('reconnaît les questions de suivi et de politique de la boutique', () => {
    expect(parseShopperMessage('Où en est ma commande ?').intent).toBe('order_status');
    expect(parseShopperMessage('Comment se passe le paiement ?').intent).toBe('policy_payment');
    expect(parseShopperMessage('Bonjour').intent).toBe('greeting');
  });

  it('cherche dans le catalogue en respectant budget et disponibilité', () => {
    const catalog = [
      product(1, 'Écouteurs sans fil', 'high-tech', 249),
      product(2, 'Casque audio', 'high-tech', 1999),
      product(3, 'Écouteurs filaires', 'high-tech', 49, { stock: { status: 'OUT' } }),
    ];
    const results = searchCatalog(catalog, {
      keywords: ['ecouteur'],
      maxPrice: 500,
      inStockOnly: true,
    });
    expect(results.map((item) => item.id)).toEqual([1]);
  });
});

describe('Client Claude', () => {
  it('n’est jamais activé pendant les tests', () => {
    expect(isClaudeEnabled()).toBe(false);
  });

  it('renvoie le JSON des structured outputs', async () => {
    create.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: '{"summary":"Très bon produit"}' }],
    });

    const result = await generateStructured({ content: 'Avis : ...', schema: { type: 'object' } });

    expect(result).toEqual({ summary: 'Très bon produit' });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        output_config: {
          effort: 'low',
          format: { type: 'json_schema', schema: { type: 'object' } },
        },
        fallbacks: 'default',
      }),
    );
  });

  it('transforme un refus de Claude en erreur (repli local)', async () => {
    create.mockResolvedValueOnce({ stop_reason: 'refusal', content: [] });
    await expect(generateStructured({ content: 'x', schema: {} })).rejects.toBeInstanceOf(
      AiProviderError,
    );
  });

  it('transforme une erreur réseau en erreur du fournisseur', async () => {
    create.mockRejectedValueOnce(new Error('ECONNRESET'));
    await expect(generateStructured({ content: 'x', schema: {} })).rejects.toThrow(
      'Claude est indisponible',
    );
  });
});
