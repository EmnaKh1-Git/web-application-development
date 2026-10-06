import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

/** Table `order_items` : nom et prix COPIÉS au moment de la commande. */
class OrderItem extends Model {
  static associate(models) {
    OrderItem.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
    OrderItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
  }
}

OrderItem.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productName: { type: DataTypes.STRING(150), allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    size: { type: DataTypes.STRING(20), allowNull: true },
    color: { type: DataTypes.STRING(40), allowNull: true },
    lineTotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  },
  { sequelize, modelName: 'OrderItem', tableName: 'order_items' },
);

export default OrderItem;
