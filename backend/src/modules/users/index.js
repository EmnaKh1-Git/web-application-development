/**
 * Module Utilisateurs — responsable : Fares
 *
 * Ce fichier est la SEULE porte d'entrée du module pour le reste de l'application :
 * - registerRoutes : branche les routes du module sur l'API (/api/v1)
 * - les autres exports forment l'API publique utilisable par les autres modules
 */
import usersRoutes from './users.routes.js';
import usersAdminRoutes from './usersAdmin.routes.js';

export {
  createUser,
  emailExists,
  findUserByEmailWithPassword,
  findUserById,
} from './users.service.js';
export { findUserAddress } from './addresses.service.js';
export { toUserResponse } from './users.mapper.js';

export function registerRoutes(apiRouter) {
  apiRouter.use('/users', usersRoutes); // profil, mot de passe, adresses
  apiRouter.use('/admin/users', usersAdminRoutes); // gestion des utilisateurs (ADMIN)
}
