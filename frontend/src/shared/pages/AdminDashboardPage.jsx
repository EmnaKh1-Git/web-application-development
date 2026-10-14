import { COMPLAINT_STATUS, ORDER_STATUS, PERMISSIONS } from '@smart-ecommerce/shared';
import { useQuery } from '@tanstack/react-query';
import {
  Banknote,
  Boxes,
  ChevronRight,
  Hourglass,
  MessageSquareWarning,
  PackageX,
  TriangleAlert,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router';
import { BriefingCard } from '@/features/ai/components/BriefingCard';
import { orderKeys, ordersAdminApi } from '@/features/cart-orders/api/ordersApi';
import { OrderStatusBadge } from '@/features/cart-orders/components/OrderStatusBadge';
import { complaintKeys, complaintsAdminApi } from '@/features/reviews-complaints/api/complaintsApi';
import { stockApi, stockKeys } from '@/features/stock/api/stockApi';
import { StockStatusBadge } from '@/features/stock/components/StockStatusBadge';
import { userKeys, usersAdminApi } from '@/features/users/api/usersApi';
import { useAuth } from '@/shared/auth/useAuth';
import { ProductImage } from '@/shared/components/ProductImage';
import { RoleBadge } from '@/shared/components/ui/RoleBadge';
import { StatCard } from '@/shared/components/ui/StatCard';
import { ADMIN_SECTIONS } from '@/shared/layouts/adminSections';
import { formatDate, formatNumber, formatPrice } from '@/shared/utils/format';

/** Accueil du back-office : chiffres clés et sections autorisées pour l'utilisateur. */
export function AdminDashboardPage() {
  const { user, hasPermission } = useAuth();
  const canManageOrders = hasPermission(PERMISSIONS.ORDERS_MANAGE);
  const canReadStock = hasPermission(PERMISSIONS.STOCK_READ);
  const canManageComplaints = hasPermission(PERMISSIONS.COMPLAINTS_MANAGE);
  const canManageUsers = hasPermission(PERMISSIONS.USERS_MANAGE);
  const sections = ADMIN_SECTIONS.filter((section) => hasPermission(section.permission));

  const orderStats = useQuery({
    queryKey: orderKeys.stats,
    queryFn: ordersAdminApi.stats,
    enabled: canManageOrders,
  });
  const stockSummary = useQuery({
    queryKey: stockKeys.summary,
    queryFn: stockApi.summary,
    enabled: canReadStock,
  });
  const complaintStats = useQuery({
    queryKey: complaintKeys.stats,
    queryFn: complaintsAdminApi.stats,
    enabled: canManageComplaints,
  });
  const usersParams = { page: 1, limit: 1 };
  const users = useQuery({
    queryKey: userKeys.admin(usersParams),
    queryFn: () => usersAdminApi.list(usersParams),
    enabled: canManageUsers,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bonjour {user.firstName}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-slate-600">
          Connecté en tant que <RoleBadge role={user.role} />
        </p>
      </div>

      <BriefingCard />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {orderStats.data && (
          <>
            <StatCard
              label="Chiffre d’affaires"
              value={formatPrice(orderStats.data.revenue)}
              hint={`${formatNumber(orderStats.data.totalOrders)} commandes au total`}
              icon={Banknote}
              tone="success"
            />
            <StatCard
              label="Commandes à confirmer"
              value={formatNumber(orderStats.data.byStatus[ORDER_STATUS.PENDING])}
              icon={Hourglass}
              tone="warning"
              to={`/admin/orders?status=${ORDER_STATUS.PENDING}`}
            />
          </>
        )}
        {stockSummary.data && (
          <>
            <StatCard
              label="Stock faible"
              value={formatNumber(stockSummary.data.lowStock)}
              hint={`${formatNumber(stockSummary.data.totalUnits)} unités en stock`}
              icon={TriangleAlert}
              tone="warning"
              to="/admin/stock?status=low"
            />
            <StatCard
              label="Ruptures de stock"
              value={formatNumber(stockSummary.data.outOfStock)}
              icon={PackageX}
              tone="danger"
              to="/admin/stock?status=out"
            />
          </>
        )}
        {complaintStats.data && (
          <StatCard
            label="Réclamations ouvertes"
            value={formatNumber(complaintStats.data.byStatus[COMPLAINT_STATUS.OPEN])}
            hint={`${formatNumber(complaintStats.data.byStatus[COMPLAINT_STATUS.IN_PROGRESS])} en cours de traitement`}
            icon={MessageSquareWarning}
            tone="brand"
            to={`/admin/complaints?status=${COMPLAINT_STATUS.OPEN}`}
          />
        )}
        {users.data && (
          <StatCard
            label="Utilisateurs"
            value={formatNumber(users.data.meta.total)}
            icon={UsersRound}
            tone="neutral"
            to="/admin/users"
          />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {canManageOrders && <PendingOrders />}
        {canReadStock && <StockAlerts />}
      </div>

      <section aria-labelledby="sections-title">
        <h2 id="sections-title" className="text-lg font-semibold">
          Accès rapide
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map(({ to, label, description, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:ring-brand-300"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold group-hover:text-brand-700">{label}</h3>
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Panel({ title, to, linkLabel, children }) {
  return (
    <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
        >
          {linkLabel}
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function PendingOrders() {
  const params = { page: 1, limit: 5, status: ORDER_STATUS.PENDING };
  const query = useQuery({
    queryKey: orderKeys.admin(params),
    queryFn: () => ordersAdminApi.list(params),
  });
  const orders = query.data?.data ?? [];

  return (
    <Panel
      title="Commandes à confirmer"
      to={`/admin/orders?status=${ORDER_STATUS.PENDING}`}
      linkLabel="Toutes"
    >
      {query.isSuccess && orders.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500">Aucune commande en attente.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  n°{order.id} · {order.customer?.firstName} {order.customer?.lastName}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDate(order.createdAt)} · {order.itemsCount} article(s)
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-semibold">{formatPrice(order.totalAmount)}</span>
                <OrderStatusBadge status={order.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function StockAlerts() {
  const params = { page: 1, limit: 5, status: 'alert', sort: 'quantity_asc' };
  const query = useQuery({
    queryKey: stockKeys.list(params),
    queryFn: () => stockApi.list(params),
  });
  const alerts = query.data?.data ?? [];

  return (
    <Panel title="Alertes de stock" to="/admin/stock?status=alert" linkLabel="Toutes">
      {query.isSuccess && alerts.length === 0 ? (
        <p className="flex items-center gap-2 px-5 py-6 text-sm text-slate-500">
          <Boxes aria-hidden="true" className="size-4" />
          Aucun produit sous son seuil d’alerte.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {alerts.map((stock) => (
            <li key={stock.productId} className="flex items-center gap-3 px-5 py-3 text-sm">
              <ProductImage
                src={stock.product?.imageUrl}
                name={stock.product?.name}
                compact
                className="size-9 shrink-0 rounded-md"
              />
              <p className="min-w-0 flex-1 truncate font-medium">{stock.product?.name}</p>
              <span className="tabular-nums">
                {stock.quantity} / seuil {stock.lowStockThreshold}
              </span>
              <StockStatusBadge status={stock.status} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
