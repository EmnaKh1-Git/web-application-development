import {
  PERMISSIONS,
  STOCK_MOVEMENT_TYPE_LABELS,
  STOCK_MOVEMENT_TYPE_LIST,
} from '@smart-ecommerce/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Boxes,
  History,
  Package,
  PackagePlus,
  PackageSearch,
  PackageX,
  PencilLine,
  ScanLine,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { categoriesApi, productKeys } from '@/features/products/api/productsApi';
import { useAuth } from '@/shared/auth/useAuth';
import { ProductImage } from '@/shared/components/ProductImage';
import { QueryError } from '@/shared/components/QueryError';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { fieldClassName } from '@/shared/components/ui/fieldStyles';
import { FilterTabs } from '@/shared/components/ui/FilterTabs';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Pagination } from '@/shared/components/ui/Pagination';
import { SearchInput } from '@/shared/components/ui/SearchInput';
import { PageSpinner } from '@/shared/components/ui/Spinner';
import { StatCard } from '@/shared/components/ui/StatCard';
import { useUrlFilters } from '@/shared/hooks/useUrlFilters';
import { cn } from '@/shared/utils/cn';
import { formatDateTime, formatNumber, formatPrice } from '@/shared/utils/format';
import { stockApi, stockKeys } from '../api/stockApi';
import { MovementsTable } from '../components/MovementsTable';
import { ReceptionDialog } from '../components/ReceptionDialog';
import { AdjustStockDialog, RestockDialog } from '../components/StockDialogs';
import { StockForecastView } from '../components/StockForecastView';
import { StockStatusBadge } from '../components/StockStatusBadge';

const PAGE_SIZE = 15;
const DEFAULT_FILTERS = {
  view: 'stock',
  status: 'all',
  search: '',
  categoryId: '',
  sort: 'name',
  type: '',
  productId: '',
  page: '1',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'alert', label: 'À traiter' },
  { value: 'low', label: 'Stock faible' },
  { value: 'out', label: 'Rupture' },
  { value: 'ok', label: 'En stock' },
];

const SORT_OPTIONS = {
  name: 'Nom du produit',
  quantity_asc: 'Quantité croissante',
  quantity_desc: 'Quantité décroissante',
  updated: 'Dernière mise à jour',
};

const VIEW_OPTIONS = [
  { value: 'stock', label: 'État du stock' },
  { value: 'forecast', label: 'Prévisions IA ✨' },
  { value: 'movements', label: 'Historique des mouvements' },
];

/** Module Stock : état des stocks, alertes, réapprovisionnement, inventaire et historique. */
export function StockPage() {
  const { hasPermission } = useAuth();
  const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS);
  const [isReceiving, setIsReceiving] = useState(false);
  const summaryQuery = useQuery({ queryKey: stockKeys.summary, queryFn: stockApi.summary });
  const summary = summaryQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion du stock"
        description="Le stock diminue à la confirmation d’une commande et revient en cas d’annulation."
        actions={
          hasPermission(PERMISSIONS.STOCK_MANAGE) && (
            <Button onClick={() => setIsReceiving(true)}>
              <ScanLine aria-hidden="true" className="size-4" />
              Réception intelligente
            </Button>
          )
        }
      />
      <ReceptionDialog open={isReceiving} onClose={() => setIsReceiving(false)} />

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Produits suivis"
            value={formatNumber(summary.totalProducts)}
            hint="Produits actifs du catalogue"
            icon={Package}
          />
          <StatCard
            label="Unités en stock"
            value={formatNumber(summary.totalUnits)}
            icon={Boxes}
            tone="success"
          />
          <StatCard
            label="Stock faible"
            value={formatNumber(summary.lowStock)}
            hint="Au niveau du seuil d’alerte ou en dessous"
            icon={TriangleAlert}
            tone="warning"
            to="?status=low"
          />
          <StatCard
            label="Ruptures"
            value={formatNumber(summary.outOfStock)}
            icon={PackageX}
            tone="danger"
            to="?status=out"
          />
        </div>
      )}

      <FilterTabs
        label="Affichage"
        options={VIEW_OPTIONS}
        value={filters.view}
        onChange={(view) => setFilters({ view, productId: '', type: '' })}
      />

      {filters.view === 'forecast' ? (
        <StockForecastView />
      ) : filters.view === 'movements' ? (
        <MovementsView filters={filters} setFilters={setFilters} />
      ) : (
        <StockView filters={filters} setFilters={setFilters} />
      )}
    </div>
  );
}

