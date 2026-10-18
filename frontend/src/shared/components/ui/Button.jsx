import { buttonClassName } from './buttonStyles';
import { Spinner } from './Spinner';

/**
 * Bouton de l'application.
 * @example <Button type="submit" isLoading={isSubmitting}>Enregistrer</Button>
 * @example <Button variant="danger" onClick={onDelete}>Supprimer</Button>
 */
export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  disabled = false,
  type = 'button',
  className,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={buttonClassName({ variant, size, fullWidth, className })}
      {...props}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
