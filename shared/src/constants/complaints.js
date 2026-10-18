/** Statuts d'une réclamation (module Avis & Réclamations). */
export const COMPLAINT_STATUS = Object.freeze({
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
});

export const COMPLAINT_STATUS_LIST = Object.freeze(Object.values(COMPLAINT_STATUS));

export const COMPLAINT_STATUS_LABELS = Object.freeze({
  [COMPLAINT_STATUS.OPEN]: 'Ouverte',
  [COMPLAINT_STATUS.IN_PROGRESS]: 'En cours de traitement',
  [COMPLAINT_STATUS.RESOLVED]: 'Résolue',
  [COMPLAINT_STATUS.REJECTED]: 'Rejetée',
});

/** Statuts qui clôturent une réclamation : une réponse à l'utilisateur est obligatoire. */
export const CLOSING_COMPLAINT_STATUSES = Object.freeze([
  COMPLAINT_STATUS.RESOLVED,
  COMPLAINT_STATUS.REJECTED,
]);
