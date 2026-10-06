import { EventEmitter } from 'node:events';
import { logger } from '../utils/logger.js';

/**
 * Bus d'événements interne : permet à un module de réagir à ce qui se passe
 * dans un autre module sans dépendre de lui directement.
 *
 * @example
 * // Module commandes (émetteur)
 * publish(EVENTS.ORDER_CREATED, { orderId: order.id, userId: order.userId });
 *
 * // Module produits (abonné) : mise à jour de la popularité
 * subscribe(EVENTS.ORDER_CREATED, async ({ orderId }) => { ... });
 */
const emitter = new EventEmitter();
emitter.setMaxListeners(50);

/** Publie un événement. L'émetteur n'attend pas les abonnés. */
export function publish(eventName, payload) {
  emitter.emit(eventName, payload);
}

/**
 * Abonne une fonction (synchrone ou async) à un événement.
 * Une erreur dans un abonné est journalisée mais ne casse jamais l'action d'origine.
 * Retourne une fonction pour se désabonner.
 */
export function subscribe(eventName, handler) {
  const listener = async (payload) => {
    try {
      await handler(payload);
    } catch (error) {
      logger.error(`Erreur dans un abonné à l'événement « ${eventName} »`, error);
    }
  };
  emitter.on(eventName, listener);
  return () => emitter.off(eventName, listener);
}
