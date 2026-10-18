import { Button } from './Button';
import { Dialog } from './Dialog';

/**
 * Demande de confirmation avant une action importante (annulation, suppression...).
 * @example
 * <ConfirmDialog open={isOpen} title="Annuler la commande ?" confirmLabel="Oui, annuler"
 *   variant="danger" isLoading={mutation.isPending} onConfirm={...} onClose={...} />
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Retour',
  variant = 'primary',
  isLoading = false,
  onConfirm,
  onClose,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate-600">{children}</div>
    </Dialog>
  );
}
