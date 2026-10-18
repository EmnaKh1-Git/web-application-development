import { DataTypes, literal } from 'sequelize';

// Module Produits & Catégories (Emna).

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
    'categories',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      description: { type: DataTypes.STRING(500), allowNull: true },
      parent_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      ...timestamps,
    },
    tableOptions,
  );

  await queryInterface.createTable(
    'products',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      category_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT', // une catégorie contenant des produits ne peut pas être supprimée
      },
      name: { type: DataTypes.STRING(150), allowNull: false },
      slug: { type: DataTypes.STRING(170), allowNull: false, unique: true },
      description: { type: DataTypes.TEXT, allowNull: false },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      image_url: { type: DataTypes.STRING(500), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      // Popularité : nombre d'exemplaires vendus (commandes confirmées)
      sales_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      // Résumé des avis, mis à jour par le module Avis
      rating_average: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 0 },
      review_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      ...timestamps,
    },
    tableOptions,
  );

  await queryInterface.addIndex('products', ['price']);
  await queryInterface.addIndex('products', ['sales_count']);
  await queryInterface.addIndex('products', ['is_active', 'created_at']);
}

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('products');
  await queryInterface.dropTable('categories');
}
