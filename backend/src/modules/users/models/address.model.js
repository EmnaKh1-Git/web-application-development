import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

/** Table `addresses` : adresses de livraison d'un utilisateur. */
class Address extends Model {
  static associate(models) {
    Address.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    models.User.hasMany(Address, { foreignKey: 'userId', as: 'addresses' });
  }
}

Address.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    label: { type: DataTypes.STRING(50), allowNull: false },
    street: { type: DataTypes.STRING(255), allowNull: false },
    city: { type: DataTypes.STRING(100), allowNull: false },
    postalCode: { type: DataTypes.STRING(20), allowNull: false },
    country: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'Tunisie' },
    phone: { type: DataTypes.STRING(30), allowNull: true },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { sequelize, modelName: 'Address', tableName: 'addresses' },
);

export default Address;
