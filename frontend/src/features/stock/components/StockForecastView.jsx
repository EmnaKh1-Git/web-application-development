import { PERMISSIONS, STOCK_RISK, STOCK_RISK_LABELS } from '@smart-ecommerce/shared';
import { useQuery } from '@tanstack/react-query';
import {
  CircleCheck,
  Clock,
  LineChart,
  PackagePlus,
  PackageX,
  Snowflake,
  TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { aiApi, aiKeys } from '@/features/ai/api/aiApi';
import { AiBadge } from '@/features/ai/components/AiBadge';
import { useAuth } from '@/shared/auth/useAuth';
import { ProductImage } from '@/shared/components/ProductImage';
import { QueryError } from '@/shared/components/QueryError';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Dialog } from '@/shared/components/ui/Dialog';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { FilterTabs } from '@/shared/components/ui/FilterTabs';
import { PageSpinner, Spinner } from '@/shared/components/ui/Spinner';
import { StatCard } from '@/shared/components/ui/StatCard';
import { formatDate, formatNumber, formatPrice } from '@/shared/utils/format';
import { DemandChart, ProjectedStockChart } from './ForecastCharts';
import { AdjustStockDialog, RestockDialog } from './StockDialogs';

const RISK_STYLES = {
  [STOCK_RISK.CRITICAL]: { tone: 'danger', icon: TriangleAlert },
  [STOCK_RISK.WARNING]: { tone: 'warning', icon: Clock },
  [STOCK_RISK.OK]: { tone: 'success', icon: CircleCheck },
  [STOCK_RISK.NO_DEMAND]: { tone: 'neutral', icon: Snowflake },
};

const DEMAND_TYPE_LABELS = {
  smooth: 'Régulière',
  erratic: 'Irrégulière',
  intermittent: 'Intermittente',
  lumpy: 'Sporadique',
  none: 'Aucune vente',
};

const METHOD_LABELS = {
  ses: 'Lissage exponentiel',
  'croston-sba': 'Croston (SBA)',
  none: '—',
};

const FILTERS = [
  { value: 'all', label: 'Tous', match: () => true },
  { value: 'reorder', label: 'À commander', match: (item) => item.suggestedQuantity > 0 },
  {
    value: 'critical',
    label: 'Rupture imminente',
    match: (item) => item.risk === STOCK_RISK.CRITICAL,
  },
  { value: 'warning', label: 'À surveiller', match: (item) => item.risk === STOCK_RISK.WARNING },
  { value: 'dormant', label: 'Stock dormant', match: (item) => item.isDormant },
];

/** Risque de rupture prévu par l'IA (badge avec icône : la couleur ne porte jamais seule le sens). */
export function StockRiskBadge({ risk }) {
  const { tone, icon: Icon } = RISK_STYLES[risk] ?? RISK_STYLES[STOCK_RISK.OK];
  return (
    <Badge tone={tone}>
      <Icon aria-hidden="true" className="size-3" />
      {STOCK_RISK_LABELS[risk]}
    </Badge>
  );
}

