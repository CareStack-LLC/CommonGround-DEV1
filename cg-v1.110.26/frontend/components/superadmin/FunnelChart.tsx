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
  'bg-[#3DAA8A]',
  'bg-[#4BA8C8]',
  'bg-[#2D6A8F]',
  'bg-[#F5A623]',
  'bg-[#E8834A]',
  'bg-[#C53030]',
];

export function FunnelChart({ stages, title = 'Conversion Funnel', tooltip }: FunnelChartProps) {
  if (!stages.length) return null;

  const maxVal = stages[0]?.count || 1;

  return (
    <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">
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
                <span className="text-xs text-[#8AACBC]">{stage.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#D0E4EC]">{formatNumber(stage.count)}</span>
                  {convRate && (
                    <span className="text-[10px] text-[#6B8A9A]">({convRate}%)</span>
                  )}
                </div>
              </div>
              <div className="h-6 bg-[#1E3A4A] rounded-lg overflow-hidden relative">
                <div
                  className={`h-full rounded-lg ${colorClass} transition-all duration-700 ease-out`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              {convRate && (
                <div className="flex justify-end mt-0.5">
                  <span className="text-[10px] text-[#4A6E7F]">
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
