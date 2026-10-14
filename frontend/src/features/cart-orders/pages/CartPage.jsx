import { MAX_CART_ITEM_QUANTITY } from '@smart-ecommerce/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, MapPin, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { RecommendedProducts } from '@/features/ai/components/RecommendedProducts';
import { productKeys } from '@/features/products/api/productsApi';
import { accountApi, userKeys } from '@/features/users/api/usersApi';
import { AddressFormDialog } from '@/features/users/components/AddressFormDialog';
import { ProductImage } from '@/shared/components/ProductImage';
import { QueryError } from '@/shared/components/QueryError';
import { Button } from '@/shared/components/ui/Button';
import { buttonClassName } from '@/shared/components/ui/buttonStyles';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { QuantityStepper } from '@/shared/components/ui/QuantityStepper';
import { PageSpinner, Spinner } from '@/shared/components/ui/Spinner';
import { TextAreaField } from '@/shared/components/ui/TextAreaField';
import { cn } from '@/shared/utils/cn';
import { formatPrice, pluralize } from '@/shared/utils/format';
import { notifyError, notifySuccess } from '@/shared/utils/notify';
import { cartApi, orderKeys, ordersApi } from '../api/ordersApi';
import { VariantLabel } from '../components/VariantLabel';
import { useCart } from '../hooks/useCart';

