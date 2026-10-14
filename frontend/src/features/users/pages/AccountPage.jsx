import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, PERMISSIONS, profileSchema } from '@smart-ecommerce/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Home, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { MyReviews } from '@/features/reviews-complaints/components/MyReviews';
import { useAuth } from '@/shared/auth/useAuth';
import { QueryError } from '@/shared/components/QueryError';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { buttonClassName } from '@/shared/components/ui/buttonStyles';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { FilterTabs } from '@/shared/components/ui/FilterTabs';
import { RoleBadge } from '@/shared/components/ui/RoleBadge';
import { Spinner } from '@/shared/components/ui/Spinner';
import { TextField } from '@/shared/components/ui/TextField';
import { useUrlFilters } from '@/shared/hooks/useUrlFilters';
import { formatDate } from '@/shared/utils/format';
import { applyServerValidationErrors } from '@/shared/utils/forms';
import { notifyError, notifySuccess } from '@/shared/utils/notify';
import { accountApi, userKeys } from '../api/usersApi';
import { AddressFormDialog } from '../components/AddressFormDialog';

/** Espace « Mon compte » : profil, mot de passe, adresses et avis. */
export function AccountPage() {
  const { user, hasPermission } = useAuth();
  const [{ tab }, setFilters] = useUrlFilters({ tab: 'profile' });
  const isClient = hasPermission(PERMISSIONS.ORDERS_PLACE);
  const tabs = [
    { value: 'profile', label: 'Profil' },
    { value: 'security', label: 'Mot de passe' },
    ...(isClient
      ? [
          { value: 'addresses', label: 'Adresses' },
          { value: 'reviews', label: 'Mes avis' },
        ]
      : []),
  ];
  const activeTab = tabs.some((item) => item.value === tab) ? tab : 'profile';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <span
          aria-hidden="true"
          className="inline-flex size-14 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white"
        >
          {user.firstName.charAt(0)}
          {user.lastName.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {user.firstName} {user.lastName}
          </h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="break-all">{user.email}</span>
            <RoleBadge role={user.role} />
            {user.createdAt && <span>· membre depuis le {formatDate(user.createdAt)}</span>}
          </p>
        </div>
        {isClient && (
          <div className="flex flex-wrap gap-2">
            <Link to="/orders" className={buttonClassName({ variant: 'secondary', size: 'sm' })}>
              Mes commandes
            </Link>
            <Link
              to="/complaints"
              className={buttonClassName({ variant: 'secondary', size: 'sm' })}
            >
              Réclamations
            </Link>
          </div>
        )}
      </section>

      <FilterTabs
        label="Rubriques du compte"
        options={tabs}
        value={activeTab}
        onChange={(value) => setFilters({ tab: value })}
      />

      {activeTab === 'profile' && <ProfileForm />}
      {activeTab === 'security' && <PasswordForm />}
      {activeTab === 'addresses' && <Addresses />}
      {activeTab === 'reviews' && <MyReviews />}
    </div>
  );
}

