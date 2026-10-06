import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/shared/auth/useAuth';
import { httpClient } from '@/shared/api/httpClient';
import { productsApi } from '../api/productsApi';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';

export function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { isAuthenticated, hasPermission } = useAuth();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [productResponse, categoryResponse] = await Promise.all([
        productsApi.list({
          limit: 100,
          search: search || undefined,
          categoryId: categoryId || undefined,
        }),
        productsApi.categories(),
      ]);
      setProducts(productResponse.data);
      setCategories(categoryResponse.data);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const [productResponse, categoryResponse] = await Promise.all([
          productsApi.list({
            limit: 100,
            search: search || undefined,
            categoryId: categoryId || undefined,
          }),
          productsApi.categories(),
        ]);
        if (!cancelled) {
          setProducts(productResponse.data);
          setCategories(categoryResponse.data);
          setError('');
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCatalog();
    return () => {
      cancelled = true;
    };
  }, [search, categoryId]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catalogue des produits</h1>
        <p className="mt-1 text-slate-600">Découvrez les produits disponibles.</p>
      </div>
      <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-[1fr_220px]">
        <label className="relative">
          <span className="sr-only">Rechercher</span>
          <Search className="absolute top-2.5 left-3 size-5 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full rounded-lg py-2 pr-3 pl-10 ring-1 ring-slate-300"
          />
        </label>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="rounded-lg px-3 py-2 ring-1 ring-slate-300"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <Alert variant="error" title="Impossible de charger le catalogue">
          {error}
        </Alert>
      )}
      {message && <Alert variant="success">{message}</Alert>}
      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <Alert title="Aucun produit">Aucun produit ne correspond à votre recherche.</Alert>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <article
              key={product.id}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
            >
              {product.imageUrl ? (
                <img src={product.imageUrl} alt="" className="h-44 w-full object-cover" />
              ) : (
                <div className="h-44 bg-slate-100" />
              )}
              <div className="space-y-2 p-4">
                <p className="text-xs font-medium text-brand-700">{product.category?.name}</p>
                <h2 className="font-semibold">
                  <Link className="hover:text-brand-700" to={`/products/${product.id}`}>
                    {product.name}
                  </Link>
                </h2>
                <p className="line-clamp-2 text-sm text-slate-600">{product.description}</p>
                <div className="flex items-center justify-between pt-2">
                  <strong>{Number(product.price).toFixed(2)} €</strong>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        product.stock.inStock ? 'text-sm text-emerald-700' : 'text-sm text-red-600'
                      }
                    >
                      {product.stock.inStock
                        ? `${product.stock.availableQuantity} en stock`
                        : 'Rupture'}
                    </span>
                    {hasPermission('cart:manage') && (
                      <Button
                        size="sm"
                        disabled={!product.stock.inStock}
                        onClick={async () => {
                          if (product.sizes?.length) {
                            navigate(`/products/${product.id}`);
                            return;
                          }
                          try {
                            await httpClient.post('/cart/items', {
                              productId: product.id,
                              quantity: 1,
                            });
                            setMessage(`${product.name} a été ajouté au panier.`);
                          } catch (requestError) {
                            setError(requestError.message);
                          }
                        }}
                      >
                        {product.sizes?.length ? 'Choisir une taille' : 'Ajouter'}
                      </Button>
                    )}
                    {!isAuthenticated && (
                      <Button size="sm" variant="secondary" onClick={() => navigate('/login')}>
                        Se connecter
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <Button variant="ghost" onClick={load}>
        Actualiser
      </Button>
    </div>
  );
}
