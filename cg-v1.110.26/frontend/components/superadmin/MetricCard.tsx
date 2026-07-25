"use client";

import { type LucideIcon, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from "lucide-react";
import { InfoTooltip } from "./InfoTooltip";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  /** Numeric trend percentage (signed). Displayed as arrow + abs value. Kept for backward compat. */
  trend?: number;
  color?: "sage" | "ocean" | "gold" | "sky" | "coral" | "neutral";
  alert?: boolean;
  tooltip?: string;
  /** Legacy prop — short numeric series for the inline sparkline. */
  sparklineData?: number[];
  /** Wave 1: same purpose as sparklineData, clearer name. If both are passed, trendData wins. */
  trendData?: number[];
  /** Wave 1: label shown next to comparisonPct, e.g. "7d". */
  trendLabel?: string;
  /** Wave 1: signed percent delta vs prior period, e.g. +12 or -8. Renders below the main value. */
  comparisonPct?: number;
  /** Wave 1: switches padding + text size for dense dashboards. */
  density?: "compact" | "comfortable";
}

const COLOR_MAP = {
  sage: { icon: "text-cg-sage", bg: "bg-cg-sage/10", border: "border-cg-sage/20" },
  ocean: { icon: "text-cg-slate", bg: "bg-cg-slate/10", border: "border-cg-slate/20" },
  gold: { icon: "text-cg-amber", bg: "bg-cg-amber/10", border: "border-cg-amber/20" },
  sky: { icon: "text-cg-slate-light", bg: "bg-cg-slate-light/10", border: "border-cg-slate-light/20" },
  coral: { icon: "text-cg-error", bg: "bg-cg-error/10", border: "border-cg-error/20" },
  neutral: { icon: "text-cg-slate-muted", bg: "bg-cg-slate-muted/10", border: "border-cg-slate-muted/20" },
};

function MiniSparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 60;
  const h = 24;
  // Build polyline points (normalized to min..max so flat-ish series doesn't pin to y=0)
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  // Build filled-area path (polyline + baseline close)
  const lastX = w;
  const firstX = 0;
  const areaPath = `M ${firstX},${h} L ${points.join(" L ")} L ${lastX},${h} Z`;
  return (
    <svg width={w} height={h} className="opacity-80 overflow-visible">
      <path d={areaPath} fill="currentColor" fillOpacity={0.15} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  color = "neutral",
  alert,
  tooltip,
  sparklineData,
  trendData,
  trendLabel,
  comparisonPct,
  density = "comfortable",
}: MetricCardProps) {
  const c = COLOR_MAP[color];
  const compact = density === "compact";

  // Prefer the newer prop name when both are provided.
  const spark = trendData ?? sparklineData;

  return (
    <div
      className={`rounded-xl border ${compact ? "p-3" : "p-4"} transition-colors ${c.bg} ${c.border} ${
        alert ? "ring-1 ring-cg-amber/40" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`flex items-center gap-2 ${compact ? "mb-1" : "mb-2"}`}>
          <div className={`${compact ? "p-1" : "p-1.5"} rounded-lg ${c.bg}`}>
            <Icon className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} ${c.icon}`} />
          </div>
          <span className={`${compact ? "text-[11px]" : "text-xs"} text-cg-slate-muted font-medium`}>
            {label}
            {tooltip && <InfoTooltip text={tooltip} />}
          </span>
        </div>
        {spark && (
          <div className={c.icon}>
            <MiniSparkline data={spark} />
          </div>
        )}
      </div>
      <div className={`${compact ? "text-xl" : "text-2xl"} font-bold text-white`}>{value}</div>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        {sub && <span className={`${compact ? "text-[10px]" : "text-[11px]"} text-muted-foreground`}>{sub}</span>}
        {trend !== undefined && trend !== 0 && (
          <span
            className={`flex items-center gap-0.5 text-[11px] font-medium ${
              trend > 0 ? "text-cg-sage" : "text-cg-error"
            }`}
          >
            {trend > 0 ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {Math.abs(trend)}%
          </span>
        )}
        {comparisonPct !== undefined && comparisonPct !== 0 && (
          <span
            className={`flex items-center gap-0.5 text-[11px] font-medium ${
              comparisonPct > 0 ? "text-cg-sage" : "text-cg-error"
            }`}
          >
            {comparisonPct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {comparisonPct > 0 ? "+" : ""}{comparisonPct}%
            {trendLabel ? <span className="text-muted-foreground ml-0.5">vs prior {trendLabel}</span> : null}
          </span>
        )}
      </div>
    </div>
  );
}

/** Compact metric for secondary rows */
export function SmallMetric({
  label,
  value,
  icon: Icon,
  valueColor,
  tooltip,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  valueColor?: string;
  tooltip?: string;
}) {
  return (
    <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-3 flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div>
        <div className="text-[11px] text-muted-foreground">
          {label}
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        <div className={`text-sm font-semibold ${valueColor || "text-white"}`}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
      </div>
    </div>
  );
}
