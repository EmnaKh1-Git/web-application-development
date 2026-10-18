import { httpClient } from '@/shared/api/httpClient';

/** Appels à l'API du module Avis & Réclamations (Hajer) — partie avis. */
export const reviewsApi = {
  /** @returns {Promise<{ data: { summary, viewer, reviews }, meta: object }>} */
  listForProduct: (productId, params) =>
    httpClient.get(`/products/${productId}/reviews`, { params }),
  create: async (productId, payload) =>
    (await httpClient.post(`/products/${productId}/reviews`, payload)).data,
  update: async (id, payload) => (await httpClient.patch(`/reviews/${id}`, payload)).data,
  remove: (id) => httpClient.delete(`/reviews/${id}`),
  listMine: async () => (await httpClient.get('/reviews/me')).data,
};

export const reviewKeys = {
  all: ['reviews'],
  product: (productId, params) => ['reviews', 'product', String(productId), params],
  mine: ['reviews', 'mine'],
};
