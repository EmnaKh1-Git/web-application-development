import { Link } from 'react-router';
import { buttonClassName } from '@/shared/components/ui/buttonStyles';

/** Mise en page commune aux pages d'erreur (404, 403, erreur inattendue). */
export function StatusPage({ code, icon: Icon, title, message }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Icon aria-hidden="true" className="size-7" />
      </span>
      {code && <p className="mt-6 text-sm font-semibold text-brand-600">{code}</p>}
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 text-slate-600">{message}</p>
      <Link to="/" className={buttonClassName({ className: 'mt-8' })}>
        Retour à l’accueil
      </Link>
    </div>
  );
}
