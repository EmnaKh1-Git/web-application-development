import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

/** Table `cart_items` : une ligne par produit dans le panier. */
class CartItem extends Model {
  static associate(models) {
    CartItem.belongsTo(models.Cart, { foreignKey: 'cartId', as: 'cart' });
    CartItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
  }
}

CartItem.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    cartId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    size: { type: DataTypes.STRING(20), allowNull: true },
    color: { type: DataTypes.STRING(40), allowNull: true },
  },
  { sequelize, modelName: 'CartItem', tableName: 'cart_items' },
);

export default CartItem;
