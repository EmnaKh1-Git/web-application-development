import { Outlet, ScrollRestoration } from 'react-router';
import { ShoppingAssistant } from '@/features/ai/components/ShoppingAssistant';
import { Navbar } from '@/shared/components/layout/Navbar';

/** Mise en page de la boutique (pages publiques et espace client). */
export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollRestoration />
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-500 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} SmartE-Commerce · Projet « IA for Software Engineering »
        </div>
      </footer>
      <ShoppingAssistant />
    </div>
  );
}
