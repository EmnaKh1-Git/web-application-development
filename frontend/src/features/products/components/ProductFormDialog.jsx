import { zodResolver } from '@hookform/resolvers/zod';
import { productCreateSchema, productSchema, z } from '@smart-ecommerce/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { aiApi } from '@/features/ai/api/aiApi';
import { AiBadge } from '@/features/ai/components/AiBadge';
import { Button } from '@/shared/components/ui/Button';
import { Dialog } from '@/shared/components/ui/Dialog';
import { SelectField } from '@/shared/components/ui/SelectField';
import { TextAreaField } from '@/shared/components/ui/TextAreaField';
import { TextField } from '@/shared/components/ui/TextField';
import { applyServerValidationErrors } from '@/shared/utils/forms';
import { notifyError, notifySuccess } from '@/shared/utils/notify';
import { categoriesApi, productKeys, productsApi } from '../api/productsApi';

/** Texte saisi (une valeur par ligne ou séparée par des virgules) → liste de valeurs. */
const listFromText = (separator) => (value) =>
  typeof value === 'string'
    ? value
        .split(separator)
        .map((item) => item.trim())
        .filter(Boolean)
    : value;

// Schéma partagé avec le Back-End ; les listes sont saisies sous forme de texte.
const productFormSchema = productCreateSchema.extend({
  imageUrls: z.preprocess(listFromText(/\n/), productSchema.shape.imageUrls),
  sizes: z.preprocess(listFromText(','), productSchema.shape.sizes),
  colors: z.preprocess(listFromText(','), productSchema.shape.colors),
});

/** Premier message d'erreur d'un champ liste (l'erreur peut porter sur un élément). */
function listError(error) {
  if (!error) return undefined;
  if (error.message) return error.message;
  const itemError = Object.values(error).find((item) => item?.message);
  return itemError?.message;
}

function toFormValues(product) {
  if (!product) {
    return {
      name: '',
      categoryId: '',
      price: '',
      description: '',
      imageUrl: '',
      imageUrls: '',
      sizes: '',
      colors: '',
      isActive: true,
      initialStock: '0',
    };
  }
  return {
    name: product.name,
    categoryId: String(product.category?.id ?? ''),
    price: String(product.price),
    description: product.description,
    imageUrl: product.imageUrl ?? '',
    imageUrls: product.imageUrls.join('\n'),
    sizes: product.sizes.join(', '),
    colors: product.colors.join(', '),
    isActive: product.isActive,
  };
}

/**
 * Création ou modification d'un produit. Tous les champs sont renvoyés à la modification
 * (PUT), y compris la galerie, les tailles et les couleurs : rien n'est perdu.
 */
export function ProductFormDialog({ open, product, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={product ? 'Modifier le produit' : 'Nouveau produit'}
      description={product?.name}
    >
      <ProductForm product={product} onClose={onClose} />
    </Dialog>
  );
}

function ProductForm({ product, onClose }) {
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({
    queryKey: productKeys.categories,
    queryFn: categoriesApi.list,
  });
  const {
    register,
    control,
    getValues,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(productFormSchema), defaultValues: toFormValues(product) });
  const categoryId = useWatch({ control, name: 'categoryId' });
  const [descriptionSource, setDescriptionSource] = useState(null);

  // IA : catégorie suggérée d'après le nom (classifieur entraîné sur le catalogue)
  const categorize = useMutation({ mutationFn: aiApi.categorizeProduct });
  const suggestCategory = (name) => {
    if (name.trim().length >= 3 && !getValues('categoryId')) {
      categorize.mutate({ name, description: getValues('description') });
    }
  };
  // IA : rédaction de la description à partir des informations déjà saisies
  const describe = useMutation({
    mutationFn: aiApi.describeProduct,
    onSuccess: ({ description, source }) => {
      setValue('description', description, { shouldDirty: true, shouldValidate: true });
      setDescriptionSource(source);
    },
    onError: notifyError,
  });
  const writeDescription = () => {
    const values = getValues();
    if (values.name.trim().length < 2) {
      setError('name', { message: 'Indiquez d’abord le nom du produit' });
      return;
    }
    describe.mutate({
      name: values.name,
      categoryId: values.categoryId || undefined,
      price: values.price || undefined,
      sizes: listFromText(',')(values.sizes),
      colors: listFromText(',')(values.colors),
    });
  };
  const categorySuggestions = !categoryId ? (categorize.data?.suggestions ?? []) : [];

  const mutation = useMutation({
    mutationFn: ({ initialStock, ...values }) =>
      product
        ? productsApi.update(product.id, values)
        : productsApi.create({ ...values, initialStock }),
    onSuccess: async (saved) => {
      notifySuccess(product ? 'Produit modifié' : 'Produit créé', saved.name);
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
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
      <TextField
        data-autofocus
        label="Nom"
        error={errors.name?.message}
        {...register('name', { onBlur: (event) => suggestCategory(event.target.value) })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Catégorie"
          error={errors.categoryId?.message}
          {...register('categoryId')}
        >
          <option value="">Choisir une catégorie…</option>
          {(categoriesQuery.data ?? []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Prix (DT)"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          error={errors.price?.message}
          {...register('price')}
        />
      </div>
      {categorySuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="flex items-center gap-1 text-violet-700">
            <Sparkles aria-hidden="true" className="size-4" />
            Catégorie suggérée par l’IA :
          </span>
          {categorySuggestions.map((suggestion) => (
            <button
              key={suggestion.categoryId}
              type="button"
              onClick={() =>
                setValue('categoryId', String(suggestion.categoryId), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              className="rounded-full bg-violet-50 px-3 py-1 font-medium text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100"
            >
              {suggestion.name} ({Math.round(suggestion.probability * 100)} %)
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          isLoading={describe.isPending}
          onClick={writeDescription}
        >
          {!describe.isPending && (
            <Sparkles aria-hidden="true" className="size-4 text-violet-600" />
          )}
          Rédiger la description avec l’IA
        </Button>
        {descriptionSource && (
          <AiBadge source={descriptionSource} label="Texte proposé, à relire" />
        )}
      </div>
      <TextAreaField
        label="Description"
        rows={4}
        error={errors.description?.message}
        {...register('description')}
      />
      <TextField
        label="Image principale (URL)"
        type="url"
        placeholder="https://…"
        hint="Facultatif : sans image, une couverture est générée"
        error={errors.imageUrl?.message}
        {...register('imageUrl')}
      />
      <TextAreaField
        label="Galerie (une URL par ligne)"
        rows={3}
        hint="8 images au maximum"
        error={listError(errors.imageUrls)}
        {...register('imageUrls')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Tailles"
          placeholder="S, M, L, XL"
          hint="Séparées par des virgules"
          error={listError(errors.sizes)}
          {...register('sizes')}
        />
        <TextField
          label="Couleurs"
          placeholder="Noir, Blanc"
          hint="Séparées par des virgules"
          error={listError(errors.colors)}
          {...register('colors')}
        />
      </div>
      {!product && (
        <TextField
          label="Stock initial"
          type="number"
          min="0"
          inputMode="numeric"
          hint="Ensuite, le stock se gère depuis la page Stock"
          error={errors.initialStock?.message}
          {...register('initialStock')}
        />
      )}
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="size-4 rounded border-slate-300"
          {...register('isActive')}
        />
        Visible dans le catalogue
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" isLoading={mutation.isPending}>
          {product ? 'Enregistrer' : 'Créer le produit'}
        </Button>
      </div>
    </form>
  );
}
