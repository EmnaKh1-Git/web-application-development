import { zodResolver } from '@hookform/resolvers/zod';
import {
  CLOSING_COMPLAINT_STATUSES,
  COMPLAINT_STATUS,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_STATUS_LIST,
  COMPLAINT_PRIORITY_LABELS,
  complaintHandlingSchema,
  PERMISSIONS,
} from '@smart-ecommerce/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareWarning, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import { aiApi, aiKeys } from '@/features/ai/api/aiApi';
import { AiBadge } from '@/features/ai/components/AiBadge';
import { AiLevelBadge } from '@/features/ai/components/AiLevelBadge';
import { useAuth } from '@/shared/auth/useAuth';
import { Badge } from '@/shared/components/ui/Badge';
import { QueryError } from '@/shared/components/QueryError';
import { Button } from '@/shared/components/ui/Button';
import { Dialog } from '@/shared/components/ui/Dialog';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { FilterTabs } from '@/shared/components/ui/FilterTabs';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Pagination } from '@/shared/components/ui/Pagination';
import { SearchInput } from '@/shared/components/ui/SearchInput';
import { SelectField } from '@/shared/components/ui/SelectField';
import { PageSpinner } from '@/shared/components/ui/Spinner';
import { TextAreaField } from '@/shared/components/ui/TextAreaField';
import { useUrlFilters } from '@/shared/hooks/useUrlFilters';
import { cn } from '@/shared/utils/cn';
import { formatDateTime } from '@/shared/utils/format';
import { applyServerValidationErrors } from '@/shared/utils/forms';
import { notifyError, notifySuccess } from '@/shared/utils/notify';
import { complaintKeys, complaintsAdminApi } from '../api/complaintsApi';
import { ComplaintStatusBadge } from '../components/ComplaintStatusBadge';

const DEFAULT_FILTERS = { status: '', search: '', page: '1' };

/** Une réclamation clôturée peut encore être modifiée ; les autres sont « à traiter ». */
const actionLabel = (complaint) =>
  CLOSING_COMPLAINT_STATUSES.includes(complaint.status) ? 'Modifier' : 'Traiter';

