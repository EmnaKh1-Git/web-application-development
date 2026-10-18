import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router';

export function Logo({ suffix }) {
  return (
    <Link
      to="/"
      aria-label="SmartE-Commerce, retour à l'accueil"
      className="flex items-center gap-2 font-bold whitespace-nowrap text-slate-900"
    >
      <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        <ShoppingBag aria-hidden="true" className="size-4.5" />
      </span>
      <span>
        SmartE<span className="text-brand-600">-Commerce</span>
      </span>
      {suffix && <span className="text-sm font-medium text-slate-500">{suffix}</span>}
    </Link>
  );
}
