import { httpClient } from '@/shared/api/httpClient';

export const complaintsApi = {
  mine: () => httpClient.get('/complaints', { params: { page: 1, limit: 100 } }),
  create: (data) => httpClient.post('/complaints', data),
  all: (params = {}) =>
    httpClient.get('/admin/complaints', { params: { page: 1, limit: 100, ...params } }),
  handle: (id, data) => httpClient.patch(`/admin/complaints/${id}`, data),
};
