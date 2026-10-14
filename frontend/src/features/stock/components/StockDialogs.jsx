import { zodResolver } from '@hookform/resolvers/zod';
import { addStockSchema, adjustStockSchema, getStockStatus } from '@smart-ecommerce/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { aiKeys } from '@/features/ai/api/aiApi';
import { productKeys } from '@/features/products/api/productsApi';
import { Button } from '@/shared/components/ui/Button';
import { Dialog } from '@/shared/components/ui/Dialog';
import { TextField } from '@/shared/components/ui/TextField';
import { formatNumber } from '@/shared/utils/format';
import { applyServerValidationErrors } from '@/shared/utils/forms';
import { notifyError, notifySuccess } from '@/shared/utils/notify';
import { stockApi, stockKeys } from '../api/stockApi';
import { StockStatusBadge } from './StockStatusBadge';

/** Mutation commune : met à jour le cache du stock et du catalogue (disponibilité affichée). */
function useStockMutation(mutationFn, { successMessage, onSuccess, setError }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (stock) => {
      notifySuccess(successMessage(stock));
      onSuccess();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
        queryClient.invalidateQueries({ queryKey: aiKeys.all }),
      ]);
    },
    onError: (error) => {
      if (!applyServerValidationErrors(error, setError)) notifyError(error);
    },
  });
}

/** Aperçu « avant → après » de la quantité et de l'état du stock. */
function StockPreview({ before, after, threshold }) {
  const isValid = Number.isInteger(after) && after >= 0;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm">
      <span>
        Actuel : <strong>{formatNumber(before)}</strong>
      </span>
      <ArrowRight aria-hidden="true" className="size-4 text-slate-400" />
      <span>
        Après : <strong>{isValid ? formatNumber(after) : '—'}</strong>
      </span>
      {isValid && <StockStatusBadge status={getStockStatus(after, threshold)} />}
    </div>
  );
}

/**
 * Réapprovisionnement : ajoute une quantité au stock (mouvement « Entrée »).
 * @param {{ stock: object | null, onClose: () => void }} props stock = ligne de la liste du stock
 */
export function RestockDialog({ stock, onClose, suggestion }) {
  return (
    <Dialog
      open={stock !== null}
      onClose={onClose}
      title="Réapprovisionner"
      description={stock?.product?.name}
    >
      {stock && <RestockForm stock={stock} onClose={onClose} suggestion={suggestion} />}
    </Dialog>
  );
}

function RestockForm({ stock, onClose, suggestion }) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addStockSchema),
    defaultValues: {
      quantity: suggestion?.quantity ? String(suggestion.quantity) : '',
      reason: suggestion?.reason ?? 'Livraison fournisseur',
    },
  });
  const quantity = Number(useWatch({ control, name: 'quantity' }) || 0);
  const mutation = useStockMutation((values) => stockApi.add(stock.productId, values), {
    successMessage: (updated) =>
      `${updated.product.name} : ${formatNumber(updated.quantity)} unité(s) en stock`,
    onSuccess: onClose,
    setError,
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="space-y-4"
    >
      <TextField
        data-autofocus
        label="Quantité reçue"
        type="number"
        min="1"
        inputMode="numeric"
        error={errors.quantity?.message}
        {...register('quantity')}
      />
      <TextField
        label="Motif"
        hint="Visible dans l’historique des mouvements"
        error={errors.reason?.message}
        {...register('reason')}
      />
      <StockPreview
        before={stock.quantity}
        after={stock.quantity + quantity}
        threshold={stock.lowStockThreshold}
      />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" isLoading={mutation.isPending}>
          Ajouter au stock
        </Button>
      </div>
    </form>
  );
}

/**
 * Inventaire : corrige la quantité réelle et/ou le seuil d'alerte (mouvement « Correction »).
 * @param {{ stock: object | null, onClose: () => void }} props
 */
export function AdjustStockDialog({ stock, onClose, suggestion }) {
  return (
    <Dialog
      open={stock !== null}
      onClose={onClose}
      title="Inventaire et seuil d’alerte"
      description={stock?.product?.name}
    >
      {stock && <AdjustForm stock={stock} onClose={onClose} suggestion={suggestion} />}
    </Dialog>
  );
}

function AdjustForm({ stock, onClose, suggestion }) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: {
      quantity: String(stock.quantity),
      lowStockThreshold: String(suggestion?.lowStockThreshold ?? stock.lowStockThreshold),
      reason: suggestion?.reason ?? 'Inventaire',
    },
  });
  const [quantity, threshold] = useWatch({ control, name: ['quantity', 'lowStockThreshold'] });
  const mutation = useStockMutation((values) => stockApi.adjust(stock.productId, values), {
    successMessage: (updated) => `${updated.product.name} : stock corrigé`,
    onSuccess: onClose,
    setError,
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          data-autofocus
          label="Quantité réelle"
          type="number"
          min="0"
          inputMode="numeric"
          error={errors.quantity?.message}
          {...register('quantity')}
        />
        <TextField
          label="Seuil d’alerte"
          type="number"
          min="0"
          inputMode="numeric"
          hint="Stock faible à ce niveau ou en dessous"
          error={errors.lowStockThreshold?.message}
          {...register('lowStockThreshold')}
        />
      </div>
      <TextField label="Motif" error={errors.reason?.message} {...register('reason')} />
      <StockPreview
        before={stock.quantity}
        after={quantity === '' ? stock.quantity : Number(quantity)}
        threshold={threshold === '' ? stock.lowStockThreshold : Number(threshold)}
      />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" disabled={!isDirty && !suggestion} isLoading={mutation.isPending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
