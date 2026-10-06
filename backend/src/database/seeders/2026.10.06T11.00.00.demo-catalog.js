import { DEFAULT_LOW_STOCK_THRESHOLD } from '@smart-ecommerce/shared';
import { uniqueSlug } from '../../core/utils/slug.js';
import { models, sequelize } from '../index.js';
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from './data/catalog.js';

// Catalogue de démonstration : rayons, produits et quantités en stock.
// L'historique des mouvements de stock est créé par le seeder « demo-activity »,
// qui le rend cohérent avec les commandes de démonstration.

const DAY = 86_400_000;

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function up() {
  const { Category, Product, Stock } = models;

  await sequelize.transaction(async (transaction) => {
    const categoryIds = {};
    for (const { key, name, description } of DEMO_CATEGORIES) {
      const [category] = await Category.findOrCreate({
        where: { name },
        defaults: { name, description, slug: await uniqueSlug(Category, name, { transaction }) },
        transaction,
      });
      categoryIds[key] = category.id;
    }

    for (const [index, product] of DEMO_PRODUCTS.entries()) {
      // Produits ajoutés au catalogue il y a 61 à 90 jours (avant les commandes de démo)
      const createdAt = new Date(Date.now() - (90 - (index % 30)) * DAY);
      const created = await Product.create(
        {
          categoryId: categoryIds[product.category],
          name: product.name,
          slug: await uniqueSlug(Product, product.name, { transaction }),
          description: product.description,
          price: product.price,
          imageUrl: product.image,
          isActive: true,
          createdAt,
        },
        { transaction },
      );
      await Stock.create(
        {
          productId: created.id,
          quantity: product.stock,
          lowStockThreshold: product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
        },
        { transaction },
      );
    }
  });
}

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function down() {
  const { Category, Product } = models;
  // Supprime aussi (en cascade) stocks, mouvements, lignes de panier et avis de ces produits.
  await Product.destroy({ where: { name: DEMO_PRODUCTS.map((product) => product.name) } });
  for (const { name } of DEMO_CATEGORIES) {
    const category = await Category.findOne({ where: { name } });
    if (category && (await Product.count({ where: { categoryId: category.id } })) === 0) {
      await category.destroy();
    }
  }
}
