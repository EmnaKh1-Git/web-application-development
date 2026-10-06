import { useEffect, useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { productsApi } from '../api/productsApi';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { TextField } from '@/shared/components/ui/TextField';

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = async () => {
    try {
      setCategories((await productsApi.categories()).data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  useEffect(() => {
    let cancelled = false;
    const fetchCategories = async () => {
      try {
        const response = await productsApi.categories();
        if (!cancelled) setCategories(response.data);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      }
    };
    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (editing) await productsApi.updateCategory(editing, form);
      else await productsApi.createCategory(form);
      setMessage(editing ? 'Catégorie modifiée.' : 'Catégorie ajoutée.');
      setForm({ name: '', description: '' });
      setEditing(null);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  const remove = async (id) => {
    if (!window.confirm('Supprimer cette catégorie ?')) return;
    try {
      await productsApi.deleteCategory(id);
      setMessage('Catégorie supprimée.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion des catégories</h1>
        <p className="mt-1 text-slate-600">Organisez le catalogue et ses rayons.</p>
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
          {editing ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
        </h2>
        <TextField
          label="Nom"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
        <TextField
          label="Description"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit">
            <Plus className="size-4" />
            {editing ? 'Enregistrer' : 'Ajouter'}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setForm({ name: '', description: '' });
              }}
            >
              Annuler
            </Button>
          )}
        </div>
      </form>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="p-3">Nom</th>
              <th className="p-3">Description</th>
              <th className="p-3">Produits</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{category.name}</td>
                <td className="p-3">{category.description || '—'}</td>
                <td className="p-3">{category.productCount}</td>
                <td className="flex gap-2 p-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(category.id);
                      setForm({ name: category.name, description: category.description || '' });
                    }}
                  >
                    <Edit className="size-4" />
                    Modifier
                  </Button>
                  {category.productCount === 0 && (
                    <Button size="sm" variant="danger" onClick={() => remove(category.id)}>
                      <Trash2 className="size-4" />
                      Supprimer
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
