"use client";

import { Card } from "@/components/ui/card";
import { Shield, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CaseHealthGaugeProps {
  score: number;
  trend?: "up" | "down" | "stable";
  label?: string;
  subtitle?: string;
}

export function CaseHealthGauge({
  score,
  trend = "stable",
  label = "Compliance Score",
  subtitle = "Overall case health"
}: CaseHealthGaugeProps) {
  const getHealthStatus = (score: number) => {
    if (score >= 90) return { label: "Excellent", color: "#10b981", bg: "from-emerald-500 to-teal-600" };
    if (score >= 75) return { label: "Good", color: "#14b8a6", bg: "from-teal-500 to-cyan-600" };
    if (score >= 60) return { label: "Fair", color: "#f59e0b", bg: "from-amber-500 to-orange-600" };
    return { label: "Concerning", color: "#ef4444", bg: "from-red-500 to-rose-600" };
  };

  const health = getHealthStatus(score);
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (score / 100) * circumference;

  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
  };

  return (
    <Card className="border-slate-200/60 shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 bg-gradient-to-br ${health.bg} text-white rounded-xl shadow-lg`}>
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{label}</h3>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          {/* SVG Gauge */}
          <svg className="transform -rotate-90" width="200" height="200">
            {/* Background circle */}
            <circle
              cx="100"
              cy="100"
              r="70"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="12"
            />
            {/* Progress circle */}
            <circle
              cx="100"
              cy="100"
              r="70"
              fill="none"
              stroke={health.color}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold" style={{ color: health.color }}>
              {score}
            </div>
            <div className="text-sm font-medium text-slate-500 mt-1">out of 100</div>
            <div className="flex items-center gap-1 mt-2">
              {getTrendIcon()}
              <span className="text-xs font-semibold text-slate-600">{health.label}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2">
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
              Excellent
            </p>
            <div className="h-1.5 bg-emerald-500 rounded-full" />
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
              Good
            </p>
            <div className="h-1.5 bg-teal-500 rounded-full" />
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
              Fair
            </p>
            <div className="h-1.5 bg-amber-500 rounded-full" />
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
              Poor
            </p>
            <div className="h-1.5 bg-red-500 rounded-full" />
          </div>
        </div>
      </div>
    </Card>
  );
}
