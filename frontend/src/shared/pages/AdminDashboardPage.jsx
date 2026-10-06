import { Link } from 'react-router';
import { useAuth } from '@/shared/auth/useAuth';
import { RoleBadge } from '@/shared/components/ui/RoleBadge';
import { ADMIN_SECTIONS } from '@/shared/layouts/adminSections';

/** Accueil du back-office : uniquement les sections autorisées pour l'utilisateur. */
export function AdminDashboardPage() {
  const { user, hasPermission } = useAuth();
  const sections = ADMIN_SECTIONS.filter((section) => hasPermission(section.permission));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bonjour {user.firstName}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-slate-600">
          Connecté en tant que <RoleBadge role={user.role} />
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map(({ to, label, description, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:ring-brand-300"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-4 font-semibold group-hover:text-brand-700">{label}</h2>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
