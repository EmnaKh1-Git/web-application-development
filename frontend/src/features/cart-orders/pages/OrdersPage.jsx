import { ORDER_STATUS_LABELS, ORDER_STATUS_LIST } from '@smart-ecommerce/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronRight, PackageSearch } from 'lucide-react';
import { Link } from 'react-router';
import { ProductImage } from '@/shared/components/ProductImage';
import { QueryError } from '@/shared/components/QueryError';
import { buttonClassName } from '@/shared/components/ui/buttonStyles';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { FilterTabs } from '@/shared/components/ui/FilterTabs';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Pagination } from '@/shared/components/ui/Pagination';
import { PageSpinner } from '@/shared/components/ui/Spinner';
import { useUrlFilters } from '@/shared/hooks/useUrlFilters';
import { formatDate, formatPrice, pluralize } from '@/shared/utils/format';
import { orderKeys, ordersApi } from '../api/ordersApi';
import { OrderStatusBadge } from '../components/OrderStatusBadge';

const STATUS_OPTIONS = [
  { value: '', label: 'Toutes' },
  ...ORDER_STATUS_LIST.map((status) => ({ value: status, label: ORDER_STATUS_LABELS[status] })),
];

/** Historique des commandes du client. */
export function OrdersPage() {
  const [filters, setFilters] = useUrlFilters({ status: '', page: '1' });
  const params = { page: filters.page, limit: 10, status: filters.status || undefined };
  const query = useQuery({
    queryKey: orderKeys.mine(params),
    queryFn: () => ordersApi.listMine(params),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Mes commandes" description="Suivez vos commandes et leurs livraisons." />
      <FilterTabs
        label="Filtrer par statut"
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(status) => setFilters({ status })}
      />

      {query.isPending ? (
        <PageSpinner />
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={query.refetch} />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title={
            filters.status ? 'Aucune commande avec ce statut' : 'Aucune commande pour le moment'
          }
          description="Vos commandes apparaîtront ici dès votre premier achat."
          action={
            <Link to="/products" className={buttonClassName()}>
              Découvrir le catalogue
            </Link>
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {query.data.data.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} />
              </li>
            ))}
          </ul>
          <Pagination
            meta={query.data.meta}
            itemLabel="commande(s)"
            onPageChange={(page) => setFilters({ page })}
          />
        </>
      )}
    </div>
  );
}

function OrderCard({ order }) {
  const previewItems = order.items.slice(0, 4);
  return (
    <Link
      to={`/orders/${order.id}`}
      className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-brand-300 sm:flex-row sm:items-center"
    >
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Commande n°{order.id}</h2>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="text-sm text-slate-600">
          Passée le {formatDate(order.createdAt)} · {pluralize(order.itemsCount, 'article')}
        </p>
      </div>
      <div className="flex items-center -space-x-2">
        {previewItems.map((item) => (
          <ProductImage
            key={item.id}
            src={item.imageUrl}
            name={item.productName}
            compact
            className="size-11 rounded-lg ring-2 ring-white"
          />
        ))}
        {order.items.length > previewItems.length && (
          <span className="inline-flex size-11 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 ring-2 ring-white">
            +{order.items.length - previewItems.length}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <p className="text-lg font-bold">{formatPrice(order.totalAmount)}</p>
        <ChevronRight aria-hidden="true" className="size-5 text-slate-400" />
      </div>
    </Link>
  );
}
