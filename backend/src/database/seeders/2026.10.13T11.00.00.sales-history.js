import { DELIVERY_STATUS, ORDER_STATUS, ROLES, STOCK_MOVEMENT_TYPE } from '@smart-ecommerce/shared';
import { Op, QueryTypes } from 'sequelize';
import { env } from '../../config/env.js';
import { multiplyAmount, sumAmounts } from '../../core/utils/money.js';
import { models, sequelize } from '../index.js';
import { CARRIERS, DEMO_CLIENTS } from './data/activity.js';
import {
  AFFINITIES,
  BALANCE_REASON,
  CLIENT_PROFILES,
  EXTRA_COMPLAINTS,
  HISTORY_MARKER,
  RECENT_PRODUCTS,
  RESTOCK_REASON,
  REVIEW_PHRASES,
  SUSPICIOUS_ORDERS,
} from './data/history.js';

/*
 * Historique de ventes de 6 mois, nécessaire aux modèles d'IA (prévision, recommandations,
 * segmentation). Simulation jour par jour, déterministe :
 * - demande par produit (loi de Poisson) selon le prix, la popularité, le jour de la semaine,
 *   une tendance et d'éventuelles promotions ;
 * - produits souvent achetés ensemble (co-achats) ;
 * - réassorts fournisseur quand le stock atteint le point de commande (délai de 2 à 4 jours) ;
 * - quelques avis, réclamations et commandes inhabituelles à vérifier.
 *
 * Cohérence du stock : l'historique s'intercale avec les mouvements existants sans jamais
 * consommer le stock dont ils ont besoin, puis une régularisation finale ramène chaque produit
 * exactement à son stock actuel. Le stock « après mouvement » est ensuite recalculé en SQL
 * et vérifié : la moindre incohérence annule tout (transaction).
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const WEEKDAY_FACTORS = [1.25, 0.9, 0.85, 0.95, 1, 1.15, 1.35]; // dimanche → samedi
const SALES_STATUSES = "('CONFIRMED', 'SHIPPED', 'DELIVERED')";
const IS_GENERATED = "JSON_UNQUOTE(JSON_EXTRACT(shipping_address, '$.source')) = :marker";

function createRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tirage selon une loi de Poisson (algorithme de Knuth). */
function poisson(lambda, random) {
  const limit = Math.exp(-lambda);
  let count = 0;
  let product = 1;
  do {
    count += 1;
    product *= random();
  } while (product > limit);
  return count - 1;
}

/** Ventes journalières moyennes selon le prix (les produits chers se vendent rarement). */
function baseRate(price) {
  if (price < 30) return 0.32;
  if (price < 100) return 0.22;
  if (price < 300) return 0.13;
  if (price < 1000) return 0.07;
  return 0.03;
}

/** Popularité et notes moyennes recalculées à partir des commandes et des avis. */
async function recomputeProductCounters(options) {
  await sequelize.query(
    `UPDATE products p SET sales_count = (
       SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.product_id = p.id AND o.status IN ${SALES_STATUSES})`,
    options,
  );
  await sequelize.query(
    `UPDATE products p SET
       rating_average = COALESCE((SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.product_id = p.id), 0),
       review_count = (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id)`,
    options,
  );
}

