import { sendSuccess } from '../../core/utils/apiResponse.js';
import { chat } from './services/assistant.service.js';
import { describeProduct, suggestCategory } from './services/catalog.service.js';
import { getComplaintInsights, suggestComplaintReply } from './services/complaints.service.js';
import { getCustomerSegments, getOrderRisks } from './services/customers.service.js';
import { getProductForecast, getStockForecast } from './services/forecast.service.js';
import { getAiStatus, getBriefing, getEvaluation } from './services/insights.service.js';
import { analyzeReception } from './services/reception.service.js';
import { getRecommendations } from './services/recommendations.service.js';
import { getReviewsSummary } from './services/reviews.service.js';

export function status(_req, res) {
  sendSuccess(res, getAiStatus());
}

export async function recommendations(req, res) {
  sendSuccess(res, await getRecommendations({ ...req.query, user: req.user }));
}

export async function reviewsSummary(req, res) {
  sendSuccess(res, await getReviewsSummary(req.params.productId));
}

export async function assistant(req, res) {
  sendSuccess(res, await chat({ messages: req.body.messages, user: req.user }));
}

export async function stockForecast(_req, res) {
  sendSuccess(res, await getStockForecast());
}

export async function productForecast(req, res) {
  sendSuccess(res, await getProductForecast(req.params.productId, req.query));
}

export async function reception(req, res) {
  sendSuccess(res, await analyzeReception(req.body));
}

export async function complaintInsights(_req, res) {
  sendSuccess(res, await getComplaintInsights());
}

export async function complaintReply(req, res) {
  sendSuccess(res, await suggestComplaintReply(req.params.id));
}

export async function productDescription(req, res) {
  sendSuccess(res, await describeProduct(req.body));
}

export async function productCategory(req, res) {
  sendSuccess(res, await suggestCategory(req.body));
}

export async function orderRisk(req, res) {
  sendSuccess(res, await getOrderRisks(req.query));
}

export async function customerSegments(_req, res) {
  sendSuccess(res, await getCustomerSegments());
}

export async function briefing(req, res) {
  sendSuccess(res, await getBriefing(req.user));
}

export async function evaluation(_req, res) {
  sendSuccess(res, await getEvaluation());
}
