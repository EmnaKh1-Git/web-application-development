import { STOCK_MOVEMENT_TYPE_LIST } from '@smart-ecommerce/shared';
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

/**
 * Table `stock_movements` : historique (audit) de toutes les variations de stock.
 * `quantityChange` est signé (+ entrée, - sortie) ; `quantityAfter` = stock après le mouvement.
 */
class StockMovement extends Model {
  static associate(models) {
    StockMovement.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    StockMovement.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    StockMovement.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
  }
}

StockMovement.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: { type: DataTypes.ENUM(...STOCK_MOVEMENT_TYPE_LIST), allowNull: false },
    quantityChange: { type: DataTypes.INTEGER, allowNull: false },
    quantityAfter: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    reason: { type: DataTypes.STRING(255), allowNull: true },
    orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { sequelize, modelName: 'StockMovement', tableName: 'stock_movements' },
);

export default StockMovement;
