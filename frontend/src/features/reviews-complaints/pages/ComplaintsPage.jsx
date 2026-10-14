import { zodResolver } from '@hookform/resolvers/zod';
import { complaintSchema } from '@smart-ecommerce/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareReply, MessageSquareWarning } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { orderKeys, ordersApi } from '@/features/cart-orders/api/ordersApi';
import { QueryError } from '@/shared/components/QueryError';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Pagination } from '@/shared/components/ui/Pagination';
import { SelectField } from '@/shared/components/ui/SelectField';
import { PageSpinner } from '@/shared/components/ui/Spinner';
import { TextAreaField } from '@/shared/components/ui/TextAreaField';
import { TextField } from '@/shared/components/ui/TextField';
import { formatDate, formatDateTime, formatPrice } from '@/shared/utils/format';
import { applyServerValidationErrors } from '@/shared/utils/forms';
import { notifyError, notifySuccess } from '@/shared/utils/notify';
import { complaintKeys, complaintsApi } from '../api/complaintsApi';
import { ComplaintStatusBadge } from '../components/ComplaintStatusBadge';

/** Réclamations du client : dépôt (éventuellement liée à une commande) et suivi des réponses. */
export function ComplaintsPage() {
  const [page, setPage] = useState(1);
  const params = { page, limit: 10 };
  const query = useQuery({
    queryKey: complaintKeys.mine(params),
    queryFn: () => complaintsApi.listMine(params),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes réclamations"
        description="Un problème avec une commande ? Notre équipe vous répond rapidement."
      />
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <ComplaintForm />
        <section aria-labelledby="history-title" className="min-w-0 space-y-4">
          <h2 id="history-title" className="text-lg font-semibold">
            Historique
          </h2>
          {query.isPending ? (
            <PageSpinner />
          ) : query.isError ? (
            <QueryError error={query.error} onRetry={query.refetch} />
          ) : query.data.data.length === 0 ? (
            <EmptyState
              icon={MessageSquareWarning}
              title="Aucune réclamation"
              description="Vous n’avez déposé aucune réclamation."
            />
          ) : (
            <>
              <ul className="space-y-3">
                {query.data.data.map((complaint) => (
                  <li
                    key={complaint.id}
                    className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{complaint.subject}</h3>
                        <p className="text-xs text-slate-500">
                          Réclamation n°{complaint.id} · {formatDate(complaint.createdAt)}
                          {complaint.orderId && (
                            <>
                              {' · '}
                              <Link
                                to={`/orders/${complaint.orderId}`}
                                className="font-medium text-brand-700 hover:underline"
                              >
                                commande n°{complaint.orderId}
                              </Link>
                            </>
                          )}
                        </p>
                      </div>
                      <ComplaintStatusBadge status={complaint.status} />
                    </div>
                    <p className="mt-3 text-sm whitespace-pre-line text-slate-700">
                      {complaint.description}
                    </p>
                    {complaint.adminResponse && (
                      <div className="mt-4 rounded-xl bg-brand-50 p-4 text-sm ring-1 ring-brand-100">
                        <p className="flex items-center gap-2 font-semibold text-brand-800">
                          <MessageSquareReply aria-hidden="true" className="size-4" />
                          Réponse de l’équipe
                          {complaint.handledAt && (
                            <span className="font-normal text-brand-700">
                              · {formatDateTime(complaint.handledAt)}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 whitespace-pre-line text-slate-700">
                          {complaint.adminResponse}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <Pagination
                meta={query.data.meta}
                itemLabel="réclamation(s)"
                onPageChange={setPage}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function ComplaintForm() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const ordersParams = { page: 1, limit: 50 };
  const ordersQuery = useQuery({
    queryKey: orderKeys.mine(ordersParams),
    queryFn: () => ordersApi.listMine(ordersParams),
  });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(complaintSchema),
    // ?orderId=12 : arrivée depuis le détail d'une commande (« Signaler un problème »)
    defaultValues: { subject: '', description: '', orderId: searchParams.get('orderId') ?? '' },
  });
  const mutation = useMutation({
    mutationFn: complaintsApi.create,
    onSuccess: async (complaint) => {
      notifySuccess(
        `Réclamation n°${complaint.id} envoyée`,
        'Vous serez informé ici de la réponse de notre équipe.',
      );
      reset({ subject: '', description: '', orderId: '' });
      await queryClient.invalidateQueries({ queryKey: complaintKeys.all });
    },
    onError: (error) => {
      if (!applyServerValidationErrors(error, setError)) notifyError(error);
    },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-24 lg:self-start"
    >
      <h2 className="text-lg font-semibold">Nouvelle réclamation</h2>
      <SelectField
        // Remonté quand les commandes arrivent : la valeur pré-remplie est alors sélectionnée
        key={ordersQuery.isSuccess ? 'orders-loaded' : 'orders-loading'}
        label="Commande concernée (facultatif)"
        error={errors.orderId?.message}
        {...register('orderId')}
      >
        <option value="">Aucune commande en particulier</option>
        {(ordersQuery.data?.data ?? []).map((order) => (
          <option key={order.id} value={order.id}>
            N°{order.id} du {formatDate(order.createdAt)} — {formatPrice(order.totalAmount)}
          </option>
        ))}
      </SelectField>
      <TextField label="Objet" error={errors.subject?.message} {...register('subject')} />
      <TextAreaField
        label="Description"
        rows={5}
        placeholder="Décrivez le problème rencontré (20 caractères minimum)"
        error={errors.description?.message}
        {...register('description')}
      />
      <Button type="submit" fullWidth isLoading={mutation.isPending}>
        Envoyer la réclamation
      </Button>
    </form>
  );
}
