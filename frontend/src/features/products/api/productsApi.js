import { httpClient } from '@/shared/api/httpClient';

/**
 * Appels à l'API du module Produits & Catégories (Emna).
 * Les listes paginées renvoient { data, meta } ; les autres appels renvoient directement la donnée.
 */
export const productsApi = {
  /** @returns {Promise<{ data: object[], meta: object }>} */
  list: (params) => httpClient.get('/products', { params }),
  get: async (id) => (await httpClient.get(`/products/${id}`)).data,
  create: async (payload) => (await httpClient.post('/products', payload)).data,
  update: async (id, payload) => (await httpClient.put(`/products/${id}`, payload)).data,
  /** « Suppression » = désactivation (le produit reste dans l'historique des commandes). */
  deactivate: (id) => httpClient.delete(`/products/${id}`),
};

export const categoriesApi = {
  list: async () => (await httpClient.get('/categories')).data,
  create: async (payload) => (await httpClient.post('/categories', payload)).data,
  update: async (id, payload) => (await httpClient.put(`/categories/${id}`, payload)).data,
  remove: (id) => httpClient.delete(`/categories/${id}`),
};

/** Clés du cache TanStack Query du module. */
export const productKeys = {
  all: ['products'],
  list: (params) => ['products', 'list', params],
  detail: (id) => ['products', 'detail', String(id)],
  categories: ['categories'],
};
