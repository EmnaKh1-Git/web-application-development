import { sendCreated, sendNoContent, sendSuccess } from '../../core/utils/apiResponse.js';
import * as complaintsService from './complaints.service.js';
import * as reviewsService from './reviews.service.js';

/* ─────────── Avis ─────────── */

export async function listProductReviews(req, res) {
  const { data, meta } = await reviewsService.listProductReviews(
    req.params.productId,
    req.query,
    req.user,
  );
  sendSuccess(res, data, { meta });
}

export async function createReview(req, res) {
  sendCreated(res, await reviewsService.createReview(req.user, req.params.productId, req.body));
}

export async function listMyReviews(req, res) {
  sendSuccess(res, await reviewsService.listMyReviews(req.user.id));
}

export async function updateReview(req, res) {
  sendSuccess(res, await reviewsService.updateReview(req.user, req.params.id, req.body));
}

export async function deleteReview(req, res) {
  await reviewsService.deleteReview(req.user, req.params.id);
  sendNoContent(res);
}

/* ─────────── Réclamations ─────────── */

export async function createComplaint(req, res) {
  sendCreated(res, await complaintsService.createComplaint(req.user, req.body));
}

export async function listMyComplaints(req, res) {
  const { items, meta } = await complaintsService.listMyComplaints(req.user.id, req.query);
  sendSuccess(res, items, { meta });
}

export async function getComplaint(req, res) {
  sendSuccess(res, await complaintsService.getComplaint(req.params.id, req.user));
}

export async function listAllComplaints(req, res) {
  const { items, meta } = await complaintsService.listAllComplaints(req.query);
  sendSuccess(res, items, { meta });
}

export async function getComplaintStats(_req, res) {
  sendSuccess(res, await complaintsService.getComplaintStats());
}

export async function handleComplaint(req, res) {
  sendSuccess(res, await complaintsService.handleComplaint(req.user, req.params.id, req.body));
}
