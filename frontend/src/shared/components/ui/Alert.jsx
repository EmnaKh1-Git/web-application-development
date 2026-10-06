import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

const VARIANTS = {
  error: { icon: CircleAlert, classes: 'bg-red-50 text-red-800 ring-red-200' },
  success: { icon: CircleCheck, classes: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  info: { icon: Info, classes: 'bg-brand-50 text-brand-800 ring-brand-200' },
};

/** Message d'information, de succès ou d'erreur. */
export function Alert({ variant = 'info', title, children, className }) {
  const { icon: Icon, classes } = VARIANTS[variant];
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg p-4 text-sm ring-1 ring-inset', classes, className)}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
