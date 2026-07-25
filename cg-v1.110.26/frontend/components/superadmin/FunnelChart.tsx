'use client';

import { InfoTooltip } from './InfoTooltip';
import { formatNumber } from './helpers';

interface FunnelStage {
  name: string;
  count: number;
  color?: string;
}

interface FunnelChartProps {
  stages: FunnelStage[];
  title?: string;
  tooltip?: string;
}

const DEFAULT_COLORS = [
  'bg-cg-sage',
  'bg-cg-slate-light',
  'bg-cg-slate',
  'bg-cg-amber',
  'bg-[#E8834A]',
  'bg-cg-error',
];

export function FunnelChart({ stages, title = 'Conversion Funnel', tooltip }: FunnelChartProps) {
  if (!stages.length) return null;

  const maxVal = stages[0]?.count || 1;

  return (
    <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-cg-slate-tint mb-4">
        {title}
        {tooltip && <InfoTooltip text={tooltip} />}
      </h2>

      <div className="space-y-2">
        {stages.map((stage, i) => {
          const pct = maxVal > 0 ? (stage.count / maxVal) * 100 : 0;
          const convRate = i > 0 && stages[i - 1].count > 0
            ? ((stage.count / stages[i - 1].count) * 100).toFixed(1)
            : null;
          const colorClass = stage.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];

          return (
            <div key={stage.name} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-cg-slate-muted">{stage.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-cg-slate-tint">{formatNumber(stage.count)}</span>
                  {convRate && (
                    <span className="text-[10px] text-muted-foreground">({convRate}%)</span>
                  )}
                </div>
              </div>
              <div className="h-6 bg-foreground rounded-lg overflow-hidden relative">
                <div
                  className={`h-full rounded-lg ${colorClass} transition-all duration-700 ease-out`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              {convRate && (
                <div className="flex justify-end mt-0.5">
                  <span className="text-[10px] text-cg-slate-strong">
                    {convRate}% from {stages[i - 1].name}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
