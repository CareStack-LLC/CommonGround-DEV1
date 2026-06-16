'use client';

import {
  BarChart, Bar, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Activity, MessageSquare, XCircle, Send, PhoneOff,
} from 'lucide-react';
import { formatNumber } from '@/components/superadmin';
import { type AriaInsights, ACTION_COLORS, CustomTooltipStyle } from './page';

export default function ActionsTab({ data }: { data: AriaInsights }) {
  const actionData = data.action_breakdown
    ? Object.entries(data.action_breakdown).map(([action, count]) => ({
        action: action.replace('_', ' '),
        rawAction: action,
        count,
        fill: ACTION_COLORS[action] || '#71717a',
      }))
    : [];

  const sentAnywayRate = data.total_interventions > 0
    ? ((data.sent_anyway_count / data.total_interventions) * 100).toFixed(1)
    : '0';

  // Weekly acceptance rate trend from weekly_trends
  const trendData = data.weekly_trends?.map((w) => ({
    week: new Date(w.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    acceptance_rate: w.acceptance_rate,
    total: w.total,
  })) || [];

  const ACTION_ITEMS = [
    { label: 'Accepted Suggestion', key: 'accepted', icon: Activity, color: 'text-emerald-400', desc: 'User used ARIA rewrite' },
    { label: 'Modified Suggestion', key: 'modified', icon: MessageSquare, color: 'text-blue-400', desc: 'User edited the rewrite' },
    { label: 'Rejected Suggestion', key: 'rejected', icon: XCircle, color: 'text-amber-400', desc: 'User dismissed the suggestion' },
    { label: 'Sent Anyway', key: 'sent_anyway', icon: Send, color: 'text-red-400', desc: 'User overrode ARIA and sent original' },
    { label: 'Cancelled', key: 'cancelled', icon: PhoneOff, color: 'text-[#6B8A9A]', desc: 'User cancelled the message entirely' },
  ];

  return (
    <div className="space-y-4">
      {/* Sent Anyway Rate highlight */}
      <div className="bg-gradient-to-r from-red-900/20 to-transparent border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-red-400 font-medium mb-0.5">Override Rate</div>
          <div className="text-sm text-[#8AACBC]">
            Users who ignored ARIA and sent the original message
          </div>
        </div>
        <div className="text-3xl font-bold text-red-400">{sentAnywayRate}%</div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Action breakdown bar chart */}
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">User Response Actions</h2>
          {actionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={actionData} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="action"
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <Tooltip contentStyle={CustomTooltipStyle} />
                <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]} barSize={20}>
                  {actionData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[#4A6E7F] text-sm text-center py-10">No action data</p>
          )}
        </div>

        {/* Action summary cards */}
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">Action Summary</h2>
          <div className="space-y-3">
            {ACTION_ITEMS.map(({ label, key, icon: Icon, color, desc }) => (
              <div
                key={key}
                className="flex items-center gap-3 p-3 rounded-lg bg-[#2D6A8F]/10"
              >
                <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                <div className="flex-1">
                  <div className="text-sm text-white font-medium">{label}</div>
                  <div className="text-xs text-[#6B8A9A]">{desc}</div>
                </div>
                <div className="text-lg font-bold text-zinc-100">
                  {formatNumber(data.action_breakdown?.[key] ?? 0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Acceptance Rate Trend */}
      {trendData.length > 1 && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">
            Weekly Acceptance Rate Trend
          </h2>
          <ResponsiveContainer width="100%" height={220}>
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
                formatter={(value) => [`${Number(value ?? 0)}%`, 'Acceptance Rate']}
              />
              <Line
                type="monotone"
                dataKey="acceptance_rate"
                name="Acceptance Rate"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10b981' }}
                activeDot={{ r: 5, fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Circle action breakdown */}
      {data.circle_data?.action_breakdown && Object.keys(data.circle_data.action_breakdown).length > 0 && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">
            Circle (KidComs) Actions
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {Object.entries(data.circle_data.action_breakdown).map(([action, count]) => (
              <div
                key={action}
                className="p-3 bg-[#2D6A8F]/10 rounded-lg text-center"
              >
                <div
                  className="text-lg font-bold"
                  style={{ color: ACTION_COLORS[action] || '#fff' }}
                >
                  {count}
                </div>
                <div className="text-[11px] text-[#6B8A9A] capitalize mt-0.5">
                  {action.replace(/_/g, ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
