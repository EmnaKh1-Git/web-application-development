/**
 * Module Stock (Yassine) — tests UNITAIRES avec Jest.
 *
 * Le code testé est isolé : la base de données, le bus d'événements et les données lues par
 * le module IA sont remplacés par des faux (mocks). Aucun accès à MySQL, aucun appel à une IA réelle.
 * Chaque test suit le pattern AAA : Préparer → Agir → Vérifier.
 *
 * Lancement : npm run test:jest -w backend (aussi inclus dans npm test et dans la CI)
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  ORDER_STATUS,
  STOCK_MOVEMENT_TYPE,
  STOCK_RISK,
  STOCK_STATUS,
} from '@smart-ecommerce/shared';
import { EVENTS } from '../../../src/core/events/eventNames.js';

/* ───────────── Faux (mocks), déclarés AVANT d'importer le code testé ───────────── */

// Base de données simulée : uniquement les modèles utilisés par le service Stock.
const Stock = { findAll: jest.fn() };
const StockMovement = { create: jest.fn() };
jest.unstable_mockModule('../../../src/database/index.js', () => ({
  models: { Stock, StockMovement, Product: {}, Category: {}, User: {} },
  sequelize: {},
}));

// Bus d'événements simulé : on vérifie l'alerte « stock faible » sans abonné réel.
const publish = jest.fn();
jest.unstable_mockModule('../../../src/core/events/index.js', () => ({
  EVENTS,
  publish,
  subscribe: jest.fn(),
}));

// Données du module IA simulées : catalogue, historique des ventes et niveaux de stock fictifs.
const aiData = { getCatalog: jest.fn(), getOrders: jest.fn(), getStockLevels: jest.fn() };
jest.unstable_mockModule('../../../src/modules/ai/ai.data.js', () => aiData);

const { decreaseStockForOrder, toStockResponse } =
  await import('../../../src/modules/stock/stock.service.js');
const { getStockForecast } = await import('../../../src/modules/ai/services/forecast.service.js');

/* ───────────── Outils de préparation ───────────── */

const DAY_MS = 86_400_000;

/** Ligne de stock simulée : un enregistrement Sequelize réduit à ce que le service utilise. */
function fakeStock({ productId, quantity, lowStockThreshold = 5 }) {
  const stock = { productId, quantity, lowStockThreshold };
  stock.update = jest.fn(async (values) => Object.assign(stock, values));
  return stock;
}

/** Transaction simulée : garde les actions « après validation » pour les déclencher à la main. */
function fakeTransaction() {
  const afterCommitCallbacks = [];
  return {
    LOCK: { UPDATE: 'UPDATE' },
    afterCommit: jest.fn((callback) => afterCommitCallbacks.push(callback)),
    commit: () => afterCommitCallbacks.forEach((callback) => callback()),
  };
}

/** Les lignes de stock présentes « en base » pour ce test. */
function givenStocks(...stocks) {
  Stock.findAll.mockImplementation(async ({ where }) =>
    stocks.filter((stock) => where.productId.includes(stock.productId)),
  );
}

/** Historique fictif : un produit vendu `dailyQuantity` fois par jour pendant `days` jours. */
function givenSalesHistory({ dailyQuantity, days, stockQuantity }) {
  const today = Math.floor(Date.now() / DAY_MS);
  const product = {
    id: 1,
    name: 'Lot de 3 balles de tennis',
    price: 18.9,
    imageUrl: null,
    category: { id: 4, name: 'Sport' },
    createdAt: new Date((today - days + 1) * DAY_MS),
  };
  const orders = Array.from({ length: days }, (_, daysAgo) => ({
    status: ORDER_STATUS.DELIVERED,
    createdAt: new Date((today - daysAgo) * DAY_MS + 10 * 3_600_000), // chaque jour à 10 h UTC
    items: [{ productId: 1, quantity: dailyQuantity }],
  }));
  aiData.getCatalog.mockResolvedValue([product]);
  aiData.getOrders.mockResolvedValue(orders);
  aiData.getStockLevels.mockResolvedValue(
    new Map([[1, { quantity: stockQuantity, lowStockThreshold: 5 }]]),
  );
}

