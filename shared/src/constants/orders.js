/** Statuts d'une commande (module Panier, Commandes & Livraison). */
export const ORDER_STATUS = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
});

export const ORDER_STATUS_LIST = Object.freeze(Object.values(ORDER_STATUS));

export const ORDER_STATUS_LABELS = Object.freeze({
  [ORDER_STATUS.PENDING]: 'En attente',
  [ORDER_STATUS.CONFIRMED]: 'Confirmée',
  [ORDER_STATUS.SHIPPED]: 'Expédiée',
  [ORDER_STATUS.DELIVERED]: 'Livrée',
  [ORDER_STATUS.CANCELLED]: 'Annulée',
});

/**
 * Transitions autorisées.
 * Règle validée par l'équipe : le stock diminue au passage à CONFIRMED,
 * et il est restauré si une commande confirmée est annulée.
 */
export const ORDER_STATUS_TRANSITIONS = Object.freeze({
  [ORDER_STATUS.PENDING]: Object.freeze([ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.CONFIRMED]: Object.freeze([ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.SHIPPED]: Object.freeze([ORDER_STATUS.DELIVERED]),
  [ORDER_STATUS.DELIVERED]: Object.freeze([]),
  [ORDER_STATUS.CANCELLED]: Object.freeze([]),
});

export function canChangeOrderStatus(from, to) {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Statuts dans lesquels le client peut encore annuler sa commande (avant expédition). */
export const CANCELLABLE_ORDER_STATUSES = Object.freeze([
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
]);

/** Statuts de la livraison (suivi). */
export const DELIVERY_STATUS = Object.freeze({
  PENDING: 'PENDING',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
});

export const DELIVERY_STATUS_LIST = Object.freeze(Object.values(DELIVERY_STATUS));

export const DELIVERY_STATUS_LABELS = Object.freeze({
  [DELIVERY_STATUS.PENDING]: 'En préparation',
  [DELIVERY_STATUS.IN_TRANSIT]: 'En cours de livraison',
  [DELIVERY_STATUS.DELIVERED]: 'Livrée',
  [DELIVERY_STATUS.CANCELLED]: 'Annulée',
});

/** Quantité maximale d'un même produit dans le panier. */
export const MAX_CART_ITEM_QUANTITY = 20;
