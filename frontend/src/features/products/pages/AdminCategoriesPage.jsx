import { zodResolver } from '@hookform/resolvers/zod';
import { categorySchema } from '@smart-ecommerce/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { QueryError } from '@/shared/components/QueryError';
import { Button } from '@/shared/components/ui/Button';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { Dialog } from '@/shared/components/ui/Dialog';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageSpinner } from '@/shared/components/ui/Spinner';
import { TextAreaField } from '@/shared/components/ui/TextAreaField';
import { TextField } from '@/shared/components/ui/TextField';
import { applyServerValidationErrors } from '@/shared/utils/forms';
import { notifyError, notifySuccess } from '@/shared/utils/notify';
import { categoriesApi, productKeys } from '../api/productsApi';

/** Back-office : organisation du catalogue en catégories. */
export function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // null = fermé, {} = création, catégorie = modification
  const [deleting, setDeleting] = useState(null);
  const query = useQuery({ queryKey: productKeys.categories, queryFn: categoriesApi.list });
  const deleteMutation = useMutation({
    mutationFn: (category) => categoriesApi.remove(category.id),
    onSuccess: async (_result, category) => {
      notifySuccess('Catégorie supprimée', category.name);
      setDeleting(null);
      await queryClient.invalidateQueries({ queryKey: productKeys.categories });
    },
    onError: (error) => {
      setDeleting(null);
      notifyError(error);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catégories"
        description="Une catégorie ne peut être supprimée que si elle ne contient plus de produit."
        actions={
          <Button onClick={() => setEditing({})}>
            <Plus aria-hidden="true" className="size-4" />
            Nouvelle catégorie
          </Button>
        }
      />

      {query.isPending ? (
        <PageSpinner />
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={query.refetch} />
      ) : query.data.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Aucune catégorie"
          description="Créez la première catégorie."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {query.data.map((category) => (
            <li
              key={category.id}
              className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{category.name}</h2>
                <Link
                  to={`/admin/products?categoryId=${category.id}`}
                  className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                >
                  {category.productCount} produit(s)
                </Link>
              </div>
              <p className="mt-2 flex-1 text-sm text-slate-600">
                {category.description || <span className="text-slate-400">Sans description</span>}
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditing(category)}>
                  <Pencil aria-hidden="true" className="size-4" />
                  Modifier
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleting(category)}>
                  <Trash2 aria-hidden="true" className="size-4" />
                  Supprimer
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
      >
        <CategoryForm category={editing?.id ? editing : null} onClose={() => setEditing(null)} />
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        title={`Supprimer « ${deleting?.name} » ?`}
        confirmLabel="Supprimer"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleting)}
        onClose={() => setDeleting(null)}
      >
        {deleting?.productCount > 0
          ? `Cette catégorie contient encore ${deleting.productCount} produit(s) : déplacez-les d’abord.`
          : 'Cette action est définitive.'}
      </ConfirmDialog>
    </div>
  );
}

function CategoryForm({ category, onClose }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? '', description: category?.description ?? '' },
  });
  const mutation = useMutation({
    mutationFn: (values) =>
      category ? categoriesApi.update(category.id, values) : categoriesApi.create(values),
    onSuccess: async (saved) => {
      notifySuccess(category ? 'Catégorie modifiée' : 'Catégorie créée', saved.name);
      await queryClient.invalidateQueries({ queryKey: productKeys.categories });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      onClose();
    },
    onError: (error) => {
      if (!applyServerValidationErrors(error, setError)) notifyError(error);
    },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="space-y-4"
    >
      <TextField data-autofocus label="Nom" error={errors.name?.message} {...register('name')} />
      <TextAreaField
        label="Description (facultatif)"
        rows={3}
        error={errors.description?.message}
        {...register('description')}
      />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" isLoading={mutation.isPending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
