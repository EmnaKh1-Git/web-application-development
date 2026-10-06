import { CANCELLABLE_ORDER_STATUSES } from '@smart-ecommerce/shared';

/* Représentation des commandes dans les réponses de l'API. */

export function toOrderItemResponse(item) {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    imageUrl: item.product?.imageUrl ?? null,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    size: item.size,
    color: item.color,
    lineTotal: item.lineTotal,
  };
}

export function toDeliveryResponse(delivery) {
  if (!delivery) return null;
  return {
    status: delivery.status,
    carrier: delivery.carrier,
    trackingNumber: delivery.trackingNumber,
    estimatedDeliveryDate: delivery.estimatedDeliveryDate,
    shippedAt: delivery.shippedAt,
    deliveredAt: delivery.deliveredAt,
  };
}

export function toOrderResponse(order) {
  const items = order.items ?? [];
  return {
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
    itemsCount: items.reduce((total, item) => total + item.quantity, 0),
    items: items.map(toOrderItemResponse),
    shippingAddress: order.shippingAddress,
    notes: order.notes,
    delivery: toDeliveryResponse(order.delivery),
    customer: order.customer && {
      id: order.customer.id,
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      email: order.customer.email,
      phone: order.customer.phone,
    },
    canCancel: CANCELLABLE_ORDER_STATUSES.includes(order.status),
    confirmedAt: order.confirmedAt,
    cancelledAt: order.cancelledAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
