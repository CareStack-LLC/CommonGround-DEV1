'use client';

import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatNumber } from '@/components/superadmin';
import {
  type AriaInsights,
  SENTIMENT_COLORS, LEVEL_COLORS, CustomTooltipStyle,
} from './page';

export default function OverviewTab({ data }: { data: AriaInsights }) {
  const sentimentData = data.sentiment_distribution
    ? Object.entries(data.sentiment_distribution).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-4">
      {/* Daily Interventions Chart */}
      <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">
          Daily Interventions ({data.days}d)
        </h2>
        {data.daily_interventions?.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.daily_interventions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }
                axisLine={{ stroke: '#3f3f46' }}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={CustomTooltipStyle}
                labelFormatter={(v) =>
                  new Date(v).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                }
              />
              <Line
                type="monotone"
                dataKey="count"
                name="Interventions"
                stroke="#14b8a6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#14b8a6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[#4A6E7F] text-sm text-center py-10">No intervention data</p>
        )}
      </div>

      {/* Sentiment + Intervention Levels */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">Sentiment Distribution</h2>
          {sentimentData.length > 0 && sentimentData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                >
                  {sentimentData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={SENTIMENT_COLORS[entry.name.toLowerCase()] || '#71717a'}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={CustomTooltipStyle} />
                <Legend
                  verticalAlign="bottom"
                  formatter={(value: string) => (
                    <span className="text-[#8AACBC] text-xs capitalize">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[#4A6E7F] text-sm text-center py-10">No sentiment data</p>
          )}
        </div>

        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">Intervention Levels</h2>
          {data.intervention_levels?.length ? (
            <div className="space-y-3 pt-2">
              {data.intervention_levels.map((lvl, i) => {
                const maxCount = Math.max(...data.intervention_levels.map((l) => l.count));
                const pct = maxCount > 0 ? (lvl.count / maxCount) * 100 : 0;
                return (
                  <div key={lvl.level}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#8AACBC]">{lvl.label}</span>
                      <span className="text-[#D0E4EC] font-medium">{formatNumber(lvl.count)}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: LEVEL_COLORS[i] || '#71717a',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[#4A6E7F] text-sm text-center py-10">No level data</p>
          )}
        </div>
      </div>

      {/* Processing Time + Circle/Call Summary */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-3">Processing Time</h2>
          <div className="space-y-3">
            {[
              { label: 'Average', value: `${Math.round(data.processing_time?.avg_ms || 0)}ms` },
              { label: 'Min', value: `${data.processing_time?.min_ms || 0}ms` },
              { label: 'Max', value: `${data.processing_time?.max_ms || 0}ms` },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-xs text-[#6B8A9A]">{item.label}</span>
                <span className="text-sm font-medium text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-3">Circle (KidComs)</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#6B8A9A]">Analyzed</span>
              <span className="text-sm font-medium text-white">
                {formatNumber(data.circle_data?.total_analyzed || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#6B8A9A]">Flagged</span>
              <span className="text-sm font-medium text-red-400">
                {formatNumber(data.circle_data?.total_flagged || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#6B8A9A]">Flag Rate</span>
              <span className="text-sm font-medium text-white">
                {data.circle_data?.intervention_rate || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#6B8A9A]">Avg Response</span>
              <span className="text-sm font-medium text-white">
                {Math.round(data.circle_data?.avg_response_time_ms || 0)}ms
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-3">Call Safety</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#6B8A9A]">Sessions</span>
              <span className="text-sm font-medium text-white">
                {formatNumber(data.call_data?.total_sessions || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#6B8A9A]">Interventions</span>
              <span className="text-sm font-medium text-amber-400">
                {formatNumber(data.call_data?.total_interventions || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#6B8A9A]">Terminated</span>
              <span className="text-sm font-medium text-red-400">
                {formatNumber(data.call_data?.terminated_count || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#6B8A9A]">Avg Safety Score</span>
              <span className="text-sm font-medium text-white">
                {data.call_data?.avg_safety_score || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
