import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { productsApi } from '../api/productsApi';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { httpClient } from '@/shared/api/httpClient';
import { useAuth } from '@/shared/auth/useAuth';

export function ProductDetailPage() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const [product, setProduct] = useState(null);
  const [image, setImage] = useState('');
  const [size, setSize] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    productsApi
      .get(id)
      .then((response) => {
        if (!cancelled) {
          setProduct(response.data);
          setImage(response.data.imageUrls?.[0] ?? response.data.imageUrl ?? '');
          setSize(response.data.sizes?.[0] ?? '');
        }
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error)
    return (
      <Alert variant="error" title="Produit introuvable">
        {error}
      </Alert>
    );
  if (!product) return <Spinner />;
  const images = product.imageUrls?.length
    ? product.imageUrls
    : product.imageUrl
      ? [product.imageUrl]
      : [];

  return (
    <div className="space-y-6">
      <Link to="/products" className="text-sm font-medium text-brand-700">
        ← Retour au catalogue
      </Link>
      {message && <Alert variant="success">{message}</Alert>}
      <div className="grid gap-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex h-96 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
            {image ? (
              <img src={image} alt={product.name} className="h-full w-full object-contain" />
            ) : (
              <span className="text-slate-400">Aucune image</span>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {images.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setImage(item)}
                className="size-20 overflow-hidden rounded-lg ring-1 ring-slate-300"
              >
                <img src={item} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <p className="text-sm font-medium text-brand-700">{product.category?.name}</p>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-2xl font-semibold">{Number(product.price).toFixed(2)} €</p>
          <p className="leading-7 text-slate-600">{product.description}</p>
          {product.sizes?.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Taille disponible</legend>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((item) => (
                  <label
                    key={item}
                    className={`cursor-pointer rounded-lg px-4 py-2 ring-1 ${size === item ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-300'}`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="size"
                      value={item}
                      checked={size === item}
                      onChange={() => setSize(item)}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <p className={product.stock.inStock ? 'text-emerald-700' : 'text-red-600'}>
            {product.stock.inStock
              ? `${product.stock.availableQuantity} article(s) disponible(s)`
              : 'Rupture de stock'}
          </p>
          {hasPermission('cart:manage') && (
            <Button
              disabled={!product.stock.inStock || (product.sizes?.length > 0 && !size)}
              onClick={async () => {
                try {
                  await httpClient.post('/cart/items', {
                    productId: product.id,
                    quantity: 1,
                    size: size || undefined,
                  });
                  setMessage(`Produit ajouté au panier${size ? ` — taille ${size}` : ''}.`);
                } catch (requestError) {
                  setError(requestError.message);
                }
              }}
            >
              Ajouter au panier
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
