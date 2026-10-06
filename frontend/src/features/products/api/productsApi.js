import { httpClient } from '@/shared/api/httpClient';

export const productsApi = {
  list: (params = {}) => httpClient.get('/products', { params }),
  get: (id) => httpClient.get(`/products/${id}`),
  create: (data) => httpClient.post('/products', data),
  update: (id, data) => httpClient.put(`/products/${id}`, data),
  deactivate: (id) => httpClient.delete(`/products/${id}`),
  categories: () => httpClient.get('/categories'),
  createCategory: (data) => httpClient.post('/categories', data),
  updateCategory: (id, data) => httpClient.put(`/categories/${id}`, data),
  deleteCategory: (id) => httpClient.delete(`/categories/${id}`),
};
