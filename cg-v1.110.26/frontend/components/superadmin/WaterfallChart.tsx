'use client';

import { InfoTooltip } from './InfoTooltip';
import { formatCurrency } from './helpers';

interface WaterfallItem {
  label: string;
  value: number;
  type: 'positive' | 'negative' | 'total';
}

interface WaterfallChartProps {
  items: WaterfallItem[];
  title?: string;
  tooltip?: string;
}

export function WaterfallChart({ items, title = 'MRR Movement', tooltip }: WaterfallChartProps) {
  if (!items.length) return null;

  const maxAbs = Math.max(...items.map(i => Math.abs(i.value)), 1);

  return (
    <div className="bg-[#1A3648]/60 border border-cg-slate/20 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">
        {title}
        {tooltip && <InfoTooltip text={tooltip} />}
      </h2>

      <div className="flex items-end gap-2 h-40">
        {items.map((item, i) => {
          const height = Math.max((Math.abs(item.value) / maxAbs) * 100, 8);
          const isPositive = item.type === 'positive' || (item.type === 'total' && item.value >= 0);
          const isTotal = item.type === 'total';

          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              {/* Value label */}
              <div className="text-[10px] font-medium mb-1 text-center whitespace-nowrap">
                <span className={
                  isTotal ? 'text-[#D0E4EC]' :
                  isPositive ? 'text-emerald-400' : 'text-red-400'
                }>
                  {item.value >= 0 ? '+' : ''}{formatCurrency(item.value)}
                </span>
              </div>

              {/* Bar */}
              <div
                className={`w-full rounded-t transition-all ${
                  isTotal
                    ? 'bg-cg-sage/80 border-2 border-cg-sage/40'
                    : isPositive
                    ? 'bg-emerald-500/60 group-hover:bg-emerald-500/80'
                    : 'bg-red-400/60 group-hover:bg-red-400/80'
                }`}
                style={{ height: `${height}%` }}
              />

              {/* Label */}
              <div className="text-[10px] text-muted-foreground mt-1.5 text-center leading-tight whitespace-nowrap">
                {item.label}
              </div>

              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                {item.label}: {formatCurrency(item.value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
