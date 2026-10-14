import {
  DELIVERY_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PERMISSIONS,
  PRODUCT_SORT_LIST,
  hasPermission,
} from '@smart-ecommerce/shared';
import * as ordersModule from '../../orders/index.js';
import { getCatalog, getCategories, withClaude } from '../ai.data.js';
import {
  describeFilters,
  parseShopperMessage,
  searchCatalog,
  SHOP_POLICIES,
} from '../engine/assistant.js';
import { tokenize } from '../engine/text.js';
import { createMessage, responseText } from '../llm/claude.js';

const MAX_TOOL_ROUNDS = 5;
const MAX_PRODUCT_CARDS = 4;

const DEFAULT_SUGGESTIONS = [
  'Un cadeau pour ma sœur à moins de 150 DT',
  'Les meilleurs écouteurs',
  'Où en est ma commande ?',
  'Comment se passe la livraison ?',
];

const formatPrice = (amount) => `${Number(amount).toFixed(2).replace('.', ',')} DT`;

/** Le client peut-il consulter « ses commandes » ? */
const canSeeOrders = (user) => Boolean(user && hasPermission(user.role, PERMISSIONS.ORDERS_PLACE));

async function recentOrders(user, limit = 3) {
  const { items } = await ordersModule.listMyOrders(user.id, { page: 1, limit });
  return items.map((order) => ({
    id: order.id,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status],
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    deliveryStatus: order.delivery?.status ?? null,
    deliveryLabel: order.delivery ? DELIVERY_STATUS_LABELS[order.delivery.status] : null,
    trackingNumber: order.delivery?.trackingNumber ?? null,
    estimatedDeliveryDate: order.delivery?.estimatedDeliveryDate ?? null,
  }));
}

/* ─────────────────────────── Assistant local ─────────────────────────── */

async function localAnswer({ messages, user }) {
  const lastMessage = messages.at(-1).content;
  const parsed = parseShopperMessage(lastMessage);
  const { intent } = parsed;
  let { filters, gift } = parsed;

  // Relance courte (« moins cher ? », « et en rouge ») : on garde le sujet du message précédent
  const previousUser = messages.slice(0, -1).findLast((message) => message.role === 'user');
  if (
    intent === 'search' &&
    previousUser &&
    !filters.categorySlug &&
    filters.keywords.length <= 1
  ) {
    const previous = parseShopperMessage(previousUser.content);
    if (previous.intent === 'search') {
      filters = {
        ...previous.filters,
        ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined)),
        keywords: [...previous.filters.keywords, ...filters.keywords],
      };
      gift = gift || previous.gift;
    }
  }

  if (intent === 'greeting') {
    return {
      reply: `Bonjour${user ? ` ${user.firstName}` : ''} ! Je suis l’assistant de SmartE-Commerce. Dites-moi ce que vous cherchez (un produit, un budget, une idée cadeau) ou posez-moi une question sur votre commande.`,
      suggestions: DEFAULT_SUGGESTIONS,
    };
  }
  if (intent === 'thanks') {
    return {
      reply: 'Avec plaisir ! N’hésitez pas si vous avez une autre question.',
      suggestions: [],
    };
  }
  if (intent.startsWith('policy_')) {
    const topic = intent.replace('policy_', '');
    return {
      reply: SHOP_POLICIES[topic],
      suggestions: ['Où en est ma commande ?', 'Voir les meilleures ventes'],
    };
  }
  if (intent === 'order_status') {
    if (!user) {
      return {
        reply:
          'Connectez-vous pour que je puisse consulter vos commandes et leur suivi de livraison.',
        suggestions: [],
      };
    }
    if (!canSeeOrders(user)) {
      return {
        reply: 'Les comptes du back-office n’ont pas de commandes personnelles.',
        suggestions: [],
      };
    }
    const orders = await recentOrders(user);
    if (orders.length === 0) {
      return {
        reply:
          'Vous n’avez pas encore passé de commande. Je peux vous aider à trouver un produit !',
        suggestions: ['Voir les meilleures ventes'],
      };
    }
    const lines = orders.map(
      (order) =>
        `• Commande n°${order.id} (${formatPrice(order.totalAmount)}) : ${order.statusLabel.toLowerCase()}` +
        (order.trackingNumber ? `, suivi ${order.trackingNumber}` : ''),
    );
    return {
      reply: `Voici vos dernières commandes :\n${lines.join('\n')}`,
      orders,
      suggestions: [],
    };
  }

  // Recherche de produits
  const [catalog, categories] = await Promise.all([getCatalog(), getCategories()]);
  let products = searchCatalog(catalog, filters, { limit: MAX_PRODUCT_CARDS });
  let relaxed = false;
  if (products.length === 0 && filters.keywords.length > 0) {
    products = searchCatalog(catalog, { ...filters, keywords: [] }, { limit: MAX_PRODUCT_CARDS });
    relaxed = products.length > 0;
  }
  const criteria = describeFilters(filters, categories);

  if (products.length === 0) {
    return {
      reply: `Je n’ai trouvé aucun produit disponible${criteria ? ` ${criteria}` : ''}. Essayez avec un autre budget ou un autre rayon.`,
      suggestions: ['Voir les meilleures ventes', 'Un cadeau à moins de 100 DT'],
    };
  }
  const intro = gift ? 'Voici quelques idées cadeaux' : 'Voici ce que je vous propose';
  const note = relaxed
    ? ' (rien ne correspondait exactement à vos mots-clés, voici les plus proches)'
    : '';
  return {
    reply: `${intro}${criteria ? ` ${criteria}` : ''}${note} :`,
    products,
    suggestions: ['Moins cher ?', 'Les mieux notés', 'Où en est ma commande ?'],
  };
}

