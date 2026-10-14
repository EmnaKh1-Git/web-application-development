import { ORDER_STATUS } from '@smart-ecommerce/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageSquareWarning, PackageX, Star, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { productKeys } from '@/features/products/api/productsApi';
import { QueryError } from '@/shared/components/QueryError';
import { Button } from '@/shared/components/ui/Button';
import { buttonClassName } from '@/shared/components/ui/buttonStyles';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageSpinner } from '@/shared/components/ui/Spinner';
import { formatDate, formatDateTime } from '@/shared/utils/format';
import { notifyError, notifySuccess } from '@/shared/utils/notify';
import { orderKeys, ordersApi } from '../api/ordersApi';
import { OrderItemsList, ShippingAddress } from '../components/OrderItemsList';
import { DeliveryStatusBadge, OrderStatusBadge } from '../components/OrderStatusBadge';
import { OrderTimeline } from '../components/OrderTimeline';

/** Détail et suivi d'une commande du client. */
export function OrderDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);
  const query = useQuery({ queryKey: orderKeys.detail(id), queryFn: () => ordersApi.get(id) });
  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(id),
    onSuccess: async (order) => {
      queryClient.setQueryData(orderKeys.detail(id), order);
      setIsCancelling(false);
      notifySuccess(`Commande n°${order.id} annulée`);
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
      // Une commande confirmée annulée remet ses produits en stock
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: notifyError,
  });

  if (query.isPending) return <PageSpinner />;
  if (query.isError) {
    return [400, 403, 404].includes(query.error.status) ? (
      <EmptyState
        icon={PackageX}
        titleAs="h1"
        title="Commande introuvable"
        description="Cette commande n’existe pas ou ne fait pas partie de votre historique."
        action={
          <Link to="/orders" className={buttonClassName()}>
            Mes commandes
          </Link>
        }
      />
    ) : (
      <QueryError error={query.error} onRetry={query.refetch} />
    );
  }

  const order = query.data;
  const delivery = order.delivery;
  return (
    <div className="space-y-6">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Mes commandes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Commande n°{order.id}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-slate-600">Passée le {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/complaints?orderId=${order.id}`}
            className={buttonClassName({ variant: 'secondary' })}
          >
            <MessageSquareWarning aria-hidden="true" className="size-4" />
            Signaler un problème
          </Link>
          {order.canCancel && (
            <Button variant="danger" onClick={() => setIsCancelling(true)}>
              <XCircle aria-hidden="true" className="size-4" />
              Annuler la commande
            </Button>
          )}
        </div>
      </div>

      <section
        aria-label="Suivi de la commande"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
      >
        <OrderTimeline order={order} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <h2 className="font-semibold">Articles</h2>
          <div className="mt-2">
            <OrderItemsList order={order} />
          </div>
          {order.status === ORDER_STATUS.DELIVERED && (
            <p className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <Star aria-hidden="true" className="size-4 fill-amber-400 text-amber-400" />
              Votre commande est livrée : donnez votre avis depuis la page de chaque produit.
            </p>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Livraison</h2>
              {delivery && <DeliveryStatusBadge status={delivery.status} />}
            </div>
            <div className="mt-3">
              <ShippingAddress address={order.shippingAddress} />
            </div>
            {delivery && (delivery.carrier || delivery.trackingNumber) && (
              <dl className="mt-4 space-y-1 border-t border-slate-200 pt-4 text-sm">
                {delivery.carrier && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-600">Transporteur</dt>
                    <dd className="font-medium">{delivery.carrier}</dd>
                  </div>
                )}
                {delivery.trackingNumber && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-600">N° de suivi</dt>
                    <dd className="font-mono font-medium">{delivery.trackingNumber}</dd>
                  </div>
                )}
                {delivery.estimatedDeliveryDate && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-600">Livraison prévue</dt>
                    <dd className="font-medium">{formatDate(delivery.estimatedDeliveryDate)}</dd>
                  </div>
                )}
              </dl>
            )}
          </section>
          {order.notes && (
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="font-semibold">Instructions</h2>
              <p className="mt-2 text-sm whitespace-pre-line text-slate-700">{order.notes}</p>
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={isCancelling}
        title={`Annuler la commande n°${order.id} ?`}
        confirmLabel="Oui, annuler"
        variant="danger"
        isLoading={cancel.isPending}
        onConfirm={() => cancel.mutate()}
        onClose={() => setIsCancelling(false)}
      >
        Cette action est définitive. Les articles seront remis en vente.
      </ConfirmDialog>
    </div>
  );
}
