import {
  CUSTOMER_SEGMENT_ACTIONS,
  CUSTOMER_SEGMENT_LABELS,
  ORDER_RISK_LABELS,
  ORDER_STATUS,
} from '@smart-ecommerce/shared';
import { getCustomers, getOrders } from '../ai.data.js';
import { buildAmountStats, scoreOrder } from '../engine/orderRisk.js';
import { segmentCustomers } from '../engine/segmentation.js';

/**
 * Score de risque des commandes demandées (par défaut : celles à traiter, en attente ou confirmées).
 * @param {{ ids?: number[] }} options
 */
export async function getOrderRisks({ ids } = {}) {
  const [orders, customers] = await Promise.all([getOrders(), getCustomers()]);
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const ordersByUser = new Map();
  for (const order of orders) {
    ordersByUser.set(order.userId, [...(ordersByUser.get(order.userId) ?? []), order]);
  }
  const amountStats = buildAmountStats(orders);
  const wanted = ids ? new Set(ids) : null;
  const targets = orders.filter((order) =>
    wanted
      ? wanted.has(order.id)
      : [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED].includes(order.status),
  );

  const items = {};
  for (const order of targets) {
    const risk = scoreOrder(order, {
      customer: customersById.get(order.userId),
      history: ordersByUser.get(order.userId) ?? [],
      amountStats,
    });
    items[order.id] = { ...risk, label: ORDER_RISK_LABELS[risk.level] };
  }
  return { items };
}

/** Segment RFM de chaque client, répartition et action conseillée. */
export async function getCustomerSegments() {
  const [orders, customers] = await Promise.all([getOrders(), getCustomers()]);
  const segments = segmentCustomers(customers, orders);
  const items = {};
  const distribution = {};
  for (const [userId, entry] of segments) {
    items[userId] = {
      ...entry,
      label: CUSTOMER_SEGMENT_LABELS[entry.segment],
      action: CUSTOMER_SEGMENT_ACTIONS[entry.segment],
    };
    distribution[entry.segment] = (distribution[entry.segment] ?? 0) + 1;
  }
  return { items, distribution, customers: customers.length };
}
