import { DataTypes, literal } from 'sequelize';

// Module Stock (Yassine).

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

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function up({ context: queryInterface }) {
  await queryInterface.createTable(
    'stocks',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      product_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        unique: true, // un stock par produit
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      low_stock_threshold: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 5 },
      ...timestamps,
    },
    tableOptions,
  );

  await queryInterface.createTable(
    'stock_movements',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      product_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: { type: DataTypes.ENUM('IN', 'OUT', 'ADJUST', 'RETURN'), allowNull: false },
      // Variation signée (+ entrée, - sortie) et quantité obtenue après le mouvement
      quantity_change: { type: DataTypes.INTEGER, allowNull: false },
      quantity_after: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      reason: { type: DataTypes.STRING(255), allowNull: true },
      order_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      user_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      ...timestamps,
    },
    tableOptions,
  );
  await queryInterface.addIndex('stock_movements', ['product_id', 'created_at']);
}

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('stock_movements');
  await queryInterface.dropTable('stocks');
}
