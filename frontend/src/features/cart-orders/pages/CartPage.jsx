import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ordersApi } from '../api/ordersApi';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { TextField } from '@/shared/components/ui/TextField';

const emptyAddress = {
  label: 'Maison',
  street: '',
  city: '',
  postalCode: '',
  country: 'Tunisie',
  phone: '',
  isDefault: true,
};

export function CartPage() {
  const [cart, setCart] = useState({ items: [], totalAmount: 0 });
  const [addresses, setAddresses] = useState([]);
  const [address, setAddress] = useState(emptyAddress);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    const fetchCart = async () => {
      try {
        const [cartResponse, addressResponse] = await Promise.all([
          ordersApi.cart(),
          ordersApi.addresses(),
        ]);
        if (!cancelled) {
          setCart(cartResponse.data);
          setAddresses(addressResponse.data);
          setSelectedAddress(
            String(
              addressResponse.data.find((item) => item.isDefault)?.id ??
                addressResponse.data[0]?.id ??
                '',
            ),
          );
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      }
    };
    fetchCart();
    return () => {
      cancelled = true;
    };
  }, []);
  const update = async (item, quantity) => {
    try {
      setCart((await ordersApi.update(item.id, quantity)).data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  const remove = async (id) => {
    try {
      setCart((await ordersApi.remove(id)).data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  const saveAddress = async (event) => {
    event.preventDefault();
    try {
      const response = await ordersApi.createAddress(address);
      setAddresses((current) => [...current, response.data]);
      setSelectedAddress(String(response.data.id));
      setShowAddressForm(false);
      setMessage('Adresse enregistrée.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  const checkout = async () => {
    if (!selectedAddress) {
      setError('Ajoutez une adresse de livraison.');
      return;
    }
    try {
      const response = await ordersApi.checkout(Number(selectedAddress), notes);
      navigate(`/orders?created=${response.data.id}`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon panier</h1>
        <p className="mt-1 text-slate-600">Vérifiez vos articles avant de passer commande.</p>
      </div>
      {error && (
        <Alert variant="error" title="Impossible de continuer">
          {error}
        </Alert>
      )}
      {message && <Alert variant="success">{message}</Alert>}
      {cart.items.length === 0 ? (
        <Alert title="Panier vide">
          Votre panier est vide.{' '}
          <Link className="font-semibold text-brand-700" to="/products">
            Voir le catalogue
          </Link>
        </Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-3">
            {cart.items.map((item) => (
              <article
                key={item.id}
                className="flex items-center gap-4 rounded-xl bg-white p-4 ring-1 ring-slate-200"
              >
                {item.imageUrl && (
                  <img src={item.imageUrl} alt="" className="size-20 rounded object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  {' '}
                  <h2 className="font-semibold">{item.name}</h2>
                  <p>{Number(item.unitPrice).toFixed(2)} €</p>
                  {item.size && <p className="text-sm text-slate-500">Taille : {item.size}</p>}
                  {!item.isAvailable && <p className="text-sm text-red-600">Stock insuffisant</p>}
                </div>
                <input
                  aria-label={`Quantité ${item.name}`}
                  type="number"
                  min="1"
                  max={item.availableQuantity}
                  value={item.quantity}
                  onChange={(event) => update(item, Number(event.target.value))}
                  className="w-20 rounded px-2 py-1 ring-1 ring-slate-300"
                />
                <Button size="sm" variant="danger" onClick={() => remove(item.id)}>
                  Retirer
                </Button>
              </article>
            ))}
          </section>
          <aside className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">Livraison et commande</h2>
            {addresses.length > 0 && (
              <select
                value={selectedAddress}
                onChange={(event) => setSelectedAddress(event.target.value)}
                className="w-full rounded-lg px-3 py-2 ring-1 ring-slate-300"
              >
                {addresses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} — {item.street}, {item.city}
                  </option>
                ))}
              </select>
            )}
            {showAddressForm ? (
              <form onSubmit={saveAddress} className="space-y-3">
                <TextField
                  label="Libellé"
                  value={address.label}
                  onChange={(event) => setAddress({ ...address, label: event.target.value })}
                  required
                />
                <TextField
                  label="Adresse"
                  value={address.street}
                  onChange={(event) => setAddress({ ...address, street: event.target.value })}
                  required
                />
                <TextField
                  label="Ville"
                  value={address.city}
                  onChange={(event) => setAddress({ ...address, city: event.target.value })}
                  required
                />
                <TextField
                  label="Code postal"
                  value={address.postalCode}
                  onChange={(event) => setAddress({ ...address, postalCode: event.target.value })}
                  required
                />
                <TextField
                  label="Téléphone"
                  value={address.phone}
                  onChange={(event) => setAddress({ ...address, phone: event.target.value })}
                />
                <Button type="submit">Enregistrer l'adresse</Button>
              </form>
            ) : (
              <Button variant="secondary" onClick={() => setShowAddressForm(true)}>
                Ajouter une adresse
              </Button>
            )}
            <TextField
              label="Note (facultatif)"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <div className="flex justify-between border-t pt-4 text-lg font-bold">
              <span>Total</span>
              <span>{Number(cart.totalAmount).toFixed(2)} €</span>
            </div>
            <Button
              fullWidth
              disabled={cart.hasUnavailableItems || !selectedAddress}
              onClick={checkout}
            >
              Passer la commande
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
