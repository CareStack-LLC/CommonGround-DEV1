"use client";

import { type LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { InfoTooltip } from "./InfoTooltip";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
  color?: "violet" | "emerald" | "blue" | "amber" | "red" | "slate";
  alert?: boolean;
  tooltip?: string;
  sparklineData?: number[];
}

const COLOR_MAP = {
  violet: { icon: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  blue: { icon: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  amber: { icon: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  red: { icon: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  slate: { icon: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20" },
};

function MiniSparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 60;
  const h = 20;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} className="opacity-60">
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
  color = "slate",
  alert,
  tooltip,
  sparklineData,
}: MetricCardProps) {
  const c = COLOR_MAP[color];

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${c.bg} ${c.border} ${
        alert ? "ring-1 ring-amber-500/40" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-lg ${c.bg}`}>
            <Icon className={`w-4 h-4 ${c.icon}`} />
          </div>
          <span className="text-xs text-zinc-500 font-medium">
            {label}
            {tooltip && <InfoTooltip text={tooltip} />}
          </span>
        </div>
        {sparklineData && (
          <div className={c.icon}>
            <MiniSparkline data={sparklineData} />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        {sub && <span className="text-[11px] text-zinc-500">{sub}</span>}
        {trend !== undefined && trend !== 0 && (
          <span
            className={`flex items-center gap-0.5 text-[11px] font-medium ${
              trend > 0 ? "text-emerald-400" : "text-red-400"
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
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3 flex items-center gap-3">
      <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
      <div>
        <div className="text-[11px] text-zinc-500">
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
