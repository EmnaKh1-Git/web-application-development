import { useId } from 'react';
import { cn } from '@/shared/utils/cn';

/**
 * Champ de formulaire avec libellé, aide et message d'erreur (accessible).
 * Compatible react-hook-form :
 * @example <TextField label="Email" type="email" error={errors.email?.message} {...register('email')} />
 */
export function TextField({ label, error, hint, className, id, ref, ...inputProps }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          'mt-1.5 block w-full rounded-lg bg-white px-3 py-2 text-slate-900 shadow-xs ring-1 ring-inset',
          'placeholder:text-slate-400 focus:ring-2 focus:outline-none focus:ring-inset sm:text-sm',
          error ? 'ring-red-400 focus:ring-red-500' : 'ring-slate-300 focus:ring-brand-600',
        )}
        {...inputProps}
      />
      {message && (
        <p
          id={messageId}
          className={cn('mt-1.5 text-sm', error ? 'text-red-600' : 'text-slate-500')}
        >
          {message}
        </p>
      )}
    </div>
  );
}
