import { DataTypes, literal } from 'sequelize';

// Module Panier, Commandes & Livraison (Oussama).

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
const foreignKey = (table, onDelete) => ({
  type: DataTypes.INTEGER.UNSIGNED,
  allowNull: false,
  references: { model: table, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete,
});

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function up({ context: queryInterface }) {
  await queryInterface.createTable(
    'carts',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { ...foreignKey('users', 'CASCADE'), unique: true }, // un panier par utilisateur
      ...timestamps,
    },
    tableOptions,
  );

  await queryInterface.createTable(
    'cart_items',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      cart_id: foreignKey('carts', 'CASCADE'),
      product_id: foreignKey('products', 'CASCADE'),
      quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      ...timestamps,
    },
    tableOptions,
  );
  await queryInterface.addIndex('cart_items', ['cart_id', 'product_id'], { unique: true });

  await queryInterface.createTable(
    'orders',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: foreignKey('users', 'RESTRICT'),
      status: {
        type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      // Copie de l'adresse au moment de la commande (elle ne change plus ensuite)
      shipping_address: { type: DataTypes.JSON, allowNull: false },
      notes: { type: DataTypes.STRING(500), allowNull: true },
      confirmed_at: { type: DataTypes.DATE, allowNull: true },
      cancelled_at: { type: DataTypes.DATE, allowNull: true },
      ...timestamps,
    },
    tableOptions,
  );
  await queryInterface.addIndex('orders', ['status', 'created_at']);

  await queryInterface.createTable(
    'order_items',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      order_id: foreignKey('orders', 'CASCADE'),
      product_id: foreignKey('products', 'RESTRICT'),
      // Copies au moment de la commande : un changement de nom ou de prix ne modifie pas l'historique
      product_name: { type: DataTypes.STRING(150), allowNull: false },
      unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      line_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      ...timestamps,
    },
    tableOptions,
  );

  await queryInterface.createTable(
    'deliveries',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      order_id: { ...foreignKey('orders', 'CASCADE'), unique: true },
      status: {
        type: DataTypes.ENUM('PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      carrier: { type: DataTypes.STRING(100), allowNull: true },
      tracking_number: { type: DataTypes.STRING(100), allowNull: true },
      estimated_delivery_date: { type: DataTypes.DATEONLY, allowNull: true },
      shipped_at: { type: DataTypes.DATE, allowNull: true },
      delivered_at: { type: DataTypes.DATE, allowNull: true },
      ...timestamps,
    },
    tableOptions,
  );
}

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('deliveries');
  await queryInterface.dropTable('order_items');
  await queryInterface.dropTable('orders');
  await queryInterface.dropTable('cart_items');
  await queryInterface.dropTable('carts');
}
