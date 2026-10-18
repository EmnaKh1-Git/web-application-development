import { sendCreated, sendSuccess } from '../../core/utils/apiResponse.js';
import * as authService from './auth.service.js';

// Contrôleurs : uniquement le lien HTTP ↔ service (aucune logique métier ici).
// Les erreurs levées par les services remontent automatiquement à errorHandler (Express 5).

export async function register(req, res) {
  const session = await authService.register(req.body);
  sendCreated(res, session);
}

export async function login(req, res) {
  const session = await authService.login(req.body);
  sendSuccess(res, session);
}

export async function me(req, res) {
  const user = await authService.getCurrentUser(req.user.id);
  sendSuccess(res, user);
}
