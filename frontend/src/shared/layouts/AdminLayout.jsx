import { ArrowLeft, LayoutDashboard, LogOut } from 'lucide-react';
import { Link, NavLink, Outlet, ScrollRestoration, useNavigate } from 'react-router';
import { useAuth } from '@/shared/auth/useAuth';
import { Logo } from '@/shared/components/layout/Logo';
import { buttonClassName } from '@/shared/components/ui/buttonStyles';
import { RoleBadge } from '@/shared/components/ui/RoleBadge';
import { cn } from '@/shared/utils/cn';
import { ADMIN_SECTIONS } from './adminSections';

const sidebarLinkClassName = ({ isActive }) =>
  cn(
    'flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  );

/** Mise en page du back-office (ADMIN et STOCK_MANAGER). */
export function AdminLayout() {
  const { user, hasPermission, logout } = useAuth();
  const navigate = useNavigate();
  const sections = ADMIN_SECTIONS.filter((section) => hasPermission(section.permission));

  const handleLogout = () => {
    // D'abord quitter le back-office, de façon immédiate (flushSync),
    // ensuite fermer la session : sinon la page protégée redirigerait vers /login.
    navigate('/', { flushSync: true });
    logout();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <ScrollRestoration />
      <aside className="border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:w-64 lg:border-r lg:border-b-0">
        <div className="flex h-16 items-center px-4">
          <Logo suffix="Admin" />
        </div>
        <nav
          aria-label="Back-office"
          className="flex gap-1 overflow-x-auto px-4 pb-3 lg:flex-col lg:px-3 lg:pb-0"
        >
          <NavLink to="/admin" end className={sidebarLinkClassName}>
            <LayoutDashboard aria-hidden="true" className="size-4" />
            Tableau de bord
          </NavLink>
          {sections.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={sidebarLinkClassName}>
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Boutique
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-slate-700 sm:inline">
              {user.firstName} {user.lastName}
            </span>
            <RoleBadge role={user.role} />
            <button
              type="button"
              onClick={handleLogout}
              className={buttonClassName({ variant: 'ghost', size: 'sm' })}
            >
              <LogOut aria-hidden="true" className="size-4" />
              <span className="sr-only sm:not-sr-only">Déconnexion</span>
            </button>
          </div>
        </header>
        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
