import { ORDER_STATUS, ORDER_STATUS_LIST } from '@smart-ecommerce/shared';
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

/**
 * Table `orders`.
 * `shippingAddress` est une COPIE de l'adresse au moment de la commande (JSON).
 */
class Order extends Model {
  static associate(models) {
    Order.belongsTo(models.User, { foreignKey: 'userId', as: 'customer' });
    Order.hasMany(models.OrderItem, { foreignKey: 'orderId', as: 'items' });
    Order.hasOne(models.Delivery, { foreignKey: 'orderId', as: 'delivery' });
  }
}

Order.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: {
      type: DataTypes.ENUM(...ORDER_STATUS_LIST),
      allowNull: false,
      defaultValue: ORDER_STATUS.PENDING,
    },
    totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    shippingAddress: { type: DataTypes.JSON, allowNull: false },
    notes: { type: DataTypes.STRING(500), allowNull: true },
    confirmedAt: { type: DataTypes.DATE, allowNull: true },
    cancelledAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, modelName: 'Order', tableName: 'orders' },
);

export default Order;
