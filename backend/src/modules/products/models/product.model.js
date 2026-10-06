import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

/**
 * Table `products`.
 * - suppression = désactivation (`isActive`) : l'historique des commandes reste cohérent ;
 * - `salesCount` (popularité) et `ratingAverage` / `reviewCount` sont mis à jour
 *   par les modules Commandes et Avis via l'API publique du module.
 */
class Product extends Model {
  static associate(models) {
    Product.belongsTo(models.Category, { foreignKey: 'categoryId', as: 'category' });
  }
}

Product.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    categoryId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(150), allowNull: false },
    slug: { type: DataTypes.STRING(170), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    imageUrl: { type: DataTypes.STRING(500), allowNull: true },
    imageUrls: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    sizes: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    colors: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    salesCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    ratingAverage: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 0 },
    reviewCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  { sequelize, modelName: 'Product', tableName: 'products' },
);

export default Product;
