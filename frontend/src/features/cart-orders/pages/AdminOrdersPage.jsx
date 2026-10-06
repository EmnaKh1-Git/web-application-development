import { useEffect, useState } from 'react';
import { ordersApi } from '../api/ordersApi';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';

const statuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const labels = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée (stock déduit)',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

export function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [delivery, setDelivery] = useState({});
  const load = async () => {
    try {
      setOrders((await ordersApi.adminOrders(status ? { status } : {})).data ?? []);
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => {
    let active = true;
    ordersApi
      .adminOrders(status ? { status } : {})
      .then((response) => {
        if (active) setOrders(response.data ?? []);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [status]);
  const changeStatus = async (order, next) => {
    try {
      await ordersApi.adminStatus(order.id, next);
      setMessage(`Commande #${order.id} mise à jour. Le stock est déduit à la confirmation.`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };
  const saveDelivery = async (order) => {
    try {
      await ordersApi.adminDelivery(order.id, delivery[order.id] ?? {});
      setMessage(`Livraison de la commande #${order.id} mise à jour.`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion des commandes</h1>
        <p className="mt-1 text-slate-600">
          Validez les commandes, déduisez le stock et renseignez le suivi.
        </p>
      </div>
      {error && (
        <Alert variant="error" title="Erreur">
          {error}
        </Alert>
      )}
      {message && <Alert variant="success">{message}</Alert>}
      <select
        aria-label="Filtrer par statut"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="rounded-lg px-3 py-2 ring-1 ring-slate-300"
      >
        <option value="">Tous les statuts</option>
        {statuses.map((item) => (
          <option key={item} value={item}>
            {labels[item]}
          </option>
        ))}
      </select>
      <div className="space-y-4">
        {orders.map((order) => (
          <article key={order.id} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-semibold">Commande #{order.id}</h2>
                <p className="text-sm text-slate-500">
                  {order.user?.email ?? order.customerEmail ?? ''} ·{' '}
                  {Number(order.totalAmount).toFixed(2)} €
                </p>
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
                {labels[order.status] ?? order.status}
              </span>
            </div>
            {order.items?.map((item) => (
              <p key={item.id} className="mt-2 text-sm">
                {item.quantity} × {item.productName}
                {item.size ? ` — taille ${item.size}` : ''}
              </p>
            ))}
            <div className="mt-4 flex flex-wrap gap-2">
              {statuses
                .filter((next) => next !== order.status)
                .map((next) => (
                  <Button
                    key={next}
                    size="sm"
                    variant={next === 'CANCELLED' ? 'danger' : 'secondary'}
                    onClick={() => changeStatus(order, next)}
                  >
                    {labels[next]}
                  </Button>
                ))}
            </div>
            {['CONFIRMED', 'SHIPPED'].includes(order.status) && (
              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  aria-label="Transporteur"
                  placeholder="Transporteur"
                  value={delivery[order.id]?.carrier ?? ''}
                  onChange={(e) =>
                    setDelivery({
                      ...delivery,
                      [order.id]: { ...delivery[order.id], carrier: e.target.value },
                    })
                  }
                  className="rounded px-2 py-1 ring-1 ring-slate-300"
                />
                <input
                  aria-label="Numéro de suivi"
                  placeholder="N° de suivi"
                  value={delivery[order.id]?.trackingNumber ?? ''}
                  onChange={(e) =>
                    setDelivery({
                      ...delivery,
                      [order.id]: { ...delivery[order.id], trackingNumber: e.target.value },
                    })
                  }
                  className="rounded px-2 py-1 ring-1 ring-slate-300"
                />
                <Button size="sm" onClick={() => saveDelivery(order)}>
                  Enregistrer le suivi
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
