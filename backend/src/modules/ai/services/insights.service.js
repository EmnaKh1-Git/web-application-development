import {
  AI_LEVEL,
  AI_SOURCE,
  COMPLAINT_CATEGORY_LABELS,
  CUSTOMER_SEGMENT,
  ORDER_STATUS,
  PERMISSIONS,
  hasPermission,
} from '@smart-ecommerce/shared';
import { env } from '../../../config/env.js';
import { cached } from '../ai.cache.js';
import { getCatalog, getOrders, withClaude } from '../ai.data.js';
import { classifyComplaint } from '../engine/complaints.js';
import { evaluateRecommender } from '../engine/recommender.js';
import { COMPLAINT_TEST_SET } from '../evaluation/complaintTestSet.js';
import { generateStructured, isClaudeEnabled } from '../llm/claude.js';
import { evaluateCategoryModel } from './catalog.service.js';
import { getComplaintInsights } from './complaints.service.js';
import { getCustomerSegments, getOrderRisks } from './customers.service.js';
import { evaluateForecasts, getStockForecast } from './forecast.service.js';

const DAY_MS = 86_400_000;
const formatPrice = (amount) => `${Math.round(amount).toLocaleString('fr-FR')} DT`;

/* ─────────────────────────── État du module ─────────────────────────── */

/** Fournisseur actif et liste des fonctions d'IA (affichés dans le Centre IA). */
export function getAiStatus() {
  const claude = isClaudeEnabled();
  return {
    provider: claude ? AI_SOURCE.CLAUDE : AI_SOURCE.LOCAL,
    model: claude ? env.AI_MODEL : null,
    claudeConfigured: claude,
  };
}

/* ─────────────────────────── Briefing du jour ─────────────────────────── */

function salesInsights(orders) {
  const now = Date.now();
  const valid = orders.filter((order) => order.status !== ORDER_STATUS.CANCELLED);
  const inWindow = (order, from, to) => {
    const time = new Date(order.createdAt).getTime();
    return time >= now - from * DAY_MS && time < now - to * DAY_MS;
  };
  const thisWeek = valid.filter((order) => inWindow(order, 7, 0));
  const lastWeek = valid.filter((order) => inWindow(order, 14, 7));
  const revenue = (list) => list.reduce((total, order) => total + order.totalAmount, 0);
  const current = revenue(thisWeek);
  const previous = revenue(lastWeek);
  const insights = [];

  if (previous > 0) {
    const change = Math.round(((current - previous) / previous) * 100);
    insights.push({
      domain: 'sales',
      tone: change >= 0 ? 'good' : 'warning',
      text: `Ventes des 7 derniers jours : ${formatPrice(current)} (${change >= 0 ? '+' : ''}${change} % par rapport à la semaine précédente, ${thisWeek.length} commandes).`,
      link: '/admin/orders',
    });
  }
  const units = new Map();
  for (const order of thisWeek) {
    for (const item of order.items) {
      const entry = units.get(item.productId) ?? { name: item.productName, quantity: 0 };
      entry.quantity += item.quantity;
      units.set(item.productId, entry);
    }
  }
  const best = [...units.values()].sort((a, b) => b.quantity - a.quantity)[0];
  if (best) {
    insights.push({
      domain: 'sales',
      tone: 'info',
      text: `Produit star de la semaine : ${best.name} (${best.quantity} vendu${best.quantity > 1 ? 's' : ''}).`,
      link: '/admin/products',
    });
  }
  return insights;
}

async function stockInsights() {
  const { items, summary } = await getStockForecast();
  const insights = [];
  const critical = items.filter((item) => item.risk === 'CRITICAL');
  if (critical.length > 0) {
    insights.push({
      domain: 'stock',
      tone: 'danger',
      text: `${critical.length} produit(s) risquent la rupture d’ici une semaine : ${critical
        .slice(0, 3)
        .map((item) => item.product.name)
        .join(', ')}${critical.length > 3 ? '…' : ''}.`,
      link: '/admin/stock?view=forecast',
    });
  }
  if (summary.toReorder > 0) {
    insights.push({
      domain: 'stock',
      tone: 'warning',
      text: `${summary.toReorder} réapprovisionnement(s) conseillé(s) par l’IA, quantités calculées selon la demande prévue.`,
      link: '/admin/stock?view=forecast',
    });
  }
  if (summary.dormant > 0) {
    insights.push({
      domain: 'stock',
      tone: 'info',
      text: `Stock dormant : ${summary.dormant} produit(s) couvrent plus de 4 mois de ventes (${formatPrice(summary.dormantValue)} immobilisés) : ils sont mis en avant dans les recommandations.`,
      link: '/admin/stock?view=forecast',
    });
  }
  return insights;
}

async function orderInsights() {
  const { items } = await getOrderRisks();
  const risky = Object.values(items).filter((risk) => risk.level === AI_LEVEL.HIGH).length;
  return risky > 0
    ? [
        {
          domain: 'orders',
          tone: 'warning',
          text: `${risky} commande(s) à traiter présentent un risque élevé : vérifiez-les avant de les confirmer.`,
          link: '/admin/orders',
        },
      ]
    : [];
}

