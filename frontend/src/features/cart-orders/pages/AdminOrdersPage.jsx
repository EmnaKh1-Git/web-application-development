import { zodResolver } from '@hookform/resolvers/zod';
import {
  AI_LEVEL,
  deliverySchema,
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_LIST,
  ORDER_RISK_LABELS,
  ORDER_STATUS_TRANSITIONS,
} from '@smart-ecommerce/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Banknote,
  ClipboardCheck,
  ClipboardList,
  Hourglass,
  PackageCheck,
  PackageSearch,
  Truck,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { aiApi, aiKeys } from '@/features/ai/api/aiApi';
import { AiLevelBadge } from '@/features/ai/components/AiLevelBadge';
import { productKeys } from '@/features/products/api/productsApi';
import { stockKeys } from '@/features/stock/api/stockApi';
import { QueryError } from '@/shared/components/QueryError';
import { Button } from '@/shared/components/ui/Button';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { Dialog } from '@/shared/components/ui/Dialog';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { FilterTabs } from '@/shared/components/ui/FilterTabs';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Pagination } from '@/shared/components/ui/Pagination';
import { SearchInput } from '@/shared/components/ui/SearchInput';
import { PageSpinner } from '@/shared/components/ui/Spinner';
import { StatCard } from '@/shared/components/ui/StatCard';
import { TextField } from '@/shared/components/ui/TextField';
import { useUrlFilters } from '@/shared/hooks/useUrlFilters';
import { cn } from '@/shared/utils/cn';
import { formatDate, formatDateTime, formatNumber, formatPrice } from '@/shared/utils/format';
import { applyServerValidationErrors } from '@/shared/utils/forms';
import { notifyError, notifySuccess } from '@/shared/utils/notify';
import { orderKeys, ordersAdminApi } from '../api/ordersApi';
import { OrderItemsList, ShippingAddress } from '../components/OrderItemsList';
import { DeliveryStatusBadge, OrderStatusBadge } from '../components/OrderStatusBadge';
import { OrderTimeline } from '../components/OrderTimeline';

/** Boutons proposés pour chaque transition autorisée (ORDER_STATUS_TRANSITIONS). */
const TRANSITION_ACTIONS = {
  [ORDER_STATUS.CONFIRMED]: {
    label: 'Confirmer la commande',
    icon: ClipboardCheck,
    variant: 'primary',
    hint: 'Le stock des produits est déduit à la confirmation.',
  },
  [ORDER_STATUS.SHIPPED]: {
    label: 'Marquer comme expédiée',
    icon: Truck,
    variant: 'primary',
    hint: 'Un numéro de suivi est généré s’il n’a pas été renseigné.',
  },
  [ORDER_STATUS.DELIVERED]: {
    label: 'Marquer comme livrée',
    icon: PackageCheck,
    variant: 'primary',
  },
  [ORDER_STATUS.CANCELLED]: { label: 'Annuler la commande', icon: XCircle, variant: 'danger' },
};

const DEFAULT_FILTERS = { status: '', search: '', page: '1' };

