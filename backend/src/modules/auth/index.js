/**
 * Module Authentification — responsable : Fares
 * Inscription, connexion et utilisateur courant (JWT).
 * Le logout est géré côté Front-End (suppression du jeton) : le JWT est sans état.
 */
import authRoutes from './auth.routes.js';

export function registerRoutes(apiRouter) {
  apiRouter.use('/auth', authRoutes);
}
