'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users, RefreshCw, AlertTriangle, Phone,
  Tv, BookOpen, Gamepad2, Trophy, ShieldCheck,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface KidSpaceStats {
  active_families: number;
  call_minutes_30d: number;
  theater_sessions: number;
  stories_read: number;
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

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`} />;
}

const CustomTooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid rgba(63,63,70,0.6)',
  borderRadius: '8px',
  color: '#e4e4e7',
  fontSize: '12px',
};

export default function KidSpaceAnalyticsPage() {
  const [data, setData] = useState<KidSpaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noData, setNoData] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNoData(false);

      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${API_BASE}/api/v1/admin/kidspace/stats`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          setNoData(true);
          return;
        }
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-zinc-400 mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
          Retry
        </button>
      </div>
    );
  }

  if (!loading && noData) {
    return (
      <div className="space-y-6">
        <Header loading={false} onRefresh={fetchData} />
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/50 border border-zinc-800/60 rounded-xl">
          <Gamepad2 className="w-12 h-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 text-lg font-medium">No KidSpace data available yet</p>
          <p className="text-zinc-600 text-sm mt-1">Analytics will populate as families use KidSpace features.</p>
        </div>
      </div>
    );
  }

  const consentPct = data && data.coppa_consent.total_children > 0
    ? Math.round((data.coppa_consent.children_with_consent / data.coppa_consent.total_children) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <Header loading={loading} onRefresh={fetchData} />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : data && (
          <>
            <MetricCard icon={Users} label="Active Families" value={formatNumber(data.active_families)} color="violet" />
            <MetricCard icon={Phone} label="Call Minutes (30d)" value={formatNumber(data.call_minutes_30d)} color="blue" />
            <MetricCard icon={Tv} label="Theater Sessions" value={formatNumber(data.theater_sessions)} color="emerald" />
            <MetricCard icon={BookOpen} label="Stories Read" value={formatNumber(data.stories_read)} color="amber" />
          </>
        )}
      </div>

      {/* Leaderboards */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Most Played */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-zinc-300">Most Played</h2>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : data && data.most_played.length > 0 ? (
            <div className="space-y-0">
              {data.most_played.slice(0, 10).map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-zinc-800/30 last:border-0 hover:bg-zinc-800/20 transition-colors px-2 rounded">
                  <span className={`w-6 text-center text-xs font-bold ${i === 0 ? 'text-amber-400' : 'text-zinc-600'}`}>
                    {i === 0 ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">#1</span>
                    ) : (
                      `#${item.rank}`
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-300 truncate">{item.title}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-zinc-300 font-medium">{item.view_count.toLocaleString()} views</div>
                    <div className="text-[11px] text-zinc-600">{item.minutes_watched.toLocaleString()} min</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-600 text-sm text-center py-6">No viewing data yet</p>
          )}
        </div>

        {/* Most Read */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-300">Most Read</h2>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : data && data.most_read.length > 0 ? (
            <div className="space-y-0">
              {data.most_read.slice(0, 10).map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-zinc-800/30 last:border-0 hover:bg-zinc-800/20 transition-colors px-2 rounded">
                  <span className={`w-6 text-center text-xs font-bold ${i === 0 ? 'text-amber-400' : 'text-zinc-600'}`}>
                    {i === 0 ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">#1</span>
                    ) : (
                      `#${item.rank}`
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-300 truncate">{item.title}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-zinc-300 font-medium">{item.read_count.toLocaleString()} reads</div>
                    <div className="text-[11px] text-zinc-600">{item.pages_turned.toLocaleString()} pages</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-600 text-sm text-center py-6">No reading data yet</p>
          )}
        </div>
      </div>

      {/* Daily Usage Chart */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Daily Usage Trends</h2>
        {loading ? (
          <Skeleton className="h-64" />
        ) : data && data.daily_usage.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.daily_usage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                axisLine={{ stroke: '#3f3f46' }}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={CustomTooltipStyle} labelFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value: string) => <span className="text-zinc-400 text-xs capitalize">{value}</span>}
              />
              <Line type="monotone" dataKey="calls" name="Calls" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="theater" name="Theater" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="arcade" name="Arcade" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="stories" name="Stories" stroke="#a78bfa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-zinc-600 text-sm text-center py-10">No usage data</p>
        )}
      </div>

      {/* COPPA Consent Card */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-zinc-300">COPPA Consent Status</h2>
        </div>
        {loading ? (
          <Skeleton className="h-16" />
        ) : data ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400">
                {data.coppa_consent.children_with_consent} of {data.coppa_consent.total_children} children have parental consent
              </span>
              <span className="text-sm font-semibold text-white">{consentPct}%</span>
            </div>
            <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                style={{ width: `${consentPct}%` }}
              />
            </div>
            {consentPct < 100 && (
              <p className="text-[11px] text-amber-500/80 mt-2">
                {data.coppa_consent.total_children - data.coppa_consent.children_with_consent} children pending consent
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Header({ loading, onRefresh }: { loading: boolean; onRefresh: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-white">KidSpace Analytics</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Usage statistics and content leaderboards</p>
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
    violet: 'from-violet-600/20 to-violet-600/5 border-violet-500/20',
    blue: 'from-blue-600/20 to-blue-600/5 border-blue-500/20',
    emerald: 'from-emerald-600/20 to-emerald-600/5 border-emerald-500/20',
    amber: 'from-amber-600/20 to-amber-600/5 border-amber-500/20',
  };
  const iconColorMap: Record<string, string> = {
    violet: 'text-violet-400', blue: 'text-blue-400',
    emerald: 'text-emerald-400', amber: 'text-amber-400',
  };
  return (
    <div className={`bg-gradient-to-b ${colorMap[color]} border rounded-xl p-4`}>
      <Icon className={`w-5 h-5 ${iconColorMap[color]} mb-2`} />
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}
