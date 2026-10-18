import { zodResolver } from '@hookform/resolvers/zod';
import { reviewSchema } from '@smart-ecommerce/shared';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/shared/components/ui/Button';
import { StarRatingInput } from '@/shared/components/ui/StarRating';
import { TextAreaField } from '@/shared/components/ui/TextAreaField';
import { applyServerValidationErrors } from '@/shared/utils/forms';
import { notifyError } from '@/shared/utils/notify';

/**
 * Formulaire d'avis (création ou modification) : note de 1 à 5 + commentaire.
 * `onSubmit` reçoit { rating, comment } validés par le schéma partagé avec le Back-End.
 */
export function ReviewForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Publier mon avis',
}) {
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, comment: '', ...defaultValues },
  });

  const submit = async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      if (!applyServerValidationErrors(error, setError)) notifyError(error);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="space-y-4">
      <Controller
        control={control}
        name="rating"
        render={({ field }) => (
          <StarRatingInput
            value={field.value}
            onChange={field.onChange}
            error={errors.rating?.message}
          />
        )}
      />
      <TextAreaField
        label="Votre commentaire"
        rows={4}
        placeholder="Qu’avez-vous pensé de ce produit ? (10 caractères minimum)"
        error={errors.comment?.message}
        {...register('comment')}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </form>
  );
}
