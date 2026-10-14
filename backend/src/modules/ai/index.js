/**
 * Module Intelligence Artificielle
 *
 * Toutes les fonctions d'IA marchent SANS service externe grâce à des algorithmes locaux
 * (prévision de la demande, recommandations, classification, scores, segmentation).
 * Si une clé Anthropic est configurée (backend/.env), Claude les enrichit : lecture de photos,
 * assistant conversationnel, rédaction de textes. En cas d'indisponibilité, repli automatique.
 *
 * Règles : l'IA lit les données via l'API publique des autres modules, en lecture seule ;
 * elle propose, l'humain décide (aucune donnée n'est modifiée par l'IA).
 * Voir docs/ARCHITECTURE.md, section « Intégration de l'IA ».
 */
import { EVENTS, subscribe } from '../../core/events/index.js';
import { invalidateCache } from './ai.cache.js';
import aiRoutes from './ai.routes.js';

export function registerRoutes(apiRouter) {
  apiRouter.use('/ai', aiRoutes);
}

// Les modèles sont recalculés dès que les données dont ils dépendent changent.
for (const event of [
  EVENTS.ORDER_CREATED,
  EVENTS.ORDER_CONFIRMED,
  EVENTS.ORDER_SHIPPED,
  EVENTS.ORDER_DELIVERED,
  EVENTS.ORDER_CANCELLED,
]) {
  subscribe(event, () => invalidateCache('orders'));
}
subscribe(EVENTS.REVIEW_CHANGED, () =>
  invalidateCache('reviews', 'catalog', 'orders:model:recommender'),
);
subscribe(EVENTS.USER_REGISTERED, () => invalidateCache('customers'));
