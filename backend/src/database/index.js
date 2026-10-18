import { sequelize } from '../config/database.js';
import aiModels from '../modules/ai/models/index.js';
import ordersModels from '../modules/orders/models/index.js';
import productsModels from '../modules/products/models/index.js';
import reviewsModels from '../modules/reviews/models/index.js';
import stockModels from '../modules/stock/models/index.js';
import usersModels from '../modules/users/models/index.js';

/**
 * Registre des modèles Sequelize.
 *
 * Chaque module déclare ses modèles dans `modules/<module>/models/index.js` :
 * ce fichier n'a donc pas besoin d'être modifié quand un module ajoute un modèle.
 *
 * Les relations sont déclarées dans la méthode statique `associate(models)`
 * de chaque modèle, appelée ici une fois que tous les modèles sont chargés.
 *
 * @example
 * import { models } from '../../database/index.js';
 * const user = await models.User.findByPk(id, { include: 'role' });
 */
const allModels = [
  ...usersModels,
  ...productsModels,
  ...ordersModels,
  ...reviewsModels,
  ...stockModels,
  ...aiModels,
];

export const models = Object.fromEntries(allModels.map((model) => [model.name, model]));

for (const model of allModels) {
  model.associate?.(models);
}

export { sequelize };
