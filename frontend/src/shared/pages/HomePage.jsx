import { MessageSquareText, PackageCheck, Search, ShoppingCart, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '@/shared/auth/useAuth';
import { buttonClassName } from '@/shared/components/ui/buttonStyles';

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

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-16">
      <section className="rounded-3xl bg-linear-to-br from-brand-600 to-brand-900 px-6 py-16 text-white shadow-lg sm:px-12 sm:py-20">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium ring-1 ring-white/20">
            <Sparkles aria-hidden="true" className="size-4" />
            Recommandations intelligentes bientôt disponibles
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
