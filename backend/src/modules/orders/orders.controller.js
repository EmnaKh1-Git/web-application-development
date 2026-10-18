import { sendCreated, sendSuccess } from '../../core/utils/apiResponse.js';
import * as cartService from './cart.service.js';
import * as ordersService from './orders.service.js';

/* ─────────── Panier ─────────── */

export async function getCart(req, res) {
  sendSuccess(res, await cartService.getCart(req.user.id));
}

export async function addCartItem(req, res) {
  sendSuccess(res, await cartService.addItem(req.user.id, req.body));
}

export async function updateCartItem(req, res) {
  sendSuccess(res, await cartService.updateItem(req.user.id, req.params.itemId, req.body));
}

export async function removeCartItem(req, res) {
  sendSuccess(res, await cartService.removeItem(req.user.id, req.params.itemId));
}

export async function clearCart(req, res) {
  await cartService.clearCart(req.user.id);
  sendSuccess(res, await cartService.getCart(req.user.id));
}

/* ─────────── Commandes du client ─────────── */

export async function createOrder(req, res) {
  sendCreated(res, await ordersService.createOrderFromCart(req.user, req.body));
}

export async function listMyOrders(req, res) {
  const { items, meta } = await ordersService.listMyOrders(req.user.id, req.query);
  sendSuccess(res, items, { meta });
}

export async function getOrder(req, res) {
  sendSuccess(res, await ordersService.getOrder(req.params.id, req.user));
}

export async function getDelivery(req, res) {
  const order = await ordersService.getOrder(req.params.id, req.user);
  sendSuccess(res, { orderId: order.id, orderStatus: order.status, ...order.delivery });
}

export async function cancelOrder(req, res) {
  sendSuccess(res, await ordersService.cancelOrder(req.params.id, req.user));
}

/* ─────────── Administration ─────────── */

export async function listAllOrders(req, res) {
  const { items, meta } = await ordersService.listAllOrders(req.query);
  sendSuccess(res, items, { meta });
}

export async function getOrderStats(_req, res) {
  sendSuccess(res, await ordersService.getOrderStats());
}

export async function updateOrderStatus(req, res) {
  sendSuccess(res, await ordersService.updateOrderStatus(req.params.id, req.body.status, req.user));
}

export async function updateDelivery(req, res) {
  sendSuccess(res, await ordersService.updateDelivery(req.params.id, req.body, req.user));
}
