import { useEffect, useState } from 'react';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { TextField } from '@/shared/components/ui/TextField';
import { httpClient } from '@/shared/api/httpClient';

export function StockPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [amounts, setAmounts] = useState({});
  const load = async () => {
    try {
      setItems(
        (
          await httpClient.get('/stock', {
            params: {
              page: 1,
              limit: 100,
              status: 'all',
              sort: 'name',
              search: search || undefined,
            },
          })
        ).data,
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  useEffect(() => {
    let cancelled = false;
    const fetchStock = async () => {
      try {
        const response = await httpClient.get('/stock', {
          params: { page: 1, limit: 100, status: 'all', sort: 'name', search: search || undefined },
        });
        if (!cancelled) setItems(response.data);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      }
    };
    fetchStock();
    return () => {
      cancelled = true;
    };
  }, [search]);
  const add = async (productId) => {
    try {
      await httpClient.post(`/stock/${productId}/add`, {
        quantity: Number(amounts[productId]),
        reason: 'Réapprovisionnement admin',
      });
      setMessage('Stock mis à jour.');
      setAmounts({ ...amounts, [productId]: '' });
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion du stock</h1>
        <p className="mt-1 text-slate-600">
          Consultez les quantités et réapprovisionnez les produits.
        </p>
      </div>
      {error && (
        <Alert variant="error" title="Erreur">
          {error}
        </Alert>
      )}
      {message && <Alert variant="success">{message}</Alert>}
      <TextField
        label="Rechercher un produit"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="p-3">Produit</th>
              <th className="p-3">Catégorie</th>
              <th className="p-3">Quantité</th>
              <th className="p-3">Seuil</th>
              <th className="p-3">Ajouter</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.productId} className="border-b last:border-0">
                <td className="p-3 font-medium">{item.product?.name}</td>
                <td className="p-3">{item.product?.category?.name}</td>
                <td className="p-3">{item.quantity}</td>
                <td className="p-3">{item.lowStockThreshold}</td>
                <td className="flex gap-2 p-3">
                  <input
                    type="number"
                    min="1"
                    value={amounts[item.productId] ?? ''}
                    onChange={(event) =>
                      setAmounts({ ...amounts, [item.productId]: event.target.value })
                    }
                    className="w-24 rounded-lg px-2 py-1.5 ring-1 ring-slate-300"
                  />
                  <Button
                    size="sm"
                    onClick={() => add(item.productId)}
                    disabled={!amounts[item.productId]}
                  >
                    Ajouter
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
