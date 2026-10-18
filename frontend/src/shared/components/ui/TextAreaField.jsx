import { useId } from 'react';
import { cn } from '@/shared/utils/cn';
import { fieldClassName } from './fieldStyles';

/**
 * Zone de texte multiligne avec libellé et message d'erreur (compatible react-hook-form).
 * @example <TextAreaField label="Description" rows={5} {...register('description')} />
 */
export function TextAreaField({ label, error, hint, className, id, ref, rows = 4, ...props }) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const message = error ?? hint;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={fieldClassName({ error, className: 'mt-1.5' })}
        {...props}
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
