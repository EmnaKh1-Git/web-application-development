import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/utils/cn';

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

/**
 * Fenêtre modale : fermeture par Échap, par le bouton ✕ ou en cliquant à côté.
 * Le contenu n'est monté que lorsque `open` est vrai. Ajoutez `data-autofocus` au champ
 * qui doit recevoir le focus à l'ouverture.
 *
 * @example
 * <Dialog open={isOpen} onClose={close} title="Réapprovisionner">…</Dialog>
 */
export function Dialog({ open, onClose, title, description, size = 'md', children, footer }) {
  const titleId = useId();
  const panelRef = useRef(null);
  // Dernière version de onClose, sans relancer l'effet (et donc sans voler le focus) à chaque rendu
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    // Place le focus dans la fenêtre : sur le champ marqué data-autofocus, sinon la fenêtre
    // elle-même (focaliser un champ en bas d'une longue fenêtre la ferait défiler).
    const autoFocusField = panelRef.current?.querySelector('[data-autofocus]');
    (autoFocusField ?? panelRef.current)?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl outline-none sm:rounded-2xl',
          SIZES[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X aria-hidden="true" className="size-5" />
            <span className="sr-only">Fermer</span>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
