import { CUSTOMER_SEGMENT_LABELS, CUSTOMER_SEGMENT, PERMISSIONS } from '@smart-ecommerce/shared';
import { useQuery } from '@tanstack/react-query';
import {
  Bot,
  BrainCircuit,
  ClipboardList,
  LineChart,
  MessageSquareText,
  MessageSquareWarning,
  Package,
  ScanLine,
  ShoppingBag,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '@/shared/auth/useAuth';
import { QueryError } from '@/shared/components/QueryError';
import { Alert } from '@/shared/components/ui/Alert';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Spinner } from '@/shared/components/ui/Spinner';
import { aiApi, aiKeys } from '../api/aiApi';
import { AiBadge } from '../components/AiBadge';
import { BriefingCard } from '../components/BriefingCard';

// Barres de comparaison : modèle (palette validée, emplacement 1) contre une référence neutre
const MODEL_COLOR = '#2a78d6';
const BASELINE_COLOR = '#c3c2b7';
const percent = (value) => `${Math.round(value * 100)} %`;

const FEATURES = [
  {
    icon: LineChart,
    title: 'Prévision des ruptures et réassorts',
    where: 'Stock › Prévisions IA',
    to: '/admin/stock?view=forecast',
    permission: PERMISSIONS.STOCK_READ,
    how: 'Croston (SBA) pour les ventes intermittentes, lissage exponentiel sinon, profil hebdomadaire, stock de sécurité à 95 %.',
    engine: 'Local',
  },
  {
    icon: ScanLine,
    title: 'Réception intelligente',
    where: 'Stock › Réception intelligente',
    to: '/admin/stock',
    permission: PERMISSIONS.STOCK_MANAGE,
    how: 'Lecture du bon (texte, ou photo avec Claude), puis rapprochement flou des libellés avec le catalogue (trigrammes + mots-clés).',
    engine: 'Local + Claude',
  },
  {
    icon: ShoppingBag,
    title: 'Recommandations de produits',
    where: 'Boutique : accueil, fiche produit, panier',
    to: '/',
    how: 'Filtrage collaboratif (co-achats) + similarité TF-IDF + popularité bayésienne, en tenant compte du stock (rupture exclue, stock dormant favorisé).',
    engine: 'Local',
  },
  {
    icon: Bot,
    title: 'Assistant d’achat',
    where: 'Boutique : bouton « Assistant IA »',
    to: '/',
    how: 'Compréhension du message (budget, rayon, tri, intention) et recherche classée ; avec Claude, conversation libre et outils (catalogue, commandes).',
    engine: 'Local + Claude',
  },
  {
    icon: MessageSquareText,
    title: 'Résumé des avis',
    where: 'Boutique : fiche produit',
    to: '/products',
    how: 'Analyse par aspects (qualité, taille, livraison…) et polarité de chaque phrase, avec gestion de la négation ; synthèse rédigée par Claude s’il est configuré.',
    engine: 'Local + Claude',
  },
  {
    icon: MessageSquareWarning,
    title: 'Tri des réclamations et brouillons de réponse',
    where: 'Réclamations',
    to: '/admin/complaints',
    permission: PERMISSIONS.COMPLAINTS_MANAGE,
    how: 'Catégorie par mots-clés pondérés, priorité (ton, urgence, ancienneté), réponse proposée selon la catégorie ou rédigée par Claude.',
    engine: 'Local + Claude',
  },
  {
    icon: ClipboardList,
    title: 'Score de risque des commandes',
    where: 'Commandes › colonne « Risque (IA) »',
    to: '/admin/orders',
    permission: PERMISSIONS.ORDERS_MANAGE,
    how: 'Détection d’anomalies explicable : montant inhabituel (z-score), nouveau compte, nouvelle ville, quantités, annulations passées.',
    engine: 'Local',
  },
  {
    icon: UsersRound,
    title: 'Segmentation des clients',
    where: 'Utilisateurs › colonne « Segment (IA) »',
    to: '/admin/users',
    permission: PERMISSIONS.USERS_MANAGE,
    how: 'Méthode RFM (récence, fréquence, montant) et détection des clients dont le rythme d’achat chute.',
    engine: 'Local',
  },
  {
    icon: Package,
    title: 'Aide à la saisie des produits',
    where: 'Produits › formulaire',
    to: '/admin/products',
    permission: PERMISSIONS.PRODUCTS_MANAGE,
    how: 'Catégorie suggérée par un classifieur bayésien naïf entraîné sur le catalogue ; description rédigée par Claude (ou gabarit).',
    engine: 'Local + Claude',
  },
];

