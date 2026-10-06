import { useEffect, useState } from 'react';
import { ordersApi } from '../api/ordersApi';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';

const labels = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = async () => {
    try {
      setOrders((await ordersApi.orders()).data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  useEffect(() => {
    let cancelled = false;
    const fetchOrders = async () => {
      try {
        const response = await ordersApi.orders();
        if (!cancelled) setOrders(response.data);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      }
    };
    fetchOrders();
    return () => {
      cancelled = true;
    };
  }, []);
  const cancel = async (id) => {
    try {
      await ordersApi.cancel(id);
      setMessage('Commande annulée.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes commandes</h1>
        <p className="mt-1 text-slate-600">Suivez vos commandes et leur livraison.</p>
      </div>
      {error && (
        <Alert variant="error" title="Erreur">
          {error}
        </Alert>
      )}
      {message && <Alert variant="success">{message}</Alert>}
      {orders.length === 0 ? (
        <Alert title="Aucune commande">Vous n'avez encore passé aucune commande.</Alert>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">Commande #{order.id}</h2>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
                  {labels[order.status] ?? order.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {order.itemsCount} article(s) · {Number(order.totalAmount).toFixed(2)} € ·{' '}
                {new Date(order.createdAt).toLocaleDateString('fr-FR')}
              </p>
              <p className="mt-2 text-sm">
                Livraison : {order.delivery?.status ?? 'En préparation'}{' '}
                {order.delivery?.carrier ? `— ${order.delivery.carrier}` : ''}
              </p>{' '}
              {order.items.map((item) => (
                <p key={item.id} className="mt-1 text-sm">
                  {item.quantity} × {item.productName} {item.size && ` (taille ${item.size})`}
                </p>
              ))}
              {order.canCancel && (
                <Button
                  className="mt-4"
                  size="sm"
                  variant="danger"
                  onClick={() => cancel(order.id)}
                >
                  Annuler la commande
                </Button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