/** Back-office : traitement des réclamations (statut + réponse visible par le client). */
export function AdminComplaintsPage() {
  const { hasPermission } = useAuth();
  const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS);
  const [selected, setSelected] = useState(null);
  const [urgentFirst, setUrgentFirst] = useState(true);
  const insightsQuery = useQuery({
    queryKey: aiKeys.complaintInsights,
    queryFn: aiApi.complaintInsights,
  });
  const insights = insightsQuery.data?.items ?? {};
  const params = {
    page: filters.page,
    limit: 10,
    status: filters.status || undefined,
    search: filters.search || undefined,
  };
  const query = useQuery({
    queryKey: complaintKeys.admin(params),
    queryFn: () => complaintsAdminApi.list(params),
    placeholderData: keepPreviousData,
  });
  const statsQuery = useQuery({ queryKey: complaintKeys.stats, queryFn: complaintsAdminApi.stats });
  const byStatus = statsQuery.data?.byStatus;
  const total = byStatus && Object.values(byStatus).reduce((sum, count) => sum + count, 0);
  const statusOptions = [
    { value: '', label: 'Toutes', count: total },
    ...COMPLAINT_STATUS_LIST.map((status) => ({
      value: status,
      label: COMPLAINT_STATUS_LABELS[status],
      count: byStatus?.[status],
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réclamations"
        description="Une réponse au client est obligatoire pour clôturer une réclamation."
      />
      <div className="space-y-3">
        <FilterTabs
          label="Filtrer par statut"
          options={statusOptions}
          value={filters.status}
          onChange={(status) => setFilters({ status })}
        />
        <SearchInput
          className="max-w-md"
          label="Rechercher une réclamation"
          placeholder="Objet, nom ou email du client"
          value={filters.search}
          onSearch={(search) => setFilters({ search })}
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={urgentFirst}
            onChange={(event) => setUrgentFirst(event.target.checked)}
            className="size-4 rounded border-slate-300"
          />
          <Sparkles aria-hidden="true" className="size-4 text-violet-600" />
          Les plus urgentes d’abord (priorité calculée par l’IA)
        </label>
      </div>

      {query.isPending ? (
        <PageSpinner />
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={query.refetch} />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          icon={MessageSquareWarning}
          title="Aucune réclamation"
          description="Aucune réclamation ne correspond à ces critères."
        />
      ) : (
        <div className={cn('space-y-4', query.isPlaceholderData && 'opacity-60')}>
          <ul className="space-y-3">
            {(urgentFirst
              ? [...query.data.data].sort(
                  (a, b) => (insights[b.id]?.score ?? 0) - (insights[a.id]?.score ?? 0),
                )
              : query.data.data
            ).map((complaint) => (
              <li
                key={complaint.id}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{complaint.subject}</h2>
                      <ComplaintStatusBadge status={complaint.status} />
                      {insights[complaint.id] && (
                        <>
                          <AiLevelBadge
                            level={insights[complaint.id].priority}
                            labels={COMPLAINT_PRIORITY_LABELS}
                            reasons={insights[complaint.id].reasons}
                          />
                          <Badge tone="info">{insights[complaint.id].categoryLabel}</Badge>
                        </>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      n°{complaint.id} · {formatDateTime(complaint.createdAt)} ·{' '}
                      {complaint.customer?.firstName} {complaint.customer?.lastName} (
                      {complaint.customer?.email})
                      {complaint.orderId && (
                        <>
                          {' · '}
                          {hasPermission(PERMISSIONS.ORDERS_MANAGE) ? (
                            <Link
                              to={`/admin/orders?search=${complaint.orderId}`}
                              className="font-medium text-brand-700 hover:underline"
                            >
                              commande n°{complaint.orderId}
                            </Link>
                          ) : (
                            `commande n°${complaint.orderId}`
                          )}
                        </>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={complaint.status === COMPLAINT_STATUS.OPEN ? 'primary' : 'secondary'}
                    aria-label={`${actionLabel(complaint)} la réclamation n°${complaint.id}`}
                    onClick={() => setSelected(complaint)}
                  >
                    {actionLabel(complaint)}
                  </Button>
                </div>
                <p className="mt-3 line-clamp-3 text-sm whitespace-pre-line text-slate-700">
                  {complaint.description}
                </p>
                {complaint.adminResponse && (
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    <span className="font-semibold">
                      Réponse{complaint.handledBy && ` de ${complaint.handledBy}`} :
                    </span>{' '}
                    {complaint.adminResponse}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <Pagination
            meta={query.data.meta}
            itemLabel="réclamation(s)"
            onPageChange={(page) => setFilters({ page })}
          />
        </div>
      )}

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        size="lg"
        title={selected ? `Réclamation n°${selected.id}` : ''}
        description={selected?.subject}
      >
        {selected && (
          <HandleComplaintForm
            complaint={selected}
            insight={insights[selected.id]}
            onClose={() => setSelected(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

function HandleComplaintForm({ complaint, insight, onClose }) {
  const queryClient = useQueryClient();
  const [draftSource, setDraftSource] = useState(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(complaintHandlingSchema),
    defaultValues: {
      // Une réclamation ouverte passe d'office « en cours de traitement »
      status:
        complaint.status === COMPLAINT_STATUS.OPEN
          ? COMPLAINT_STATUS.IN_PROGRESS
          : complaint.status,
      adminResponse: complaint.adminResponse ?? '',
    },
  });
  const status = useWatch({ control, name: 'status' });
  const mutation = useMutation({
    mutationFn: (values) => complaintsAdminApi.handle(complaint.id, values),
    onSuccess: async (updated) => {
      notifySuccess(
        `Réclamation n°${updated.id} : ${COMPLAINT_STATUS_LABELS[updated.status].toLowerCase()}`,
      );
      await queryClient.invalidateQueries({ queryKey: complaintKeys.all });
      queryClient.invalidateQueries({ queryKey: aiKeys.all });
      onClose();
    },
    onError: (error) => {
      if (!applyServerValidationErrors(error, setError)) notifyError(error);
    },
  });
  const draft = useMutation({
    mutationFn: () => aiApi.complaintReply(complaint.id),
    onSuccess: ({ reply, source }) => {
      setValue('adminResponse', reply, { shouldDirty: true, shouldValidate: true });
      setDraftSource(source);
    },
    onError: notifyError,
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="space-y-4"
    >
      <div className="rounded-xl bg-slate-50 p-4 text-sm">
        <p className="font-medium">
          {complaint.customer?.firstName} {complaint.customer?.lastName} ·{' '}
          {complaint.customer?.email}
        </p>
        <p className="mt-2 whitespace-pre-line text-slate-700">{complaint.description}</p>
      </div>
      {insight && (
        <div className="rounded-xl bg-violet-50/60 p-4 text-sm ring-1 ring-violet-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Analyse de l’IA :</span>
            <Badge tone="info">{insight.categoryLabel}</Badge>
            <AiLevelBadge level={insight.priority} labels={COMPLAINT_PRIORITY_LABELS} />
          </div>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-slate-600">
            {insight.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      <SelectField label="Statut" error={errors.status?.message} {...register('status')}>
        {COMPLAINT_STATUS_LIST.map((value) => (
          <option key={value} value={value}>
            {COMPLAINT_STATUS_LABELS[value]}
          </option>
        ))}
      </SelectField>
      <TextAreaField
        label="Réponse au client"
        rows={5}
        hint={
          CLOSING_COMPLAINT_STATUSES.includes(status)
            ? 'Obligatoire pour clôturer (5 caractères minimum)'
            : 'Facultative tant que la réclamation est en cours'
        }
        error={errors.adminResponse?.message}
        {...register('adminResponse')}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          isLoading={draft.isPending}
          onClick={() => draft.mutate()}
        >
          {!draft.isPending && <Sparkles aria-hidden="true" className="size-4 text-violet-600" />}
          Suggérer une réponse
        </Button>
        {draftSource && <AiBadge source={draftSource} label="Brouillon IA à relire" />}
      </div>
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
