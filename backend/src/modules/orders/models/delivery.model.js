import { DELIVERY_STATUS, DELIVERY_STATUS_LIST } from '@smart-ecommerce/shared';
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

/** Table `deliveries` : suivi de livraison, une ligne par commande. */
class Delivery extends Model {
  static associate(models) {
    Delivery.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
  }
}

Delivery.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
    status: {
      type: DataTypes.ENUM(...DELIVERY_STATUS_LIST),
      allowNull: false,
      defaultValue: DELIVERY_STATUS.PENDING,
    },
    carrier: { type: DataTypes.STRING(100), allowNull: true },
    trackingNumber: { type: DataTypes.STRING(100), allowNull: true },
    estimatedDeliveryDate: { type: DataTypes.DATEONLY, allowNull: true },
    shippedAt: { type: DataTypes.DATE, allowNull: true },
    deliveredAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, modelName: 'Delivery', tableName: 'deliveries' },
);

export default Delivery;
