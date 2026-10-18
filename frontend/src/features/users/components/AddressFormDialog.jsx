import { zodResolver } from '@hookform/resolvers/zod';
import { addressSchema } from '@smart-ecommerce/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/components/ui/Button';
import { Dialog } from '@/shared/components/ui/Dialog';
import { TextField } from '@/shared/components/ui/TextField';
import { applyServerValidationErrors } from '@/shared/utils/forms';
import { notifyError, notifySuccess } from '@/shared/utils/notify';
import { accountApi, userKeys } from '../api/usersApi';

const EMPTY_ADDRESS = {
  label: '',
  street: '',
  city: '',
  postalCode: '',
  country: 'Tunisie',
  phone: '',
  isDefault: false,
};

/**
 * Ajout ou modification d'une adresse de livraison (fenêtre modale).
 * `onSaved(address)` est appelé avec l'adresse enregistrée.
 *
 * @example <AddressFormDialog open={isOpen} onClose={close} onSaved={(a) => setAddressId(a.id)} />
 */
export function AddressFormDialog({ open, onClose, address, onSaved }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={address ? 'Modifier l’adresse' : 'Nouvelle adresse de livraison'}
    >
      {/* Monté à l'ouverture : le formulaire repart des bonnes valeurs à chaque fois */}
      <AddressForm address={address} onClose={onClose} onSaved={onSaved} />
    </Dialog>
  );
}

function AddressForm({ address, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: address
      ? { ...EMPTY_ADDRESS, ...address, phone: address.phone ?? '' }
      : EMPTY_ADDRESS,
  });
  const mutation = useMutation({
    mutationFn: (values) =>
      address ? accountApi.updateAddress(address.id, values) : accountApi.createAddress(values),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: userKeys.addresses });
      notifySuccess(address ? 'Adresse modifiée' : 'Adresse ajoutée');
      onSaved?.(saved);
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
        label="Libellé"
        placeholder="Maison, Bureau…"
        error={errors.label?.message}
        {...register('label')}
      />
      <TextField
        label="Adresse"
        autoComplete="street-address"
        placeholder="12 rue de la République"
        error={errors.street?.message}
        {...register('street')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Ville"
          autoComplete="address-level2"
          error={errors.city?.message}
          {...register('city')}
        />
        <TextField
          label="Code postal"
          autoComplete="postal-code"
          error={errors.postalCode?.message}
          {...register('postalCode')}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Pays"
          autoComplete="country-name"
          error={errors.country?.message}
          {...register('country')}
        />
        <TextField
          label="Téléphone (facultatif)"
          type="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="size-4 rounded border-slate-300 text-brand-600"
          {...register('isDefault')}
        />
        Utiliser comme adresse par défaut
      </label>
      <div className="flex justify-end gap-2 pt-2">
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
