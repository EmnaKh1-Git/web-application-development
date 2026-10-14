import { PRODUCT_SORT, PRODUCT_SORT_LABELS } from '@smart-ecommerce/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, PackageSearch, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { StockStatusBadge } from '@/features/stock/components/StockStatusBadge';
import { ProductImage } from '@/shared/components/ProductImage';
import { QueryError } from '@/shared/components/QueryError';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { fieldClassName } from '@/shared/components/ui/fieldStyles';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Pagination } from '@/shared/components/ui/Pagination';
import { SearchInput } from '@/shared/components/ui/SearchInput';
import { PageSpinner } from '@/shared/components/ui/Spinner';
import { StarRating } from '@/shared/components/ui/StarRating';
import { useUrlFilters } from '@/shared/hooks/useUrlFilters';
import { cn } from '@/shared/utils/cn';
import { formatNumber, formatPrice } from '@/shared/utils/format';
import { notifyError, notifySuccess } from '@/shared/utils/notify';
import { categoriesApi, productKeys, productsApi } from '../api/productsApi';
import { ProductFormDialog } from '../components/ProductFormDialog';

const DEFAULT_FILTERS = {
  search: '',
  categoryId: '',
  includeInactive: 'true',
  sort: PRODUCT_SORT.NEWEST,
  page: '1',
};

/** Back-office : catalogue complet, y compris les produits désactivés. */
export function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS);
  const [editing, setEditing] = useState(null); // null = fermé, {} = création, produit = modification
  const [toggling, setToggling] = useState(null);
  const params = {
    page: filters.page,
    limit: 15,
    sort: filters.sort,
    includeInactive: filters.includeInactive || undefined,
    search: filters.search || undefined,
    categoryId: filters.categoryId || undefined,
  };
  const query = useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productsApi.list(params),
    placeholderData: keepPreviousData,
  });
  const categoriesQuery = useQuery({
    queryKey: productKeys.categories,
    queryFn: categoriesApi.list,
  });

  const toggleMutation = useMutation({
    // Désactiver = DELETE ; réactiver = PUT complet avec isActive à true
    mutationFn: (product) =>
      product.isActive
        ? productsApi.deactivate(product.id)
        : productsApi.update(product.id, {
            name: product.name,
            categoryId: product.category.id,
            price: product.price,
            description: product.description,
            imageUrl: product.imageUrl,
            imageUrls: product.imageUrls,
            sizes: product.sizes,
            colors: product.colors,
            isActive: true,
          }),
    onSuccess: async (_result, product) => {
      notifySuccess(product.isActive ? 'Produit désactivé' : 'Produit réactivé', product.name);
      setToggling(null);
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: notifyError,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produits"
        description="Ajoutez, modifiez ou retirez des produits du catalogue."
        actions={
          <Button onClick={() => setEditing({})}>
            <Plus aria-hidden="true" className="size-4" />
            Nouveau produit
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-[1fr_200px_200px]">
        <SearchInput
          label="Rechercher un produit"
          value={filters.search}
          onSearch={(search) => setFilters({ search })}
        />
        <select
          aria-label="Catégorie"
          value={filters.categoryId}
          onChange={(event) => setFilters({ categoryId: event.target.value })}
          className={fieldClassName()}
        >
          <option value="">Toutes les catégories</option>
          {(categoriesQuery.data ?? []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Trier par"
          value={filters.sort}
          onChange={(event) => setFilters({ sort: event.target.value })}
          className={fieldClassName()}
        >
          {Object.entries(PRODUCT_SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={filters.includeInactive === 'true'}
          onChange={(event) =>
            setFilters({ includeInactive: event.target.checked ? 'true' : 'false' })
          }
          className="size-4 rounded border-slate-300"
        />
        Inclure les produits désactivés
      </label>

      {query.isPending ? (
        <PageSpinner />
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={query.refetch} />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Aucun produit"
          description="Modifiez les filtres."
        />
      ) : (
        <div className={cn('space-y-4', query.isPlaceholderData && 'opacity-60')}>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Produit
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Prix
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Stock
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Avis
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Ventes
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Statut
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {query.data.data.map((product) => (
                  <tr
                    key={product.id}
                    className={cn('hover:bg-slate-50', !product.isActive && 'bg-slate-50/60')}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          src={product.imageUrl}
                          name={product.name}
                          compact
                          className="size-11 shrink-0 rounded-lg"
                        />
                        <div className="min-w-0">
                          <Link
                            to={`/products/${product.id}`}
                            className="line-clamp-1 font-medium hover:text-brand-700"
                          >
                            {product.name}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {product.category?.name}
                            {product.sizes.length > 0 && ` · ${product.sizes.length} tailles`}
                            {product.colors.length > 0 && ` · ${product.colors.length} couleurs`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums">
                          {formatNumber(product.stock.availableQuantity)}
                        </span>
                        <StockStatusBadge status={product.stock.status} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {product.rating.count > 0 ? (
                        <StarRating
                          value={product.rating.average}
                          count={product.rating.count}
                          size="sm"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatNumber(product.salesCount)}
                    </td>
                    <td className="px-4 py-3">
                      {product.isActive ? (
                        <Badge tone="success">Actif</Badge>
                      ) : (
                        <Badge>Désactivé</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="secondary" size="sm" onClick={() => setEditing(product)}>
                          <Pencil aria-hidden="true" className="size-4" />
                          <span className="sr-only">Modifier {product.name}</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setToggling(product)}>
                          {product.isActive ? (
                            <EyeOff aria-hidden="true" className="size-4" />
                          ) : (
                            <Eye aria-hidden="true" className="size-4" />
                          )}
                          <span className="sr-only">
                            {product.isActive ? 'Désactiver' : 'Réactiver'} {product.name}
                          </span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            meta={query.data.meta}
            itemLabel="produit(s)"
            onPageChange={(page) => setFilters({ page })}
          />
        </div>
      )}

      <ProductFormDialog
        open={editing !== null}
        product={editing?.id ? editing : null}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={toggling !== null}
        title={toggling?.isActive ? 'Désactiver ce produit ?' : 'Réactiver ce produit ?'}
        confirmLabel={toggling?.isActive ? 'Désactiver' : 'Réactiver'}
        variant={toggling?.isActive ? 'danger' : 'primary'}
        isLoading={toggleMutation.isPending}
        onConfirm={() => toggleMutation.mutate(toggling)}
        onClose={() => setToggling(null)}
      >
        {toggling?.isActive
          ? `« ${toggling.name} » ne sera plus visible dans le catalogue. Il reste dans l’historique des commandes.`
          : `« ${toggling?.name} » sera de nouveau visible dans le catalogue.`}
      </ConfirmDialog>
    </div>
  );
}
