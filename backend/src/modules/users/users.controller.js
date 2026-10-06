import { sendCreated, sendNoContent, sendSuccess } from '../../core/utils/apiResponse.js';
import * as addressesService from './addresses.service.js';
import { toUserResponse } from './users.mapper.js';
import * as usersService from './users.service.js';
import * as usersAdminService from './usersAdmin.service.js';

/* ─────────── Mon compte (utilisateur connecté) ─────────── */

export async function updateProfile(req, res) {
  const user = await usersService.updateProfile(req.user.id, req.body);
  sendSuccess(res, toUserResponse(user));
}

export async function changePassword(req, res) {
  await usersService.changePassword(req.user.id, req.body);
  sendNoContent(res);
}

export async function listAddresses(req, res) {
  sendSuccess(res, await addressesService.listAddresses(req.user.id));
}

export async function createAddress(req, res) {
  sendCreated(res, await addressesService.createAddress(req.user.id, req.body));
}

export async function updateAddress(req, res) {
  sendSuccess(res, await addressesService.updateAddress(req.user.id, req.params.id, req.body));
}

export async function deleteAddress(req, res) {
  await addressesService.deleteAddress(req.user.id, req.params.id);
  sendNoContent(res);
}

/* ─────────── Administration (users:manage) ─────────── */

export async function listUsers(req, res) {
  const { items, meta } = await usersAdminService.listUsers(req.query);
  sendSuccess(res, items, { meta });
}

export async function getUser(req, res) {
  sendSuccess(res, await usersAdminService.getUser(req.params.id));
}

export async function setUserStatus(req, res) {
  sendSuccess(
    res,
    await usersAdminService.setUserStatus(req.user.id, req.params.id, req.body.isActive),
  );
}

export async function setUserRole(req, res) {
  sendSuccess(res, await usersAdminService.setUserRole(req.user.id, req.params.id, req.body.role));
}
