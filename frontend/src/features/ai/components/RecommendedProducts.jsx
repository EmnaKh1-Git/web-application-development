import { useQuery } from '@tanstack/react-query';
import { ProductGrid } from '@/features/products/components/ProductCard';
import { Spinner } from '@/shared/components/ui/Spinner';
import { aiApi, aiKeys } from '../api/aiApi';
import { AiBadge } from './AiBadge';

/**
 * Recommandations de l'IA, chacune avec sa raison (« Souvent acheté avec … »).
 * Contexte : un produit (`productId`), un panier (`productIds`) ou, sans paramètre,
 * l'historique du client connecté (sinon les produits populaires).
 *
 * @example <RecommendedProducts productId={product.id} title="Vous aimerez aussi" />
 */
export function RecommendedProducts({ productId, productIds, title, description, limit = 4 }) {
  const params = {
    limit,
    ...(productId && { productId }),
    ...(productIds?.length && { productIds: productIds.join(',') }),
  };
  const query = useQuery({
    queryKey: aiKeys.recommendations(params),
    queryFn: () => aiApi.recommendations(params),
  });
  const items = query.data?.items ?? [];
  if (!query.isPending && items.length === 0) return null;
  const titleId = `recommendations-${productId ?? productIds?.join('-') ?? 'home'}`;

  return (
    <section aria-labelledby={titleId} className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={titleId} className="text-xl font-bold tracking-tight">
          {title}
        </h2>
        <AiBadge label="Recommandé par l’IA" />
      </div>
      {description && <p className="-mt-2 text-sm text-slate-600">{description}</p>}
      {query.isPending ? (
        <Spinner className="text-brand-600" />
      ) : (
        <ProductGrid
          products={items.map((item) => item.product)}
          highlights={new Map(items.map((item) => [item.product.id, item.reason.label]))}
        />
      )}
    </section>
  );
}
