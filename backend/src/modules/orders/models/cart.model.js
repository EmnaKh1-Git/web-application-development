import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

/** Table `carts` : un panier par utilisateur. */
class Cart extends Model {
  static associate(models) {
    Cart.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Cart.hasMany(models.CartItem, { foreignKey: 'cartId', as: 'items' });
  }
}

Cart.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
  },
  { sequelize, modelName: 'Cart', tableName: 'carts' },
);

export default Cart;
