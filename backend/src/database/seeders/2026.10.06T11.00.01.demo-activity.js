import { randomBytes } from 'node:crypto';
import { DELIVERY_STATUS, ORDER_STATUS, ROLES, STOCK_MOVEMENT_TYPE } from '@smart-ecommerce/shared';
import { env } from '../../config/env.js';
import { hashPassword } from '../../core/security/password.js';
import { multiplyAmount, sumAmounts } from '../../core/utils/money.js';
import { models, sequelize } from '../index.js';
import { DEMO_PRODUCTS } from './data/catalog.js';
import {
  CARRIERS,
  DEMO_CLIENT_ADDRESSES,
  DEMO_CLIENTS,
  DEMO_COMPLAINTS,
  REVIEW_COMMENTS,
} from './data/activity.js';

/*
 * Activité de démonstration : clients, adresses, commandes à tous les statuts, livraisons,
 * historique du stock, popularité, avis, réclamations et paniers.
 *
 * Les règles métier sont respectées : le stock diminue à la confirmation d'une commande,
 * il est restauré si elle est annulée après confirmation, et seuls les clients livrés
 * donnent un avis. Les quantités finales correspondent au champ `stock` du catalogue.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const CANCELLED_AFTER_CONFIRM = 'CANCELLED_AFTER_CONFIRM';

// [statut, il y a N jours] — le client n° (index % nombre de clients) passe la commande.
const ORDER_PLAN = [
  ['DELIVERED', 58],
  ['DELIVERED', 56],
  ['DELIVERED', 54],
  [CANCELLED_AFTER_CONFIRM, 52],
  ['DELIVERED', 50],
  ['DELIVERED', 47],
  ['DELIVERED', 45],
  ['DELIVERED', 42],
  ['CANCELLED', 40],
  ['DELIVERED', 37],
  ['DELIVERED', 35],
  ['DELIVERED', 32],
  ['DELIVERED', 30],
  [CANCELLED_AFTER_CONFIRM, 27],
  ['DELIVERED', 24],
  ['DELIVERED', 21],
  ['DELIVERED', 18],
  ['DELIVERED', 15],
  ['SHIPPED', 6],
  ['DELIVERED', 12],
  ['DELIVERED', 10],
  ['DELIVERED', 8],
  ['SHIPPED', 5],
  ['SHIPPED', 4],
  ['SHIPPED', 3],
  ['CONFIRMED', 2],
  ['CONFIRMED', 2],
  ['PENDING', 1],
  ['CONFIRMED', 1],
  ['PENDING', 1],
  ['PENDING', 0],
  ['PENDING', 0],
];
const ORDER_NOTES = ['Merci de sonner à l’interphone.', 'Livraison après 17 h si possible.'];
const RATING_POOL = [5, 5, 5, 5, 4, 4, 4, 3, 3, 2];
const DEMO_CARTS = {
  demo: [
    ['Lampe de table design', 1],
    ['Lot de 3 balles de tennis', 2],
  ],
  0: [['Apple iPad mini 2021', 1]],
  3: [
    ['Palette de fards à paupières', 1],
    ['Rouge à lèvres rouge intense', 2],
  ],
};

/** Générateur pseudo-aléatoire déterministe : les mêmes données à chaque exécution. */
function createRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function up() {
  const random = createRandom(2026);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const now = Date.now();
  const atMost = (date) => new Date(Math.min(date.getTime(), now - HOUR));

  await sequelize.transaction(async (transaction) => {
    const {
      Address,
      Cart,
      CartItem,
      Complaint,
      Delivery,
      Order,
      OrderItem,
      Product,
      Review,
      Role,
      Stock,
      StockMovement,
      User,
    } = models;
    const options = { transaction };

    const findUserWithRole = (roleName) =>
      User.findOne({
        include: [{ model: Role, as: 'role', where: { name: roleName } }],
        order: [['id', 'ASC']],
        ...options,
      });
    const admin = await findUserWithRole(ROLES.ADMIN);
    const stockManager = await findUserWithRole(ROLES.STOCK_MANAGER);

    const products = await Product.findAll({
      where: { name: DEMO_PRODUCTS.map((product) => product.name) },
      include: [{ model: Stock, as: 'stock' }],
      order: [['id', 'ASC']],
      ...options,
    });
    if (products.length === 0) {
      throw new Error(
        'Catalogue de démonstration absent : le seeder demo-catalog doit être exécuté avant.',
      );
    }
    const productByName = new Map(products.map((product) => [product.name, product]));

    /* ─── 1. Clients et adresses ─── */
    const clientRole = await Role.findOne({ where: { name: ROLES.CLIENT }, ...options });
    const passwordHash = await hashPassword(
      env.SEED_CLIENT_PASSWORD ?? `${randomBytes(12).toString('base64url')}aA1`,
    );

    const clients = []; // { key, user, address }
    const demoClient = env.SEED_CLIENT_EMAIL
      ? await User.findOne({ where: { email: env.SEED_CLIENT_EMAIL.toLowerCase() }, ...options })
      : null;
    if (demoClient) {
      for (const address of DEMO_CLIENT_ADDRESSES) {
        await Address.create({ ...address, userId: demoClient.id, country: 'Tunisie' }, options);
      }
      const address = await Address.findOne({
        where: { userId: demoClient.id, isDefault: true },
        ...options,
      });
      clients.push({ key: 'demo', user: demoClient, address });
    }
    for (const [index, client] of DEMO_CLIENTS.entries()) {
      const [user] = await User.findOrCreate({
        where: { email: client.email },
        defaults: {
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          passwordHash,
          roleId: clientRole.id,
          createdAt: new Date(now - (70 - index * 3) * DAY),
        },
        ...options,
      });
      const address = await Address.create(
        {
          ...client.address,
          userId: user.id,
          label: 'Maison',
          country: 'Tunisie',
          phone: client.phone,
          isDefault: true,
        },
        options,
      );
      clients.push({ key: index, user, address });
    }

    /* ─── 2. Commandes, lignes et livraisons ─── */
    const stockEvents = new Map(); // productId → [{ date, change, type, orderId }]
    const salesCount = new Map(); // productId → exemplaires vendus
    const ordersByClient = new Map(); // clé client → [{ order, plan, items, deliveredAt }]
    const addStockEvent = (productId, event) =>
      stockEvents.set(productId, [...(stockEvents.get(productId) ?? []), event]);

    for (const [index, [plan, daysAgo]] of ORDER_PLAN.entries()) {
      const client = clients[index % clients.length];
      const createdAt = new Date(now - daysAgo * DAY - Math.floor(random() * 8 + 1) * HOUR);
      const at = (hours) => atMost(new Date(createdAt.getTime() + hours * HOUR));

      // Commandes non encore confirmées : uniquement des produits disponibles (confirmables en démo)
      const pool = ['PENDING', 'CONFIRMED'].includes(plan)
        ? products.filter((product) => product.stock.quantity >= 3)
        : products;
      const chosen = new Set();
      const itemCount = 1 + Math.floor(random() * 3);
      while (chosen.size < itemCount) chosen.add(pick(pool));
      const lines = [...chosen].map((product) => {
        const quantity = product.price >= 500 ? 1 : 1 + Math.floor(random() * 2);
        return {
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity,
          lineTotal: multiplyAmount(product.price, quantity),
        };
      });

      const confirmedAt = ['DELIVERED', 'SHIPPED', 'CONFIRMED', CANCELLED_AFTER_CONFIRM].includes(
        plan,
      )
        ? at(4)
        : null;
      const shippedAt = ['DELIVERED', 'SHIPPED'].includes(plan) ? at(26) : null;
      const deliveredAt = plan === 'DELIVERED' ? at(74) : null;
      const cancelledAt =
        plan === 'CANCELLED' ? at(18) : plan === CANCELLED_AFTER_CONFIRM ? at(30) : null;
      const status = plan === CANCELLED_AFTER_CONFIRM ? ORDER_STATUS.CANCELLED : plan;

      const order = await Order.create(
        {
          userId: client.user.id,
          status,
          totalAmount: sumAmounts(lines.map((line) => line.lineTotal)),
          shippingAddress: {
            recipient: `${client.user.firstName} ${client.user.lastName}`,
            label: client.address.label,
            street: client.address.street,
            city: client.address.city,
            postalCode: client.address.postalCode,
            country: client.address.country,
            phone: client.address.phone ?? client.user.phone,
          },
          notes: index % 5 === 0 ? pick(ORDER_NOTES) : null,
          confirmedAt,
          cancelledAt,
          createdAt,
        },
        options,
      );
      await OrderItem.bulkCreate(
        lines.map((line) => ({ ...line, orderId: order.id, createdAt })),
        options,
      );

      const deliveryStatus = {
        DELIVERED: DELIVERY_STATUS.DELIVERED,
        SHIPPED: DELIVERY_STATUS.IN_TRANSIT,
        CONFIRMED: DELIVERY_STATUS.PENDING,
        PENDING: DELIVERY_STATUS.PENDING,
        CANCELLED: DELIVERY_STATUS.CANCELLED,
        [CANCELLED_AFTER_CONFIRM]: DELIVERY_STATUS.CANCELLED,
      }[plan];
      await Delivery.create(
        {
          orderId: order.id,
          status: deliveryStatus,
          carrier: shippedAt ? pick(CARRIERS) : null,
          trackingNumber: shippedAt
            ? `SE-${String(order.id).padStart(6, '0')}-${1000 + Math.floor(random() * 9000)}`
            : null,
          estimatedDeliveryDate: shippedAt
            ? new Date(shippedAt.getTime() + 3 * DAY).toISOString().slice(0, 10)
            : null,
          shippedAt,
          deliveredAt,
          createdAt,
        },
        options,
      );

      // Stock : sortie à la confirmation, retour si annulation après confirmation
      for (const line of lines) {
        if (confirmedAt) {
          addStockEvent(line.productId, {
            date: confirmedAt,
            change: -line.quantity,
            type: STOCK_MOVEMENT_TYPE.OUT,
            orderId: order.id,
            reason: `Commande n°${order.id} confirmée`,
          });
        }
        if (plan === CANCELLED_AFTER_CONFIRM) {
          addStockEvent(line.productId, {
            date: cancelledAt,
            change: line.quantity,
            type: STOCK_MOVEMENT_TYPE.RETURN,
            orderId: order.id,
            reason: `Annulation de la commande n°${order.id}`,
          });
        }
        if (['DELIVERED', 'SHIPPED', 'CONFIRMED'].includes(plan)) {
          salesCount.set(line.productId, (salesCount.get(line.productId) ?? 0) + line.quantity);
        }
      }

      ordersByClient.set(client.key, [
        ...(ordersByClient.get(client.key) ?? []),
        { order, plan, lines, deliveredAt },
      ]);
    }

    /* ─── 3. Historique du stock (cohérent avec les quantités finales) ─── */
    for (const product of products) {
      const events = (stockEvents.get(product.id) ?? []).sort((a, b) => a.date - b.date);
      const finalQuantity = product.stock.quantity;
      const initialQuantity =
        finalQuantity - events.reduce((total, event) => total + event.change, 0);
      if (initialQuantity <= 0) continue;

      let quantity = initialQuantity;
      await StockMovement.create(
        {
          productId: product.id,
          type: STOCK_MOVEMENT_TYPE.IN,
          quantityChange: initialQuantity,
          quantityAfter: quantity,
          reason: 'Stock initial',
          userId: stockManager?.id,
          createdAt: new Date(product.createdAt.getTime() + HOUR),
        },
        options,
      );
      for (const event of events) {
        quantity += event.change;
        await StockMovement.create(
          {
            productId: product.id,
            type: event.type,
            quantityChange: event.change,
            quantityAfter: quantity,
            reason: event.reason,
            orderId: event.orderId,
            userId: admin?.id,
            createdAt: event.date,
          },
          options,
        );
      }
    }

    /* ─── 4. Popularité ─── */
    for (const [productId, count] of salesCount) {
      await Product.update({ salesCount: count }, { where: { id: productId }, ...options });
    }

    /* ─── 5. Avis (uniquement sur des produits livrés) ─── */
    const reviewed = new Set();
    for (const [clientKey, orders] of ordersByClient) {
      const delivered = orders.filter(({ plan }) => plan === 'DELIVERED');
      // Le client de démo garde une commande livrée sans avis, pour pouvoir en écrire un.
      const toReview = clientKey === 'demo' ? delivered.slice(0, 1) : delivered;
      for (const { order, lines, deliveredAt } of toReview) {
        for (const line of lines) {
          const key = `${order.userId}-${line.productId}`;
          if (reviewed.has(key) || random() > 0.8) continue;
          reviewed.add(key);
          const rating = pick(RATING_POOL);
          await Review.create(
            {
              userId: order.userId,
              productId: line.productId,
              rating,
              comment: pick(REVIEW_COMMENTS[rating]),
              createdAt: atMost(new Date(deliveredAt.getTime() + (1 + random() * 3) * DAY)),
            },
            options,
          );
        }
      }
    }
    for (const product of products) {
      const reviews = await Review.findAll({ where: { productId: product.id }, ...options });
      if (reviews.length === 0) continue;
      const average = reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;
      await product.update(
        { ratingAverage: Math.round(average * 100) / 100, reviewCount: reviews.length },
        options,
      );
    }

    /* ─── 6. Réclamations ─── */
    for (const complaint of DEMO_COMPLAINTS) {
      const client = clients.find(({ key }) => key === complaint.customer);
      if (!client) continue;
      const linkedOrder = complaint.orderStatus
        ? (ordersByClient.get(client.key) ?? [])
            .filter(({ plan }) => plan === complaint.orderStatus)
            .at(-1)?.order
        : null;
      const createdAt = atMost(
        new Date((linkedOrder?.createdAt.getTime() ?? now - 9 * DAY) + 3 * DAY),
      );
      const isHandled = complaint.status !== 'OPEN';
      await Complaint.create(
        {
          userId: client.user.id,
          orderId: linkedOrder?.id ?? null,
          subject: complaint.subject,
          description: complaint.description,
          status: complaint.status,
          adminResponse: complaint.adminResponse,
          handledBy: isHandled ? admin?.id : null,
          handledAt: isHandled ? atMost(new Date(createdAt.getTime() + DAY)) : null,
          createdAt,
        },
        options,
      );
    }

    /* ─── 7. Paniers en cours ─── */
    for (const [clientKey, items] of Object.entries(DEMO_CARTS)) {
      const client = clients.find(({ key }) => String(key) === clientKey);
      if (!client) continue;
      const [cart] = await Cart.findOrCreate({
        where: { userId: client.user.id },
        defaults: { userId: client.user.id },
        ...options,
      });
      for (const [productName, quantity] of items) {
        const product = productByName.get(productName);
        if (product) {
          await CartItem.create({ cartId: cart.id, productId: product.id, quantity }, options);
        }
      }
    }
  });
}

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function down() {
  const { Address, Cart, Complaint, Order, Review, User } = models;
  const demoEmails = DEMO_CLIENTS.map((client) => client.email);
  const users = await User.findAll({
    where: {
      email: env.SEED_CLIENT_EMAIL
        ? [...demoEmails, env.SEED_CLIENT_EMAIL.toLowerCase()]
        : demoEmails,
    },
  });
  const userIds = users.map((user) => user.id);

  await Complaint.destroy({ where: { userId: userIds } });
  await Review.destroy({ where: { userId: userIds } });
  await Order.destroy({ where: { userId: userIds } }); // lignes et livraisons supprimées en cascade
  await Cart.destroy({ where: { userId: userIds } });
  await Address.destroy({ where: { userId: userIds } });
  await User.destroy({ where: { email: demoEmails } });
  // Les compteurs des produits et l'historique du stock sont remis à zéro par « npm run db:reset ».
}
