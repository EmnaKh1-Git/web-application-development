import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

/**
 * Table `users`.
 *
 * Sécurité : le hash du mot de passe est exclu par défaut de toutes les requêtes
 * (defaultScope). Pour le lire (connexion uniquement) : User.scope('withPassword').
 */
class User extends Model {
  static associate(models) {
    User.belongsTo(models.Role, { foreignKey: 'roleId', as: 'role' });
  }

  // Filet de sécurité : le hash n'apparaît jamais dans une réponse JSON.
  toJSON() {
    const values = { ...this.get() };
    delete values.passwordHash;
    return values;
  }
}

User.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    roleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    firstName: { type: DataTypes.STRING(100), allowNull: false },
    lastName: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(30), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    defaultScope: { attributes: { exclude: ['passwordHash'] } },
    scopes: { withPassword: { attributes: { include: ['passwordHash'] } } },
  },
);

export default User;
