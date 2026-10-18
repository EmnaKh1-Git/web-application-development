import { DEFAULT_LOW_STOCK_THRESHOLD } from '@smart-ecommerce/shared';
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

/** Table `stocks` : quantité disponible et seuil d'alerte, un enregistrement par produit. */
class Stock extends Model {
  static associate(models) {
    Stock.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    models.Product.hasOne(Stock, { foreignKey: 'productId', as: 'stock' });
  }
}

Stock.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
    quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    lowStockThreshold: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: DEFAULT_LOW_STOCK_THRESHOLD,
    },
  },
  { sequelize, modelName: 'Stock', tableName: 'stocks' },
);

export default Stock;
