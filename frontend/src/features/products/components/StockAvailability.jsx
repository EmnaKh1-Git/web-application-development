import { STOCK_STATUS } from '@smart-ecommerce/shared';
import { cn } from '@/shared/utils/cn';

/** Disponibilité affichée au client : « En stock », « Plus que 3 en stock » ou « Rupture de stock ». */
export function StockAvailability({ stock, className }) {
  const { status, availableQuantity } = stock;
  const [label, color] =
    status === STOCK_STATUS.OUT
      ? ['Rupture de stock', 'text-red-600 bg-red-500']
      : status === STOCK_STATUS.LOW
        ? [`Plus que ${availableQuantity} en stock`, 'text-amber-700 bg-amber-500']
        : ['En stock', 'text-emerald-700 bg-emerald-500'];
  const [textColor, dotColor] = color.split(' ');

  return (
    <p className={cn('flex items-center gap-1.5 text-sm font-medium', textColor, className)}>
      <span aria-hidden="true" className={cn('size-2 rounded-full', dotColor)} />
      {label}
    </p>
  );
}
