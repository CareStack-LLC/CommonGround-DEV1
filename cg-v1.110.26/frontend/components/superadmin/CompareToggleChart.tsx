'use client';

/**
 * Reusable time-series chart wrapper with a "Compare to prior period" toggle.
 *
 * Usage:
 *   <CompareToggleChart
 *     title="Daily signups"
 *     data={currentSeries}         // [{date, value}]
 *     priorData={priorSeries}      // [{date, prior_value}] (optional)
 *     valueLabel="signups"
 *     color="var(--cg-sage)"
 *     height={260}
 *   />
 *
 * Current + prior series are index-aligned (not date-aligned) — the X axis
 * shows the current window's dates; the prior line is drawn at matching
 * positions. This lets callers compute prior by simple slicing without
 * worrying about label collisions.
 */

import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Layers } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

interface SeriesPoint {
  date: string;
  value: number;
}

interface PriorSeriesPoint {
  date: string;
  prior_value: number;
}

interface Props {
  data: SeriesPoint[];
  priorData?: PriorSeriesPoint[];
  title?: string;
  valueLabel?: string;
  color?: string;
  height?: number;
  formatValue?: (n: number) => string;
  tooltip?: string;
}

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--foreground)',
  border: '1px solid var(--cg-slate)',
  borderRadius: 8,
  color: '#D0E4EC',
  fontSize: 12,
} as const;

const AXIS_PROPS = {
  stroke: '#4A6E7F',
  tick: { fill: 'var(--muted-foreground)', fontSize: 10 },
  tickLine: false,
} as const;

const GRID_PROPS = {
  strokeDasharray: '3 3',
  stroke: 'var(--cg-slate)',
  opacity: 0.2,
} as const;

export function CompareToggleChart({
  data,
  priorData,
  title,
  valueLabel = 'value',
  color = 'var(--cg-sage)',
  height = 260,
  formatValue,
  tooltip,
}: Props) {
  const [compareOn, setCompareOn] = useState(false);
  const hasPrior = !!priorData && priorData.length > 0;

  // Merge current + prior into one dataset, index-aligned. The X axis shows
  // the CURRENT window's dates; prior is drawn "in parallel" at the same
  // index positions.
  const merged = data.map((d, i) => ({
    date: d.date,
    value: d.value,
    prior_value: compareOn && hasPrior ? priorData![i]?.prior_value ?? null : null,
  }));

  const fmt = formatValue ?? ((n: number) => n.toLocaleString());

  return (
    <div className="bg-[#1A3648]/60 border border-cg-slate/20 rounded-xl p-5">
      {(title || hasPrior || !hasPrior) && (
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-[#D0E4EC]">
            {title}
            {tooltip && <InfoTooltip text={tooltip} />}
          </h3>
          <button
            onClick={() => setCompareOn((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
              compareOn
                ? 'bg-cg-sage/15 border-cg-sage/30 text-cg-sage-light'
                : 'bg-[#0F2533]/60 border-cg-slate/20 text-[#8AACBC] hover:text-white hover:border-cg-slate/50'
            }`}
            title="Overlay the prior period for side-by-side comparison"
          >
            <Layers className="w-3 h-3" />
            Compare to prior period
          </button>
        </div>
      )}

      {compareOn && !hasPrior && (
        <div className="text-[11px] text-amber-300/80 mb-2">
          Prior period data unavailable for this chart.
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={merged} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="date"
            {...AXIS_PROPS}
            tickFormatter={(v: string) => {
              try {
                return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              } catch {
                return v;
              }
            }}
          />
          <YAxis {...AXIS_PROPS} tickFormatter={(v: number) => fmt(v)} width={60} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, name) => {
              const v = value as number | null | undefined;
              if (v == null) return ['—', String(name)];
              return [fmt(Number(v)), name === 'prior_value' ? `Prior ${valueLabel}` : valueLabel];
            }}
            labelFormatter={(label) => {
              const l = typeof label === 'string' ? label : String(label ?? '');
              try {
                return new Date(l).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              } catch {
                return l;
              }
            }}
          />
          {compareOn && hasPrior && (
            <Legend
              wrapperStyle={{ fontSize: 10, color: '#8AACBC' }}
              iconType="plainline"
              iconSize={20}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color }}
            name={valueLabel}
          />
          {compareOn && hasPrior && (
            <Line
              type="monotone"
              dataKey="prior_value"
              stroke={color}
              strokeWidth={2}
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              dot={false}
              name={`Prior ${valueLabel}`}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
