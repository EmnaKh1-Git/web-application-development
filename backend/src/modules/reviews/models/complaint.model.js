import { COMPLAINT_STATUS, COMPLAINT_STATUS_LIST } from '@smart-ecommerce/shared';
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database.js';

/** Table `complaints` : réclamations des clients et traitement par l'administrateur. */
class Complaint extends Model {
  static associate(models) {
    Complaint.belongsTo(models.User, { foreignKey: 'userId', as: 'customer' });
    Complaint.belongsTo(models.User, { foreignKey: 'handledBy', as: 'handler' });
    Complaint.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
  }
}

Complaint.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    subject: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM(...COMPLAINT_STATUS_LIST),
      allowNull: false,
      defaultValue: COMPLAINT_STATUS.OPEN,
    },
    adminResponse: { type: DataTypes.TEXT, allowNull: true },
    handledBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    handledAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, modelName: 'Complaint', tableName: 'complaints' },
);

export default Complaint;