/** Comparaison « modèle contre référence » en barres horizontales, valeurs écrites en bout de barre. */
function ComparisonBars({ rows, max = 1 }) {
  return (
    <dl className="mt-3 space-y-2 text-sm">
      {rows.map(({ label, value, color }) => (
        <div key={label} className="grid grid-cols-[8.5rem_1fr] items-center gap-3">
          <dt className="text-slate-600">{label}</dt>
          <dd className="flex items-center gap-2">
            <span className="h-3 flex-1">
              <span
                className="block h-3 rounded-r"
                style={{
                  width: `${Math.max(2, (Math.min(value, max) / max) * 100)}%`,
                  backgroundColor: color,
                }}
              />
            </span>
            <span className="w-12 text-right font-semibold tabular-nums">{percent(value)}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function MetricCard({ title, children, footnote }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h3 className="font-semibold">{title}</h3>
      {children}
      {footnote && <p className="mt-3 text-xs text-slate-500">{footnote}</p>}
    </article>
  );
}

function Evaluation() {
  const query = useQuery({ queryKey: aiKeys.evaluation, queryFn: aiApi.evaluation });
  if (query.isPending) return <Spinner className="text-brand-600" />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;
  const { forecast, recommender, categoryClassifier, complaintClassifier } = query.data;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {forecast.wape !== null && (
        <MetricCard
          title="Prévision de la demande (erreur, plus bas = mieux)"
          footnote={`Backtest sur les ${forecast.horizonDays} derniers jours, ${forecast.products} produits : le modèle apprend sur le passé puis prévoit une période qu’il n’a pas vue. Erreur absolue pondérée (WAPE).`}
        >
          <ComparisonBars
            rows={[
              { label: 'Modèle IA', value: forecast.wape, color: MODEL_COLOR },
              { label: 'Moyenne naïve', value: forecast.naiveWape, color: BASELINE_COLOR },
            ]}
          />
          {forecast.improvement !== null && (
            <p className="mt-2 text-sm font-medium text-slate-700">
              {forecast.improvement >= 0 ? 'Erreur réduite de ' : 'Erreur supérieure de '}
              {percent(Math.abs(forecast.improvement))} par rapport à la référence.
            </p>
          )}
        </MetricCard>
      )}
      {recommender.hitRate !== null && (
        <MetricCard
          title={`Recommandations (taux de réussite, top ${recommender.k})`}
          footnote={`${recommender.cases} cas de test : pour chaque commande récente de plusieurs articles, un article est caché ; réussite s’il fait partie des ${recommender.k} produits recommandés à partir des autres.`}
        >
          <ComparisonBars
            rows={[
              { label: 'Modèle IA', value: recommender.hitRate, color: MODEL_COLOR },
              {
                label: 'Popularité seule',
                value: recommender.popularityHitRate,
                color: BASELINE_COLOR,
              },
            ]}
          />
        </MetricCard>
      )}
      <MetricCard
        title="Catégorie suggérée pour un produit (précision)"
        footnote={`Validation croisée « leave-one-out » sur ${categoryClassifier.documents} produits du catalogue.`}
      >
        <p className="mt-2 text-3xl font-bold tabular-nums">
          {percent(categoryClassifier.accuracy ?? 0)}
        </p>
      </MetricCard>
      <MetricCard
        title="Classement des réclamations (précision)"
        footnote={`Jeu de test étiqueté à la main : ${complaintClassifier.cases} réclamations.`}
      >
        <p className="mt-2 text-3xl font-bold tabular-nums">
          {percent(complaintClassifier.accuracy)}
        </p>
      </MetricCard>
    </div>
  );
}

function Segments() {
  const query = useQuery({ queryKey: aiKeys.customerSegments, queryFn: aiApi.customerSegments });
  if (!query.data) return null;
  const order = Object.values(CUSTOMER_SEGMENT);
  const rows = order
    .map((segment) => ({ segment, count: query.data.distribution[segment] ?? 0 }))
    .filter((row) => row.count > 0);
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <section
      aria-labelledby="segments-title"
      className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
    >
      <h2 id="segments-title" className="font-semibold">
        Clients par segment ({query.data.customers})
      </h2>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map(({ segment, count }) => (
          <div key={segment} className="grid grid-cols-[8.5rem_1fr] items-center gap-3">
            <dt className="text-slate-600">{CUSTOMER_SEGMENT_LABELS[segment]}</dt>
            <dd className="flex items-center gap-2">
              <span className="h-3 flex-1">
                <span
                  className="block h-3 rounded-r"
                  style={{ width: `${(count / max) * 100}%`, backgroundColor: MODEL_COLOR }}
                />
              </span>
              <span className="w-8 text-right font-semibold tabular-nums">{count}</span>
            </dd>
          </div>
        ))}
      </dl>
      <Link
        to="/admin/users"
        className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline"
      >
        Voir les clients
      </Link>
    </section>
  );
}

/** Centre IA : fournisseur actif, fonctions d'IA de l'application et qualité mesurée des modèles. */
export function AiCenterPage() {
  const { hasPermission } = useAuth();
  const statusQuery = useQuery({ queryKey: aiKeys.status, queryFn: aiApi.status });
  const status = statusQuery.data;
  const features = FEATURES.filter(
    (feature) => !feature.permission || hasPermission(feature.permission),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Centre IA"
        description="Toutes les fonctions d’intelligence artificielle de SmartE-Commerce, et la mesure de leur qualité."
      />

      {status && (
        <Alert
          variant="info"
          title={status.claudeConfigured ? `Claude activé (${status.model})` : 'Mode IA locale'}
        >
          {status.claudeConfigured
            ? 'Les algorithmes locaux tournent en permanence ; Claude enrichit la lecture des photos, l’assistant, les résumés et les textes rédigés, avec repli automatique en cas d’indisponibilité.'
            : 'Toutes les fonctions marchent avec les algorithmes du serveur. Pour activer Claude (lecture de photos, conversation libre, rédaction), ajoutez une clé ANTHROPIC_API_KEY dans backend/.env puis redémarrez l’API.'}
        </Alert>
      )}

      <BriefingCard />

      <section aria-labelledby="features-title" className="space-y-4">
        <h2 id="features-title" className="text-lg font-semibold">
          Où voir l’IA dans l’application
        </h2>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map(({ icon: Icon, title, where, to, how, engine }) => (
            <li key={title}>
              <Link
                to={to}
                className="flex h-full flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-violet-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex size-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <AiBadge label={engine} />
                </div>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="text-xs font-medium text-brand-700">{where}</p>
                <p className="mt-2 text-sm text-slate-600">{how}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="evaluation-title" className="space-y-4">
        <h2 id="evaluation-title" className="flex items-center gap-2 text-lg font-semibold">
          <BrainCircuit aria-hidden="true" className="size-5 text-violet-600" />
          Qualité mesurée des modèles
        </h2>
        <Evaluation />
      </section>

      {hasPermission(PERMISSIONS.USERS_MANAGE) && <Segments />}
    </div>
  );
}
