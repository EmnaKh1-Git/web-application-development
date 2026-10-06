import { httpClient } from '@/shared/api/httpClient';

export const ordersApi = {
  cart: () => httpClient.get('/cart'),
  add: (productId, quantity = 1, size) =>
    httpClient.post('/cart/items', { productId, quantity, size }),
  update: (id, quantity) => httpClient.patch(`/cart/items/${id}`, { quantity }),
  remove: (id) => httpClient.delete(`/cart/items/${id}`),
  addresses: () => httpClient.get('/users/me/addresses'),
  createAddress: (data) => httpClient.post('/users/me/addresses', data),
  checkout: (addressId, notes) => httpClient.post('/orders', { addressId, notes }),
  orders: () => httpClient.get('/orders', { params: { page: 1, limit: 100 } }),
  cancel: (id) => httpClient.patch(`/orders/${id}/cancel`),
  delivery: (id) => httpClient.get(`/orders/${id}/delivery`),
  adminOrders: (params = {}) =>
    httpClient.get('/admin/orders', { params: { page: 1, limit: 100, ...params } }),
  adminStatus: (id, status) => httpClient.patch(`/admin/orders/${id}/status`, { status }),
  adminDelivery: (id, data) => httpClient.patch(`/admin/orders/${id}/delivery`, data),
};
