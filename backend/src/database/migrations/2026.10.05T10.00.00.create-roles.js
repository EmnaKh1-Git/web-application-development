import { DataTypes, literal } from 'sequelize';

// Table des rôles + données de référence.
// Les noms sont écrits « en dur » : une migration est une photo du schéma à un instant donné
// et ne doit pas changer si les constantes du code évoluent plus tard.

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function up({ context: queryInterface }) {
  await queryInterface.createTable(
    'roles',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
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
    },
    { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
  );

  await queryInterface.bulkInsert('roles', [
    { name: 'CLIENT', description: 'Client de la boutique' },
    { name: 'ADMIN', description: 'Administrateur de la plateforme' },
    { name: 'STOCK_MANAGER', description: 'Gestionnaire du stock' },
  ]);
}

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('roles');
}
