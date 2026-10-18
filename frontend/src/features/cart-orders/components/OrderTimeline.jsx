import { ORDER_STATUS } from '@smart-ecommerce/shared';
import { Check, CircleX, ClipboardCheck, PackageCheck, ShoppingBag, Truck } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { formatDate, formatDateTime } from '@/shared/utils/format';

const STEP_ORDER = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
];

/** Suivi d'une commande : commandée → confirmée → expédiée → livrée. */
export function OrderTimeline({ order }) {
  if (order.status === ORDER_STATUS.CANCELLED) {
    return (
      <p className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
        <CircleX aria-hidden="true" className="size-5 shrink-0" />
        Commande annulée le {formatDateTime(order.cancelledAt)}.
      </p>
    );
  }

  const delivery = order.delivery ?? {};
  const steps = [
    { icon: ShoppingBag, label: 'Commande passée', date: formatDateTime(order.createdAt) },
    { icon: ClipboardCheck, label: 'Confirmée', date: formatDateTime(order.confirmedAt) },
    {
      icon: Truck,
      label: 'Expédiée',
      date: formatDateTime(delivery.shippedAt),
      hint:
        delivery.estimatedDeliveryDate &&
        order.status === ORDER_STATUS.SHIPPED &&
        `Livraison prévue le ${formatDate(delivery.estimatedDeliveryDate)}`,
    },
    { icon: PackageCheck, label: 'Livrée', date: formatDateTime(delivery.deliveredAt) },
  ];
  const currentIndex = STEP_ORDER.indexOf(order.status);

  return (
    <ol className="grid gap-4 sm:grid-cols-4">
      {steps.map(({ icon: Icon, label, date, hint }, index) => {
        const isDone = index <= currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={label} className="flex gap-3 sm:flex-col">
            <div className="flex items-center sm:w-full">
              <span
                className={cn(
                  'inline-flex size-10 shrink-0 items-center justify-center rounded-full',
                  isDone ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400',
                  isCurrent && 'ring-4 ring-brand-100',
                )}
              >
                {isDone && !isCurrent ? (
                  <Check aria-hidden="true" className="size-5" />
                ) : (
                  <Icon aria-hidden="true" className="size-5" />
                )}
              </span>
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'ml-2 hidden h-0.5 flex-1 rounded sm:block',
                    index < currentIndex ? 'bg-brand-600' : 'bg-slate-200',
                  )}
                />
              )}
            </div>
            <div>
              <p className={cn('text-sm font-semibold', !isDone && 'text-slate-400')}>
                {label}
                {isCurrent && <span className="sr-only"> (étape actuelle)</span>}
              </p>
              {date && <p className="text-xs text-slate-500">{date}</p>}
              {hint && <p className="text-xs font-medium text-brand-700">{hint}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
