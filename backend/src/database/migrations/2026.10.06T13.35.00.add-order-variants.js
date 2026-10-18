import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  const cartDescription = await queryInterface.describeTable('cart_items');
  const orderDescription = await queryInterface.describeTable('order_items');
  if (!cartDescription.size)
    await queryInterface.addColumn('cart_items', 'size', {
      type: DataTypes.STRING(20),
      allowNull: true,
    });
  if (!cartDescription.color)
    await queryInterface.addColumn('cart_items', 'color', {
      type: DataTypes.STRING(40),
      allowNull: true,
    });
  if (!orderDescription.size)
    await queryInterface.addColumn('order_items', 'size', {
      type: DataTypes.STRING(20),
      allowNull: true,
    });
  if (!orderDescription.color)
    await queryInterface.addColumn('order_items', 'color', {
      type: DataTypes.STRING(40),
      allowNull: true,
    });
  const foreignKeys = await queryInterface.getForeignKeyReferencesForTable('cart_items');
  for (const foreignKey of foreignKeys) {
    if (foreignKey.columnName === 'cart_id')
      await queryInterface.removeConstraint('cart_items', foreignKey.constraintName);
  }
  await queryInterface.removeIndex('cart_items', ['cart_id', 'product_id']);
  await queryInterface.addIndex('cart_items', ['cart_id', 'product_id', 'size', 'color'], {
    unique: true,
  });
  await queryInterface.addConstraint('cart_items', {
    fields: ['cart_id'],
    type: 'foreign key',
    name: 'cart_items_cart_id_fk',
    references: { table: 'carts', field: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
}

export async function down({ context: queryInterface }) {
  // D'abord recréer l'ancien index : la clé étrangère cart_id a toujours besoin d'un index.
  // (La contrainte cart_items_cart_id_fk est équivalente à celle d'origine : elle est conservée.)
  await queryInterface.addIndex('cart_items', ['cart_id', 'product_id'], { unique: true });
  await queryInterface.removeIndex('cart_items', ['cart_id', 'product_id', 'size', 'color']);
  await queryInterface.removeColumn('order_items', 'color');
  await queryInterface.removeColumn('order_items', 'size');
  await queryInterface.removeColumn('cart_items', 'color');
  await queryInterface.removeColumn('cart_items', 'size');
}