beforeEach(() => {
  StockMovement.create.mockImplementation(async (movement) => movement);
});

/* ───────────── Diminution du stock à la confirmation d'une commande ───────────── */

describe('Stock — confirmation d’une commande (decreaseStockForOrder)', () => {
  test('UT-01 — confirmer 3 unités fait passer le stock de 10 à 7 et enregistre une sortie', async () => {
    // Scénario nominal : le stock diminue à la CONFIRMATION de la commande (règle de l'équipe)
    // et chaque variation est tracée dans l'historique des mouvements, ligne verrouillée.

    // Préparer
    const stock = fakeStock({ productId: 1, quantity: 10 });
    givenStocks(stock);
    const transaction = fakeTransaction();
    const items = [{ productId: 1, productName: 'Lot de 3 balles de tennis', quantity: 3 }];

    // Agir
    await decreaseStockForOrder(42, items, { transaction, userId: 7 });

    // Vérifier
    expect(stock.quantity).toBe(7);
    expect(stock.update).toHaveBeenCalledWith({ quantity: 7 }, { transaction });
    expect(StockMovement.create).toHaveBeenCalledTimes(1);
    expect(StockMovement.create).toHaveBeenCalledWith(
      {
        productId: 1,
        type: STOCK_MOVEMENT_TYPE.OUT,
        quantityChange: -3,
        quantityAfter: 7,
        reason: 'Commande n°42 confirmée',
        orderId: 42,
        userId: 7,
      },
      { transaction },
    );
    expect(Stock.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ transaction, lock: transaction.LOCK.UPDATE }),
    );
    expect(transaction.afterCommit).not.toHaveBeenCalled(); // 7 > seuil de 5 : aucune alerte
  });

  test('UT-02 — confirmer 5 unités avec 2 en stock est refusé (409 INSUFFICIENT_STOCK) sans rien modifier', async () => {
    // Cas d'erreur : on ne vend jamais plus que ce qu'on a. L'erreur détaille le manque
    // pour que le back-office sache quel produit bloque la confirmation.

    // Préparer
    const stock = fakeStock({ productId: 1, quantity: 2 });
    givenStocks(stock);
    const items = [{ productId: 1, productName: 'Lot de 3 balles de tennis', quantity: 5 }];

    // Agir
    const confirmation = decreaseStockForOrder(43, items, {
      transaction: fakeTransaction(),
      userId: 7,
    });

    // Vérifier
    await expect(confirmation).rejects.toMatchObject({
      statusCode: 409,
      code: 'INSUFFICIENT_STOCK',
      details: [
        {
          productId: 1,
          productName: 'Lot de 3 balles de tennis',
          requested: 5,
          available: 2,
          message: 'Lot de 3 balles de tennis : 2 disponible(s) pour 5 demandé(s)',
        },
      ],
    });
    expect(stock.quantity).toBe(2);
    expect(stock.update).not.toHaveBeenCalled();
    expect(StockMovement.create).not.toHaveBeenCalled();
  });

  test('UT-03 — vendre exactement tout le stock le met à 0 (jamais négatif), en rupture, avec une alerte', async () => {
    // Cas limite : la quantité demandée est ÉGALE au stock. La vente passe, le stock tombe à 0,
    // l'état devient « Rupture » et l'alerte de stock faible part une fois la transaction validée.

    // Préparer
    const stock = fakeStock({ productId: 1, quantity: 5, lowStockThreshold: 5 });
    givenStocks(stock);
    const transaction = fakeTransaction();
    const items = [{ productId: 1, productName: 'Lot de 3 balles de tennis', quantity: 5 }];

    // Agir
    await decreaseStockForOrder(44, items, { transaction, userId: 7 });
    transaction.commit();

    // Vérifier
    expect(stock.quantity).toBe(0);
    expect(StockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({ quantityChange: -5, quantityAfter: 0 }),
      { transaction },
    );
    expect(toStockResponse(stock).status).toBe(STOCK_STATUS.OUT);
    expect(publish).toHaveBeenCalledWith(EVENTS.STOCK_LOW, {
      productId: 1,
      quantity: 0,
      threshold: 5,
    });
  });

  test('UT-04 — deux tailles du même produit partagent un seul stock : M × 2 + L × 3 = 5 > 4, refusé', async () => {
    // Cas limite : chaque ligne seule tient dans le stock (2 ≤ 4 et 3 ≤ 4), mais pas leur total.
    // Le service additionne les lignes d'un même produit avant de contrôler le stock.

    // Préparer
    const stock = fakeStock({ productId: 9, quantity: 4 });
    givenStocks(stock);
    const items = [
      { productId: 9, productName: 'T-shirt coton bio', quantity: 2 }, // taille M
      { productId: 9, productName: 'T-shirt coton bio', quantity: 3 }, // taille L
    ];

    // Agir
    const confirmation = decreaseStockForOrder(45, items, {
      transaction: fakeTransaction(),
      userId: 7,
    });

    // Vérifier
    await expect(confirmation).rejects.toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      details: [expect.objectContaining({ productId: 9, requested: 5, available: 4 })],
    });
    expect(Stock.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { productId: [9] } }),
    );
    expect(stock.quantity).toBe(4);
    expect(StockMovement.create).not.toHaveBeenCalled();
  });
});

