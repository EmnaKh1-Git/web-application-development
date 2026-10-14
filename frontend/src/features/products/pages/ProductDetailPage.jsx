import { MAX_CART_ITEM_QUANTITY, PERMISSIONS } from '@smart-ecommerce/shared';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, PackageX, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { RecommendedProducts } from '@/features/ai/components/RecommendedProducts';
import { useAddToCart } from '@/features/cart-orders/hooks/useCart';
import { ProductReviews } from '@/features/reviews-complaints/components/ProductReviews';
import { useAuth } from '@/shared/auth/useAuth';
import { ProductImage } from '@/shared/components/ProductImage';
import { QueryError } from '@/shared/components/QueryError';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { buttonClassName } from '@/shared/components/ui/buttonStyles';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { QuantityStepper } from '@/shared/components/ui/QuantityStepper';
import { PageSpinner } from '@/shared/components/ui/Spinner';
import { StarRating } from '@/shared/components/ui/StarRating';
import { cn } from '@/shared/utils/cn';
import { formatPrice } from '@/shared/utils/format';
import { productKeys, productsApi } from '../api/productsApi';
import { StockAvailability } from '../components/StockAvailability';
import { VariantPicker } from '../components/VariantPicker';

export function ProductDetailPage() {
  const { id } = useParams();
  const query = useQuery({ queryKey: productKeys.detail(id), queryFn: () => productsApi.get(id) });

  if (query.isPending) return <PageSpinner />;
  if (query.isError) {
    return query.error.status === 404 || query.error.status === 400 ? (
      <EmptyState
        icon={PackageX}
        titleAs="h1"
        title="Produit introuvable"
        description="Ce produit n’existe pas ou n’est plus disponible à la vente."
        action={
          <Link to="/products" className={buttonClassName()}>
            Retour au catalogue
          </Link>
        }
      />
    ) : (
      <QueryError error={query.error} onRetry={query.refetch} />
    );
  }

  const product = query.data;
  return (
    // key : l'état (image, variante, quantité) repart de zéro quand on change de produit
    <div key={product.id} className="space-y-12">
      <nav
        aria-label="Fil d’Ariane"
        className="flex flex-wrap items-center gap-1 text-sm text-slate-500"
      >
        <Link to="/products" className="hover:text-slate-900">
          Catalogue
        </Link>
        <ChevronRight aria-hidden="true" className="size-4" />
        {product.category && (
          <>
            <Link
              to={`/products?categoryId=${product.category.id}`}
              className="hover:text-slate-900"
            >
              {product.category.name}
            </Link>
            <ChevronRight aria-hidden="true" className="size-4" />
          </>
        )}
        <span aria-current="page" className="line-clamp-1 font-medium text-slate-900">
          {product.name}
        </span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <Gallery product={product} />
        <ProductInfo product={product} />
      </div>

      <ProductReviews productId={product.id} />
      <RecommendedProducts
        productId={product.id}
        title="Vous aimerez aussi"
        description="Sélection calculée à partir des achats des autres clients et des produits similaires."
      />
    </div>
  );
}

function Gallery({ product }) {
  const images = product.imageUrls;
  const [selected, setSelected] = useState(0);

  return (
    <div className="mx-auto w-full max-w-md space-y-3 lg:max-w-none">
      <ProductImage
        src={images[selected]}
        name={product.name}
        alt={product.name}
        fit="contain"
        className="aspect-square rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
      />
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
              className={cn(
                'size-20 shrink-0 overflow-hidden rounded-lg bg-white ring-2 transition',
                index === selected ? 'ring-brand-600' : 'ring-transparent hover:ring-slate-300',
              )}
            >
              <ProductImage
                src={image}
                name={product.name}
                fit="contain"
                compact
                className="size-full"
              />
              <span className="sr-only">Afficher l’image {index + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductInfo({ product }) {
  const { isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();
  const addToCart = useAddToCart();
  // Une seule option possible : elle est choisie d'office
  const [size, setSize] = useState(product.sizes.length === 1 ? product.sizes[0] : '');
  const [color, setColor] = useState(product.colors.length === 1 ? product.colors[0] : '');
  const [quantity, setQuantity] = useState(1);
  const maxQuantity = Math.min(product.stock.availableQuantity, MAX_CART_ITEM_QUANTITY);
  const missingChoice =
    (product.sizes.length > 0 && !size && 'Choisissez une taille') ||
    (product.colors.length > 0 && !color && 'Choisissez une couleur') ||
    null;

  return (
    <div className="space-y-6">
      <div>
        {product.category && (
          <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">
            {product.category.name}
          </p>
        )}
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-balance">{product.name}</h1>
        <a
          href="#avis"
          className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <StarRating value={product.rating.average} />
          {product.rating.count > 0
            ? `${product.rating.average.toLocaleString('fr-FR')} · ${product.rating.count} avis`
            : 'Aucun avis'}
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <p className="text-3xl font-bold">{formatPrice(product.price)}</p>
        <StockAvailability stock={product.stock} />
      </div>

      <p className="leading-7 whitespace-pre-line text-slate-700">{product.description}</p>

      <VariantPicker label="Taille" options={product.sizes} value={size} onChange={setSize} />
      <VariantPicker
        label="Couleur"
        kind="color"
        options={product.colors}
        value={color}
        onChange={setColor}
      />

      {!isAuthenticated ? (
        <Link to="/login" state={{ from: location }} className={buttonClassName({ size: 'lg' })}>
          <ShoppingCart aria-hidden="true" className="size-5" />
          Se connecter pour commander
        </Link>
      ) : hasPermission(PERMISSIONS.CART_MANAGE) ? (
        product.stock.inStock && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <QuantityStepper
                label="Quantité"
                value={Math.min(quantity, maxQuantity)}
                max={maxQuantity}
                onChange={setQuantity}
              />
              <Button
                size="lg"
                className="flex-1 sm:flex-none"
                disabled={Boolean(missingChoice)}
                isLoading={addToCart.isPending}
                onClick={() =>
                  addToCart.mutate({
                    productId: product.id,
                    quantity: Math.min(quantity, maxQuantity),
                    size: size || undefined,
                    color: color || undefined,
                  })
                }
              >
                {!addToCart.isPending && <ShoppingCart aria-hidden="true" className="size-5" />}
                Ajouter au panier
              </Button>
            </div>
            {missingChoice && (
              <p className="text-sm text-slate-500">{missingChoice} pour continuer.</p>
            )}
          </div>
        )
      ) : (
        <Alert variant="info">
          Les comptes du back-office ne peuvent pas passer de commande : connectez-vous avec un
          compte client pour acheter.
        </Alert>
      )}

      <ul className="grid gap-3 border-t border-slate-200 pt-6 text-sm text-slate-600 sm:grid-cols-2">
        <li className="flex items-center gap-2">
          <Truck aria-hidden="true" className="size-5 text-brand-600" />
          Livraison en 3 jours ouvrés
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="size-5 text-brand-600" />
          Annulation gratuite avant expédition
        </li>
      </ul>
    </div>
  );
}
