import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

/**
 * Table `roles` : CLIENT, ADMIN, STOCK_MANAGER.
 * Les lignes sont insérées par la migration « create-roles ».
 * Les noms sont centralisés dans ROLES (@smart-ecommerce/shared).
 */
class Role extends Model {
  static associate(models) {
    Role.hasMany(models.User, { foreignKey: 'roleId', as: 'users' });
  }
}

Role.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(255), allowNull: true },
  },
  { sequelize, modelName: 'Role', tableName: 'roles' },
);

export default Role;
