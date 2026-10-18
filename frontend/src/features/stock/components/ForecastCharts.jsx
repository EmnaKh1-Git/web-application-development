import { useId, useState } from 'react';
import { formatDate, formatNumber } from '@/shared/utils/format';

/*
 * Graphiques de prévision du stock (SVG, sans bibliothèque) :
 * 1. ventes par jour — réelles (colonnes) puis prévues (ligne + intervalle à 80 %) ;
 * 2. stock projeté jour après jour jusqu'à la rupture.
 * Deux graphiques distincts plutôt qu'un double axe : les deux grandeurs n'ont pas la même échelle.
 * Survol ou flèches du clavier : réticule et infobulle ; toutes les valeurs sont aussi dans le tableau.
 */

// Palette catégorielle validée (daltonisme, contraste) : emplacements 1 et 2
const ACTUAL = '#2a78d6';
const FORECAST = '#eb6834';
const CRITICAL = '#d03b3b';
const GRID = '#e1e0d9';
const AXIS = '#c3c2b7';
const MUTED = '#898781';

const WIDTH = 720;
const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 36 };
const PLOT_W = WIDTH - PADDING.left - PADDING.right;
const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom;

/** Graduations « propres » de l'axe vertical (0, 1, 2… ou 0, 5, 10…). */
function niceTicks(max) {
  const raw = Math.max(1, max) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((factor) => factor * magnitude).find((value) => value >= raw);
  const top = Math.ceil(Math.max(1, max) / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
}

/** Réticule, infobulle et navigation au clavier communs aux deux graphiques. */
function useCrosshair(count) {
  const [index, setIndex] = useState(null);
  const x = (position) => PADDING.left + ((position + 0.5) / count) * PLOT_W;
  const handlers = {
    tabIndex: 0,
    onPointerMove: (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = ((event.clientX - rect.left) / rect.width) * WIDTH - PADDING.left;
      setIndex(Math.max(0, Math.min(count - 1, Math.floor((ratio / PLOT_W) * count))));
    },
    onPointerLeave: () => setIndex(null),
    onBlur: () => setIndex(null),
    onKeyDown: (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      setIndex((current) => {
        const start = current ?? (event.key === 'ArrowLeft' ? count : -1);
        return Math.max(0, Math.min(count - 1, start + (event.key === 'ArrowRight' ? 1 : -1)));
      });
    },
  };
  return { index, x, handlers };
}

function Axes({ ticks, scaleY, points, x, todayIndex }) {
  const labelEvery = Math.ceil(points.length / 6);
  return (
    <g aria-hidden="true">
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={scaleY(tick)}
            y2={scaleY(tick)}
            stroke={tick === 0 ? AXIS : GRID}
            strokeWidth="1"
          />
          <text
            x={PADDING.left - 6}
            y={scaleY(tick) + 4}
            textAnchor="end"
            fontSize="11"
            fill={MUTED}
          >
            {formatNumber(tick)}
          </text>
        </g>
      ))}
      {points.map((point, position) =>
        position % labelEvery === 0 ? (
          <text
            key={point.date}
            x={x(position)}
            y={HEIGHT - 8}
            textAnchor="middle"
            fontSize="11"
            fill={MUTED}
          >
            {formatDate(point.date).replace(/ \d{4}$/, '')}
          </text>
        ) : null,
      )}
      {todayIndex !== null && (
        <g>
          <line
            x1={x(todayIndex) + PLOT_W / points.length / 2}
            x2={x(todayIndex) + PLOT_W / points.length / 2}
            y1={PADDING.top}
            y2={PADDING.top + PLOT_H}
            stroke={AXIS}
            strokeWidth="1"
          />
          <text
            x={x(todayIndex) + PLOT_W / points.length / 2 + 4}
            y={PADDING.top + 10}
            fontSize="11"
            fill={MUTED}
          >
            Aujourd’hui
          </text>
        </g>
      )}
    </g>
  );
}

function Tooltip({ children, left }) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-slate-200"
      style={{ left: `${Math.min(Math.max(left, 0), 72)}%` }}
    >
      {children}
    </div>
  );
}

