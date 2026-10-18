import { DataTypes, literal } from 'sequelize';

// Module Utilisateurs (Fares) : adresses de livraison.

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

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function up({ context: queryInterface }) {
  await queryInterface.createTable(
    'addresses',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      label: { type: DataTypes.STRING(50), allowNull: false },
      street: { type: DataTypes.STRING(255), allowNull: false },
      city: { type: DataTypes.STRING(100), allowNull: false },
      postal_code: { type: DataTypes.STRING(20), allowNull: false },
      country: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'Tunisie' },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      ...timestamps,
    },
    { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
  );
}

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('addresses');
}
