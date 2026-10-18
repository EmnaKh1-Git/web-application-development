/**
 * Noms des événements internes (format « domaine.action »).
 *
 * Les événements servent aux effets SECONDAIRES non critiques (statistiques,
 * popularité, historique pour l'IA, notifications...). Ce qui doit réussir ou
 * échouer en même temps qu'une action (ex. diminuer le stock lors de la
 * confirmation d'une commande) passe par un APPEL DIRECT de service dans une
 * transaction SQL, jamais par un événement.
 */
export const EVENTS = Object.freeze({
  USER_REGISTERED: 'user.registered',
  PRODUCT_VIEWED: 'product.viewed',
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  STOCK_LOW: 'stock.low',
  REVIEW_CHANGED: 'review.changed',
});