function TooltipRow({ color, label, value, dashed = false }) {
  return (
    <p className="flex items-center gap-2">
      <svg aria-hidden="true" width="14" height="4">
        <line
          x1="0"
          x2="14"
          y1="2"
          y2="2"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? '3 2' : undefined}
        />
      </svg>
      <strong className="text-slate-900">{value}</strong>
      <span className="text-slate-500">{label}</span>
    </p>
  );
}

/** Ventes réelles (60 derniers jours) puis prévision jour par jour avec son intervalle à 80 %. */
export function DemandChart({ history, forecast }) {
  const titleId = useId();
  const points = [
    ...history.map((point) => ({ date: point.date, actual: point.quantity })),
    ...forecast.map((point) => ({ ...point })),
  ];
  const ticks = niceTicks(Math.max(...points.map((point) => point.actual ?? point.high ?? 0)));
  const scaleY = (value) => PADDING.top + PLOT_H - (value / ticks.at(-1)) * PLOT_H;
  const { index, x, handlers } = useCrosshair(points.length);
  const barWidth = Math.min(24, (PLOT_W / points.length) * 0.7);
  const forecastPoints = points
    .map((point, position) => ({ point, position }))
    .filter(({ point }) => point.expected !== undefined);
  const line = forecastPoints
    .map(({ point, position }) => `${x(position)},${scaleY(point.expected)}`)
    .join(' ');
  const band = [
    ...forecastPoints.map(({ point, position }) => `${x(position)},${scaleY(point.high)}`),
    ...[...forecastPoints]
      .reverse()
      .map(({ point, position }) => `${x(position)},${scaleY(point.low)}`),
  ].join(' ');
  const hovered = index !== null ? points[index] : null;

  return (
    <figure className="space-y-2">
      <figcaption id={titleId} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-semibold">Ventes par jour</span>
        <span className="flex items-center gap-1.5 text-slate-600">
          <span
            aria-hidden="true"
            className="inline-block size-3 rounded-sm"
            style={{ backgroundColor: ACTUAL }}
          />
          Ventes réelles
        </span>
        <span className="flex items-center gap-1.5 text-slate-600">
          <svg aria-hidden="true" width="16" height="4">
            <line
              x1="0"
              x2="16"
              y1="2"
              y2="2"
              stroke={FORECAST}
              strokeWidth="2"
              strokeDasharray="4 3"
            />
          </svg>
          Prévision
        </span>
        <span className="flex items-center gap-1.5 text-slate-600">
          <span
            aria-hidden="true"
            className="inline-block size-3 rounded-sm"
            style={{ backgroundColor: FORECAST, opacity: 0.15 }}
          />
          Intervalle à 80 %
        </span>
      </figcaption>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby={titleId}
          className="w-full touch-none rounded-lg focus-visible:outline-2 focus-visible:outline-brand-600"
          {...handlers}
        >
          <Axes
            ticks={ticks}
            scaleY={scaleY}
            points={points}
            x={x}
            todayIndex={history.length ? history.length - 1 : null}
          />
          {points.map((point, position) =>
            point.actual > 0 ? (
              <path
                key={point.date}
                d={roundedTopBar(
                  x(position) - barWidth / 2,
                  scaleY(point.actual),
                  barWidth,
                  scaleY(0) - scaleY(point.actual),
                )}
                fill={ACTUAL}
                opacity={index === null || index === position ? 1 : 0.75}
              />
            ) : null,
          )}
          <polygon points={band} fill={FORECAST} opacity="0.12" />
          {/* Tirets : convention d'une valeur prévue (et non mesurée) */}
          <polyline
            points={line}
            fill="none"
            stroke={FORECAST}
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {hovered && (
            <line
              x1={x(index)}
              x2={x(index)}
              y1={PADDING.top}
              y2={PADDING.top + PLOT_H}
              stroke={MUTED}
              strokeWidth="1"
            />
          )}
        </svg>
        {hovered && (
          <Tooltip left={(index / points.length) * 100}>
            <p className="mb-1 font-medium text-slate-700">{formatDate(hovered.date)}</p>
            {hovered.actual !== undefined ? (
              <TooltipRow color={ACTUAL} value={formatNumber(hovered.actual)} label="vendu(s)" />
            ) : (
              <>
                <TooltipRow
                  color={FORECAST}
                  dashed
                  value={hovered.expected.toLocaleString('fr-FR')}
                  label="prévu(s)"
                />
                <p className="text-slate-500">
                  entre {hovered.low.toLocaleString('fr-FR')} et{' '}
                  {hovered.high.toLocaleString('fr-FR')}
                </p>
              </>
            )}
          </Tooltip>
        )}
      </div>
    </figure>
  );
}

