import { httpClient } from '@/shared/api/httpClient';

/**
 * Appels à l'API du module Utilisateurs (Fares).
 * Les listes paginées renvoient { data, meta } ; les autres appels renvoient directement la donnée.
 */
export const accountApi = {
  updateProfile: async (payload) => (await httpClient.patch('/users/me', payload)).data,
  changePassword: (payload) => httpClient.patch('/users/me/password', payload),
  listAddresses: async () => (await httpClient.get('/users/me/addresses')).data,
  createAddress: async (payload) => (await httpClient.post('/users/me/addresses', payload)).data,
  updateAddress: async (id, payload) =>
    (await httpClient.patch(`/users/me/addresses/${id}`, payload)).data,
  deleteAddress: (id) => httpClient.delete(`/users/me/addresses/${id}`),
};

/** Back-office (permission users:manage). */
export const usersAdminApi = {
  list: (params) => httpClient.get('/admin/users', { params }),
  get: async (id) => (await httpClient.get(`/admin/users/${id}`)).data,
  setStatus: async (id, isActive) =>
    (await httpClient.patch(`/admin/users/${id}/status`, { isActive })).data,
  setRole: async (id, role) => (await httpClient.patch(`/admin/users/${id}/role`, { role })).data,
};

export const userKeys = {
  addresses: ['addresses'],
  admin: (params) => ['users', 'admin', params],
  adminDetail: (id) => ['users', 'admin', 'detail', String(id)],
};
