import { QueryTypes } from 'sequelize';

const CLOTHING_NAMES = ['Chemise à carreaux homme', 'Robe d’été fille', 'Robe de soirée noire'];

export async function up({ context: queryInterface }) {
  const products = await queryInterface.sequelize.query(
    `SELECT p.id, p.name, p.image_url
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE c.slug = 'mode'`,
    { type: QueryTypes.SELECT },
  );

  for (const product of products) {
    const sizes = CLOTHING_NAMES.includes(product.name) ? ['XS', 'S', 'M', 'L', 'XL'] : [];
    const imageUrls = product.image_url
      ? [1, 2, 3].map((number) => product.image_url.replace('/1.webp', `/${number}.webp`))
      : [];
    await queryInterface.sequelize.query(
      'UPDATE products SET image_urls = :imageUrls, sizes = :sizes WHERE id = :id',
      {
        replacements: {
          id: product.id,
          imageUrls: JSON.stringify(imageUrls),
          sizes: JSON.stringify(sizes),
        },
      },
    );
  }
}

export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query(
    `UPDATE products p
     JOIN categories c ON c.id = p.category_id
     SET p.image_urls = JSON_ARRAY(), p.sizes = JSON_ARRAY()
     WHERE c.slug = 'mode'`,
  );
}
