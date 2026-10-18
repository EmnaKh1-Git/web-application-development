import {
  PERMISSIONS,
  STOCK_MOVEMENT_TYPE,
  STOCK_MOVEMENT_TYPE_LABELS,
} from '@smart-ecommerce/shared';
import { Link } from 'react-router';
import { useAuth } from '@/shared/auth/useAuth';
import { Badge } from '@/shared/components/ui/Badge';
import { cn } from '@/shared/utils/cn';
import { formatDateTime, formatNumber } from '@/shared/utils/format';

const TYPE_TONES = {
  [STOCK_MOVEMENT_TYPE.IN]: 'success',
  [STOCK_MOVEMENT_TYPE.OUT]: 'danger',
  [STOCK_MOVEMENT_TYPE.ADJUST]: 'info',
  [STOCK_MOVEMENT_TYPE.RETURN]: 'brand',
};

/**
 * Historique des mouvements de stock (le plus récent en premier).
 * `showProduct` : affiche la colonne Produit (masquée dans l'historique d'un seul produit).
 */
export function MovementsTable({ movements, showProduct = true }) {
  const { hasPermission } = useAuth();
  const canOpenOrders = hasPermission(PERMISSIONS.ORDERS_MANAGE);

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Date
            </th>
            {showProduct && (
              <th scope="col" className="px-4 py-3 font-medium">
                Produit
              </th>
            )}
            <th scope="col" className="px-4 py-3 font-medium">
              Type
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Variation
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Stock après
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Motif
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Par
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {movements.map((movement) => (
            <tr key={movement.id}>
              <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                {formatDateTime(movement.createdAt)}
              </td>
              {showProduct && <td className="px-4 py-3 font-medium">{movement.productName}</td>}
              <td className="px-4 py-3">
                <Badge tone={TYPE_TONES[movement.type]}>
                  {STOCK_MOVEMENT_TYPE_LABELS[movement.type] ?? movement.type}
                </Badge>
              </td>
              <td
                className={cn(
                  'px-4 py-3 text-right font-semibold tabular-nums',
                  movement.quantityChange > 0 ? 'text-emerald-700' : 'text-red-600',
                )}
              >
                {movement.quantityChange > 0 ? '+' : ''}
                {formatNumber(movement.quantityChange)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatNumber(movement.quantityAfter)}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {movement.reason}
                {movement.orderId && !movement.reason?.includes(String(movement.orderId)) && (
                  <> · commande n°{movement.orderId}</>
                )}
                {movement.orderId && canOpenOrders && (
                  <Link
                    to={`/admin/orders?search=${movement.orderId}`}
                    className="ml-1 font-medium text-brand-700 hover:underline"
                  >
                    Voir
                  </Link>
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">{movement.user ?? 'Système'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
