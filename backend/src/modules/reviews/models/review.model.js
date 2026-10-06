import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

/** Table `reviews` : un avis (note de 1 à 5 + commentaire) par utilisateur et par produit. */
class Review extends Model {
  static associate(models) {
    Review.belongsTo(models.User, { foreignKey: 'userId', as: 'author' });
    Review.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
  }
}

Review.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    rating: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: false },
  },
  { sequelize, modelName: 'Review', tableName: 'reviews' },
);

export default Review;
