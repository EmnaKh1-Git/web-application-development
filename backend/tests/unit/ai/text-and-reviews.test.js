import { describe, expect, it } from 'vitest';
import { summarizeReviews } from '../../../src/modules/ai/engine/reviews.js';
import {
  normalizeText,
  sentimentScore,
  textSimilarity,
  tokenize,
} from '../../../src/modules/ai/engine/text.js';

describe('Traitement du texte', () => {
  it('normalise accents, apostrophes et ponctuation', () => {
    expect(normalizeText('Robe d’été : TRÈS jolie !')).toBe('robe d ete tres jolie');
  });

  it('retire les mots vides et le pluriel', () => {
    expect(tokenize('Les ballons de football pour les enfants')).toEqual([
      'ballon',
      'football',
      'enfant',
    ]);
  });

  it('rapproche un libellé abrégé du bon nom de produit', () => {
    const close = textSimilarity('IPHONE13PRO 128GB', 'Apple iPhone 13 Pro 128 Go');
    const far = textSimilarity('IPHONE13PRO 128GB', 'Ballon de basketball');
    expect(close).toBeGreaterThan(far + 0.2);
  });
});

describe('Polarité (sentiment)', () => {
  it('distingue un avis positif d’un avis négatif', () => {
    expect(sentimentScore('Excellent produit, livraison rapide')).toBe(1);
    expect(sentimentScore('Produit cassé, très déçu')).toBe(-1);
  });

  it('gère la négation dans sa proposition seulement', () => {
    expect(sentimentScore('Pas déçu du tout')).toBe(1);
    expect(sentimentScore('Ce n’est pas bon')).toBe(-1);
    // « pas » ne porte pas sur « inadmissible », situé dans une autre proposition
    expect(sentimentScore('Le transporteur ne répond pas, c’est inadmissible')).toBe(-1);
  });
});

describe('Résumé local des avis', () => {
  const reviews = [
    {
      rating: 5,
      comment: 'Le tissu est doux et de très bonne qualité. La taille correspond bien.',
    },
    { rating: 4, comment: 'Très confortable à porter. Le tissu est agréable.' },
    { rating: 2, comment: 'La taille est trop petite, déçue.' },
    { rating: 5, comment: 'Très élégant, livraison rapide.' },
  ];

  it('donne un verdict, les points forts et les points faibles par aspect', () => {
    const result = summarizeReviews(reviews);

    expect(result.summary).toMatch(/^Les clients sont globalement satisfaits \(4/);
    expect(result.positiveShare).toBe(75);
    expect(result.pros.join(' ')).toMatch(/qualité/i);
    expect(result.cons.join(' ')).toMatch(/taille/i);
  });
});
