import { ROLES, ROLE_LABELS } from '@smart-ecommerce/shared';
import { cn } from '@/shared/utils/cn';

const ROLE_COLORS = {
  [ROLES.CLIENT]: 'bg-slate-100 text-slate-700 ring-slate-200',
  [ROLES.ADMIN]: 'bg-brand-50 text-brand-700 ring-brand-200',
  [ROLES.STOCK_MANAGER]: 'bg-amber-50 text-amber-800 ring-amber-200',
};

/** Pastille affichant le rôle de l'utilisateur. */
export function RoleBadge({ role, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        ROLE_COLORS[role] ?? ROLE_COLORS[ROLES.CLIENT],
        className,
      )}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}
