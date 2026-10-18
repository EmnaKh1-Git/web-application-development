import { Star } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/shared/utils/cn';

const SIZES = { sm: 'size-3.5', md: 'size-4', lg: 'size-6' };
const RATING_LABELS = ['Très mauvais', 'Mauvais', 'Correct', 'Bien', 'Excellent'];

/**
 * Note sur 5 en étoiles (affichage).
 * @example <StarRating value={4.3} count={12} />
 */
export function StarRating({ value = 0, count, size = 'md', className }) {
  const rounded = Math.round(value);
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="sr-only">Note : {value.toLocaleString('fr-FR')} sur 5</span>
      <span aria-hidden="true" className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              SIZES[size],
              star <= rounded ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200',
            )}
          />
        ))}
      </span>
      {count !== undefined && <span className="text-xs text-slate-500">({count})</span>}
    </span>
  );
}

/**
 * Choix d'une note de 1 à 5 (boutons radio accessibles au clavier).
 * @example <StarRatingInput value={rating} onChange={setRating} error={errors.rating?.message} />
 */
export function StarRatingInput({ value, onChange, error, label = 'Votre note' }) {
  const name = useId();
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">{label}</legend>
      <div className="mt-1.5 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <label
            key={star}
            className="cursor-pointer rounded p-0.5 has-focus-visible:ring-2 has-focus-visible:ring-brand-600"
          >
            <input
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="sr-only"
            />
            <Star
              aria-hidden="true"
              className={cn(
                'size-7 transition-colors',
                star <= (value ?? 0)
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-slate-100 text-slate-300 hover:text-amber-300',
              )}
            />
            <span className="sr-only">
              {star} étoile{star > 1 ? 's' : ''} — {RATING_LABELS[star - 1]}
            </span>
          </label>
        ))}
        {value > 0 && (
          <span className="ml-2 text-sm text-slate-600">{RATING_LABELS[value - 1]}</span>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </fieldset>
  );
}