/* ───────────── Prévisions IA du stock (IA simulée) ───────────── */

describe('Stock — prévisions IA (données simulées)', () => {
  test('UT-05a — 2 ventes par jour et 4 unités en stock : rupture imminente et réassort conseillé', async () => {
    // L'IA de prévision travaille sur des données SIMULÉES : 60 jours de ventes fictives
    // (2 unités par jour) et 4 unités en stock, soit 2 jours de couverture.
    // Quantité conseillée : de quoi tenir 5 jours de délai + 14 jours de revue, soit 2 × 19 − 4 = 34.

    // Préparer
    givenSalesHistory({ dailyQuantity: 2, days: 60, stockQuantity: 4 });

    // Agir
    const { items, summary } = await getStockForecast();

    // Vérifier
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      productId: 1,
      dailyDemand: 2,
      risk: STOCK_RISK.CRITICAL, // affiché « Rupture imminente »
      daysOfCover: 2,
      suggestedQuantity: 34,
    });
    expect(summary).toMatchObject({ critical: 1, toReorder: 1 });
  });

  test('UT-05b — IA indisponible : la prévision échoue proprement et le stock continue de fonctionner', async () => {
    // Panne simulée : le module IA ne peut plus lire l'historique des ventes.
    // La prévision renvoie une erreur, mais la gestion du stock n'en dépend pas :
    // une commande se confirme normalement au même moment.

    // Préparer
    aiData.getCatalog.mockResolvedValue([]);
    aiData.getOrders.mockRejectedValue(new Error('Service IA indisponible'));
    aiData.getStockLevels.mockResolvedValue(new Map());
    const stock = fakeStock({ productId: 1, quantity: 10 });
    givenStocks(stock);
    const items = [{ productId: 1, productName: 'Lot de 3 balles de tennis', quantity: 3 }];

    // Agir
    const [forecast, confirmation] = await Promise.allSettled([
      getStockForecast(),
      decreaseStockForOrder(46, items, { transaction: fakeTransaction(), userId: 7 }),
    ]);

    // Vérifier
    expect(forecast.status).toBe('rejected');
    expect(forecast.reason.message).toBe('Service IA indisponible');
    expect(confirmation.status).toBe('fulfilled');
    expect(stock.quantity).toBe(7);
    expect(StockMovement.create).toHaveBeenCalledTimes(1);
  });
});
