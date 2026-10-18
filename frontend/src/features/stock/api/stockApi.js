import { httpClient } from '@/shared/api/httpClient';

/**
 * Appels à l'API du module Stock (Yassine) — rôles ADMIN et STOCK_MANAGER.
 * Les listes paginées renvoient { data, meta } ; les autres appels renvoient directement la donnée.
 */
export const stockApi = {
  /** @param {{ page, limit, search, status: 'all'|'ok'|'low'|'out'|'alert', categoryId, sort }} params */
  list: (params) => httpClient.get('/stock', { params }),
  summary: async () => (await httpClient.get('/stock/summary')).data,
  /** Historique : tous les produits, ou un seul avec params.productId. */
  movements: (params) => httpClient.get('/stock/movements', { params }),
  /** Réapprovisionnement : { quantity, reason } */
  add: async (productId, payload) =>
    (await httpClient.post(`/stock/${productId}/add`, payload)).data,
  /** Inventaire : { quantity?, lowStockThreshold?, reason } */
  adjust: async (productId, payload) =>
    (await httpClient.patch(`/stock/${productId}`, payload)).data,
};

export const stockKeys = {
  all: ['stock'],
  list: (params) => ['stock', 'list', params],
  summary: ['stock', 'summary'],
  movements: (params) => ['stock', 'movements', params],
};
