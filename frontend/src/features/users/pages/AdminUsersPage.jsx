import { ROLE_LABELS, ROLE_LIST, ROLES } from '@smart-ecommerce/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Eye, UserCheck, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { aiApi, aiKeys } from '@/features/ai/api/aiApi';
import { SegmentBadge } from '@/features/ai/components/SegmentBadge';
import { useAuth } from '@/shared/auth/useAuth';
import { QueryError } from '@/shared/components/QueryError';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { Dialog } from '@/shared/components/ui/Dialog';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { fieldClassName } from '@/shared/components/ui/fieldStyles';
import { FilterTabs } from '@/shared/components/ui/FilterTabs';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Pagination } from '@/shared/components/ui/Pagination';
import { RoleBadge } from '@/shared/components/ui/RoleBadge';
import { SearchInput } from '@/shared/components/ui/SearchInput';
import { PageSpinner, Spinner } from '@/shared/components/ui/Spinner';
import { useUrlFilters } from '@/shared/hooks/useUrlFilters';
import { cn } from '@/shared/utils/cn';
import { formatDate } from '@/shared/utils/format';
import { notifyError, notifySuccess } from '@/shared/utils/notify';
import { userKeys, usersAdminApi } from '../api/usersApi';

const DEFAULT_FILTERS = { search: '', role: '', status: 'all', page: '1' };
const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'blocked', label: 'Bloqués' },
];

