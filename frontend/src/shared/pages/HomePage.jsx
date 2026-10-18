import { PRODUCT_SORT } from '@smart-ecommerce/shared';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpen,
  Dumbbell,
  MessageSquareText,
  PackageCheck,
  Search,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sofa,
  Sparkles,
  Tags,
} from 'lucide-react';
import { Link } from 'react-router';
import { RecommendedProducts } from '@/features/ai/components/RecommendedProducts';
import { categoriesApi, productKeys, productsApi } from '@/features/products/api/productsApi';
import { ProductGrid } from '@/features/products/components/ProductCard';
import { useAuth } from '@/shared/auth/useAuth';
import { buttonClassName } from '@/shared/components/ui/buttonStyles';
import { Spinner } from '@/shared/components/ui/Spinner';

const FEATURES = [
  {
    icon: Search,
    title: 'Recherche et filtres',
    description: 'Trouvez un produit par nom, catégorie ou prix, et triez par popularité.',
  },
  {
    icon: ShoppingCart,
    title: 'Panier et commande',
    description: 'Ajoutez vos articles au panier et commandez en quelques clics.',
  },
  {
    icon: PackageCheck,
    title: 'Suivi de livraison',
    description: 'Suivez chaque commande, de sa confirmation jusqu’à la livraison.',
  },
  {
    icon: MessageSquareText,
    title: 'Avis et réclamations',
    description: 'Partagez votre expérience et obtenez une réponse rapide en cas de problème.',
  },
];

const CATEGORY_ICONS = {
  'high-tech': Smartphone,
  maison: Sofa,
  sport: Dumbbell,
  mode: Shirt,
  beaute: Sparkles,
  livres: BookOpen,
};

const SECTIONS = [
  { title: 'Meilleures ventes', sort: PRODUCT_SORT.POPULARITY },
  { title: 'Les mieux notés', sort: PRODUCT_SORT.RATING },
  { title: 'Nouveautés', sort: PRODUCT_SORT.NEWEST },
];

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-16">
      <section className="rounded-3xl bg-linear-to-br from-brand-600 to-brand-900 px-6 py-16 text-white shadow-lg sm:px-12 sm:py-20">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium ring-1 ring-white/20">
            <Sparkles aria-hidden="true" className="size-4" />
            Recommandations personnalisées par l’IA
          </p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Votre boutique en ligne, en plus intelligent.
          </h1>
          <p className="mt-4 text-lg text-brand-100">
            Trouvez rapidement les bons produits, commandez en toute simplicité et suivez vos
            livraisons en temps réel.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/products" className={buttonClassName({ variant: 'secondary', size: 'lg' })}>
              Découvrir le catalogue
            </Link>
            {!isAuthenticated && (
              <Link
                to="/register"
                className={buttonClassName({
                  size: 'lg',
                  className: 'bg-white/10 ring-1 ring-white/30 ring-inset hover:bg-white/20',
                })}
              >
                Créer un compte
              </Link>
            )}
          </div>
        </div>
      </section>

      <CategoriesSection />
      <RecommendedProducts
        title={isAuthenticated ? 'Sélectionnés pour vous' : 'Nos recommandations'}
        description={
          isAuthenticated
            ? 'D’après vos achats et ceux des clients qui vous ressemblent.'
            : 'Les produits les plus appréciés en ce moment, disponibles tout de suite.'
        }
      />
      {SECTIONS.map((section) => (
        <ProductsSection key={section.sort} {...section} />
      ))}

      <section aria-labelledby="features-title">
        <h2 id="features-title" className="text-2xl font-bold tracking-tight">
          Tout pour acheter sereinement
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CategoriesSection() {
  const query = useQuery({ queryKey: productKeys.categories, queryFn: categoriesApi.list });
  if (!query.data?.length) return null;

  return (
    <section aria-labelledby="categories-title">
      <h2 id="categories-title" className="text-2xl font-bold tracking-tight">
        Nos rayons
      </h2>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {query.data.map((category) => {
          const Icon = CATEGORY_ICONS[category.slug] ?? Tags;
          return (
            <li key={category.id}>
              <Link
                to={`/products?categoryId=${category.id}`}
                className="flex h-full flex-col items-center gap-3 rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-brand-300"
              >
                <span className="inline-flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                <span className="font-semibold">{category.name}</span>
                <span className="text-xs text-slate-500">{category.productCount} produits</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ProductsSection({ title, sort }) {
  const params = { sort, limit: 4, inStock: true };
  const query = useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productsApi.list(params),
  });
  const titleId = `home-${sort}`;

  return (
    <section aria-labelledby={titleId}>
      <div className="flex items-end justify-between gap-4">
        <h2 id={titleId} className="text-2xl font-bold tracking-tight">
          {title}
        </h2>
        <Link
          to={`/products?sort=${sort}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          Tout voir
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <div className="mt-6">
        {query.isPending ? (
          <Spinner className="text-brand-600" />
        ) : query.data?.data.length ? (
          <ProductGrid products={query.data.data} />
        ) : null}
      </div>
    </section>
  );
}