function Card({ title, description, children }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ProfileForm() {
  const { user, updateUser } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user.firstName, lastName: user.lastName, phone: user.phone ?? '' },
  });
  const mutation = useMutation({
    mutationFn: accountApi.updateProfile,
    onSuccess: (updated) => {
      updateUser(updated);
      reset({
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone ?? '',
      });
      notifySuccess('Profil mis à jour');
    },
    onError: (error) => {
      if (!applyServerValidationErrors(error, setError)) notifyError(error);
    },
  });

  return (
    <Card
      title="Informations personnelles"
      description="Votre email sert d’identifiant : il ne peut pas être modifié."
    >
      <form
        noValidate
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="space-y-5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Prénom"
            autoComplete="given-name"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <TextField
            label="Nom"
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Email" value={user.email} disabled readOnly />
          <TextField
            label="Téléphone (facultatif)"
            type="tel"
            autoComplete="tel"
            placeholder="+216 20 123 456"
            error={errors.phone?.message}
            {...register('phone')}
          />
        </div>
        <Button type="submit" disabled={!isDirty} isLoading={mutation.isPending}>
          Enregistrer
        </Button>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const mutation = useMutation({
    mutationFn: accountApi.changePassword,
    onSuccess: () => {
      reset();
      notifySuccess('Mot de passe modifié');
    },
    onError: (error) => {
      if (error.code === 'INVALID_CURRENT_PASSWORD') {
        setError('currentPassword', { type: 'server', message: error.message });
      } else if (!applyServerValidationErrors(error, setError)) {
        notifyError(error);
      }
    },
  });

  const onSubmit = (values) => {
    // La confirmation est propre au formulaire : elle n'est pas envoyée à l'API
    if (getValues('confirmPassword') !== values.newPassword) {
      setError('confirmPassword', { message: 'Les mots de passe ne correspondent pas' });
      return;
    }
    mutation.mutate(values);
  };

  return (
    <Card
      title="Changer de mot de passe"
      description="8 caractères minimum, avec une majuscule, une minuscule et un chiffre."
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-5">
        <TextField
          label="Mot de passe actuel"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <TextField
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <TextField
          label="Confirmer le nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" isLoading={mutation.isPending}>
          Modifier le mot de passe
        </Button>
      </form>
    </Card>
  );
}

function Addresses() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // null = fermé, {} = ajout, adresse = modification
  const [deleting, setDeleting] = useState(null);
  const query = useQuery({ queryKey: userKeys.addresses, queryFn: accountApi.listAddresses });
  const refresh = () => queryClient.invalidateQueries({ queryKey: userKeys.addresses });
  const setDefault = useMutation({
    mutationFn: (address) => accountApi.updateAddress(address.id, { ...address, isDefault: true }),
    onSuccess: async () => {
      notifySuccess('Adresse par défaut modifiée');
      await refresh();
    },
    onError: notifyError,
  });
  const remove = useMutation({
    mutationFn: (address) => accountApi.deleteAddress(address.id),
    onSuccess: async () => {
      setDeleting(null);
      notifySuccess('Adresse supprimée');
      await refresh();
    },
    onError: notifyError,
  });

  return (
    <Card
      title="Adresses de livraison"
      description="L’adresse par défaut est proposée lors de vos commandes."
    >
      {query.isPending ? (
        <Spinner className="text-brand-600" />
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={query.refetch} />
      ) : (
        <div className="space-y-4">
          {query.data.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="Aucune adresse"
              description="Ajoutez une adresse pour commander plus vite."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {query.data.map((address) => (
                <li key={address.id} className="flex flex-col rounded-xl p-4 ring-1 ring-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 font-semibold">
                      <Home aria-hidden="true" className="size-4 text-slate-400" />
                      {address.label}
                    </p>
                    {address.isDefault && <Badge tone="brand">Par défaut</Badge>}
                  </div>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                    {address.street}
                    <br />
                    {address.postalCode} {address.city}, {address.country}
                    {address.phone && (
                      <>
                        <br />
                        Tél. {address.phone}
                      </>
                    )}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(address)}>
                      <Pencil aria-hidden="true" className="size-4" />
                      Modifier
                    </Button>
                    {!address.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        isLoading={setDefault.isPending && setDefault.variables?.id === address.id}
                        onClick={() => setDefault.mutate(address)}
                      >
                        <Star aria-hidden="true" className="size-4" />
                        Par défaut
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(address)}>
                      <Trash2 aria-hidden="true" className="size-4" />
                      Supprimer
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button variant="secondary" onClick={() => setEditing({})}>
            <Plus aria-hidden="true" className="size-4" />
            Ajouter une adresse
          </Button>
        </div>
      )}

      <AddressFormDialog
        open={editing !== null}
        address={editing?.id ? editing : null}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer cette adresse ?"
        confirmLabel="Supprimer"
        variant="danger"
        isLoading={remove.isPending}
        onConfirm={() => remove.mutate(deleting)}
        onClose={() => setDeleting(null)}
      >
        « {deleting?.label} » — les commandes déjà passées conservent leur adresse.
      </ConfirmDialog>
    </Card>
  );
}
