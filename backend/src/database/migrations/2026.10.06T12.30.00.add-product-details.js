import { DataTypes } from 'sequelize';

/** Ajoute les galeries d'images et les tailles disponibles aux produits. */
export async function up({ context: queryInterface }) {
  await queryInterface.addColumn('products', 'image_urls', {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  });
  await queryInterface.addColumn('products', 'sizes', {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeColumn('products', 'sizes');
  await queryInterface.removeColumn('products', 'image_urls');
}
