import { PERMISSIONS } from '@smart-ecommerce/shared';
import { LogOut, Menu, ShoppingCart, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useCart } from '@/features/cart-orders/hooks/useCart';
import { useAuth } from '@/shared/auth/useAuth';
import { buttonClassName } from '@/shared/components/ui/buttonStyles';
import { RoleBadge } from '@/shared/components/ui/RoleBadge';
import { cn } from '@/shared/utils/cn';
import { Logo } from './Logo';

const navLinkClassName = ({ isActive }) =>
  cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  );

/** Icône du panier avec le nombre d'articles. */
function CartLink() {
  const { data: cart } = useCart();
  const count = cart?.totalItems ?? 0;

  return (
    <Link
      to="/cart"
      className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      <ShoppingCart aria-hidden="true" className="size-5" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-xs font-semibold text-white"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
      <span className="sr-only">
        Panier{count > 0 && ` (${count} article${count > 1 ? 's' : ''})`}
      </span>
    </Link>
  );
}

/** Barre de navigation : les liens affichés dépendent des permissions de l'utilisateur. */
export function Navbar() {
  const { user, isAuthenticated, isBackOfficeUser, hasPermission, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const links = [
    { to: '/products', label: 'Catalogue', visible: true },
    { to: '/orders', label: 'Mes commandes', visible: hasPermission(PERMISSIONS.ORDERS_PLACE) },
    {
      to: '/complaints',
      label: 'Réclamations',
      visible: hasPermission(PERMISSIONS.COMPLAINTS_CREATE),
    },
    { to: '/admin', label: 'Back-office', visible: isBackOfficeUser },
  ].filter((link) => link.visible);

  const closeMenu = () => setIsMenuOpen(false);
  const handleLogout = () => {
    closeMenu();
    // D'abord quitter la page (éventuellement protégée), de façon immédiate (flushSync),
    // ensuite fermer la session : sinon la page protégée redirigerait vers /login.
    navigate('/', { flushSync: true });
    logout();
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClassName}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {hasPermission(PERMISSIONS.CART_MANAGE) && <CartLink />}

          {isAuthenticated ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                to="/account"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <UserRound aria-hidden="true" className="size-4" />
                {user.firstName}
                <RoleBadge role={user.role} />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <LogOut aria-hidden="true" className="size-5" />
                <span className="sr-only">Se déconnecter</span>
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/login" className={buttonClassName({ variant: 'ghost', size: 'sm' })}>
                Connexion
              </Link>
              <Link to="/register" className={buttonClassName({ size: 'sm' })}>
                Créer un compte
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          >
            {isMenuOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
            <span className="sr-only">Menu</span>
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Navigation mobile"
          className="border-t border-slate-200 px-4 py-3 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={navLinkClassName} onClick={closeMenu}>
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-3 border-t border-slate-200 pt-3">
            {isAuthenticated ? (
              <div className="flex items-center justify-between">
                <Link
                  to="/account"
                  onClick={closeMenu}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  {user.firstName} {user.lastName}
                  <RoleBadge role={user.role} />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={buttonClassName({ variant: 'ghost', size: 'sm' })}
                >
                  <LogOut aria-hidden="true" className="size-4" />
                  Déconnexion
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className={buttonClassName({ variant: 'secondary', size: 'sm' })}
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className={buttonClassName({ size: 'sm' })}
                >
                  Créer un compte
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
