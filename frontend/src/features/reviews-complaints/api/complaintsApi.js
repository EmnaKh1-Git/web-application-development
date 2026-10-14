import { httpClient } from '@/shared/api/httpClient';

/**
 * Appels à l'API du module Avis & Réclamations (Hajer) — partie réclamations.
 * Les listes paginées renvoient { data, meta } ; les autres appels renvoient directement la donnée.
 */
export const complaintsApi = {
  listMine: (params) => httpClient.get('/complaints', { params }),
  create: async (payload) => (await httpClient.post('/complaints', payload)).data,
};

/** Back-office (permission complaints:manage). */
export const complaintsAdminApi = {
  list: (params) => httpClient.get('/admin/complaints', { params }),
  stats: async () => (await httpClient.get('/admin/complaints/stats')).data,
  handle: async (id, payload) => (await httpClient.patch(`/admin/complaints/${id}`, payload)).data,
};

export const complaintKeys = {
  all: ['complaints'],
  mine: (params) => ['complaints', 'mine', params],
  admin: (params) => ['complaints', 'admin', params],
  stats: ['complaints', 'stats'],
};
