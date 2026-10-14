import { useId } from 'react';
import { cn } from '@/shared/utils/cn';
import { fieldClassName } from './fieldStyles';

/**
 * Liste déroulante avec libellé et message d'erreur (compatible react-hook-form).
 * @example
 * <SelectField label="Catégorie" error={errors.categoryId?.message} {...register('categoryId')}>
 *   <option value="">Choisir…</option>
 * </SelectField>
 */
export function SelectField({ label, error, hint, className, id, ref, children, ...selectProps }) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const messageId = `${selectId}-message`;
  const message = error ?? hint;

  return (
    <div className={className}>
      <label htmlFor={selectId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={fieldClassName({ error, className: 'mt-1.5' })}
        {...selectProps}
      >
        {children}
      </select>
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