async function complaintInsights() {
  const { summary } = await getComplaintInsights();
  const insights = [];
  if (summary.urgentOpen > 0) {
    insights.push({
      domain: 'complaints',
      tone: 'danger',
      text: `${summary.urgentOpen} réclamation(s) urgente(s) attendent une réponse.`,
      link: '/admin/complaints',
    });
  }
  const [topCategory, count] =
    Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1])[0] ?? [];
  if (topCategory && count >= 2) {
    insights.push({
      domain: 'complaints',
      tone: 'info',
      text: `Motif de réclamation le plus fréquent en ce moment : ${COMPLAINT_CATEGORY_LABELS[topCategory].toLowerCase()} (${count}).`,
      link: '/admin/complaints',
    });
  }
  return insights;
}

async function customerInsights() {
  const { distribution } = await getCustomerSegments();
  const atRisk = distribution[CUSTOMER_SEGMENT.AT_RISK] ?? 0;
  const champions = distribution[CUSTOMER_SEGMENT.CHAMPION] ?? 0;
  if (atRisk === 0 && champions === 0) return [];
  return [
    {
      domain: 'customers',
      tone: atRisk > 0 ? 'warning' : 'good',
      text: `${champions} client(s) champion(s) et ${atRisk} client(s) fidèle(s) devenu(s) silencieux à relancer.`,
      link: '/admin/users',
    },
  ];
}

const BRIEFING_SCHEMA = {
  type: 'object',
  properties: { briefing: { type: 'string', description: 'Synthèse de 3 à 4 phrases' } },
  required: ['briefing'],
  additionalProperties: false,
};

/** Points clés du jour, selon les permissions de l'utilisateur (+ synthèse rédigée par Claude). */
export async function getBriefing(user) {
  const can = (permission) => hasPermission(user.role, permission);
  const domains = [
    can(PERMISSIONS.ORDERS_MANAGE) && 'orders',
    can(PERMISSIONS.STOCK_READ) && 'stock',
    can(PERMISSIONS.COMPLAINTS_MANAGE) && 'complaints',
    can(PERMISSIONS.USERS_MANAGE) && 'customers',
  ].filter(Boolean);

  return cached(`orders:briefing:${domains.join(',')}`, 2 * 60_000, async () => {
    const orders = await getOrders();
    const groups = await Promise.all([
      domains.includes('orders') ? salesInsights(orders) : [],
      domains.includes('orders') ? orderInsights() : [],
      domains.includes('stock') ? stockInsights() : [],
      domains.includes('complaints') ? complaintInsights() : [],
      domains.includes('customers') ? customerInsights() : [],
    ]);
    const insights = groups.flat();
    const result = await withClaude(
      async () => {
        const { briefing } = await generateStructured({
          system:
            'Tu es l’analyste d’une boutique en ligne. À partir des constats fournis (et uniquement eux), rédige ' +
            'en français une synthèse de 3 à 4 phrases pour l’équipe, en commençant par le plus urgent. ' +
            'Pas de liste, pas de chiffre inventé.',
          content:
            insights.map((insight) => `- ${insight.text}`).join('\n') ||
            'Aucun constat particulier.',
          schema: BRIEFING_SCHEMA,
        });
        return { narrative: briefing };
      },
      async () => ({ narrative: null }),
    );
    return { generatedAt: new Date().toISOString(), insights, ...result };
  });
}

/* ─────────────────────────── Évaluation des modèles ─────────────────────────── */

/** Mesures de qualité des modèles locaux (affichées dans le Centre IA). */
export function getEvaluation() {
  return cached('orders:evaluation', 10 * 60_000, async () => {
    const [orders, products, forecast, categories] = await Promise.all([
      getOrders(),
      getCatalog(),
      evaluateForecasts(),
      evaluateCategoryModel(),
    ]);

    // Recommandations : apprentissage sur l'historique, test sur les 30 derniers jours
    const cutoff = Date.now() - 30 * DAY_MS;
    const valid = orders.filter((order) => order.status !== ORDER_STATUS.CANCELLED);
    const recommender = evaluateRecommender({
      products,
      trainOrders: valid.filter((order) => new Date(order.createdAt).getTime() < cutoff),
      testOrders: valid.filter((order) => new Date(order.createdAt).getTime() >= cutoff),
      k: 4,
    });

    const complaintsCorrect = COMPLAINT_TEST_SET.filter(
      (testCase) => classifyComplaint(testCase).category === testCase.expected,
    ).length;

    return {
      generatedAt: new Date().toISOString(),
      forecast,
      recommender: { ...recommender, k: 4 },
      categoryClassifier: categories,
      complaintClassifier: {
        cases: COMPLAINT_TEST_SET.length,
        accuracy: Math.round((complaintsCorrect / COMPLAINT_TEST_SET.length) * 1000) / 1000,
      },
    };
  });
}
