import { PERMISSIONS } from '@smart-ecommerce/shared';
import {
  Boxes,
  ClipboardList,
  MessageSquareWarning,
  Package,
  Sparkles,
  Tags,
  Users,
} from 'lucide-react';

/**
 * Sections du back-office. Chaque section n'est affichée qu'aux utilisateurs
 * qui possèdent la permission indiquée (menu latéral et tableau de bord).
 */
export const ADMIN_SECTIONS = [
  {
    to: '/admin/users',
    label: 'Utilisateurs',
    description: 'Comptes, rôles, blocage et déblocage',
    icon: Users,
    permission: PERMISSIONS.USERS_MANAGE,
  },
  {
    to: '/admin/products',
    label: 'Produits',
    description: 'Catalogue, prix et visibilité',
    icon: Package,
    permission: PERMISSIONS.PRODUCTS_MANAGE,
  },
  {
    to: '/admin/categories',
    label: 'Catégories',
    description: 'Organisation du catalogue',
    icon: Tags,
    permission: PERMISSIONS.PRODUCTS_MANAGE,
  },
  {
    to: '/admin/orders',
    label: 'Commandes',
    description: 'Confirmation, statuts et livraisons',
    icon: ClipboardList,
    permission: PERMISSIONS.ORDERS_MANAGE,
  },
  {
    to: '/admin/complaints',
    label: 'Réclamations',
    description: 'Traitement des réclamations clients',
    icon: MessageSquareWarning,
    permission: PERMISSIONS.COMPLAINTS_MANAGE,
  },
  {
    to: '/admin/stock',
    label: 'Stock',
    description: 'Quantités, alertes de stock faible, ruptures',
    icon: Boxes,
    permission: PERMISSIONS.STOCK_READ,
  },
  {
    to: '/admin/ai',
    label: 'Centre IA',
    description: 'Prévisions, recommandations, analyses et qualité des modèles',
    icon: Sparkles,
    permission: PERMISSIONS.AI_INSIGHTS,
  },
];
