import { PERMISSIONS } from '@smart-ecommerce/shared';
import { ShoppingCart, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useAddToCart } from '@/features/cart-orders/hooks/useCart';
import { useAuth } from '@/shared/auth/useAuth';
import { ProductImage } from '@/shared/components/ProductImage';
import { Button } from '@/shared/components/ui/Button';
import { buttonClassName } from '@/shared/components/ui/buttonStyles';
import { StarRating } from '@/shared/components/ui/StarRating';
import { formatPrice } from '@/shared/utils/format';
import { StockAvailability } from './StockAvailability';

/**
 * Carte d'un produit dans le catalogue et sur la page d'accueil.
 * `highlight` : raison d'une recommandation de l'IA (« Souvent acheté avec … »).
 */
export function ProductCard({ product, highlight }) {
  const { isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();
  const addToCart = useAddToCart();
  const productUrl = `/products/${product.id}`;
  const hasVariants = product.sizes?.length > 0 || product.colors?.length > 0;
  const isAdding = addToCart.isPending && addToCart.variables?.productId === product.id;

  let action = null;
  if (!isAuthenticated) {
    action = (
      <Link
        to="/login"
        state={{ from: location }}
        className={buttonClassName({ variant: 'secondary', size: 'sm' })}
      >
        <ShoppingCart aria-hidden="true" className="size-4" />
        Ajouter
      </Link>
    );
  } else if (hasPermission(PERMISSIONS.CART_MANAGE)) {
    action = hasVariants ? (
      <Link to={productUrl} className={buttonClassName({ variant: 'secondary', size: 'sm' })}>
        Choisir
      </Link>
    ) : (
      <Button
        size="sm"
        disabled={!product.stock.inStock}
        isLoading={isAdding}
        aria-label={`Ajouter ${product.name} au panier`}
        onClick={() => addToCart.mutate({ productId: product.id, quantity: 1 })}
      >
        {!isAdding && <ShoppingCart aria-hidden="true" className="size-4" />}
        Ajouter
      </Button>
    );
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
      <Link to={productUrl} tabIndex={-1} aria-hidden="true">
        <ProductImage
          src={product.imageUrl}
          name={product.name}
          className="aspect-square transition group-hover:opacity-95"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {highlight && (
          <p className="flex items-start gap-1 text-xs font-medium text-violet-700">
            <Sparkles aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
            {highlight}
          </p>
        )}
        <p className="text-xs font-medium tracking-wide text-brand-700 uppercase">
          {product.category?.name}
        </p>
        <h3 className="line-clamp-2 font-semibold text-slate-900">
          <Link to={productUrl} className="hover:text-brand-700">
            {product.name}
          </Link>
        </h3>
        {product.rating.count > 0 ? (
          <StarRating value={product.rating.average} count={product.rating.count} size="sm" />
        ) : (
          <p className="text-xs text-slate-400">Pas encore d’avis</p>
        )}
        <StockAvailability stock={product.stock} className="text-xs" />
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <p className="text-lg font-bold text-slate-900">{formatPrice(product.price)}</p>
          {action}
        </div>
      </div>
    </article>
  );
}

/** Grille de cartes produits (`highlights` : Map productId → raison affichée). */
export function ProductGrid({ products, highlights }) {
  return (
    <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} highlight={highlights?.get(product.id)} />
      ))}
    </div>
  );
}