/* ─────────────────────────── Assistant Claude (outils) ─────────────────────────── */

function buildTools(user, categories) {
  const tools = [
    {
      name: 'rechercher_produits',
      description:
        'Recherche des produits disponibles dans le catalogue de la boutique. Utilise-le avant toute recommandation.',
      input_schema: {
        type: 'object',
        properties: {
          mots_cles: { type: 'string', description: 'Mots-clés (ex. « écouteurs sans fil »)' },
          categorie: { type: 'string', enum: categories.map((category) => category.slug) },
          prix_min: { type: 'number' },
          prix_max: { type: 'number' },
          tri: { type: 'string', enum: [...PRODUCT_SORT_LIST] },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'afficher_produits',
      description:
        'Affiche au client les cartes des produits que tu recommandes (4 au maximum), à partir de leurs identifiants.',
      input_schema: {
        type: 'object',
        properties: { ids: { type: 'array', items: { type: 'integer' } } },
        required: ['ids'],
        additionalProperties: false,
      },
    },
  ];
  if (canSeeOrders(user)) {
    tools.push({
      name: 'mes_commandes',
      description:
        'Dernières commandes du client connecté, avec leur statut et le suivi de livraison.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    });
  }
  return tools;
}

function systemPrompt(user, categories) {
  return [
    'Tu es l’assistant d’achat de SmartE-Commerce, une boutique en ligne tunisienne (prix en dinars, DT).',
    'Réponds toujours en français, de façon chaleureuse et concise (4 phrases au maximum).',
    'Ne recommande QUE des produits renvoyés par l’outil rechercher_produits, et appelle afficher_produits',
    'avec leurs identifiants pour que le client voie les cartes. N’invente jamais un prix, un produit ou une caractéristique.',
    `Rayons : ${categories.map((category) => `${category.name} (${category.slug})`).join(', ')}.`,
    `Livraison : ${SHOP_POLICIES.delivery}`,
    `Paiement : ${SHOP_POLICIES.payment}`,
    `Annulation et problèmes : ${SHOP_POLICIES.cancel}`,
    `Avis : ${SHOP_POLICIES.reviews}`,
    user
      ? `Le client connecté s’appelle ${user.firstName}.`
      : 'Le visiteur n’est pas connecté : pour ses commandes, invite-le à se connecter.',
    'Si la question sort du cadre de la boutique, réponds poliment que tu ne peux aider que pour les achats.',
  ].join('\n');
}

async function claudeAnswer({ messages, user }) {
  const [catalog, categories] = await Promise.all([getCatalog(), getCategories()]);
  const catalogById = new Map(catalog.map((product) => [product.id, product]));
  const conversation = messages.map(({ role, content }) => ({ role, content }));
  const tools = buildTools(user, categories);
  const shownIds = [];
  let orders;

  const runTool = async (name, input) => {
    if (name === 'rechercher_produits') {
      const results = searchCatalog(
        catalog,
        {
          keywords: tokenize(input.mots_cles ?? ''),
          categorySlug: input.categorie,
          minPrice: input.prix_min,
          maxPrice: input.prix_max,
          sort: input.tri,
          inStockOnly: true,
        },
        { limit: 8 },
      );
      return results.map((product) => ({
        id: product.id,
        nom: product.name,
        prix: product.price,
        rayon: product.category?.name,
        note:
          product.rating.count > 0
            ? `${product.rating.average}/5 (${product.rating.count} avis)`
            : 'aucun avis',
        disponibilite: product.stock.status === 'LOW' ? 'stock faible' : 'en stock',
        tailles: product.sizes,
        couleurs: product.colors,
        description: product.description.slice(0, 160),
      }));
    }
    if (name === 'afficher_produits') {
      for (const id of input.ids ?? []) {
        if (catalogById.has(id) && !shownIds.includes(id)) shownIds.push(id);
      }
      return 'Cartes affichées.';
    }
    if (name === 'mes_commandes' && canSeeOrders(user)) {
      orders = await recentOrders(user, 5);
      return orders;
    }
    return 'Outil indisponible.';
  };

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await createMessage({
      system: systemPrompt(user, categories),
      messages: conversation,
      tools,
      effort: 'low', // conversation : réponses courtes et rapides
    });
    if (response.stop_reason !== 'tool_use') {
      return {
        reply: responseText(response) || 'Je n’ai pas compris, pouvez-vous reformuler ?',
        products: shownIds.slice(0, MAX_PRODUCT_CARDS).map((id) => catalogById.get(id)),
        ...(orders && { orders }),
        suggestions: [],
      };
    }
    conversation.push({ role: 'assistant', content: response.content });
    const results = [];
    for (const block of response.content.filter((item) => item.type === 'tool_use')) {
      results.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(await runTool(block.name, block.input ?? {})),
      });
    }
    conversation.push({ role: 'user', content: results });
  }
  throw new Error('Trop d’appels d’outils');
}

/** Réponse de l'assistant d'achat au dernier message de la conversation. */
export async function chat({ messages, user }) {
  const answer = await withClaude(
    () => claudeAnswer({ messages, user }),
    () => localAnswer({ messages, user }),
  );
  return { products: [], suggestions: [], ...answer };
}
