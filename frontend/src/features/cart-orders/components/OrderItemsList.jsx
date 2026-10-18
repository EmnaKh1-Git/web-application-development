import { Link } from 'react-router';
import { ProductImage } from '@/shared/components/ProductImage';
import { formatPrice } from '@/shared/utils/format';
import { VariantLabel } from './VariantLabel';

/**
 * Articles d'une commande (nom et prix tels qu'au moment de la commande) et total.
 * `linkToProducts` : lien vers la fiche produit (boutique) ; désactivé dans le back-office.
 */
export function OrderItemsList({ order, linkToProducts = true }) {
  return (
    <div>
      <ul className="divide-y divide-slate-200">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 py-3">
            <ProductImage
              src={item.imageUrl}
              name={item.productName}
              compact
              className="size-14 shrink-0 rounded-lg"
            />
            <div className="min-w-0 flex-1">
              {linkToProducts ? (
                <Link
                  to={`/products/${item.productId}`}
                  className="line-clamp-2 font-medium hover:text-brand-700"
                >
                  {item.productName}
                </Link>
              ) : (
                <p className="line-clamp-2 font-medium">{item.productName}</p>
              )}
              <VariantLabel size={item.size} color={item.color} />
              <p className="text-sm text-slate-500">
                {item.quantity} × {formatPrice(item.unitPrice)}
              </p>
            </div>
            <p className="font-semibold">{formatPrice(item.lineTotal)}</p>
          </li>
        ))}
      </ul>
      <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold">
        <span>Total</span>
        <span>{formatPrice(order.totalAmount)}</span>
      </div>
    </div>
  );
}

/** Adresse de livraison enregistrée avec la commande. */
export function ShippingAddress({ address }) {
  if (!address) return null;
  return (
    <address className="text-sm leading-6 text-slate-700 not-italic">
      <span className="font-semibold text-slate-900">{address.recipient}</span>
      <br />
      {address.street}
      <br />
      {address.postalCode} {address.city}, {address.country}
      {address.phone && (
        <>
          <br />
          Tél. {address.phone}
        </>
      )}
    </address>
  );
}
