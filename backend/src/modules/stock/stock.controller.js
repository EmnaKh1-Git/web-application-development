import { sendSuccess } from '../../core/utils/apiResponse.js';
import * as stockService from './stock.service.js';

export async function list(req, res) {
  const { items, meta } = await stockService.listStock(req.query);
  sendSuccess(res, items, { meta });
}

export async function alerts(req, res) {
  const { items, meta } = await stockService.listStock({
    page: 1,
    limit: 100,
    status: 'alert',
    sort: 'quantity_asc',
  });
  sendSuccess(res, items, { meta });
}

export async function summary(_req, res) {
  sendSuccess(res, await stockService.getStockSummary());
}

export async function movements(req, res) {
  const { items, meta } = await stockService.listMovements(req.query);
  sendSuccess(res, items, { meta });
}

export async function detail(req, res) {
  sendSuccess(res, await stockService.getProductStock(req.params.productId));
}

export async function productMovements(req, res) {
  const { items, meta } = await stockService.listMovements({
    ...req.query,
    productId: req.params.productId,
  });
  sendSuccess(res, items, { meta });
}

export async function add(req, res) {
  const stock = await stockService.addStock(req.params.productId, req.body, {
    userId: req.user.id,
  });
  sendSuccess(res, stock);
}

export async function adjust(req, res) {
  const stock = await stockService.adjustStock(req.params.productId, req.body, {
    userId: req.user.id,
  });
  sendSuccess(res, stock);
}
