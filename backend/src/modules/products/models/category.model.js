import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

/** Table `categories` (les sous-catégories sont possibles via `parentId`). */
class Category extends Model {
  static associate(models) {
    Category.hasMany(models.Product, { foreignKey: 'categoryId', as: 'products' });
    Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' });
  }
}

Category.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(500), allowNull: true },
    parentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { sequelize, modelName: 'Category', tableName: 'categories' },
);

export default Category;