/** Stock projeté jusqu'à la rupture, avec le seuil d'alerte. */
export function ProjectedStockChart({ forecast, quantity, threshold }) {
  const titleId = useId();
  const points = [{ date: null, projectedStock: quantity }, ...forecast].map((point, position) => ({
    ...point,
    date: point.date ?? forecast[0]?.date,
    label: position === 0 ? 'Aujourd’hui' : formatDate(point.date),
  }));
  const ticks = niceTicks(Math.max(quantity, threshold ?? 0));
  const scaleY = (value) => PADDING.top + PLOT_H - (value / ticks.at(-1)) * PLOT_H;
  const { index, x, handlers } = useCrosshair(points.length);
  const stockoutIndex = points.findIndex((point) => point.projectedStock <= 0);
  const line = points
    .map((point, position) => `${x(position)},${scaleY(point.projectedStock)}`)
    .join(' ');
  const hovered = index !== null ? points[index] : null;

  return (
    <figure className="space-y-2">
      <figcaption id={titleId} className="text-sm font-semibold">
        Stock projeté (sans réapprovisionnement)
      </figcaption>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby={titleId}
          className="w-full touch-none rounded-lg focus-visible:outline-2 focus-visible:outline-brand-600"
          {...handlers}
        >
          <Axes
            ticks={ticks}
            scaleY={scaleY}
            points={points.slice(1)}
            x={(position) => x(position + 1)}
            todayIndex={null}
          />
          {threshold > 0 && (
            <g aria-hidden="true">
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={scaleY(threshold)}
                y2={scaleY(threshold)}
                stroke={MUTED}
                strokeWidth="1"
              />
              <text
                x={WIDTH - PADDING.right}
                y={scaleY(threshold) - 4}
                textAnchor="end"
                fontSize="11"
                fill={MUTED}
              >
                Seuil d’alerte ({threshold})
              </text>
            </g>
          )}
          <polygon
            points={`${x(0)},${scaleY(0)} ${line} ${x(points.length - 1)},${scaleY(0)}`}
            fill={ACTUAL}
            opacity="0.1"
          />
          <polyline
            points={line}
            fill="none"
            stroke={ACTUAL}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {stockoutIndex > 0 && (
            <circle
              cx={x(stockoutIndex)}
              cy={scaleY(0)}
              r="5"
              fill={CRITICAL}
              stroke="#ffffff"
              strokeWidth="2"
            />
          )}
          {hovered && (
            <line
              x1={x(index)}
              x2={x(index)}
              y1={PADDING.top}
              y2={PADDING.top + PLOT_H}
              stroke={MUTED}
              strokeWidth="1"
            />
          )}
        </svg>
        {hovered && (
          <Tooltip left={(index / points.length) * 100}>
            <p className="mb-1 font-medium text-slate-700">{hovered.label}</p>
            <TooltipRow
              color={ACTUAL}
              value={hovered.projectedStock.toLocaleString('fr-FR')}
              label="en stock"
            />
          </Tooltip>
        )}
      </div>
    </figure>
  );
}

/** Rectangle à coins arrondis en haut seulement (posé sur la ligne de base). */
function roundedTopBar(left, top, width, height) {
  const radius = Math.min(4, width / 2, height);
  return `M${left},${top + height} V${top + radius} Q${left},${top} ${left + radius},${top} H${left + width - radius} Q${left + width},${top} ${left + width},${top + radius} V${top + height} Z`;
}