export function CartPage() {
  const cartQuery = useCart();

  if (cartQuery.isPending) return <PageSpinner />;
  if (cartQuery.isError) return <QueryError error={cartQuery.error} onRetry={cartQuery.refetch} />;

  const cart = cartQuery.data;
  if (cart.items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        titleAs="h1"
        title="Votre panier est vide"
        description="Parcourez le catalogue et ajoutez vos produits préférés."
        action={
          <Link to="/products" className={buttonClassName()}>
            Découvrir le catalogue
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Mon panier" description={pluralize(cart.totalItems, 'article')} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <CartLines cart={cart} />
        <Checkout cart={cart} />
      </div>
      <RecommendedProducts
        productIds={[...new Set(cart.items.map((item) => item.productId))]}
        title="Complétez votre panier"
      />
    </div>
  );
}

function CartLines({ cart }) {
  const queryClient = useQueryClient();
  const [isClearing, setIsClearing] = useState(false);
  const setCart = (updatedCart) => queryClient.setQueryData(orderKeys.cart, updatedCart);
  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }) => cartApi.updateItem(itemId, quantity),
    onSuccess: setCart,
    onError: notifyError,
  });
  const removeMutation = useMutation({
    mutationFn: cartApi.removeItem,
    onSuccess: setCart,
    onError: notifyError,
  });
  const clearMutation = useMutation({
    mutationFn: cartApi.clear,
    onSuccess: (updatedCart) => {
      setCart(updatedCart);
      setIsClearing(false);
    },
    onError: notifyError,
  });

  return (
    <section aria-label="Articles du panier" className="space-y-3">
      {cart.hasUnavailableItems && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Certains articles ne sont plus disponibles dans la quantité demandée : ajustez-les pour
          pouvoir commander.
        </p>
      )}
      <ul className="divide-y divide-slate-200 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {cart.items.map((item) => {
          const isBusy =
            (updateMutation.isPending && updateMutation.variables?.itemId === item.id) ||
            (removeMutation.isPending && removeMutation.variables === item.id);
          const maxQuantity = Math.max(
            1,
            Math.min(MAX_CART_ITEM_QUANTITY, item.availableQuantity || item.quantity),
          );
          return (
            <li key={item.id} className={cn('flex gap-4 p-4 sm:p-5', isBusy && 'opacity-60')}>
              <Link to={`/products/${item.productId}`} tabIndex={-1} aria-hidden="true">
                <ProductImage
                  src={item.imageUrl}
                  name={item.name}
                  compact
                  className="size-20 shrink-0 rounded-lg sm:size-24"
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/products/${item.productId}`}
                      className="line-clamp-2 font-semibold hover:text-brand-700"
                    >
                      {item.name}
                    </Link>
                    <VariantLabel size={item.size} color={item.color} />
                    <p className="mt-0.5 text-sm text-slate-500">
                      {formatPrice(item.unitPrice)} l’unité
                    </p>
                  </div>
                  <p className="font-bold">{formatPrice(item.lineTotal)}</p>
                </div>
                {!item.isAvailable && (
                  <p className="text-sm font-medium text-amber-700">
                    {item.availableQuantity === 0
                      ? 'Rupture de stock'
                      : `Stock insuffisant : ${item.availableQuantity} disponible(s) pour ce produit`}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2">
                  <QuantityStepper
                    size="sm"
                    label={`Quantité de ${item.name}`}
                    value={item.quantity}
                    max={Math.max(maxQuantity, item.quantity)}
                    disabled={isBusy}
                    onChange={(quantity) => updateMutation.mutate({ itemId: item.id, quantity })}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isBusy}
                    aria-label={`Retirer ${item.name} du panier`}
                    onClick={() => removeMutation.mutate(item.id)}
                  >
                    {isBusy ? (
                      <Spinner size="sm" />
                    ) : (
                      <Trash2 aria-hidden="true" className="size-4" />
                    )}
                    <span className="sr-only sm:not-sr-only">Retirer</span>
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-between">
        <Link to="/products" className={buttonClassName({ variant: 'ghost', size: 'sm' })}>
          ← Continuer mes achats
        </Link>
        <Button variant="ghost" size="sm" onClick={() => setIsClearing(true)}>
          Vider le panier
        </Button>
      </div>
      <ConfirmDialog
        open={isClearing}
        title="Vider le panier ?"
        confirmLabel="Vider"
        variant="danger"
        isLoading={clearMutation.isPending}
        onConfirm={() => clearMutation.mutate()}
        onClose={() => setIsClearing(false)}
      >
        Tous les articles seront retirés de votre panier.
      </ConfirmDialog>
    </section>
  );
}

function Checkout({ cart }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const addressesQuery = useQuery({
    queryKey: userKeys.addresses,
    queryFn: accountApi.listAddresses,
  });
  const addresses = addressesQuery.data ?? [];
  const [chosenAddressId, setChosenAddressId] = useState(null);
  const [notes, setNotes] = useState('');
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  // Adresse choisie, sinon l'adresse par défaut, sinon la première
  const addressId =
    chosenAddressId ?? (addresses.find((address) => address.isDefault) ?? addresses[0])?.id ?? null;

  const checkout = useMutation({
    mutationFn: ordersApi.checkout,
    onSuccess: async (order) => {
      queryClient.setQueryData(orderKeys.cart, {
        items: [],
        totalItems: 0,
        totalAmount: 0,
        hasUnavailableItems: false,
      });
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
      notifySuccess(
        `Commande n°${order.id} enregistrée`,
        'Elle sera confirmée par notre équipe très prochainement.',
      );
      navigate(`/orders/${order.id}`);
    },
    onError: (error) => {
      notifyError(error);
      // Stock ou prix modifiés entre-temps : on recharge le panier et le catalogue
      queryClient.invalidateQueries({ queryKey: orderKeys.cart });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });

  return (
    <aside aria-labelledby="checkout-title" className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 id="checkout-title" className="text-lg font-semibold">
          Récapitulatif
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Sous-total ({pluralize(cart.totalItems, 'article')})</dt>
            <dd>{formatPrice(cart.totalAmount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Livraison</dt>
            <dd className="font-medium text-emerald-700">Offerte</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd>{formatPrice(cart.totalAmount)}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <fieldset>
          <legend className="flex items-center gap-2 font-semibold">
            <MapPin aria-hidden="true" className="size-4 text-brand-600" />
            Adresse de livraison
          </legend>
          {addressesQuery.isPending ? (
            <Spinner className="mt-3 text-brand-600" />
          ) : addressesQuery.isError ? (
            <QueryError error={addressesQuery.error} onRetry={addressesQuery.refetch} />
          ) : (
            <div className="mt-3 space-y-2">
              {addresses.length === 0 && (
                <p className="text-sm text-slate-600">Ajoutez une adresse pour être livré.</p>
              )}
              {addresses.map((address) => (
                <label
                  key={address.id}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-lg p-3 text-sm ring-1 ring-inset',
                    address.id === addressId
                      ? 'bg-brand-50 ring-brand-300'
                      : 'ring-slate-200 hover:bg-slate-50',
                  )}
                >
                  <input
                    type="radio"
                    name="addressId"
                    checked={address.id === addressId}
                    onChange={() => setChosenAddressId(address.id)}
                    className="mt-0.5 text-brand-600"
                  />
                  <span>
                    <span className="font-semibold">{address.label}</span>
                    <span className="block text-slate-600">
                      {address.street}, {address.postalCode} {address.city}
                    </span>
                  </span>
                </label>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setIsAddingAddress(true)}>
                <Plus aria-hidden="true" className="size-4" />
                Nouvelle adresse
              </Button>
            </div>
          )}
        </fieldset>

        <TextAreaField
          label="Instructions de livraison (facultatif)"
          rows={2}
          maxLength={500}
          placeholder="Code d’entrée, étage, créneau préféré…"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        <Button
          size="lg"
          fullWidth
          disabled={!addressId || cart.hasUnavailableItems}
          isLoading={checkout.isPending}
          onClick={() => checkout.mutate({ addressId, notes })}
        >
          Commander · {formatPrice(cart.totalAmount)}
        </Button>
        <p className="text-xs text-slate-500">
          Paiement à la livraison. Vous pourrez annuler gratuitement tant que la commande n’est pas
          expédiée.
        </p>
      </div>

      <AddressFormDialog
        open={isAddingAddress}
        onClose={() => setIsAddingAddress(false)}
        onSaved={(address) => setChosenAddressId(address.id)}
      />
    </aside>
  );
}
