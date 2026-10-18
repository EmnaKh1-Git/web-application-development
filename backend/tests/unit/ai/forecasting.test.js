import { STOCK_RISK } from '@smart-ecommerce/shared';
import { describe, expect, it } from 'vitest';
import {
  backtest,
  buildDailySeries,
  classifyDemand,
  crostonSBA,
  DAY_MS,
  forecastDailyRate,
  stockAdvice,
  wape,
} from '../../../src/modules/ai/engine/forecasting.js';

describe('Prévision de la demande', () => {
  it('agrège les ventes par jour', () => {
    const day = (index) => new Date(index * DAY_MS + 10 * 3_600_000);
    const series = buildDailySeries(
      [
        { date: day(100), quantity: 2 },
        { date: day(100), quantity: 1 },
        { date: day(102), quantity: 4 },
      ],
      100,
      103,
    );
    expect(series).toEqual([3, 0, 4, 0]);
  });

  it('classe la demande selon Syntetos & Boylan', () => {
    expect(classifyDemand([2, 3, 2, 3, 2, 3, 2]).type).toBe('smooth');
    expect(classifyDemand([0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2]).type).toBe('intermittent');
    expect(classifyDemand([0, 0, 0]).type).toBe('none');
  });

  it('estime une demande intermittente avec Croston (SBA)', () => {
    // 2 unités tous les 4 jours = 0,5 unité/jour ; SBA corrige légèrement vers le bas
    const series = Array.from({ length: 80 }, (_, index) => (index % 4 === 3 ? 2 : 0));
    const rate = crostonSBA(series);
    expect(rate).toBeGreaterThan(0.4);
    expect(rate).toBeLessThan(0.5);
    expect(forecastDailyRate(series).method).toBe('croston-sba');
  });

  it('utilise le lissage exponentiel pour une demande régulière', () => {
    const forecast = forecastDailyRate(Array.from({ length: 60 }, () => 3));
    expect(forecast.method).toBe('ses');
    expect(forecast.rate).toBeCloseTo(3, 5);
  });
});

describe('Conseils de réapprovisionnement', () => {
  it('signale une rupture imminente et calcule la quantité à commander', () => {
    const advice = stockAdvice({ quantity: 4, rate: 1, sigma: 1 });

    expect(advice.risk).toBe(STOCK_RISK.CRITICAL);
    expect(advice.daysOfCover).toBe(4);
    expect(advice.suggestedQuantity).toBeGreaterThan(15);
    expect(advice.suggestedThreshold).toBe(advice.reorderPoint);
  });

  it('ne conseille rien pour un stock largement couvert', () => {
    const advice = stockAdvice({ quantity: 100, rate: 1, sigma: 1 });
    expect(advice.risk).toBe(STOCK_RISK.OK);
    expect(advice.suggestedQuantity).toBe(0);
  });

  it('reconnaît un produit sans demande', () => {
    expect(stockAdvice({ quantity: 10, rate: 0, sigma: 0 }).risk).toBe(STOCK_RISK.NO_DEMAND);
  });
});

describe('Évaluation hors échantillon', () => {
  it('compare la prévision à la réalité et à la méthode naïve (WAPE)', () => {
    const series = Array.from({ length: 120 }, () => 2);
    const pair = backtest(series, 28);
    expect(pair).toMatchObject({ actual: 56 });
    expect(wape([pair])).toBeCloseTo(0, 1);
    expect(wape([{ actual: 10, predicted: 8, naive: 15 }], 'naive')).toBe(0.5);
  });

  it('refuse un historique trop court', () => {
    expect(backtest([1, 2, 3], 28)).toBeNull();
  });
});
