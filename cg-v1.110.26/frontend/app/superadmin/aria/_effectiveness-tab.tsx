'use client';

import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatNumber } from '@/components/superadmin';
import { type AriaInsights, CustomTooltipStyle } from './page';

export default function EffectivenessTab({ data }: { data: AriaInsights }) {
  const trendData = data.weekly_trends?.map((w) => ({
    week: new Date(w.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    acceptance_rate: w.acceptance_rate,
    avg_toxicity: w.avg_toxicity,
    total: w.total,
    accepted: w.accepted,
  })) || [];

  // Calculate trend direction
  const recentAcceptance = trendData.length >= 2
    ? trendData[trendData.length - 1]?.acceptance_rate - trendData[trendData.length - 2]?.acceptance_rate
    : 0;
  const recentToxicity = trendData.length >= 2
    ? trendData[trendData.length - 1]?.avg_toxicity - trendData[trendData.length - 2]?.avg_toxicity
    : 0;

  // Circle vs parent comparison
  const parentFlagRate = data.intervention_rate || 0;
  const circleFlagRate = data.circle_data?.intervention_rate || 0;

  return (
    <div className="space-y-4">
      {/* Key effectiveness indicators */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <EffectivenessCard
          label="Acceptance Rate"
          value={`${data.acceptance_rate}%`}
          trend={recentAcceptance}
          trendLabel="vs last week"
          good={recentAcceptance >= 0}
        />
        <EffectivenessCard
          label="Override Rate"
          value={`${data.total_interventions > 0 ? ((data.sent_anyway_count / data.total_interventions) * 100).toFixed(1) : 0}%`}
          trend={0}
          trendLabel="sent anyway"
          good={false}
          highlight={data.sent_anyway_count > 0}
        />
        <EffectivenessCard
          label="Parent Flag Rate"
          value={`${parentFlagRate}%`}
          trend={0}
          trendLabel="of parent messages"
          good={parentFlagRate < 10}
        />
        <EffectivenessCard
          label="Circle Flag Rate"
          value={`${circleFlagRate}%`}
          trend={0}
          trendLabel="of circle messages"
          good={circleFlagRate < 5}
        />
      </div>

      {/* Weekly Acceptance Rate Trend */}
      {trendData.length > 1 && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-1">
            Weekly Acceptance Rate
          </h2>
          <p className="text-xs text-[#4A6E7F] mb-4">
            Higher is better — shows how often users accept or modify ARIA suggestions
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="week"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={CustomTooltipStyle}
                formatter={(value?: number, name?: string) => {
                  if (name === 'acceptance_rate') return [`${value ?? 0}%`, 'Acceptance Rate'];
                  return [value ?? 0, name ?? ''];
                }}
              />
              <Line
                type="monotone"
                dataKey="acceptance_rate"
                name="acceptance_rate"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly Toxicity Trend */}
      {trendData.length > 1 && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-1">
            Weekly Average Toxicity Score
          </h2>
          <p className="text-xs text-[#4A6E7F] mb-4">
            Lower is better — tracks if flagged message toxicity is decreasing over time
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="week"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 1]}
              />
              <Tooltip
                contentStyle={CustomTooltipStyle}
                formatter={(value?: number) => [(value ?? 0).toFixed(3), 'Avg Toxicity']}
              />
              <Line
                type="monotone"
                dataKey="avg_toxicity"
                name="Avg Toxicity"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3, fill: '#ef4444' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Intervention Volume Trend */}
      {trendData.length > 1 && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-1">
            Weekly Intervention Volume
          </h2>
          <p className="text-xs text-[#4A6E7F] mb-4">
            Total flags per week — accepted vs total
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="week"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={CustomTooltipStyle} />
              <Line
                type="monotone"
                dataKey="total"
                name="Total Flags"
                stroke="#6B8A9A"
                strokeWidth={2}
                dot={{ r: 3, fill: '#6B8A9A' }}
              />
              <Line
                type="monotone"
                dataKey="accepted"
                name="Accepted"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {trendData.length <= 1 && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-10 text-center">
          <p className="text-[#4A6E7F] text-sm">
            Not enough data for trend analysis. Need at least 2 weeks of ARIA activity.
          </p>
        </div>
      )}

      {/* Top Cases */}
      {data.top_cases?.length > 0 && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-1">
            Top Cases by Interventions
          </h2>
          <p className="text-xs text-[#4A6E7F] mb-4">
            Family files with the most ARIA interventions in this period
          </p>
          <div className="space-y-2">
            {data.top_cases.map((tc, i) => {
              const maxCount = data.top_cases[0]?.count || 1;
              const pct = (tc.count / maxCount) * 100;
              return (
                <div key={tc.family_file_id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#8AACBC] font-mono">
                      {tc.family_file_id.slice(0, 8)}...
                    </span>
                    <span className="text-[#D0E4EC] font-medium">
                      {formatNumber(tc.count)} interventions
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#2D6A8F] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function EffectivenessCard({
  label,
  value,
  trend,
  trendLabel,
  good,
  highlight,
}: {
  label: string;
  value: string;
  trend: number;
  trendLabel: string;
  good: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? 'bg-red-500/5 border-red-500/20'
          : 'bg-[#1A3648]/60 border-[#2D6A8F]/20'
      }`}
    >
      <div className="text-xs text-[#6B8A9A] mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="flex items-center gap-1 mt-1">
        {trend !== 0 && (
          <span
            className={`text-[11px] font-medium ${
              (good && trend > 0) || (!good && trend < 0)
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
          >
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
        <span className="text-[11px] text-[#6B8A9A]">{trendLabel}</span>
      </div>
    </div>
  );
}
