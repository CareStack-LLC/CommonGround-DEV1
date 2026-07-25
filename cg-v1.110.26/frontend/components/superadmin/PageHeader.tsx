"use client";

import { RefreshCw, Radio } from "lucide-react";
import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  loading?: boolean;
  showLiveIndicator?: boolean;
  liveInterval?: string;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  onRefresh,
  loading,
  showLiveIndicator,
  liveInterval = "30s",
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm text-[#8AACBC] mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {showLiveIndicator && (
          <span className="flex items-center gap-1.5 text-[11px] text-cg-sage-light/80">
            <Radio className="w-3 h-3 animate-pulse" />
            Live — auto-refresh {liveInterval}
          </span>
        )}
        {actions}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cg-slate/20 hover:bg-cg-slate/30 text-[#8AACBC] hover:text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}
