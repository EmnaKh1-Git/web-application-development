import { PRODUCT_SORT, PRODUCT_SORT_LABELS } from '@smart-ecommerce/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SearchX, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { QueryError } from '@/shared/components/QueryError';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { fieldClassName } from '@/shared/components/ui/fieldStyles';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Pagination } from '@/shared/components/ui/Pagination';
import { SearchInput } from '@/shared/components/ui/SearchInput';
import { PageSpinner } from '@/shared/components/ui/Spinner';
import { useUrlFilters } from '@/shared/hooks/useUrlFilters';
import { cn } from '@/shared/utils/cn';
import { categoriesApi, productKeys, productsApi } from '../api/productsApi';
import { ProductGrid } from '../components/ProductCard';

const PAGE_SIZE = 12;
const DEFAULT_FILTERS = {
  search: '',
  categoryId: '',
  minPrice: '',
  maxPrice: '',
  inStock: '',
  sort: PRODUCT_SORT.NEWEST,
  page: '1',
};

export function CatalogPage() {
  const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS);
  const params = {
    page: filters.page,
    limit: PAGE_SIZE,
    sort: filters.sort,
    search: filters.search || undefined,
    categoryId: filters.categoryId || undefined,
    minPrice: filters.minPrice || undefined,
    maxPrice: filters.maxPrice || undefined,
    inStock: filters.inStock || undefined,
  };
  const productsQuery = useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productsApi.list(params),
    placeholderData: keepPreviousData,
  });
  const categoriesQuery = useQuery({
    queryKey: productKeys.categories,
    queryFn: categoriesApi.list,
  });
  const categories = categoriesQuery.data ?? [];
  const activeCategory = categories.find((category) => String(category.id) === filters.categoryId);
  const hasFilters = Object.entries(DEFAULT_FILTERS).some(
    ([key, value]) => key !== 'sort' && key !== 'page' && filters[key] !== value,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={activeCategory ? activeCategory.name : 'Catalogue'}
        description={activeCategory?.description ?? 'Tous nos produits, livrés partout en Tunisie.'}
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <FiltersPanel
          categories={categories}
          filters={filters}
          setFilters={setFilters}
          hasFilters={hasFilters}
        />

        <section aria-label="Produits" className="min-w-0 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              className="flex-1"
              label="Rechercher un produit"
              placeholder="Rechercher un produit, une marque…"
              value={filters.search}
              onSearch={(search) => setFilters({ search })}
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span className="shrink-0">Trier par</span>
              <select
                value={filters.sort}
                onChange={(event) => setFilters({ sort: event.target.value })}
                className={fieldClassName({ className: 'sm:w-48' })}
              >
                {Object.entries(PRODUCT_SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {productsQuery.isPending ? (
            <PageSpinner />
          ) : productsQuery.isError ? (
            <QueryError error={productsQuery.error} onRetry={productsQuery.refetch} />
          ) : productsQuery.data.data.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Aucun produit trouvé"
              description="Essayez d’autres mots-clés ou retirez certains filtres."
              action={
                hasFilters && (
                  <Button variant="secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>
                    Réinitialiser les filtres
                  </Button>
                )
              }
            />
          ) : (
            <div
              className={cn(
                'space-y-6 transition-opacity',
                productsQuery.isPlaceholderData && 'opacity-60',
              )}
            >
              <ProductGrid products={productsQuery.data.data} />
              <Pagination
                meta={productsQuery.data.meta}
                itemLabel="produit(s)"
                onPageChange={(page) => {
                  setFilters({ page });
                  window.scrollTo({ top: 0 });
                }}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FiltersPanel({ categories, filters, setFilters, hasFilters }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <Button
        variant="secondary"
        className="lg:hidden"
        aria-expanded={isOpen}
        aria-controls="catalog-filters"
        onClick={() => setIsOpen((open) => !open)}
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Filtres
      </Button>
      <div
        id="catalog-filters"
        className={cn(
          'mt-3 space-y-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:mt-0 lg:block',
          !isOpen && 'hidden',
        )}
      >
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Catégories</h2>
          <ul className="mt-2 space-y-0.5">
            {[{ id: '', name: 'Toutes les catégories' }, ...categories].map((category) => {
              const isActive = String(category.id) === filters.categoryId;
              return (
                <li key={category.id || 'all'}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setFilters({ categoryId: category.id })}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm',
                      isActive
                        ? 'bg-brand-50 font-semibold text-brand-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    )}
                  >
                    {category.name}
                    {category.productCount !== undefined && (
                      <span className="text-xs text-slate-400">{category.productCount}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <PriceFilter
          key={`${filters.minPrice}-${filters.maxPrice}`}
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          onApply={(prices) => setFilters(prices)}
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={filters.inStock === 'true'}
            onChange={(event) => setFilters({ inStock: event.target.checked ? 'true' : '' })}
            className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
          />
          Disponibles uniquement
        </label>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setFilters({ search: '', categoryId: '', minPrice: '', maxPrice: '', inStock: '' })
            }
          >
            Effacer les filtres
          </Button>
        )}
      </div>
    </aside>
  );
}

function PriceFilter({ minPrice, maxPrice, onApply }) {
  const [values, setValues] = useState({ minPrice, maxPrice });
  const isInvalid =
    values.minPrice !== '' &&
    values.maxPrice !== '' &&
    Number(values.minPrice) > Number(values.maxPrice);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!isInvalid) onApply(values);
      }}
    >
      <h2 className="text-sm font-semibold text-slate-900">Prix (DT)</h2>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min="0"
          inputMode="decimal"
          aria-label="Prix minimum"
          placeholder="Min"
          value={values.minPrice}
          onChange={(event) => setValues({ ...values, minPrice: event.target.value })}
          className={fieldClassName()}
        />
        <span aria-hidden="true" className="text-slate-400">
          –
        </span>
        <input
          type="number"
          min="0"
          inputMode="decimal"
          aria-label="Prix maximum"
          placeholder="Max"
          value={values.maxPrice}
          onChange={(event) => setValues({ ...values, maxPrice: event.target.value })}
          className={fieldClassName({ error: isInvalid })}
        />
      </div>
      {isInvalid && (
        <p className="mt-1.5 text-xs text-red-600">Le maximum doit être supérieur au minimum.</p>
      )}
      <Button type="submit" variant="secondary" size="sm" className="mt-2" fullWidth>
        Appliquer
      </Button>
    </form>
  );
}
