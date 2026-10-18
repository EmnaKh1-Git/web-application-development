import { describe, expect, it, vi } from 'vitest';
import { EVENTS, publish, subscribe } from '../../../src/core/events/index.js';
import {
  buildPaginationMeta,
  paginationQuerySchema,
  toSequelizePagination,
} from '../../../src/core/utils/pagination.js';

describe('Pagination', () => {
  it('applique les valeurs par défaut et convertit les chaînes de la query', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(paginationQuerySchema.parse({ page: '3', limit: '10' })).toEqual({ page: 3, limit: 10 });
  });

  it('refuse une limite trop grande', () => {
    expect(paginationQuerySchema.safeParse({ limit: '1000' }).success).toBe(false);
  });

  it('calcule offset et métadonnées', () => {
    expect(toSequelizePagination({ page: 3, limit: 10 })).toEqual({ limit: 10, offset: 20 });
    expect(buildPaginationMeta({ page: 3, limit: 10 }, 45)).toEqual({
      page: 3,
      limit: 10,
      total: 45,
      totalPages: 5,
    });
  });
});

describe('Bus d’événements', () => {
  it('transmet le contenu de l’événement aux abonnés', async () => {
    const handler = vi.fn();
    const unsubscribe = subscribe(EVENTS.ORDER_CREATED, handler);

    publish(EVENTS.ORDER_CREATED, { orderId: 5 });

    expect(handler).toHaveBeenCalledWith({ orderId: 5 });
    unsubscribe();
  });

  it('isole les erreurs d’un abonné : l’émetteur n’est jamais interrompu', async () => {
    const failing = vi.fn(async () => {
      throw new Error('abonné en échec');
    });
    const working = vi.fn();
    const unsubscribeFailing = subscribe(EVENTS.STOCK_LOW, failing);
    const unsubscribeWorking = subscribe(EVENTS.STOCK_LOW, working);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => publish(EVENTS.STOCK_LOW, { productId: 1 })).not.toThrow();
    await vi.waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(working).toHaveBeenCalled();

    consoleError.mockRestore();
    unsubscribeFailing();
    unsubscribeWorking();
  });

  it('ne notifie plus un abonné après désabonnement', () => {
    const handler = vi.fn();
    const unsubscribe = subscribe(EVENTS.REVIEW_CHANGED, handler);
    unsubscribe();

    publish(EVENTS.REVIEW_CHANGED, {});

    expect(handler).not.toHaveBeenCalled();
  });
});
