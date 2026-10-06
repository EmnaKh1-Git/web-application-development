/**
 * Module Intelligence Artificielle — étape IA (après le Sprint 3)
 *
 * Le module IA est découplé du reste de l'application :
 * - le Front-End appelle uniquement /api/v1/ai/... (jamais un service IA directement) ;
 * - ce module délègue à un « fournisseur » interchangeable (AI_PROVIDER = mock | http | llm) ;
 * - les clés d'API restent dans le .env du Back-End.
 * Voir docs/ARCHITECTURE.md, section « Intégration de l'IA ».
 */

// eslint-disable-next-line no-unused-vars -- utilisé à l'étape IA
export function registerRoutes(apiRouter) {
  // apiRouter.use('/ai', aiRoutes); // /ai/recommendations, /ai/chat
}
