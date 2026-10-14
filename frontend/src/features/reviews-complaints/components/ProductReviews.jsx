import { PERMISSIONS } from '@smart-ecommerce/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareText, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { aiKeys } from '@/features/ai/api/aiApi';
import { ReviewsSummaryCard } from '@/features/ai/components/ReviewsSummaryCard';
import { productKeys } from '@/features/products/api/productsApi';
import { useAuth } from '@/shared/auth/useAuth';
import { QueryError } from '@/shared/components/QueryError';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { Pagination } from '@/shared/components/ui/Pagination';
import { Spinner } from '@/shared/components/ui/Spinner';
import { StarRating } from '@/shared/components/ui/StarRating';
import { formatDate } from '@/shared/utils/format';
import { notifyError, notifySuccess } from '@/shared/utils/notify';
import { reviewKeys, reviewsApi } from '../api/reviewsApi';
import { ReviewForm } from './ReviewForm';

const PAGE_SIZE = 5;

/**
 * Avis d'un produit (affichés sur la page détail) : résumé des notes, avis du client
 * connecté (création, modification, suppression) et liste paginée.
 * Seuls les clients qui ont REÇU le produit peuvent donner leur avis (règle du Back-End).
 */
export function ProductReviews({ productId }) {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const params = { page, limit: PAGE_SIZE };
  const query = useQuery({
    queryKey: reviewKeys.product(productId, params),
    queryFn: () => reviewsApi.listForProduct(productId, params),
    placeholderData: keepPreviousData,
  });

  // La note moyenne du produit change : on rafraîchit aussi le catalogue.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: reviewKeys.all }),
      queryClient.invalidateQueries({ queryKey: productKeys.all }),
      queryClient.invalidateQueries({ queryKey: aiKeys.all }),
    ]);

  return (
    <section id="avis" aria-labelledby="reviews-title" className="scroll-mt-24 space-y-6">
      <h2 id="reviews-title" className="text-xl font-bold tracking-tight">
        Avis des clients
      </h2>
      {query.isPending ? (
        <Spinner className="text-brand-600" />
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={query.refetch} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <RatingSummary summary={query.data.data.summary} />
          <div className="min-w-0 space-y-6">
            <ReviewsSummaryCard productId={productId} />
            <ViewerReview
              productId={productId}
              viewer={query.data.data.viewer}
              onChange={refresh}
            />
            <ReviewList reviews={query.data.data.reviews} onChange={refresh} />
            <Pagination meta={query.data.meta} itemLabel="avis" onPageChange={setPage} />
          </div>
        </div>
      )}
    </section>
  );
}