/** Onglet « Prévisions IA » de la page Stock. */
export function StockForecastView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.STOCK_MANAGE);
  const [filter, setFilter] = useState('all');
  const [restocking, setRestocking] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const query = useQuery({ queryKey: aiKeys.stockForecast, queryFn: aiApi.stockForecast });

  if (query.isPending) return <PageSpinner />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;

  const { items, summary } = query.data;
  const active = FILTERS.find((option) => option.value === filter) ?? FILTERS[0];
  const visible = items.filter(active.match);

  return (
    <section aria-label="Prévisions IA" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-violet-50/60 p-4 text-sm text-slate-700 ring-1 ring-violet-100">
        <p className="max-w-3xl">
          L’IA prévoit les ventes de chaque produit à partir des 6 derniers mois de commandes :
          méthode de <strong>Croston (SBA)</strong> pour les ventes intermittentes, sinon{' '}
          <strong>lissage exponentiel</strong>, avec un profil par jour de la semaine. Les quantités
          conseillées couvrent le délai fournisseur (5 jours) et la prochaine revue (14 jours), avec
          un stock de sécurité pour un niveau de service de 95 %.
        </p>
        <AiBadge source="local" label="Prévisions" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Rupture imminente"
          value={formatNumber(summary.critical)}
          hint="Moins d’une semaine de stock"
          icon={PackageX}
          tone="danger"
        />
        <StatCard
          label="À surveiller"
          value={formatNumber(summary.warning)}
          hint="Moins de 3 semaines de stock"
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="Réassorts conseillés"
          value={formatNumber(summary.toReorder)}
          icon={PackagePlus}
          tone="brand"
        />
        <StatCard
          label="Stock dormant"
          value={formatNumber(summary.dormant)}
          hint={`${formatPrice(summary.dormantValue)} immobilisés (plus de 4 mois de ventes)`}
          icon={Snowflake}
          tone="neutral"
        />
      </div>

      <FilterTabs
        label="Filtrer les prévisions"
        value={filter}
        onChange={setFilter}
        options={FILTERS.map(({ value, label, match }) => ({
          value,
          label,
          count: items.filter(match).length,
        }))}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={CircleCheck}
          title="Rien à signaler"
          description="Aucun produit dans cette catégorie."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Produit
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Stock
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Ventes / jour
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Couverture
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Rupture prévue
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Risque
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Conseil de l’IA
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((item) => (
                <tr key={item.productId} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductImage
                        src={item.product.imageUrl}
                        name={item.product.name}
                        compact
                        className="size-10 shrink-0 rounded-lg"
                      />
                      <div className="min-w-0">
                        <p className="line-clamp-1 font-medium">{item.product.name}</p>
                        <p className="text-xs text-slate-500">
                          Demande {DEMAND_TYPE_LABELS[item.demandType]?.toLowerCase()} ·{' '}
                          {formatNumber(item.soldLast30Days)} vendu(s) en 30 j
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatNumber(item.quantity)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {item.dailyDemand.toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {item.daysOfCover === null ? '—' : `${Math.round(item.daysOfCover)} j`}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {item.stockoutDate ? formatDate(item.stockoutDate) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StockRiskBadge risk={item.risk} />
                  </td>
                  <td className="px-4 py-3">
                    {item.suggestedQuantity > 0 ? (
                      <p className="font-medium text-slate-900">
                        Commander {formatNumber(item.suggestedQuantity)}
                      </p>
                    ) : (
                      <p className="text-slate-500">Rien à commander</p>
                    )}
                    {item.suggestedThreshold !== item.lowStockThreshold &&
                      item.risk !== STOCK_RISK.NO_DEMAND && (
                        <p className="text-xs text-slate-500">
                          Seuil conseillé : {item.suggestedThreshold} (actuel{' '}
                          {item.lowStockThreshold})
                        </p>
                      )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {canManage && item.suggestedQuantity > 0 && (
                        <Button
                          size="sm"
                          aria-label={`Commander ${item.suggestedQuantity} ${item.product.name}`}
                          onClick={() => setRestocking(item)}
                        >
                          <PackagePlus aria-hidden="true" className="size-4" />
                          Commander
                        </Button>
                      )}
                      {canManage &&
                        item.suggestedThreshold !== item.lowStockThreshold &&
                        item.risk !== STOCK_RISK.NO_DEMAND && (
                          <Button variant="secondary" size="sm" onClick={() => setAdjusting(item)}>
                            Seuil {item.suggestedThreshold}
                            <span className="sr-only"> pour {item.product.name}</span>
                          </Button>
                        )}
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Courbe de prévision de ${item.product.name}`}
                        onClick={() => setDetailId(item.productId)}
                      >
                        <LineChart aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RestockDialog
        stock={restocking}
        suggestion={
          restocking && {
            quantity: restocking.suggestedQuantity,
            reason: 'Réassort conseillé par l’IA',
          }
        }
        onClose={() => setRestocking(null)}
      />
      <AdjustStockDialog
        stock={adjusting}
        suggestion={
          adjusting && {
            lowStockThreshold: adjusting.suggestedThreshold,
            reason: 'Seuil d’alerte conseillé par l’IA',
          }
        }
        onClose={() => setAdjusting(null)}
      />
      <Dialog
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        size="xl"
        title="Prévision détaillée"
      >
        {detailId !== null && <ForecastDetail productId={detailId} />}
      </Dialog>
    </section>
  );
}

function ForecastDetail({ productId }) {
  const query = useQuery({
    queryKey: aiKeys.productForecast(productId, 30),
    queryFn: () => aiApi.productForecast(productId, 30),
  });
  if (query.isPending) return <Spinner className="text-brand-600" />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;
  const detail = query.data;
  const facts = [
    ['Demande', DEMAND_TYPE_LABELS[detail.demandType]],
    ['Méthode', METHOD_LABELS[detail.method]],
    ['Ventes prévues', `${detail.dailyDemand.toLocaleString('fr-FR')} / jour`],
    ['Couverture', detail.daysOfCover === null ? '—' : `${Math.round(detail.daysOfCover)} jours`],
    ['Stock de sécurité', formatNumber(detail.safetyStock)],
    ['Point de commande', formatNumber(detail.reorderPoint)],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{detail.product.name}</p>
          <p className="text-sm text-slate-600">
            {formatNumber(detail.quantity)} en stock
            {detail.stockoutDate && <> · rupture estimée le {formatDate(detail.stockoutDate)}</>}
          </p>
        </div>
        <StockRiskBadge risk={detail.risk} />
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <DemandChart history={detail.history} forecast={detail.forecast} />
      <ProjectedStockChart
        forecast={detail.forecast}
        quantity={detail.quantity}
        threshold={detail.lowStockThreshold}
      />
      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-brand-700">
          Voir les données de la prévision
        </summary>
        <div className="mt-2 max-h-64 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white text-xs text-slate-500">
              <tr>
                <th scope="col" className="py-1">
                  Date
                </th>
                <th scope="col" className="py-1 text-right">
                  Prévu
                </th>
                <th scope="col" className="py-1 text-right">
                  Intervalle à 80 %
                </th>
                <th scope="col" className="py-1 text-right">
                  Stock projeté
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {detail.forecast.map((day) => (
                <tr key={day.date}>
                  <td className="py-1">{formatDate(day.date)}</td>
                  <td className="py-1 text-right">{day.expected.toLocaleString('fr-FR')}</td>
                  <td className="py-1 text-right">
                    {day.low.toLocaleString('fr-FR')} – {day.high.toLocaleString('fr-FR')}
                  </td>
                  <td className="py-1 text-right">{day.projectedStock.toLocaleString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