/** Back-office : comptes, rôles, blocage et déblocage. */
export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS);
  const [statusChange, setStatusChange] = useState(null);
  const [roleChange, setRoleChange] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const params = {
    page: filters.page,
    limit: 15,
    status: filters.status,
    role: filters.role || undefined,
    search: filters.search || undefined,
  };
  const segmentsQuery = useQuery({
    queryKey: aiKeys.customerSegments,
    queryFn: aiApi.customerSegments,
  });
  const segments = segmentsQuery.data?.items ?? {};
  const query = useQuery({
    queryKey: userKeys.admin(params),
    queryFn: () => usersAdminApi.list(params),
    placeholderData: keepPreviousData,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const statusMutation = useMutation({
    mutationFn: ({ user, isActive }) => usersAdminApi.setStatus(user.id, isActive),
    onSuccess: async (updated) => {
      setStatusChange(null);
      notifySuccess(
        updated.isActive ? 'Compte débloqué' : 'Compte bloqué',
        `${updated.firstName} ${updated.lastName}`,
      );
      await refresh();
    },
    onError: notifyError,
  });
  const roleMutation = useMutation({
    mutationFn: ({ user, role }) => usersAdminApi.setRole(user.id, role),
    onSuccess: async (updated) => {
      setRoleChange(null);
      notifySuccess(
        'Rôle modifié',
        `${updated.firstName} ${updated.lastName} : ${ROLE_LABELS[updated.role]}`,
      );
      await refresh();
    },
    onError: notifyError,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        description="Un compte bloqué ne peut plus se connecter ; l’effet est immédiat."
      />
      <div className="space-y-3">
        <FilterTabs
          label="Filtrer par statut"
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(status) => setFilters({ status })}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <SearchInput
            label="Rechercher un utilisateur"
            placeholder="Nom, prénom ou email"
            value={filters.search}
            onSearch={(search) => setFilters({ search })}
          />
          <select
            aria-label="Rôle"
            value={filters.role}
            onChange={(event) => setFilters({ role: event.target.value })}
            className={fieldClassName()}
          >
            <option value="">Tous les rôles</option>
            {ROLE_LIST.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {query.isPending ? (
        <PageSpinner />
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={query.refetch} />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Aucun utilisateur"
          description="Modifiez les filtres."
        />
      ) : (
        <div className={cn('space-y-4', query.isPlaceholderData && 'opacity-60')}>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Utilisateur
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Rôle
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Statut
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Segment (IA)
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Inscrit le
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {query.data.data.map((user) => {
                  const isSelf = user.id === currentUser.id;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {user.firstName} {user.lastName}
                          {isSelf && <span className="ml-1 text-xs text-slate-500">(vous)</span>}
                        </p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <RoleBadge role={user.role} />
                        ) : (
                          <select
                            aria-label={`Rôle de ${user.firstName} ${user.lastName}`}
                            value={user.role}
                            onChange={(event) => setRoleChange({ user, role: event.target.value })}
                            className={fieldClassName({ className: 'w-44 py-1.5' })}
                          >
                            {ROLE_LIST.map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.isActive ? (
                          <Badge tone="success">Actif</Badge>
                        ) : (
                          <Badge tone="danger">Bloqué</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.role === ROLES.CLIENT && segments[user.id] ? (
                          <SegmentBadge segment={segments[user.id]} />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setDetailId(user.id)}>
                            <Eye aria-hidden="true" className="size-4" />
                            <span className="sr-only">
                              Détails de {user.firstName} {user.lastName}
                            </span>
                          </Button>
                          {!isSelf && (
                            <Button
                              variant={user.isActive ? 'secondary' : 'primary'}
                              size="sm"
                              onClick={() => setStatusChange({ user, isActive: !user.isActive })}
                            >
                              {user.isActive ? (
                                <Ban aria-hidden="true" className="size-4" />
                              ) : (
                                <UserCheck aria-hidden="true" className="size-4" />
                              )}
                              {user.isActive ? 'Bloquer' : 'Débloquer'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            meta={query.data.meta}
            itemLabel="utilisateur(s)"
            onPageChange={(page) => setFilters({ page })}
          />
        </div>
      )}

      <ConfirmDialog
        open={statusChange !== null}
        title={statusChange?.isActive ? 'Débloquer ce compte ?' : 'Bloquer ce compte ?'}
        confirmLabel={statusChange?.isActive ? 'Débloquer' : 'Bloquer'}
        variant={statusChange?.isActive ? 'primary' : 'danger'}
        isLoading={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate(statusChange)}
        onClose={() => setStatusChange(null)}
      >
        {statusChange?.user.firstName} {statusChange?.user.lastName} ({statusChange?.user.email}){' '}
        {statusChange?.isActive
          ? 'pourra de nouveau se connecter.'
          : 'sera déconnecté et ne pourra plus se connecter.'}
      </ConfirmDialog>
      <ConfirmDialog
        open={roleChange !== null}
        title="Changer le rôle ?"
        confirmLabel="Confirmer"
        isLoading={roleMutation.isPending}
        onConfirm={() => roleMutation.mutate(roleChange)}
        onClose={() => setRoleChange(null)}
      >
        {roleChange?.user.firstName} {roleChange?.user.lastName} passera de «{' '}
        {ROLE_LABELS[roleChange?.user.role]} » à « {ROLE_LABELS[roleChange?.role]} ». Ses
        permissions changent immédiatement.
      </ConfirmDialog>
      <Dialog open={detailId !== null} onClose={() => setDetailId(null)} title="Fiche utilisateur">
        {detailId !== null && <UserDetail userId={detailId} />}
      </Dialog>
    </div>
  );
}

function UserDetail({ userId }) {
  const query = useQuery({
    queryKey: userKeys.adminDetail(userId),
    queryFn: () => usersAdminApi.get(userId),
  });
  if (query.isPending) return <Spinner className="text-brand-600" />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;

  const user = query.data;
  return (
    <div className="space-y-5 text-sm">
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Nom</dt>
          <dd className="font-medium">
            {user.firstName} {user.lastName}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Email</dt>
          <dd className="font-medium break-all">{user.email}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Téléphone</dt>
          <dd className="font-medium">{user.phone ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Rôle et statut</dt>
          <dd className="mt-0.5 flex gap-2">
            <RoleBadge role={user.role} />
            {user.isActive ? (
              <Badge tone="success">Actif</Badge>
            ) : (
              <Badge tone="danger">Bloqué</Badge>
            )}
          </dd>
        </div>
      </dl>
      <div>
        <h3 className="font-semibold">Adresses ({user.addresses.length})</h3>
        {user.addresses.length === 0 ? (
          <p className="mt-1 text-slate-500">Aucune adresse enregistrée.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {user.addresses.map((address) => (
              <li key={address.id} className="rounded-lg bg-slate-50 p-3">
                <span className="font-medium">{address.label}</span>
                {address.isDefault && (
                  <Badge tone="brand" className="ml-2">
                    Par défaut
                  </Badge>
                )}
                <br />
                {address.street}, {address.postalCode} {address.city}, {address.country}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
