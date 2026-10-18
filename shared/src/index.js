// Point d'entrée du package partagé « @smart-ecommerce/shared ».
// Utilisé par le Back-End (validation des requêtes, autorisations)
// et par le Front-End (validation des formulaires, affichage selon le rôle).

export { z } from './zod.js';

export * from './constants/roles.js';
export * from './constants/permissions.js';
export * from './constants/products.js';
export * from './constants/stock.js';
export * from './constants/orders.js';
export * from './constants/complaints.js';
export * from './constants/ai.js';

export * from './validation/common.js';
export * from './validation/auth.schemas.js';
export * from './validation/users.schemas.js';
export * from './validation/products.schemas.js';
export * from './validation/stock.schemas.js';
export * from './validation/orders.schemas.js';
export * from './validation/reviews.schemas.js';
export * from './validation/ai.schemas.js';