export function AdminOrdersPage() {
  const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const params = {
    page: filters.page,
    limit: 15,
    status: filters.status || undefined,
    search: filters.search || undefined,
  };
  const ordersQuery = useQuery({
    queryKey: orderKeys.admin(params),
    queryFn: () => ordersAdminApi.list(params),
    placeholderData: keepPreviousData,
  });
  const statsQuery = useQuery({ queryKey: orderKeys.stats, queryFn: ordersAdminApi.stats });
  // IA : score de risque des commandes encore à traiter sur cette page
  const pendingIds = (ordersQuery.data?.data ?? [])
    .filter((order) => [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED].includes(order.status))
    .map((order) => order.id);
  const riskQuery = useQuery({
    queryKey: aiKeys.orderRisk(pendingIds),
    queryFn: () => aiApi.orderRisk(pendingIds),
    enabled: pendingIds.length > 0,
  });
  const risks = riskQuery.data?.items ?? {};
  const stats = statsQuery.data;

  const statusOptions = [
    { value: '', label: 'Toutes', count: stats?.totalOrders },
    ...ORDER_STATUS_LIST.map((status) => ({
      value: status,
      label: ORDER_STATUS_LABELS[status],
      count: stats?.byStatus[status],
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commandes"
        description="Confirmez les commandes (le stock est alors déduit), expédiez-les et suivez les livraisons."
      />

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Commandes"
            value={formatNumber(stats.totalOrders)}
            icon={ClipboardList}
          />
          <StatCard
            label="Chiffre d’affaires"
            value={formatPrice(stats.revenue)}
            hint="Commandes confirmées, expédiées et livrées"
            icon={Banknote}
            tone="success"
          />
          <StatCard
            label="À confirmer"
            value={formatNumber(stats.byStatus.PENDING)}
            icon={Hourglass}
            tone="warning"
          />
          <StatCard
            label="En cours de livraison"
            value={formatNumber(stats.byStatus.SHIPPED)}
            icon={Truck}
            tone="neutral"
          />
        </div>
      )}

      <div className="space-y-3">
        <FilterTabs
          label="Filtrer par statut"
          options={statusOptions}
          value={filters.status}
          onChange={(status) => setFilters({ status })}
        />
        <SearchInput
          className="max-w-md"
          label="Rechercher une commande"
          placeholder="N° de commande, nom ou email du client"
          value={filters.search}
          onSearch={(search) => setFilters({ search })}
        />
      </div>

      {ordersQuery.isPending ? (
        <PageSpinner />
      ) : ordersQuery.isError ? (
        <QueryError error={ordersQuery.error} onRetry={ordersQuery.refetch} />
      ) : ordersQuery.data.data.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Aucune commande"
          description="Aucune commande ne correspond à ces critères."
        />
      ) : (
        <div className={cn('space-y-4', ordersQuery.isPlaceholderData && 'opacity-60')}>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Commande
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Client
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Articles
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Total
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Statut
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Livraison
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Risque (IA)
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordersQuery.data.data.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold">n°{order.id}</p>
                      <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {order.customer?.firstName} {order.customer?.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{order.customer?.email}</p>
                    </td>
                    <td className="px-4 py-3">{order.itemsCount}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatPrice(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      {order.delivery && <DeliveryStatusBadge status={order.delivery.status} />}
                    </td>
                    <td className="px-4 py-3">
                      {risks[order.id] ? (
                        <AiLevelBadge
                          level={risks[order.id].level}
                          labels={ORDER_RISK_LABELS}
                          reasons={risks[order.id].reasons}
                        />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Gérer la commande n°${order.id}`}
                        onClick={() => setSelectedOrder(order)}
                      >
                        Gérer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            meta={ordersQuery.data.meta}
            itemLabel="commande(s)"
            onPageChange={(page) => setFilters({ page })}
          />
        </div>
      )}

      <Dialog
        open={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        size="xl"
        title={selectedOrder ? `Commande n°${selectedOrder.id}` : ''}
        description={selectedOrder && `Passée le ${formatDateTime(selectedOrder.createdAt)}`}
      >
        {selectedOrder && (
          <OrderManagement
            order={selectedOrder}
            risk={risks[selectedOrder.id]}
            onUpdated={setSelectedOrder}
          />
        )}
      </Dialog>
    </div>
  );
}

function OrderManagement({ order, risk, onUpdated }) {
  const queryClient = useQueryClient();
  const [statusToConfirm, setStatusToConfirm] = useState(null);
  const nextStatuses = ORDER_STATUS_TRANSITIONS[order.status] ?? [];

  const statusMutation = useMutation({
    mutationFn: (status) => ordersAdminApi.updateStatus(order.id, status),
    onSuccess: (updatedOrder) => {
      onUpdated(updatedOrder);
      setStatusToConfirm(null);
      notifySuccess(
        `Commande n°${updatedOrder.id} : ${ORDER_STATUS_LABELS[updatedOrder.status].toLowerCase()}`,
      );
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      // Confirmation / annulation : le stock et la popularité des produits changent
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
      queryClient.invalidateQueries({ queryKey: aiKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (error) => {
      setStatusToConfirm(null);
      notifyError(error);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <OrderStatusBadge status={order.status} />
        {order.delivery && <DeliveryStatusBadge status={order.delivery.status} />}
      </div>
      <OrderTimeline order={order} />

      {risk && risk.level !== AI_LEVEL.LOW && order.status === ORDER_STATUS.PENDING && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">
              L’IA conseille de vérifier cette commande avant de la confirmer
            </p>
            <AiLevelBadge level={risk.level} labels={ORDER_RISK_LABELS} />
          </div>
          <ul className="mt-2 list-disc space-y-0.5 pl-5">
            {risk.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      {nextStatuses.length > 0 && (
        <section aria-label="Changer le statut" className="rounded-xl bg-slate-50 p-4">
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((status) => {
              const { label, icon: Icon, variant } = TRANSITION_ACTIONS[status];
              return (
                <Button
                  key={status}
                  variant={variant}
                  isLoading={statusMutation.isPending && statusMutation.variables === status}
                  disabled={statusMutation.isPending}
                  onClick={() =>
                    status === ORDER_STATUS.CANCELLED
                      ? setStatusToConfirm(status)
                      : statusMutation.mutate(status)
                  }
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </Button>
              );
            })}
          </div>
          {nextStatuses
            .map((status) => TRANSITION_ACTIONS[status].hint)
            .filter(Boolean)
            .map((hint) => (
              <p key={hint} className="mt-2 text-xs text-slate-500">
                {hint}
              </p>
            ))}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <section>
          <h3 className="font-semibold">Articles</h3>
          <div className="mt-2">
            <OrderItemsList order={order} linkToProducts={false} />
          </div>
        </section>
        <div className="space-y-5">
          <section>
            <h3 className="font-semibold">Client</h3>
            <p className="mt-1 text-sm">
              {order.customer?.firstName} {order.customer?.lastName}
              <br />
              <span className="text-slate-600">{order.customer?.email}</span>
              {order.customer?.phone && (
                <>
                  <br />
                  <span className="text-slate-600">{order.customer.phone}</span>
                </>
              )}
            </p>
          </section>
          <section>
            <h3 className="font-semibold">Adresse de livraison</h3>
            <div className="mt-1">
              <ShippingAddress address={order.shippingAddress} />
            </div>
          </section>
          {order.notes && (
            <section>
              <h3 className="font-semibold">Instructions du client</h3>
              <p className="mt-1 text-sm whitespace-pre-line text-slate-700">{order.notes}</p>
            </section>
          )}
        </div>
      </div>

      {![ORDER_STATUS.CANCELLED, ORDER_STATUS.DELIVERED].includes(order.status) && (
        <DeliveryForm key={order.updatedAt} order={order} onUpdated={onUpdated} />
      )}

      <ConfirmDialog
        open={statusToConfirm !== null}
        title={`Annuler la commande n°${order.id} ?`}
        confirmLabel="Oui, annuler"
        variant="danger"
        isLoading={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate(statusToConfirm)}
        onClose={() => setStatusToConfirm(null)}
      >
        {order.status === ORDER_STATUS.CONFIRMED
          ? 'Le stock déduit à la confirmation sera remis en vente.'
          : 'Le client sera informé de l’annulation.'}
      </ConfirmDialog>
    </div>
  );
}

function DeliveryForm({ order, onUpdated }) {
  const queryClient = useQueryClient();
  const delivery = order.delivery ?? {};
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      carrier: delivery.carrier ?? '',
      trackingNumber: delivery.trackingNumber ?? '',
      estimatedDeliveryDate: delivery.estimatedDeliveryDate ?? '',
    },
  });
  const mutation = useMutation({
    mutationFn: (values) => ordersAdminApi.updateDelivery(order.id, values),
    onSuccess: (updatedOrder) => {
      onUpdated(updatedOrder);
      notifySuccess('Informations de livraison enregistrées');
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: (error) => {
      if (!applyServerValidationErrors(error, setError)) notifyError(error);
    },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="space-y-4 rounded-xl p-4 ring-1 ring-slate-200"
    >
      <h3 className="font-semibold">Suivi de livraison</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Transporteur"
          placeholder="SmartE Express"
          error={errors.carrier?.message}
          {...register('carrier')}
        />
        <TextField
          label="N° de suivi"
          error={errors.trackingNumber?.message}
          {...register('trackingNumber')}
        />
        <TextField
          label="Livraison prévue le"
          type="date"
          error={errors.estimatedDeliveryDate?.message}
          {...register('estimatedDeliveryDate')}
        />
      </div>
      <Button type="submit" variant="secondary" disabled={!isDirty} isLoading={mutation.isPending}>
        Enregistrer le suivi
      </Button>
    </form>
  );
}
