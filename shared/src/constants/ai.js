/**
 * Module Intelligence Artificielle : constantes partagées par le Back-End et le Front-End.
 */

/** Origine d'un résultat d'IA : modèle de langage Claude, ou algorithmes locaux du serveur. */
export const AI_SOURCE = Object.freeze({
  CLAUDE: 'claude',
  LOCAL: 'local',
});

export const AI_SOURCE_LABELS = Object.freeze({
  [AI_SOURCE.CLAUDE]: 'Claude',
  [AI_SOURCE.LOCAL]: 'IA locale',
});

/** Prévision du stock : niveau de risque de rupture. */
export const STOCK_RISK = Object.freeze({
  CRITICAL: 'CRITICAL',
  WARNING: 'WARNING',
  OK: 'OK',
  NO_DEMAND: 'NO_DEMAND',
});

export const STOCK_RISK_LABELS = Object.freeze({
  [STOCK_RISK.CRITICAL]: 'Rupture imminente',
  [STOCK_RISK.WARNING]: 'À surveiller',
  [STOCK_RISK.OK]: 'Couvert',
  [STOCK_RISK.NO_DEMAND]: 'Sans ventes',
});

/** Réclamations : catégorie détectée automatiquement. */
export const COMPLAINT_CATEGORY = Object.freeze({
  DELIVERY: 'DELIVERY',
  DEFECTIVE: 'DEFECTIVE',
  WRONG_ITEM: 'WRONG_ITEM',
  REFUND: 'REFUND',
  ACCOUNT: 'ACCOUNT',
  OTHER: 'OTHER',
});

export const COMPLAINT_CATEGORY_LABELS = Object.freeze({
  [COMPLAINT_CATEGORY.DELIVERY]: 'Livraison',
  [COMPLAINT_CATEGORY.DEFECTIVE]: 'Produit défectueux',
  [COMPLAINT_CATEGORY.WRONG_ITEM]: 'Erreur de commande',
  [COMPLAINT_CATEGORY.REFUND]: 'Remboursement',
  [COMPLAINT_CATEGORY.ACCOUNT]: 'Compte / site',
  [COMPLAINT_CATEGORY.OTHER]: 'Autre',
});

/** Niveau d'un score (priorité d'une réclamation, risque d'une commande). */
export const AI_LEVEL = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
});

export const COMPLAINT_PRIORITY_LABELS = Object.freeze({
  [AI_LEVEL.HIGH]: 'Urgente',
  [AI_LEVEL.MEDIUM]: 'Normale',
  [AI_LEVEL.LOW]: 'Faible',
});

export const ORDER_RISK_LABELS = Object.freeze({
  [AI_LEVEL.HIGH]: 'Risque élevé',
  [AI_LEVEL.MEDIUM]: 'À vérifier',
  [AI_LEVEL.LOW]: 'Risque faible',
});

/** Segmentation des clients (méthode RFM : récence, fréquence, montant). */
export const CUSTOMER_SEGMENT = Object.freeze({
  CHAMPION: 'CHAMPION',
  LOYAL: 'LOYAL',
  BIG_SPENDER: 'BIG_SPENDER',
  PROMISING: 'PROMISING',
  NEW: 'NEW',
  AT_RISK: 'AT_RISK',
  HIBERNATING: 'HIBERNATING',
  NO_ORDER: 'NO_ORDER',
});

export const CUSTOMER_SEGMENT_LABELS = Object.freeze({
  [CUSTOMER_SEGMENT.CHAMPION]: 'Champion',
  [CUSTOMER_SEGMENT.LOYAL]: 'Fidèle',
  [CUSTOMER_SEGMENT.BIG_SPENDER]: 'Gros acheteur',
  [CUSTOMER_SEGMENT.PROMISING]: 'Prometteur',
  [CUSTOMER_SEGMENT.NEW]: 'Nouveau',
  [CUSTOMER_SEGMENT.AT_RISK]: 'À risque',
  [CUSTOMER_SEGMENT.HIBERNATING]: 'Inactif',
  [CUSTOMER_SEGMENT.NO_ORDER]: 'Sans commande',
});

/** Action marketing conseillée pour chaque segment. */
export const CUSTOMER_SEGMENT_ACTIONS = Object.freeze({
  [CUSTOMER_SEGMENT.CHAMPION]: 'Le remercier (accès en avant-première, programme de fidélité)',
  [CUSTOMER_SEGMENT.LOYAL]: 'Lui proposer des produits complémentaires',
  [CUSTOMER_SEGMENT.BIG_SPENDER]: 'Lui présenter les nouveautés haut de gamme',
  [CUSTOMER_SEGMENT.PROMISING]: 'L’inciter à revenir avec une recommandation personnalisée',
  [CUSTOMER_SEGMENT.NEW]: 'Lui souhaiter la bienvenue et l’accompagner',
  [CUSTOMER_SEGMENT.AT_RISK]: 'Le relancer rapidement (offre de retour)',
  [CUSTOMER_SEGMENT.HIBERNATING]: 'Campagne de réactivation',
  [CUSTOMER_SEGMENT.NO_ORDER]: 'Lui suggérer les meilleures ventes',
});