function RatingSummary({ summary }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:self-start">
      <p className="text-4xl font-bold">
        {summary.count > 0 ? summary.average.toLocaleString('fr-FR') : '–'}
        <span className="text-base font-normal text-slate-500"> / 5</span>
      </p>
      <StarRating value={summary.average} size="lg" className="mt-1" />
      <p className="mt-1 text-sm text-slate-600">
        {summary.count === 0 ? 'Aucun avis pour le moment' : `${summary.count} avis`}
      </p>
      <dl className="mt-4 space-y-1.5">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = summary.distribution[rating] ?? 0;
          const percent = summary.count > 0 ? Math.round((count / summary.count) * 100) : 0;
          return (
            <div key={rating} className="flex items-center gap-2 text-sm">
              <dt className="w-14 shrink-0 text-slate-600">
                {rating} étoile{rating > 1 ? 's' : ''}
              </dt>
              <dd className="flex flex-1 items-center gap-2">
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-amber-400"
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="w-6 text-right text-xs text-slate-500">{count}</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/** Ce que l'utilisateur connecté peut faire : écrire, modifier ou supprimer son avis. */
function ViewerReview({ productId, viewer, onChange }) {
  const { isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: reviewsApi.remove,
    onSuccess: async () => {
      setIsDeleting(false);
      notifySuccess('Votre avis a été supprimé');
      await onChange();
    },
    onError: notifyError,
  });

  if (!isAuthenticated) {
    return (
      <Alert variant="info">
        <Link
          to="/login"
          state={{ from: location }}
          className="font-semibold underline underline-offset-2"
        >
          Connectez-vous
        </Link>{' '}
        pour donner votre avis après avoir reçu ce produit.
      </Alert>
    );
  }
  if (!hasPermission(PERMISSIONS.REVIEWS_WRITE)) return null;

  const { myReview, canReview } = viewer;
  if (myReview) {
    return (
      <div className="rounded-2xl bg-brand-50/60 p-5 ring-1 ring-brand-100">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Votre avis</h3>
          {!isEditing && (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil aria-hidden="true" className="size-4" />
                Modifier
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsDeleting(true)}>
                <Trash2 aria-hidden="true" className="size-4" />
                Supprimer
              </Button>
            </div>
          )}
        </div>
        {isEditing ? (
          <div className="mt-3">
            <ReviewForm
              submitLabel="Enregistrer"
              defaultValues={{ rating: myReview.rating, comment: myReview.comment }}
              onCancel={() => setIsEditing(false)}
              onSubmit={async (values) => {
                await reviewsApi.update(myReview.id, values);
                setIsEditing(false);
                notifySuccess('Votre avis a été modifié');
                await onChange();
              }}
            />
          </div>
        ) : (
          <div className="mt-2">
            <StarRating value={myReview.rating} />
            <p className="mt-2 text-slate-700">{myReview.comment}</p>
          </div>
        )}
        <ConfirmDialog
          open={isDeleting}
          title="Supprimer votre avis ?"
          confirmLabel="Supprimer"
          variant="danger"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(myReview.id)}
          onClose={() => setIsDeleting(false)}
        >
          Votre note ne sera plus prise en compte dans la moyenne du produit.
        </ConfirmDialog>
      </div>
    );
  }

  if (canReview) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="font-semibold">Donnez votre avis</h3>
        <p className="mt-0.5 text-sm text-slate-600">
          Vous avez reçu ce produit : partagez votre expérience avec les autres clients.
        </p>
        <div className="mt-4">
          <ReviewForm
            onSubmit={async (values) => {
              await reviewsApi.create(productId, values);
              notifySuccess('Merci pour votre avis !');
              await onChange();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <Alert variant="info">
      Vous pourrez donner votre avis sur ce produit une fois votre commande livrée.
    </Alert>
  );
}

function ReviewList({ reviews, onChange }) {
  const { hasPermission } = useAuth();
  const canModerate = hasPermission(PERMISSIONS.REVIEWS_MODERATE);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const deleteMutation = useMutation({
    mutationFn: reviewsApi.remove,
    onSuccess: async () => {
      setReviewToDelete(null);
      notifySuccess('Avis supprimé (modération)');
      await onChange();
    },
    onError: notifyError,
  });

  if (reviews.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <MessageSquareText aria-hidden="true" className="size-4" />
        Soyez le premier à donner votre avis sur ce produit.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-slate-200 rounded-2xl bg-white px-5 shadow-sm ring-1 ring-slate-200">
        {reviews.map((review) => (
          <li key={review.id} className="py-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex size-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600"
                >
                  {review.author?.name?.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold">{review.author?.name}</p>
                  <p className="text-xs text-slate-500">{formatDate(review.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StarRating value={review.rating} size="sm" />
                {canModerate && (
                  <Button variant="ghost" size="sm" onClick={() => setReviewToDelete(review)}>
                    <Trash2 aria-hidden="true" className="size-4" />
                    <span className="sr-only">Supprimer l’avis de {review.author?.name}</span>
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-3 text-slate-700">{review.comment}</p>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={reviewToDelete !== null}
        title="Supprimer cet avis ?"
        confirmLabel="Supprimer"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(reviewToDelete.id)}
        onClose={() => setReviewToDelete(null)}
      >
        Avis de {reviewToDelete?.author?.name} : il sera définitivement retiré du produit.
      </ConfirmDialog>
    </>
  );
}
