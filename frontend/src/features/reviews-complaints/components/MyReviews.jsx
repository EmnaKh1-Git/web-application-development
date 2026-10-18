import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareText, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { productKeys } from '@/features/products/api/productsApi';
import { ProductImage } from '@/shared/components/ProductImage';
import { QueryError } from '@/shared/components/QueryError';
import { Button } from '@/shared/components/ui/Button';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { Dialog } from '@/shared/components/ui/Dialog';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Spinner } from '@/shared/components/ui/Spinner';
import { StarRating } from '@/shared/components/ui/StarRating';
import { formatDate } from '@/shared/utils/format';
import { notifyError, notifySuccess } from '@/shared/utils/notify';
import { reviewKeys, reviewsApi } from '../api/reviewsApi';
import { ReviewForm } from './ReviewForm';

/** Avis publiés par l'utilisateur connecté, modifiables et supprimables. */
export function MyReviews() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const query = useQuery({ queryKey: reviewKeys.mine, queryFn: reviewsApi.listMine });
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: reviewKeys.all }),
      queryClient.invalidateQueries({ queryKey: productKeys.all }),
    ]);
  const deleteMutation = useMutation({
    mutationFn: (review) => reviewsApi.remove(review.id),
    onSuccess: async () => {
      setDeleting(null);
      notifySuccess('Avis supprimé');
      await refresh();
    },
    onError: notifyError,
  });

  if (query.isPending) return <Spinner className="text-brand-600" />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;
  if (query.data.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="Aucun avis publié"
        description="Après la livraison d’une commande, donnez votre avis depuis la page du produit."
      />
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {query.data.map((review) => (
          <li
            key={review.id}
            className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
          >
            <ProductImage
              src={review.product?.imageUrl}
              name={review.product?.name}
              compact
              className="size-16 shrink-0 rounded-lg"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    to={`/products/${review.productId}#avis`}
                    className="font-semibold hover:text-brand-700"
                  >
                    {review.product?.name}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2">
                    <StarRating value={review.rating} size="sm" />
                    <span className="text-xs text-slate-500">{formatDate(review.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(review)}>
                    <Pencil aria-hidden="true" className="size-4" />
                    <span className="sr-only">Modifier l’avis sur {review.product?.name}</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(review)}>
                    <Trash2 aria-hidden="true" className="size-4" />
                    <span className="sr-only">Supprimer l’avis sur {review.product?.name}</span>
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-700">{review.comment}</p>
            </div>
          </li>
        ))}
      </ul>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Modifier mon avis"
        description={editing?.product?.name}
      >
        {editing && (
          <ReviewForm
            submitLabel="Enregistrer"
            defaultValues={{ rating: editing.rating, comment: editing.comment }}
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              await reviewsApi.update(editing.id, values);
              setEditing(null);
              notifySuccess('Avis modifié');
              await refresh();
            }}
          />
        )}
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer cet avis ?"
        confirmLabel="Supprimer"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleting)}
        onClose={() => setDeleting(null)}
      >
        Votre avis sur « {deleting?.product?.name} » sera définitivement supprimé.
      </ConfirmDialog>
    </>
  );
}
