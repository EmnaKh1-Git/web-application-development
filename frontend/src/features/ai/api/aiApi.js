import { httpClient } from '@/shared/api/httpClient';

/**
 * Appels au module Intelligence Artificielle de l'API (/ai).
 * Chaque résultat indique sa `source` : « claude » ou « local » (algorithmes du serveur).
 */
const get = async (url, params) => (await httpClient.get(url, { params })).data;
const post = async (url, body) => (await httpClient.post(url, body)).data;

export const aiApi = {
  status: () => get('/ai/status'),
  /** @param {{ productId?: number, productIds?: string, limit?: number }} params */
  recommendations: (params) => get('/ai/recommendations', params),
  reviewsSummary: (productId) => get(`/ai/products/${productId}/reviews-summary`),
  /** @param {{ role: 'user'|'assistant', content: string }[]} messages */
  assistant: (messages) => post('/ai/assistant', { messages }),

  stockForecast: () => get('/ai/stock/forecast'),
  productForecast: (productId, horizon = 30) => get(`/ai/stock/forecast/${productId}`, { horizon }),
  /** Bon de livraison : { text } ou { image (base64), mediaType } */
  reception: (payload) => post('/ai/stock/reception', payload),

  complaintInsights: () => get('/ai/complaints/insights'),
  complaintReply: (id) => post(`/ai/complaints/${id}/reply`),
  describeProduct: (payload) => post('/ai/products/describe', payload),
  categorizeProduct: (payload) => post('/ai/products/categorize', payload),
  orderRisk: (ids) => get('/ai/orders/risk', { ids: ids.join(',') }),
  customerSegments: () => get('/ai/customers/segments'),
  briefing: () => get('/ai/briefing'),
  evaluation: () => get('/ai/evaluation'),
};

/** Clés du cache TanStack Query du module IA. */
export const aiKeys = {
  all: ['ai'],
  status: ['ai', 'status'],
  recommendations: (params) => ['ai', 'recommendations', params],
  reviewsSummary: (productId) => ['ai', 'reviews-summary', String(productId)],
  stockForecast: ['ai', 'stock-forecast'],
  productForecast: (productId, horizon) => ['ai', 'stock-forecast', String(productId), horizon],
  complaintInsights: ['ai', 'complaint-insights'],
  orderRisk: (ids) => ['ai', 'order-risk', ids],
  customerSegments: ['ai', 'customer-segments'],
  briefing: ['ai', 'briefing'],
  evaluation: ['ai', 'evaluation'],
};
