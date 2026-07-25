'use client';

import { InfoTooltip } from './InfoTooltip';

interface CohortData {
  month: string;
  size: number;
  retention: number[];
}

interface CohortHeatmapProps {
  cohorts: CohortData[];
  title?: string;
}

function getColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500/80';
  if (pct >= 60) return 'bg-emerald-500/50';
  if (pct >= 40) return 'bg-amber-500/50';
  if (pct >= 20) return 'bg-amber-500/30';
  if (pct > 0) return 'bg-red-400/30';
  return 'bg-foreground';
}

export function CohortHeatmap({ cohorts, title = 'Cohort Retention' }: CohortHeatmapProps) {
  if (!cohorts.length) return null;

  const maxMonths = Math.max(...cohorts.map(c => c.retention.length));

  return (
    <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-cg-slate-tint mb-4">
        {title}
        <InfoTooltip text="Monthly cohort retention rates. Each row is a signup month, columns show % retained in subsequent months." />
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-1.5 font-medium text-muted-foreground w-20">Cohort</th>
              <th className="text-right py-1.5 font-medium text-muted-foreground w-14">Size</th>
              {Array.from({ length: maxMonths }).map((_, i) => (
                <th key={i} className="text-center py-1.5 font-medium text-muted-foreground w-12">
                  M{i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((cohort) => (
              <tr key={cohort.month} className="border-t border-cg-slate/10">
                <td className="py-1 text-cg-slate-muted font-mono">{cohort.month}</td>
                <td className="py-1 text-right text-muted-foreground">{cohort.size}</td>
                {Array.from({ length: maxMonths }).map((_, i) => {
                  const val = cohort.retention[i];
                  return (
                    <td key={i} className="py-1 text-center">
                      {val !== undefined ? (
                        <div className="group relative inline-block">
                          <div className={`w-10 h-6 rounded flex items-center justify-center text-[10px] font-medium text-white/90 ${getColor(val)}`}>
                            {val}%
                          </div>
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-foreground text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                            {cohort.month} → Month {i}: {val}%
                          </div>
                        </div>
                      ) : (
                        <div className="w-10 h-6 rounded bg-foreground/30" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
