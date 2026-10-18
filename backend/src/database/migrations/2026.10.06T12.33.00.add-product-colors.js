import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.addColumn('products', 'colors', {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeColumn('products', 'colors');
}
