import { useEffect, useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { productsApi } from '../api/productsApi';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { TextField } from '@/shared/components/ui/TextField';

const emptyForm = {
  name: '',
  categoryId: '',
  price: '',
  description: '',
  imageUrl: '',
  imageUrls: '',
  sizes: '',
  initialStock: 0,
  isActive: true,
};

export function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [productResponse, categoryResponse] = await Promise.all([
        productsApi.list({ limit: 100, includeInactive: true, search: search || undefined }),
        productsApi.categories(),
      ]);
      setProducts(productResponse.data);
      setCategories(categoryResponse.data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  useEffect(() => {
    let cancelled = false;
    const fetchProducts = async () => {
      try {
        const [productResponse, categoryResponse] = await Promise.all([
          productsApi.list({ limit: 100, includeInactive: true, search: search || undefined }),
          productsApi.categories(),
        ]);
        if (!cancelled) {
          setProducts(productResponse.data);
          setCategories(categoryResponse.data);
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      }
    };
    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [search]);

  const change = (field) => (event) =>
    setForm((current) => ({
      ...current,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));
  const reset = () => {
    setForm(emptyForm);
    setEditing(null);
  };
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const data = {
        ...form,
        categoryId: Number(form.categoryId),
        price: Number(form.price),
        imageUrls: form.imageUrls
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        sizes: form.sizes
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        initialStock: Number(form.initialStock),
      };
      if (editing) {
        delete data.initialStock;
        await productsApi.update(editing, data);
        setMessage('Produit modifié.');
      } else {
        await productsApi.create(data);
        setMessage('Produit ajouté.');
      }
      reset();
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  const edit = (product) =>
    setForm({
      name: product.name,
      categoryId: product.category?.id ?? '',
      price: product.price,
      description: product.description,
      imageUrl: product.imageUrl ?? '',
      imageUrls: (product.imageUrls ?? []).join(', '),
      sizes: (product.sizes ?? []).join(', '),
      initialStock: product.stock.availableQuantity,
      isActive: product.isActive,
    });
  const deactivate = async (id) => {
    if (!window.confirm('Désactiver ce produit ?')) return;
    try {
      await productsApi.deactivate(id);
      setMessage('Produit désactivé.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion des produits</h1>
        <p className="mt-1 text-slate-600">
          Ajoutez, modifiez et désactivez les produits du catalogue.
        </p>
      </div>
      {error && (
        <Alert variant="error" title="Erreur">
          {error}
        </Alert>
      )}
      {message && <Alert variant="success">{message}</Alert>}
      <form
        onSubmit={submit}
        className="grid gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:grid-cols-2"
      >
        <h2 className="text-lg font-semibold md:col-span-2">
          {editing ? 'Modifier le produit' : 'Ajouter un produit'}
        </h2>
        <TextField label="Nom" value={form.name} onChange={change('name')} required />
        <label className="text-sm font-medium text-slate-700">
          Catégorie
          <select
            required
            value={form.categoryId}
            onChange={change('categoryId')}
            className="mt-1.5 block w-full rounded-lg bg-white px-3 py-2 ring-1 ring-slate-300"
          >
            <option value="">Choisir...</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <TextField
          label="Prix"
          type="number"
          min="0.01"
          step="0.01"
          value={form.price}
          onChange={change('price')}
          required
        />
        {!editing && (
          <TextField
            label="Stock initial"
            type="number"
            min="0"
            value={form.initialStock}
            onChange={change('initialStock')}
          />
        )}
        <TextField
          label="URL de l'image"
          type="url"
          value={form.imageUrl}
          onChange={change('imageUrl')}
        />
        <TextField
          label="Images supplémentaires (URLs séparées par des virgules)"
          value={form.imageUrls}
          onChange={change('imageUrls')}
        />
        <TextField
          label="Tailles (ex. XS, S, M, L, XL)"
          value={form.sizes}
          onChange={change('sizes')}
        />
        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Description
          <textarea
            required
            minLength="10"
            value={form.description}
            onChange={change('description')}
            className="mt-1.5 block min-h-24 w-full rounded-lg px-3 py-2 ring-1 ring-slate-300"
          />
        </label>
        {editing && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={change('isActive')} /> Produit
            actif
          </label>
        )}
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit">
            <Plus className="size-4" />
            {editing ? 'Enregistrer' : 'Ajouter'}
          </Button>
          {editing && (
            <Button type="button" variant="ghost" onClick={reset}>
              Annuler
            </Button>
          )}
        </div>
      </form>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Produits ({products.length})</h2>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher..."
            className="max-w-xs rounded-lg px-3 py-2 ring-1 ring-slate-300"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="p-3">Produit</th>
                <th className="p-3">Catégorie</th>
                <th className="p-3">Prix</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">
                    {product.name}
                    {!product.isActive && (
                      <span className="ml-2 text-xs text-red-600">(inactif)</span>
                    )}
                  </td>
                  <td className="p-3">{product.category?.name}</td>
                  <td className="p-3">{Number(product.price).toFixed(2)} €</td>
                  <td className="p-3">{product.stock.availableQuantity}</td>
                  <td className="flex gap-2 p-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(product.id);
                        edit(product);
                      }}
                    >
                      <Edit className="size-4" />
                      Modifier
                    </Button>
                    {product.isActive && (
                      <Button size="sm" variant="danger" onClick={() => deactivate(product.id)}>
                        <Trash2 className="size-4" />
                        Désactiver
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