/** Stock après chaque mouvement = somme cumulée des variations, dans l'ordre chronologique. */
async function recomputeRunningStock(options) {
  await sequelize.query(
    `UPDATE stock_movements m
     JOIN (SELECT id, SUM(quantity_change) OVER (PARTITION BY product_id ORDER BY created_at, id) AS running
           FROM stock_movements) t ON t.id = m.id
     SET m.quantity_after = t.running`,
    options,
  );
  const [problem] = await sequelize.query(
    `SELECT s.product_id AS productId FROM stocks s
     WHERE EXISTS (SELECT 1 FROM stock_movements m WHERE m.product_id = s.product_id AND m.quantity_after < 0)
        OR s.quantity <> (SELECT COALESCE(SUM(m.quantity_change), 0) FROM stock_movements m WHERE m.product_id = s.product_id)
     LIMIT 1`,
    { type: QueryTypes.SELECT, ...options },
  );
  if (problem) throw new Error(`Historique de stock incohérent (produit n°${problem.productId})`);
}

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function up() {
  const random = createRandom(4242);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const between = (min, max) => min + random() * (max - min);
  const shuffle = (list) => {
    for (let index = list.length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1));
      [list[index], list[other]] = [list[other], list[index]];
    }
    return list;
  };
  const weightedPick = (list, weight) => {
    const total = list.reduce((sum, item) => sum + weight(item), 0);
    let threshold = random() * total;
    return list.find((item) => (threshold -= weight(item)) <= 0) ?? list.at(-1);
  };
  const now = Date.now();
  const todayStart = Math.floor(now / DAY) * DAY;

  await sequelize.transaction(async (transaction) => {
    const options = { transaction };
    const {
      Address,
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
    const findUserWithRole = (roleName) =>
      User.findOne({
        include: [{ model: Role, as: 'role', where: { name: roleName } }],
        order: [['id', 'ASC']],
        ...options,
      });
    const admin = await findUserWithRole(ROLES.ADMIN);
    const stockManager = await findUserWithRole(ROLES.STOCK_MANAGER);

    /* ─── 1. Clients (le compte existe avant sa première commande) ─── */
    const demoEmail = env.SEED_CLIENT_EMAIL?.toLowerCase();
    const users = await User.findAll({
      where: {
        email: [...DEMO_CLIENTS.map((client) => client.email), ...(demoEmail ? [demoEmail] : [])],
      },
      ...options,
    });
    const clients = [];
    for (const user of users) {
      const profile = CLIENT_PROFILES[user.email === demoEmail ? 'demo' : user.email];
      const address = await Address.findOne({
        where: { userId: user.id },
        order: [
          ['isDefault', 'DESC'],
          ['id', 'ASC'],
        ],
        ...options,
      });
      if (!profile || !address) continue;
      const activeFrom = todayStart - profile.activeFrom * DAY;
      const createdAt = new Date(activeFrom - between(3, 20) * DAY);
      if (user.createdAt > createdAt) {
        await sequelize.query('UPDATE users SET created_at = :createdAt WHERE id = :id', {
          replacements: { createdAt, id: user.id },
          ...options,
        });
      }
      clients.push({
        user,
        address,
        profile,
        activeFrom,
        activeUntil: todayStart - profile.activeUntil * DAY,
      });
    }
    if (clients.length === 0) {
      throw new Error(
        'Clients de démonstration absents : le seeder demo-activity doit être exécuté avant.',
      );
    }

    /* ─── 2. Produits : période d'historique, mouvements existants, paramètres de demande ─── */
    const products = await Product.findAll({
      where: { isActive: true },
      include: [{ model: Stock, as: 'stock' }, { association: 'category' }],
      ...options,
    });
    const movements = await StockMovement.findAll({
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
      ...options,
    });
    const plans = new Map();
    for (const product of products) {
      const history = movements.filter((movement) => movement.productId === product.id);
      const initialIndex = history.findIndex((movement) => movement.reason === 'Stock initial');
      if (initialIndex === -1 || !product.stock) continue;
      const initial = history[initialIndex];
      const historyDays = RECENT_PRODUCTS.includes(product.name)
        ? between(45, 70)
        : between(150, 182);
      const start = Math.min(
        todayStart - Math.round(historyDays) * DAY + 9 * HOUR,
        initial.createdAt.getTime(),
      );
      const rate = baseRate(product.price) * between(0.4, 2);
      plans.set(product.id, {
        product,
        stock: initial.quantityAfter,
        currentStock: product.stock.quantity,
        // Mouvements existants après le stock initial : ils doivent rester possibles
        existing: history.slice(initialIndex + 1).map((movement) => ({
          time: movement.createdAt.getTime(),
          change: movement.quantityChange,
        })),
        start,
        rate,
        trend: between(-0.6, 0.9),
        promoDay: random() < 0.35 ? Math.floor(between(20, historyDays - 10)) : null,
        reorderPoint: Math.max(2, Math.ceil(rate * 7)),
        target: Math.max(initial.quantityAfter, product.stock.quantity, Math.ceil(rate * 21) + 2),
        restockDay: null,
        quality: between(3.2, 4.8),
        events: [],
      });
      await sequelize.query('UPDATE products SET created_at = :date WHERE id = :id', {
        replacements: { date: new Date(start - HOUR), id: product.id },
        ...options,
      });
      await sequelize.query('UPDATE stock_movements SET created_at = :date WHERE id = :id', {
        replacements: { date: new Date(start), id: initial.id },
        ...options,
      });
    }
    const planByName = new Map([...plans.values()].map((plan) => [plan.product.name, plan]));
    const partners = new Map();
    for (const [a, b] of AFFINITIES) {
      if (!planByName.has(a) || !planByName.has(b)) continue;
      partners.set(a, [...(partners.get(a) ?? []), planByName.get(b)]);
      partners.set(b, [...(partners.get(b) ?? []), planByName.get(a)]);
    }

    /** Stock à garder pour les sorties existantes à venir (pire baisse cumulée après `time`). */
    const reservedFor = (plan, time) => {
      let running = 0;
      let worst = 0;
      for (const event of plan.existing) {
        if (event.time <= time) continue;
        running += event.change;
        worst = Math.min(worst, running);
      }
      return -worst;
    };
    const available = (plan, time) => plan.stock - reservedFor(plan, time);

    /* ─── 3. Simulation jour par jour, jusqu'à hier ─── */
    const isOpen = (plan, dayStart) => dayStart > plan.start;
    const lineFor = (plan, quantity) => ({
      plan,
      quantity,
      size: plan.product.sizes?.length ? pick(plan.product.sizes) : null,
      color: plan.product.colors?.length ? pick(plan.product.colors) : null,
    });
    const deliveredLines = []; // pour les avis
    const ordersByUser = new Map(); // pour les réclamations
    const firstDay =
      Math.floor(Math.min(...[...plans.values()].map((plan) => plan.start)) / DAY) + 1;

    for (let day = firstDay; day < Math.floor(now / DAY); day += 1) {
      const dayStart = day * DAY;
      const dayEnd = dayStart + DAY;

      for (const plan of plans.values()) {
        // Prudence : sorties existantes du jour appliquées dès le matin, entrées le soir
        for (const event of plan.existing) {
          if (event.time >= dayStart && event.time < dayEnd && event.change < 0)
            plan.stock += event.change;
        }
        // Réassort livré ce matin
        if (plan.restockDay === day) {
          plan.restockDay = null;
          const quantity = plan.target - plan.stock;
          if (quantity > 0) {
            plan.stock += quantity;
            plan.events.push({
              date: new Date(dayStart + 8 * HOUR + Math.floor(random() * 60) * 60_000),
              change: quantity,
              type: STOCK_MOVEMENT_TYPE.IN,
              reason: RESTOCK_REASON,
              userId: stockManager?.id,
            });
          }
        }
      }

      // Demande du jour (limitée au stock disponible : au-delà, vente perdue)
      const weekday = WEEKDAY_FACTORS[new Date(dayStart).getUTCDay()];
      const lines = [];
      for (const plan of plans.values()) {
        if (!isOpen(plan, dayStart)) continue;
        const progress = (dayStart - plan.start) / (now - plan.start);
        const trend = Math.max(0.3, 1 + plan.trend * (progress - 0.5));
        const offset = (dayStart - plan.start) / DAY - (plan.promoDay ?? -100);
        const promo = offset >= 0 && offset < 5 ? 2.2 : 1;
        const demand = poisson(plan.rate * weekday * trend * promo, random);
        const quantity = Math.min(
          demand,
          Math.max(0, available(plan, dayEnd)),
          plan.product.price >= 500 ? 1 : 3,
        );
        if (quantity > 0) {
          plan.stock -= quantity;
          lines.push(lineFor(plan, quantity));
        }
      }

      // Regroupement en commandes, avec les produits souvent achetés ensemble
      const drafts = [];
      for (const line of shuffle(lines)) {
        const target = drafts.length > 0 && random() < 0.2 ? pick(drafts) : null;
        if (target && !target.some((other) => other.plan === line.plan)) target.push(line);
        else drafts.push([line]);
      }
      for (const draft of drafts) {
        for (const line of [...draft]) {
          for (const partner of partners.get(line.plan.product.name) ?? []) {
            const alreadyIn = draft.some((other) => other.plan === partner);
            if (
              random() < 0.4 &&
              isOpen(partner, dayStart) &&
              available(partner, dayEnd) > 0 &&
              !alreadyIn
            ) {
              partner.stock -= 1;
              draft.push(lineFor(partner, 1));
            }
          }
        }
      }

      for (const draft of drafts) {
        const candidates = clients.filter(
          (client) => dayStart >= client.activeFrom && dayStart <= client.activeUntil,
        );
        const cancelled = candidates.length === 0 || random() < 0.05;
        if (cancelled) {
          for (const line of draft) line.plan.stock += line.quantity;
          if (candidates.length === 0) continue;
        }
        const premium = draft.some((line) => line.plan.product.price >= 500);
        const client = weightedPick(
          candidates,
          (item) => item.profile.weight * (premium && item.profile.premium ? 3 : 1),
        );
        const createdAt = new Date(Math.min(dayStart + between(9, 22) * HOUR, now - 2 * HOUR));
        const at = (time) => (time < now - 10 * 60_000 ? new Date(time) : null);
        const confirmedAt = cancelled ? null : at(createdAt.getTime() + between(2, 6) * HOUR);
        const shippedAt = confirmedAt ? at(confirmedAt.getTime() + 20 * HOUR) : null;
        const deliveredAt = shippedAt ? at(shippedAt.getTime() + between(2, 3) * DAY) : null;
        // Commandes des derniers jours : encore en préparation ou en cours de livraison
        let status = ORDER_STATUS.CANCELLED;
        let deliveryStatus = DELIVERY_STATUS.CANCELLED;
        if (!cancelled) {
          if (deliveredAt)
            [status, deliveryStatus] = [ORDER_STATUS.DELIVERED, DELIVERY_STATUS.DELIVERED];
          else if (shippedAt)
            [status, deliveryStatus] = [ORDER_STATUS.SHIPPED, DELIVERY_STATUS.IN_TRANSIT];
          else [status, deliveryStatus] = [ORDER_STATUS.CONFIRMED, DELIVERY_STATUS.PENDING];
        }
        if (!cancelled && !confirmedAt) {
          // Trop récente pour être confirmée : on n'invente pas de commande en attente
          for (const line of draft) line.plan.stock += line.quantity;
          continue;
        }
        const items = draft.map((line) => ({
          productId: line.plan.product.id,
          productName: line.plan.product.name,
          unitPrice: line.plan.product.price,
          quantity: line.quantity,
          size: line.size,
          color: line.color,
          lineTotal: multiplyAmount(line.plan.product.price, line.quantity),
        }));
        const { address, user } = client;
        const order = await Order.create(
          {
            userId: user.id,
            status,
            totalAmount: sumAmounts(items.map((item) => item.lineTotal)),
            shippingAddress: {
              recipient: `${user.firstName} ${user.lastName}`,
              label: address.label,
              street: address.street,
              city: address.city,
              postalCode: address.postalCode,
              country: address.country,
              phone: address.phone ?? user.phone,
              source: HISTORY_MARKER,
            },
            confirmedAt,
            cancelledAt: cancelled ? new Date(createdAt.getTime() + 3 * HOUR) : null,
            createdAt,
          },
          options,
        );
        await OrderItem.bulkCreate(
          items.map((item) => ({ ...item, orderId: order.id, createdAt })),
          options,
        );
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
        ordersByUser.set(user.id, [...(ordersByUser.get(user.id) ?? []), { order, status }]);
        if (cancelled) continue;
        for (const line of draft) {
          line.plan.events.push({
            date: confirmedAt,
            change: -line.quantity,
            type: STOCK_MOVEMENT_TYPE.OUT,
            reason: `Commande n°${order.id} confirmée`,
            orderId: order.id,
            userId: admin?.id,
          });
          if (deliveredAt) deliveredLines.push({ userId: user.id, plan: line.plan, deliveredAt });
        }
      }

      for (const plan of plans.values()) {
        // Entrées existantes du jour, appliquées le soir
        for (const event of plan.existing) {
          if (event.time >= dayStart && event.time < dayEnd && event.change > 0)
            plan.stock += event.change;
        }
        // Commande au fournisseur quand le stock disponible atteint le point de commande
        if (
          plan.restockDay === null &&
          isOpen(plan, dayStart) &&
          available(plan, dayEnd) <= plan.reorderPoint
        ) {
          plan.restockDay = day + 2 + Math.floor(random() * 3);
        }
      }
    }

    /* ─── 4. Mouvements générés + régularisation finale au stock actuel ─── */
    for (const plan of plans.values()) {
      // Mouvements existants d'aujourd'hui (pas encore appliqués par la simulation)
      for (const event of plan.existing) if (event.time >= todayStart) plan.stock += event.change;
      const gap = plan.currentStock - plan.stock;
      if (gap !== 0) {
        const lastGenerated = Math.max(
          plan.start,
          ...plan.events.map((event) => event.date.getTime()),
        );
        plan.events.push({
          date: new Date(Math.min(lastGenerated + 30 * 60_000, now - 60_000)),
          change: gap,
          type: gap > 0 ? STOCK_MOVEMENT_TYPE.IN : STOCK_MOVEMENT_TYPE.ADJUST,
          reason: gap > 0 ? RESTOCK_REASON : BALANCE_REASON,
          userId: stockManager?.id,
        });
      }
      await StockMovement.bulkCreate(
        plan.events.map((event) => ({
          productId: plan.product.id,
          type: event.type,
          quantityChange: event.change,
          quantityAfter: 0, // recalculé ci-dessous
          reason: event.reason,
          orderId: event.orderId ?? null,
          userId: event.userId ?? null,
          createdAt: event.date,
        })),
        options,
      );
    }
    await recomputeRunningStock(options);

    /* ─── 5. Avis sur des commandes livrées (avant la période de démonstration existante) ─── */
    const [{ cutoff }] = await sequelize.query(
      `SELECT MIN(created_at) AS cutoff FROM orders WHERE NOT COALESCE(${IS_GENERATED}, FALSE)`,
      { replacements: { marker: HISTORY_MARKER }, type: QueryTypes.SELECT, ...options },
    );
    const reviewLimit = (cutoff ? new Date(cutoff).getTime() : now - 70 * DAY) - 5 * DAY;
    const reviewed = new Set(
      (await Review.findAll({ attributes: ['userId', 'productId'], ...options })).map(
        (review) => `${review.userId}-${review.productId}`,
      ),
    );
    for (const { userId, plan, deliveredAt } of deliveredLines) {
      const key = `${userId}-${plan.product.id}`;
      if (deliveredAt.getTime() >= reviewLimit || reviewed.has(key) || random() > 0.3) continue;
      reviewed.add(key);
      const rating = Math.min(5, Math.max(1, Math.round(plan.quality + between(-1.3, 1.1))));
      const phrases = REVIEW_PHRASES[plan.product.category?.slug] ?? REVIEW_PHRASES.maison;
      const positives = shuffle([...phrases.positive]);
      const negatives = shuffle([...phrases.negative]);
      const parts = {
        5: [positives[0], positives[1]],
        4: random() < 0.5 ? [positives[0], positives[1]] : [positives[0]],
        3: [positives[0], negatives[0]],
        2: random() < 0.5 ? [negatives[0], negatives[1]] : [negatives[0]],
        1: [negatives[0], negatives[1]],
      }[rating];
      await Review.create(
        {
          userId,
          productId: plan.product.id,
          rating,
          comment: `${parts.join('. ')}.`,
          createdAt: new Date(deliveredAt.getTime() + between(1, 4) * DAY),
        },
        options,
      );
    }
    await recomputeProductCounters(options);

    /* ─── 6. Réclamations récentes à traiter ─── */
    const clientByEmail = new Map(clients.map((client) => [client.user.email, client]));
    for (const complaint of EXTRA_COMPLAINTS) {
      const client = clientByEmail.get(complaint.customer);
      if (!client) continue;
      const lastOrder = complaint.withOrder
        ? (ordersByUser.get(client.user.id) ?? [])
            .filter(({ status }) => status === ORDER_STATUS.DELIVERED)
            .at(-1)?.order
        : null;
      await Complaint.create(
        {
          userId: client.user.id,
          orderId: lastOrder?.id ?? null,
          subject: complaint.subject,
          description: complaint.description,
          status: 'OPEN',
          createdAt: new Date(now - complaint.daysAgo * DAY - between(1, 8) * HOUR),
        },
        options,
      );
    }

    /* ─── 7. Commandes en attente inhabituelles (score de risque) ─── */
    for (const suspicious of SUSPICIOUS_ORDERS) {
      const client = clientByEmail.get(suspicious.customer);
      const lines = suspicious.lines
        .map(([name, quantity]) => ({ plan: planByName.get(name), quantity }))
        .filter(({ plan, quantity }) => plan && plan.currentStock >= quantity);
      if (!client || lines.length === 0) continue;
      const items = lines.map(({ plan, quantity }) => ({
        ...lineFor(plan, quantity),
        productId: plan.product.id,
        productName: plan.product.name,
        unitPrice: plan.product.price,
        lineTotal: multiplyAmount(plan.product.price, quantity),
      }));
      const { address, user } = client;
      const createdAt = new Date(now - suspicious.hoursAgo * HOUR);
      const order = await Order.create(
        {
          userId: user.id,
          status: ORDER_STATUS.PENDING,
          totalAmount: sumAmounts(items.map((item) => item.lineTotal)),
          shippingAddress: {
            recipient: `${user.firstName} ${user.lastName}`,
            label: suspicious.city ? 'Autre adresse' : address.label,
            street: suspicious.street ?? address.street,
            city: suspicious.city ?? address.city,
            postalCode: suspicious.postalCode ?? address.postalCode,
            country: address.country,
            phone: address.phone ?? user.phone,
            source: HISTORY_MARKER,
          },
          createdAt,
        },
        options,
      );
      await OrderItem.bulkCreate(
        items.map(({ productId, productName, unitPrice, quantity, size, color, lineTotal }) => ({
          orderId: order.id,
          productId,
          productName,
          unitPrice,
          quantity,
          size,
          color,
          lineTotal,
          createdAt,
        })),
        options,
      );
      await Delivery.create({ orderId: order.id, createdAt }, options);
    }
  });
}

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function down() {
  const { Complaint, Order, Review, StockMovement } = models;
  await sequelize.transaction(async (transaction) => {
    const options = { transaction };
    const generated = await sequelize.query(`SELECT id FROM orders WHERE ${IS_GENERATED}`, {
      replacements: { marker: HISTORY_MARKER },
      type: QueryTypes.SELECT,
      ...options,
    });
    const ids = generated.map((row) => row.id);
    await Complaint.destroy({
      where: { subject: EXTRA_COMPLAINTS.map((complaint) => complaint.subject) },
      ...options,
    });
    if (ids.length > 0) {
      await StockMovement.destroy({ where: { orderId: ids }, ...options });
      await Order.destroy({ where: { id: ids }, ...options }); // lignes et livraisons supprimées en cascade
    }
    await StockMovement.destroy({
      where: { reason: [RESTOCK_REASON, BALANCE_REASON] },
      ...options,
    });
    const [{ cutoff }] = await sequelize.query('SELECT MIN(created_at) AS cutoff FROM orders', {
      type: QueryTypes.SELECT,
      ...options,
    });
    if (cutoff) await Review.destroy({ where: { createdAt: { [Op.lt]: cutoff } }, ...options });
    await recomputeRunningStock(options);
    await recomputeProductCounters(options);
  });
  // Les dates avancées (produits, stock initial, clients) restent : « npm run db:reset » repart de zéro.
}
