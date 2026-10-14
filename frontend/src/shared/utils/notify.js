import { toast } from 'sonner';

/**
 * Affiche une erreur de l'API dans une notification, avec ses détails éventuels
 * (ex. INSUFFICIENT_STOCK : la liste des produits manquants).
 *
 * @example
 * useMutation({ mutationFn: ..., onError: notifyError });
 */
export function notifyError(error) {
  const details = (error?.details ?? []).map((detail) => detail.message).filter(Boolean);
  toast.error(error?.message ?? 'Une erreur inattendue est survenue', {
    description: details.length > 0 ? details.join(' · ') : undefined,
  });
}

/** Notification de succès. */
export function notifySuccess(message, description) {
  toast.success(message, { description });
}
