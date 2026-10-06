/** Seuil d'alerte par défaut : en dessous ou à ce niveau, le stock est « faible ». */
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

/** Types de mouvements de stock (historique). */
export const STOCK_MOVEMENT_TYPE = Object.freeze({
  IN: 'IN',
  OUT: 'OUT',
  ADJUST: 'ADJUST',
  RETURN: 'RETURN',
});

export const STOCK_MOVEMENT_TYPE_LIST = Object.freeze(Object.values(STOCK_MOVEMENT_TYPE));

export const STOCK_MOVEMENT_TYPE_LABELS = Object.freeze({
  [STOCK_MOVEMENT_TYPE.IN]: 'Entrée',
  [STOCK_MOVEMENT_TYPE.OUT]: 'Sortie (commande)',
  [STOCK_MOVEMENT_TYPE.ADJUST]: 'Correction',
  [STOCK_MOVEMENT_TYPE.RETURN]: 'Retour (annulation)',
});

/** État du stock d'un produit. */
export const STOCK_STATUS = Object.freeze({
  OK: 'OK',
  LOW: 'LOW',
  OUT: 'OUT',
});

export const STOCK_STATUS_LABELS = Object.freeze({
  [STOCK_STATUS.OK]: 'En stock',
  [STOCK_STATUS.LOW]: 'Stock faible',
  [STOCK_STATUS.OUT]: 'Rupture',
});

/** Calcule l'état du stock à partir de la quantité et du seuil d'alerte. */
export function getStockStatus(quantity, lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD) {
  if (quantity <= 0) return STOCK_STATUS.OUT;
  if (quantity <= lowStockThreshold) return STOCK_STATUS.LOW;
  return STOCK_STATUS.OK;
}
