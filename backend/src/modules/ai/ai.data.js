import { AI_SOURCE } from '@smart-ecommerce/shared';
import { logger } from '../../core/utils/logger.js';
import * as ordersModule from '../orders/index.js';
import * as productsModule from '../products/index.js';
import * as stockModule from '../stock/index.js';
import * as usersModule from '../users/index.js';
import { cached } from './ai.cache.js';
import { isClaudeEnabled } from './llm/claude.js';

/*
 * Données lues par le module IA, toujours via l'API publique des autres modules
 * (jamais directement dans leurs tables), en lecture seule.
 */

const MINUTE = 60_000;

export const getCatalog = () =>
  cached('catalog:products', MINUTE, () => productsModule.getCatalogSnapshot());
export const getCategories = () =>
  cached('catalog:categories', MINUTE, () => productsModule.listCategories());
export const getOrders = () =>
  cached('orders:history', MINUTE, () => ordersModule.getOrderHistory());
export const getCustomers = () => cached('customers', MINUTE, () => usersModule.listCustomers());
/** Le stock est toujours lu en direct : un réapprovisionnement doit se voir immédiatement. */
export const getStockLevels = () => stockModule.getStockLevels();

/**
 * Exécute la version Claude d'une fonction d'IA, avec repli automatique sur la version locale
 * (pas de clé, réseau coupé, délai dépassé...). Le résultat indique toujours sa `source`.
 */
export async function withClaude(claudeTask, localTask) {
  if (!isClaudeEnabled()) return { ...(await localTask()), source: AI_SOURCE.LOCAL };
  try {
    return { ...(await claudeTask()), source: AI_SOURCE.CLAUDE };
  } catch (error) {
    logger.warn(`IA : Claude indisponible, repli sur l'IA locale (${error.message})`);
    return { ...(await localTask()), source: AI_SOURCE.LOCAL };
  }
}
