'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Shield, RefreshCw, AlertTriangle, Brain,
  MessageSquare, PhoneOff, Activity, Send, XCircle,
  BarChart3, TrendingUp, Layers,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AriaInsights {
  total_interventions: number;
  last_7d: number;
  last_30d: number;
  acceptance_rate: number;
  blocked_count: number;
  sent_anyway_count: number;
  rejected_count: number;
  ai_calls: number;
  intervention_rate: number;
  avg_messages_per_day: number;
  total_messages_30d: number;
  daily_interventions: { date: string; count: number }[];
  top_categories: { category: string; count: number }[];
  detailed_categories: { category: string; count: number }[];
  action_breakdown: Record<string, number>;
  intervention_levels: { level: number; label: string; count: number }[];
  sentiment_distribution: Record<string, number>;
  recent_flagged: {
    timestamp: string;
    sender_email: string;
    category: string;
    message_preview: string;
  }[];
}

type TabKey = 'overview' | 'categories' | 'actions' | 'messages';

function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`} />;
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#10b981',
  neutral: '#71717a',
  negative: '#ef4444',
};

const ACTION_COLORS: Record<string, string> = {
  accepted: '#10b981',
  modified: '#3b82f6',
  rejected: '#f59e0b',
  sent_anyway: '#ef4444',
  cancelled: '#71717a',
};

const LEVEL_COLORS = ['#71717a', '#f59e0b', '#f97316', '#ef4444'];

const CustomTooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid rgba(63,63,70,0.6)',
  borderRadius: '8px',
  color: '#e4e4e7',
  fontSize: '12px',
};

export default function AriaInsightsPage() {
  const [data, setData] = useState<AriaInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noData, setNoData] = useState(false);
  const [tab, setTab] = useState<TabKey>('overview');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNoData(false);

      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${API_BASE}/api/v1/admin/aria/insights`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 404) { setNoData(true); return; }
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `API error ${res.status}`);
      }

      const json = await res.json();
      if (!json || (json.total_interventions === 0 && (!json.daily_interventions || json.daily_interventions.length === 0))) {
        setNoData(true);
        return;
      }
      setData(json);
    } catch (err: unknown) {
      if (!noData) {
        setError(err instanceof Error ? err.message : 'Failed to load ARIA insights');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-zinc-400 mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">Retry</button>
      </div>
    );
  }

  if (!loading && noData) {
    return (
      <div className="space-y-6">
        <Header loading={false} onRefresh={fetchData} />
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/50 border border-zinc-800/60 rounded-xl">
          <Brain className="w-12 h-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 text-lg font-medium">No ARIA data available yet</p>
          <p className="text-zinc-600 text-sm mt-1">ARIA insights will appear once the system processes interactions.</p>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'categories', label: 'Categories', icon: Layers },
    { key: 'actions', label: 'User Actions', icon: BarChart3 },
    { key: 'messages', label: 'Flagged Messages', icon: MessageSquare },
  ];

  const sentimentData = data?.sentiment_distribution
    ? Object.entries(data.sentiment_distribution).map(([name, value]) => ({ name, value }))
    : [];

  const actionData = data?.action_breakdown
    ? Object.entries(data.action_breakdown).map(([action, count]) => ({
        action: action.replace('_', ' '),
        count,
        fill: ACTION_COLORS[action] || '#71717a',
      }))
    : [];

  return (
    <div className="space-y-6">
      <Header loading={loading} onRefresh={fetchData} />

      {/* Metric Cards — 6 across */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : data && (
          <>
            <MetricCard icon={Shield} label="Total Interventions" value={formatNumber(data.total_interventions)} color="teal" />
            <MetricCard icon={Activity} label="Acceptance Rate" value={`${data.acceptance_rate}%`} color="emerald" />
            <MetricCard icon={PhoneOff} label="Blocked" value={formatNumber(data.blocked_count)} color="red" />
            <MetricCard icon={Send} label="Sent Anyway" value={formatNumber(data.sent_anyway_count)} color="amber" />
            <MetricCard icon={TrendingUp} label="Avg Msgs/Day" value={String(data.avg_messages_per_day)} color="blue" />
            <MetricCard icon={Brain} label="Intervention Rate" value={`${data.intervention_rate}%`} color="violet" />
          </>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === t.key
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Daily Interventions Chart */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Daily Interventions (30 days)</h2>
            {data?.daily_interventions?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.daily_interventions}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} axisLine={{ stroke: '#3f3f46' }} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CustomTooltipStyle} labelFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} />
                  <Line type="monotone" dataKey="count" name="Interventions" stroke="#14b8a6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#14b8a6' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-zinc-600 text-sm text-center py-10">No intervention data</p>}
          </div>

          {/* Sentiment + Intervention Levels */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-zinc-300 mb-4">Sentiment Distribution</h2>
              {sentimentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" nameKey="name" stroke="none">
                      {sentimentData.map((entry) => (
                        <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name.toLowerCase()] || '#71717a'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CustomTooltipStyle} />
                    <Legend verticalAlign="bottom" formatter={(value: string) => <span className="text-zinc-400 text-xs capitalize">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-zinc-600 text-sm text-center py-10">No sentiment data</p>}
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-zinc-300 mb-4">Intervention Levels</h2>
              {data?.intervention_levels?.length ? (
                <div className="space-y-3">
                  {data.intervention_levels.map((lvl, i) => {
                    const maxCount = Math.max(...data.intervention_levels.map(l => l.count));
                    const pct = maxCount > 0 ? (lvl.count / maxCount * 100) : 0;
                    return (
                      <div key={lvl.level}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-400">{lvl.label}</span>
                          <span className="text-zinc-300 font-medium">{formatNumber(lvl.count)}</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: LEVEL_COLORS[i] || '#71717a' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-zinc-600 text-sm text-center py-10">No level data</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'categories' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">By Severity</h2>
            {data?.top_categories?.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.top_categories} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={CustomTooltipStyle} />
                  <Bar dataKey="count" name="Flags" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-zinc-600 text-sm text-center py-10">No severity data</p>}
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Detected Categories (30d)</h2>
            {data?.detailed_categories?.length ? (
              <div className="space-y-2">
                {data.detailed_categories.map((cat) => {
                  const maxCat = Math.max(...data.detailed_categories.map(c => c.count));
                  const pct = maxCat > 0 ? (cat.count / maxCat * 100) : 0;
                  return (
                    <div key={cat.category}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400 capitalize">{cat.category.replace(/_/g, ' ')}</span>
                        <span className="text-zinc-300 font-medium">{cat.count}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-zinc-600 text-sm text-center py-10">No category data</p>}
          </div>
        </div>
      )}

      {tab === 'actions' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">User Response Actions</h2>
            {actionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={actionData} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="action" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={CustomTooltipStyle} />
                  <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]} barSize={20}>
                    {actionData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-zinc-600 text-sm text-center py-10">No action data</p>}
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Action Summary</h2>
            <div className="space-y-4">
              {[
                { label: 'Accepted Suggestion', key: 'accepted', icon: Activity, color: 'text-emerald-400', desc: 'User used ARIA rewrite' },
                { label: 'Modified Suggestion', key: 'modified', icon: MessageSquare, color: 'text-blue-400', desc: 'User edited the rewrite' },
                { label: 'Rejected Suggestion', key: 'rejected', icon: XCircle, color: 'text-amber-400', desc: 'User dismissed the suggestion' },
                { label: 'Sent Anyway', key: 'sent_anyway', icon: Send, color: 'text-red-400', desc: 'User overrode ARIA and sent original' },
                { label: 'Cancelled', key: 'cancelled', icon: PhoneOff, color: 'text-zinc-500', desc: 'User cancelled the message entirely' },
              ].map(({ label, key, icon: Icon, color, desc }) => (
                <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30">
                  <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                  <div className="flex-1">
                    <div className="text-sm text-zinc-200 font-medium">{label}</div>
                    <div className="text-xs text-zinc-500">{desc}</div>
                  </div>
                  <div className="text-lg font-bold text-zinc-100">
                    {formatNumber(data?.action_breakdown?.[key] ?? 0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Recent Flagged Messages</h2>
          <p className="text-xs text-zinc-600 mb-4">No message content is shown — only metadata for privacy compliance.</p>
          {data?.recent_flagged?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800/60">
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3 pr-4">Timestamp</th>
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3 pr-4">Sender</th>
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3 pr-4">Category</th>
                    <th className="text-left text-xs text-zinc-500 font-medium pb-3">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_flagged.map((msg, i) => (
                    <tr key={i} className="border-b border-zinc-800/30 last:border-0 hover:bg-zinc-800/20 transition-colors">
                      <td className="py-2.5 pr-4 text-xs text-zinc-500 whitespace-nowrap">
                        {new Date(msg.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-zinc-300 font-mono">{msg.sender_email}</td>
                      <td className="py-2.5 pr-4">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/15 text-red-400 border border-red-500/20">
                          {msg.category}
                        </span>
                      </td>
                      <td className="py-2.5 text-xs text-zinc-400 truncate max-w-xs">{msg.message_preview}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-zinc-600 text-sm text-center py-6">No flagged messages</p>
          )}
        </div>
      )}
    </div>
  );
}

function Header({ loading, onRefresh }: { loading: boolean; onRefresh: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-white">ARIA Insights</h1>
        <p className="text-sm text-zinc-500 mt-0.5">AI moderation analytics — interactions, blocks, overrides &amp; categories</p>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    teal: 'from-teal-600/20 to-teal-600/5 border-teal-500/20',
    emerald: 'from-emerald-600/20 to-emerald-600/5 border-emerald-500/20',
    red: 'from-red-600/20 to-red-600/5 border-red-500/20',
    violet: 'from-violet-600/20 to-violet-600/5 border-violet-500/20',
    amber: 'from-amber-600/20 to-amber-600/5 border-amber-500/20',
    blue: 'from-blue-600/20 to-blue-600/5 border-blue-500/20',
  };
  const iconColorMap: Record<string, string> = {
    teal: 'text-teal-400', emerald: 'text-emerald-400',
    red: 'text-red-400', violet: 'text-violet-400',
    amber: 'text-amber-400', blue: 'text-blue-400',
  };
  return (
    <div className={`bg-gradient-to-b ${colorMap[color]} border rounded-xl p-4`}>
      <Icon className={`w-4 h-4 ${iconColorMap[color]} mb-1.5`} />
      <div className="text-xl font-bold text-white tracking-tight">{value}</div>
      <span className="text-[11px] text-zinc-500">{label}</span>
    </div>
  );
}