function StockView({ filters, setFilters }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.STOCK_MANAGE);
  const [restocking, setRestocking] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const params = {
    page: filters.page,
    limit: PAGE_SIZE,
    status: filters.status,
    sort: filters.sort,
    search: filters.search || undefined,
    categoryId: filters.categoryId || undefined,
  };
  const stockQuery = useQuery({
    queryKey: stockKeys.list(params),
    queryFn: () => stockApi.list(params),
    placeholderData: keepPreviousData,
  });
  const categoriesQuery = useQuery({
    queryKey: productKeys.categories,
    queryFn: categoriesApi.list,
  });

  return (
    <section aria-label="État du stock" className="space-y-4">
      <FilterTabs
        label="Filtrer par état"
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(status) => setFilters({ status })}
      />
      <div className="grid gap-3 md:grid-cols-[1fr_200px_220px]">
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
          {Object.entries(SORT_OPTIONS).map(([value, label]) => (
            <option key={value} value={value}>
              Tri : {label}
            </option>
          ))}
        </select>
      </div>

      {stockQuery.isPending ? (
        <PageSpinner />
      ) : stockQuery.isError ? (
        <QueryError error={stockQuery.error} onRetry={stockQuery.refetch} />
      ) : stockQuery.data.data.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Aucun produit"
          description="Aucun produit ne correspond à ces critères."
        />
      ) : (
        <div className={cn('space-y-4', stockQuery.isPlaceholderData && 'opacity-60')}>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Produit
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Quantité
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Seuil
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    État
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Mis à jour
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockQuery.data.data.map((stock) => (
                  <tr key={stock.productId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          src={stock.product?.imageUrl}
                          name={stock.product?.name}
                          compact
                          className="size-10 shrink-0 rounded-lg"
                        />
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-medium">{stock.product?.name}</p>
                          <p className="text-xs text-slate-500">
                            {stock.product?.category?.name} · {formatPrice(stock.product?.price)}
                            {stock.product && !stock.product.isActive && (
                              <Badge className="ml-2">Désactivé</Badge>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td
                      className={cn(
                        'px-4 py-3 text-right text-base font-bold tabular-nums',
                        stock.status === 'OUT' && 'text-red-600',
                        stock.status === 'LOW' && 'text-amber-700',
                      )}
                    >
                      {formatNumber(stock.quantity)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                      {formatNumber(stock.lowStockThreshold)}
                    </td>
                    <td className="px-4 py-3">
                      <StockStatusBadge status={stock.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {formatDateTime(stock.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canManage && (
                          <>
                            <Button
                              size="sm"
                              aria-label={`Réapprovisionner ${stock.product?.name}`}
                              onClick={() => setRestocking(stock)}
                            >
                              <PackagePlus aria-hidden="true" className="size-4" />
                              <span className="sr-only xl:not-sr-only">Réapprovisionner</span>
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setAdjusting(stock)}
                            >
                              <PencilLine aria-hidden="true" className="size-4" />
                              <span className="sr-only">Inventaire de {stock.product?.name}</span>
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setFilters({ view: 'movements', productId: stock.productId })
                          }
                        >
                          <History aria-hidden="true" className="size-4" />
                          <span className="sr-only">Historique de {stock.product?.name}</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            meta={stockQuery.data.meta}
            itemLabel="produit(s)"
            onPageChange={(page) => setFilters({ page })}
          />
        </div>
      )}

      <RestockDialog stock={restocking} onClose={() => setRestocking(null)} />
      <AdjustStockDialog stock={adjusting} onClose={() => setAdjusting(null)} />
    </section>
  );
}

function MovementsView({ filters, setFilters }) {
  const params = {
    page: filters.page,
    limit: 20,
    type: filters.type || undefined,
    productId: filters.productId || undefined,
  };
  const query = useQuery({
    queryKey: stockKeys.movements(params),
    queryFn: () => stockApi.movements(params),
    placeholderData: keepPreviousData,
  });
  const typeOptions = [
    { value: '', label: 'Tous' },
    ...STOCK_MOVEMENT_TYPE_LIST.map((type) => ({
      value: type,
      label: STOCK_MOVEMENT_TYPE_LABELS[type],
    })),
  ];
  const productName = filters.productId && query.data?.data[0]?.productName;

  return (
    <section aria-label="Historique des mouvements" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <FilterTabs
          label="Type de mouvement"
          options={typeOptions}
          value={filters.type}
          onChange={(type) => setFilters({ type })}
        />
        {filters.productId && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pr-1 pl-3 text-sm font-medium text-brand-700 ring-1 ring-brand-200">
            Produit : {productName || `n°${filters.productId}`}
            <button
              type="button"
              onClick={() => setFilters({ productId: '' })}
              className="rounded-full p-0.5 hover:bg-brand-100"
            >
              <X aria-hidden="true" className="size-4" />
              <span className="sr-only">Afficher tous les produits</span>
            </button>
          </span>
        )}
      </div>

      {query.isPending ? (
        <PageSpinner />
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={query.refetch} />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          icon={History}
          title="Aucun mouvement"
          description="Rien à afficher pour ce filtre."
        />
      ) : (
        <div className={cn('space-y-4', query.isPlaceholderData && 'opacity-60')}>
          <MovementsTable movements={query.data.data} showProduct={!filters.productId} />
          <Pagination
            meta={query.data.meta}
            itemLabel="mouvement(s)"
            onPageChange={(page) => setFilters({ page })}
          />
        </div>
      )}
    </section>
  );
}
