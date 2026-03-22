"use client";

import { type LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { InfoTooltip } from "./InfoTooltip";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
  color?: "sage" | "ocean" | "gold" | "sky" | "coral" | "neutral";
  alert?: boolean;
  tooltip?: string;
  sparklineData?: number[];
}

const COLOR_MAP = {
  sage: { icon: "text-[#3DAA8A]", bg: "bg-[#3DAA8A]/10", border: "border-[#3DAA8A]/20" },
  ocean: { icon: "text-[#2D6A8F]", bg: "bg-[#2D6A8F]/10", border: "border-[#2D6A8F]/20" },
  gold: { icon: "text-[#F5A623]", bg: "bg-[#F5A623]/10", border: "border-[#F5A623]/20" },
  sky: { icon: "text-[#4BA8C8]", bg: "bg-[#4BA8C8]/10", border: "border-[#4BA8C8]/20" },
  coral: { icon: "text-[#C53030]", bg: "bg-[#C53030]/10", border: "border-[#C53030]/20" },
  neutral: { icon: "text-[#8AACBC]", bg: "bg-[#8AACBC]/10", border: "border-[#8AACBC]/20" },
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
  color = "neutral",
  alert,
  tooltip,
  sparklineData,
}: MetricCardProps) {
  const c = COLOR_MAP[color];

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${c.bg} ${c.border} ${
        alert ? "ring-1 ring-[#F5A623]/40" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-lg ${c.bg}`}>
            <Icon className={`w-4 h-4 ${c.icon}`} />
          </div>
          <span className="text-xs text-[#8AACBC] font-medium">
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
        {sub && <span className="text-[11px] text-[#6B8A9A]">{sub}</span>}
        {trend !== undefined && trend !== 0 && (
          <span
            className={`flex items-center gap-0.5 text-[11px] font-medium ${
              trend > 0 ? "text-[#3DAA8A]" : "text-[#C53030]"
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
    <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-3 flex items-center gap-3">
      <Icon className="w-4 h-4 text-[#6B8A9A] flex-shrink-0" />
      <div>
        <div className="text-[11px] text-[#6B8A9A]">
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
