import { DataTypes, literal } from 'sequelize';

// Module Avis & Réclamations (Hajer).

const timestamps = {
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: literal('CURRENT_TIMESTAMP'),
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: literal('CURRENT_TIMESTAMP'),
  },
};
const tableOptions = { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' };
const reference = (table, { allowNull = false, onDelete = 'CASCADE' } = {}) => ({
  type: DataTypes.INTEGER.UNSIGNED,
  allowNull,
  references: { model: table, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete,
});

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function up({ context: queryInterface }) {
  await queryInterface.createTable(
    'reviews',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: reference('users'),
      product_id: reference('products'),
      rating: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
      comment: { type: DataTypes.TEXT, allowNull: false },
      ...timestamps,
    },
    tableOptions,
  );
  // Un seul avis par utilisateur et par produit
  await queryInterface.addIndex('reviews', ['user_id', 'product_id'], { unique: true });

  await queryInterface.createTable(
    'complaints',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: reference('users'),
      order_id: reference('orders', { allowNull: true, onDelete: 'SET NULL' }),
      subject: { type: DataTypes.STRING(150), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      status: {
        type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'),
        allowNull: false,
        defaultValue: 'OPEN',
      },
      admin_response: { type: DataTypes.TEXT, allowNull: true },
      handled_by: reference('users', { allowNull: true, onDelete: 'SET NULL' }),
      handled_at: { type: DataTypes.DATE, allowNull: true },
      ...timestamps,
    },
    tableOptions,
  );
  await queryInterface.addIndex('complaints', ['status', 'created_at']);
}

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('complaints');
  await queryInterface.dropTable('reviews');
}
