import { AI_LEVEL, COMPLAINT_CATEGORY, CUSTOMER_SEGMENT } from '@smart-ecommerce/shared';
import { describe, expect, it } from 'vitest';
import {
  classifyComplaint,
  complaintPriority,
  complaintReplyTemplate,
} from '../../../src/modules/ai/engine/complaints.js';
import { buildAmountStats, scoreOrder } from '../../../src/modules/ai/engine/orderRisk.js';
import { matchProduct, parseDeliveryNote } from '../../../src/modules/ai/engine/reception.js';
import { segmentCustomers } from '../../../src/modules/ai/engine/segmentation.js';
import { COMPLAINT_TEST_SET } from '../../../src/modules/ai/evaluation/complaintTestSet.js';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 14);
const daysAgo = (days) => new Date(NOW - days * DAY);

describe('Réception intelligente', () => {
  it('lit les formats courants d’un bon de livraison et sa référence', () => {
    const note = parseDeliveryNote(
      [
        'Bon de livraison n° FR-2026-118',
        'Fournisseur : TechDistrib',
        '10 x IPHONE13PRO 128GB',
        'Balles tennis (lot de 3) - 24',
        'Blender 1,5 L ; 4',
        'Total : 38 articles',
      ].join('\n'),
    );

    expect(note.reference).toBe('FR-2026-118');
    expect(note.lines).toMatchObject([
      { label: 'IPHONE13PRO 128GB', quantity: 10 },
      { label: 'Balles tennis (lot de 3)', quantity: 24 },
      { label: 'Blender 1,5 L', quantity: 4 },
    ]);
  });

  it('rapproche chaque ligne du bon produit, ou la signale inconnue', () => {
    const catalog = [
      { id: 1, name: 'Apple iPhone 13 Pro 128 Go' },
      { id: 2, name: 'Lot de 3 balles de tennis' },
      { id: 3, name: 'Blender 1,5 L' },
    ];
    const iphone = matchProduct('IPHONE13PRO 128GB', catalog);
    expect(iphone.status).toBe('matched');
    expect(iphone.candidates[0].productId).toBe(1);
    expect(matchProduct('Balles tennis (lot de 3)', catalog).candidates[0].productId).toBe(2);
    expect(matchProduct('Casque Sony WH-1000XM5', catalog).status).toBe('unknown');
  });
});

describe('Analyse des réclamations', () => {
  it('classe correctement tout le jeu de test étiqueté', () => {
    for (const testCase of COMPLAINT_TEST_SET) {
      expect(classifyComplaint(testCase).category, testCase.subject).toBe(testCase.expected);
    }
  });

  it('reconnaît une demande de remboursement malgré le mot « reçu »', () => {
    expect(
      classifyComplaint({
        subject: 'Remboursement non reçu',
        description: 'Je ne suis toujours pas remboursée de ma commande annulée.',
      }).category,
    ).toBe(COMPLAINT_CATEGORY.REFUND);
  });

  it('juge urgente une réclamation énervée restée sans réponse', () => {
    const priority = complaintPriority({
      subject: 'Colis toujours pas reçu !!',
      description: 'Le transporteur ne répond pas, c’est inadmissible.',
      status: 'OPEN',
      createdAt: daysAgo(6),
      category: COMPLAINT_CATEGORY.DELIVERY,
      now: NOW,
    });
    expect(priority.level).toBe(AI_LEVEL.HIGH);
    expect(priority.reasons).toContain('Sans réponse depuis 6 jour(s)');
  });

  it('ne priorise pas une réclamation clôturée', () => {
    expect(
      complaintPriority({
        subject: 'x',
        description: 'y',
        status: 'RESOLVED',
        createdAt: daysAgo(30),
      }).level,
    ).toBe(AI_LEVEL.LOW);
  });

  it('rédige un brouillon personnalisé', () => {
    const reply = complaintReplyTemplate({
      firstName: 'Salma',
      category: COMPLAINT_CATEGORY.DEFECTIVE,
      orderId: 42,
    });
    expect(reply).toMatch(/^Bonjour Salma,/);
    expect(reply).toContain('commande n°42');
    expect(reply).toContain('échange ou un remboursement');
  });
});

describe('Score de risque d’une commande', () => {
  const history = [10, 20, 30, 40].map((days, index) => ({
    id: index + 1,
    status: 'DELIVERED',
    totalAmount: 120,
    city: 'Tunis',
    createdAt: daysAgo(days),
    items: [{ quantity: 1, productName: 'Livre' }],
  }));
  const amountStats = buildAmountStats(history);
  const customer = { createdAt: daysAgo(100) };

  it('considère une commande habituelle comme peu risquée', () => {
    const order = { ...history[0], id: 10, createdAt: daysAgo(1) };
    expect(scoreOrder(order, { customer, history: [...history, order], amountStats }).level).toBe(
      AI_LEVEL.LOW,
    );
  });

  it('signale une commande inhabituelle avec ses raisons', () => {
    const order = {
      id: 11,
      status: 'PENDING',
      totalAmount: 9800,
      city: 'Sfax',
      createdAt: daysAgo(0),
      items: [{ quantity: 4, productName: 'Écouteurs' }],
    };
    const risk = scoreOrder(order, { customer, history: [...history, order], amountStats });
    expect(risk.level).toBe(AI_LEVEL.HIGH);
    expect(risk.reasons).toEqual(
      expect.arrayContaining([
        'Nouvelle ville de livraison (Sfax)',
        'Quantité inhabituelle : 4 × Écouteurs',
      ]),
    );
  });
});

describe('Segmentation RFM', () => {
  const customers = [1, 2, 3].map((id) => ({ id, createdAt: daysAgo(200) }));
  const orders = [
    // Client 1 : achète chaque semaine depuis 6 mois → champion
    ...Array.from({ length: 26 }, (_, week) => ({
      userId: 1,
      status: 'DELIVERED',
      totalAmount: 300,
      createdAt: daysAgo(week * 7 + 1),
    })),
    // Client 2 : très actif autrefois, presque plus rien depuis 2 mois → à risque
    ...Array.from({ length: 20 }, (_, index) => ({
      userId: 2,
      status: 'DELIVERED',
      totalAmount: 100,
      createdAt: daysAgo(70 + index * 5),
    })),
    { userId: 2, status: 'DELIVERED', totalAmount: 100, createdAt: daysAgo(3) },
  ];

  it('repère les champions, les clients qui décrochent et ceux sans commande', () => {
    const segments = segmentCustomers(customers, orders, { now: NOW });
    expect(segments.get(1).segment).toBe(CUSTOMER_SEGMENT.CHAMPION);
    expect(segments.get(2).segment).toBe(CUSTOMER_SEGMENT.AT_RISK);
    expect(segments.get(2).activityTrend).toBeLessThan(-0.6);
    expect(segments.get(3).segment).toBe(CUSTOMER_SEGMENT.NO_ORDER);
  });
});
