import { httpClient } from '@/shared/api/httpClient';

/**
 * Appels à l'API du module Panier, Commandes & Livraison (Oussama).
 * Les listes paginées renvoient { data, meta } ; les autres appels renvoient directement la donnée.
 */
export const cartApi = {
  get: async () => (await httpClient.get('/cart')).data,
  /** @param {{ productId: number, quantity?: number, size?: string, color?: string }} item */
  addItem: async (item) => (await httpClient.post('/cart/items', item)).data,
  updateItem: async (itemId, quantity) =>
    (await httpClient.patch(`/cart/items/${itemId}`, { quantity })).data,
  removeItem: async (itemId) => (await httpClient.delete(`/cart/items/${itemId}`)).data,
  clear: async () => (await httpClient.delete('/cart')).data,
};

export const ordersApi = {
  checkout: async (payload) => (await httpClient.post('/orders', payload)).data,
  listMine: (params) => httpClient.get('/orders', { params }),
  get: async (id) => (await httpClient.get(`/orders/${id}`)).data,
  cancel: async (id) => (await httpClient.patch(`/orders/${id}/cancel`)).data,
};

/** Back-office (permission orders:manage). */
export const ordersAdminApi = {
  list: (params) => httpClient.get('/admin/orders', { params }),
  stats: async () => (await httpClient.get('/admin/orders/stats')).data,
  updateStatus: async (id, status) =>
    (await httpClient.patch(`/admin/orders/${id}/status`, { status })).data,
  updateDelivery: async (id, payload) =>
    (await httpClient.patch(`/admin/orders/${id}/delivery`, payload)).data,
};

/** Clés du cache TanStack Query du module. */
export const orderKeys = {
  cart: ['cart'],
  all: ['orders'],
  mine: (params) => ['orders', 'mine', params],
  detail: (id) => ['orders', 'detail', String(id)],
  admin: (params) => ['orders', 'admin', params],
  stats: ['orders', 'stats'],
};
