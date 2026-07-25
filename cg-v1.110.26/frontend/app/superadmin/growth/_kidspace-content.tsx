'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAccessToken } from '@/lib/api';
import {
  Users, RefreshCw, AlertTriangle, Phone,
  Tv, BookOpen, Gamepad2, Trophy, ShieldCheck,
  Clock, Timer, BarChart3,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface SessionAverage {
  type: string;
  avg_minutes: number;
  total_sessions: number;
}

interface KidSpaceStats {
  active_families: number;
  total_children: number;
  total_call_minutes: number;
  call_minutes_30d: number;
  total_minutes_watched: number;
  theater_sessions: number;
  theater_minutes: number;
  arcade_sessions: number;
  arcade_minutes: number;
  stories_sessions: number;
  stories_read: number;
  pages_turned: number;
  session_averages: SessionAverage[];
  most_played: {
    rank: number;
    title: string;
    view_count: number;
    minutes_watched: number;
  }[];
  most_read: {
    rank: number;
    title: string;
    read_count: number;
    pages_turned: number;
  }[];
  daily_usage: {
    date: string;
    calls: number;
    theater: number;
    arcade: number;
    stories: number;
  }[];
  coppa_consent: {
    children_with_consent: number;
    total_children: number;
  };
}

type TabKey = 'overview' | 'content' | 'sessions';

function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-cg-slate/20 rounded-lg ${className}`} />;
}

const CustomTooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid rgba(63,63,70,0.6)',
  borderRadius: '8px',
  color: '#e4e4e7',
  fontSize: '12px',
};

const SESSION_COLORS: Record<string, string> = {
  video_call: '#3b82f6',
  theater: '#10b981',
  arcade: '#f59e0b',
  whiteboard: '#a78bfa',
  mixed: '#ec4899',
};

export default function KidSpaceContent() {
  const [data, setData] = useState<KidSpaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noData, setNoData] = useState(false);
  const [tab, setTab] = useState<TabKey>('overview');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNoData(false);

      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${API_BASE}/api/v1/admin/kidspace/stats`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 404) { setNoData(true); return; }
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `API error ${res.status}`);
      }

      const json = await res.json();
      if (!json || (json.active_families === 0 && (!json.daily_usage || json.daily_usage.length === 0))) {
        setNoData(true);
        return;
      }
      setData(json);
    } catch (err: unknown) {
      if (!noData) {
        setError(err instanceof Error ? err.message : 'Failed to load KidSpace stats');
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
        <p className="text-cg-slate-muted mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-cg-sage hover:bg-cg-sage-light text-white text-sm font-medium transition-colors">Retry</button>
      </div>
    );
  }

  if (!loading && noData) {
    return (
      <div className="space-y-6">
        <Header loading={false} onRefresh={fetchData} />
        <div className="flex flex-col items-center justify-center py-20 bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl">
          <Gamepad2 className="w-12 h-12 text-cg-slate-strong mb-4" />
          <p className="text-cg-slate-muted text-lg font-medium">No KidSpace data available yet</p>
          <p className="text-cg-slate-strong text-sm mt-1">Analytics will populate as families use KidSpace features.</p>
        </div>
      </div>
    );
  }

  const consentPct = data?.coppa_consent?.total_children && data.coppa_consent.total_children > 0
    ? Math.round((data.coppa_consent.children_with_consent / data.coppa_consent.total_children) * 100) : 0;

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'content', label: 'Content Leaderboards', icon: Trophy },
    { key: 'sessions', label: 'Session Details', icon: Timer },
  ];

  return (
    <div className="space-y-6">
      <Header loading={loading} onRefresh={fetchData} />

      {/* Metric Cards — 6 across */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : data && (
          <>
            <MetricCard icon={Users} label="Active Families" value={formatNumber(data.active_families)} color="violet" />
            <MetricCard icon={Phone} label="Call Minutes (30d)" value={formatNumber(data.call_minutes_30d)} color="blue" />
            <MetricCard icon={Clock} label="Total Mins Watched" value={formatNumber(data.total_minutes_watched)} color="emerald" />
            <MetricCard icon={Tv} label="Theater Sessions" value={formatNumber(data.theater_sessions)} color="teal" />
            <MetricCard icon={BookOpen} label="Stories Read" value={formatNumber(data.stories_read)} color="amber" />
            <MetricCard icon={Gamepad2} label="Arcade Sessions" value={formatNumber(data.arcade_sessions)} color="rose" />
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === t.key
                ? 'bg-violet-500/20 text-cg-sage-light border border-violet-500/30'
                : 'text-muted-foreground hover:text-cg-slate-tint hover:bg-cg-slate/20'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Daily Usage Chart */}
          <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-cg-slate-tint mb-4">Daily Usage Trends (30 days)</h2>
            {data?.daily_usage?.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.daily_usage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} axisLine={{ stroke: '#3f3f46' }} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CustomTooltipStyle} labelFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} />
                  <Legend verticalAlign="top" height={36} formatter={(value: any) => <span className="text-cg-slate-muted text-xs capitalize">{value}</span>} />
                  <Line type="monotone" dataKey="calls" name="Calls" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="theater" name="Theater" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="arcade" name="Arcade" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="stories" name="Stories" stroke="#a78bfa" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-cg-slate-strong text-sm text-center py-10">No usage data</p>}
          </div>

          {/* COPPA + Session Averages */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-cg-slate-tint">COPPA Consent Status</h2>
              </div>
              {data ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-cg-slate-muted">
                      {data.coppa_consent?.children_with_consent ?? 0} of {data.coppa_consent?.total_children ?? 0} children have consent
                    </span>
                    <span className="text-sm font-semibold text-white">{consentPct}%</span>
                  </div>
                  <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500" style={{ width: `${consentPct}%` }} />
                  </div>
                  {consentPct < 100 && (
                    <p className="text-[11px] text-amber-500/80 mt-2">
                      {(data.coppa_consent?.total_children ?? 0) - (data.coppa_consent?.children_with_consent ?? 0)} children pending consent
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Timer className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-cg-slate-tint">Avg Session Duration</h2>
              </div>
              {data?.session_averages?.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.session_averages} margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="type" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'minutes', angle: -90, position: 'insideLeft', style: { fill: '#71717a', fontSize: 10 } }} />
                    <Tooltip contentStyle={CustomTooltipStyle} formatter={(val) => [`${val} min`, 'Avg Duration']} />
                    <Bar dataKey="avg_minutes" name="Avg Minutes" radius={[4, 4, 0, 0]} barSize={30}>
                      {data.session_averages.map((entry, i) => (
                        <Cell key={i} fill={SESSION_COLORS[entry.type] || '#71717a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-cg-slate-strong text-sm text-center py-10">No session data</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'content' && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Most Played */}
          <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-cg-slate-tint">Most Played</h2>
            </div>
            {data?.most_played?.length ? (
              <div className="space-y-0">
                {data.most_played.slice(0, 10).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-cg-slate/10 last:border-0 hover:bg-cg-slate/10 transition-colors px-2 rounded">
                    <span className="w-6 text-center">
                      {i === 0 ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">#1</span>
                      ) : (
                        <span className="text-xs font-bold text-cg-slate-strong">#{item.rank}</span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-cg-slate-tint truncate">{item.title}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-cg-slate-tint font-medium">{(item.view_count ?? 0).toLocaleString()} views</div>
                      <div className="text-[11px] text-cg-slate-strong">{(item.minutes_watched ?? 0).toLocaleString()} min</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-cg-slate-strong text-sm text-center py-6">No viewing data yet</p>}
          </div>

          {/* Most Read */}
          <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-cg-slate-tint">Most Read</h2>
            </div>
            {data?.most_read?.length ? (
              <div className="space-y-0">
                {data.most_read.slice(0, 10).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-cg-slate/10 last:border-0 hover:bg-cg-slate/10 transition-colors px-2 rounded">
                    <span className="w-6 text-center">
                      {i === 0 ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">#1</span>
                      ) : (
                        <span className="text-xs font-bold text-cg-slate-strong">#{item.rank}</span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-cg-slate-tint truncate">{item.title}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-cg-slate-tint font-medium">{(item.read_count ?? 0).toLocaleString()} reads</div>
                      <div className="text-[11px] text-cg-slate-strong">{(item.pages_turned ?? 0).toLocaleString()} pages</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-cg-slate-strong text-sm text-center py-6">No reading data yet</p>}
          </div>
        </div>
      )}

      {tab === 'sessions' && (
        <div className="space-y-4">
          {/* Session breakdown cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Video Calls', sessions: data?.total_call_minutes ? `${formatNumber(data.total_call_minutes)} min` : '0 min', icon: Phone, color: 'blue' },
              { label: 'Theater', sessions: `${formatNumber(data?.theater_sessions ?? 0)} sessions`, sub: `${formatNumber(data?.theater_minutes ?? 0)} min`, icon: Tv, color: 'emerald' },
              { label: 'Arcade', sessions: `${formatNumber(data?.arcade_sessions ?? 0)} sessions`, sub: `${formatNumber(data?.arcade_minutes ?? 0)} min`, icon: Gamepad2, color: 'amber' },
              { label: 'Stories', sessions: `${formatNumber(data?.stories_sessions ?? 0)} sessions`, sub: `${formatNumber(data?.pages_turned ?? 0)} pages`, icon: BookOpen, color: 'violet' },
            ].map(({ label, sessions, sub, icon: Icon, color }) => (
              <div key={label} className={`bg-gradient-to-b from-${color}-600/20 to-${color}-600/5 border border-${color}-500/20 rounded-xl p-4`}>
                <Icon className={`w-4 h-4 text-${color}-400 mb-1.5`} />
                <div className="text-lg font-bold text-white">{sessions}</div>
                <span className="text-[11px] text-muted-foreground">{label}</span>
                {sub && <div className="text-[11px] text-cg-slate-strong mt-0.5">{sub}</div>}
              </div>
            ))}
          </div>

          {/* Session averages table */}
          {data?.session_averages?.length ? (
            <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-white">Session Type Breakdown</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-muted-foreground text-xs">
                    <th className="text-left px-5 py-3 font-medium">Type</th>
                    <th className="text-right px-5 py-3 font-medium">Total Sessions</th>
                    <th className="text-right px-5 py-3 font-medium">Avg Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {data.session_averages.map((sa, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-cg-slate/10">
                      <td className="px-5 py-3 text-white capitalize">{sa.type.replace('_', ' ')}</td>
                      <td className="px-5 py-3 text-right text-cg-slate-tint">{formatNumber(sa.total_sessions)}</td>
                      <td className="px-5 py-3 text-right text-cg-slate-tint">{sa.avg_minutes} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Header({ loading, onRefresh }: { loading: boolean; onRefresh: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-white">KidSpace Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Usage stats, content leaderboards &amp; session details</p>
      </div>
      <button onClick={onRefresh} disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cg-slate/20 hover:bg-cg-slate/30 text-cg-slate-muted hover:text-white text-xs font-medium transition-colors disabled:opacity-50">
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
    violet: 'from-cg-sage/20 to-cg-sage/5 border-cg-sage/20',
    blue: 'from-cg-slate/20 to-cg-slate/5 border-cg-slate/20',
    emerald: 'from-cg-sage/20 to-cg-sage/5 border-cg-sage/20',
    amber: 'from-cg-amber/20 to-cg-amber/5 border-cg-amber/20',
    teal: 'from-teal-600/20 to-teal-600/5 border-teal-500/20',
    rose: 'from-rose-600/20 to-rose-600/5 border-rose-500/20',
  };
  const iconColorMap: Record<string, string> = {
    violet: 'text-cg-sage', blue: 'text-blue-400',
    emerald: 'text-emerald-400', amber: 'text-amber-400',
    teal: 'text-teal-400', rose: 'text-rose-400',
  };
  return (
    <div className={`bg-gradient-to-b ${colorMap[color]} border rounded-xl p-4`}>
      <Icon className={`w-4 h-4 ${iconColorMap[color]} mb-1.5`} />
      <div className="text-xl font-bold text-white tracking-tight">{value}</div>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
