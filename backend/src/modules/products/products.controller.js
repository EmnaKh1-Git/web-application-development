import { hasPermission, PERMISSIONS } from '@smart-ecommerce/shared';
import { sendCreated, sendNoContent, sendSuccess } from '../../core/utils/apiResponse.js';
import * as categoriesService from './categories.service.js';
import * as productsService from './products.service.js';

// Un administrateur connecté peut voir les produits désactivés.
const canSeeInactive = (req) =>
  Boolean(req.user && hasPermission(req.user.role, PERMISSIONS.PRODUCTS_MANAGE));

/* ─────────── Produits ─────────── */

export async function listProducts(req, res) {
  const { items, meta } = await productsService.listProducts(req.query, {
    canSeeInactive: canSeeInactive(req),
  });
  sendSuccess(res, items, { meta });
}

export async function getProduct(req, res) {
  sendSuccess(
    res,
    await productsService.getProduct(req.params.id, { canSeeInactive: canSeeInactive(req) }),
  );
}

export async function createProduct(req, res) {
  sendCreated(res, await productsService.createProduct(req.body, { userId: req.user.id }));
}

export async function updateProduct(req, res) {
  sendSuccess(res, await productsService.updateProduct(req.params.id, req.body));
}

export async function deactivateProduct(req, res) {
  await productsService.deactivateProduct(req.params.id);
  sendNoContent(res);
}

/* ─────────── Catégories ─────────── */

export async function listCategories(_req, res) {
  sendSuccess(res, await categoriesService.listCategories());
}

export async function getCategory(req, res) {
  sendSuccess(res, await categoriesService.getCategory(req.params.id));
}

export async function createCategory(req, res) {
  sendCreated(res, await categoriesService.createCategory(req.body));
}

export async function updateCategory(req, res) {
  sendSuccess(res, await categoriesService.updateCategory(req.params.id, req.body));
}

export async function deleteCategory(req, res) {
  await categoriesService.deleteCategory(req.params.id);
  sendNoContent(res);
}
