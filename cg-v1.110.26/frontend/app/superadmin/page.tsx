'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Activity, TrendingUp, DollarSign, Zap,
  MessageSquare, Shield, Clock, ArrowUpRight,
  ArrowDownRight, UserPlus, CreditCard, ScrollText,
  FileText, ExternalLink, RefreshCw, AlertTriangle,
  Radio,
} from 'lucide-react';
import { adminAPI, type DashboardData, type GrowthStats, type PlatformHealth } from '@/lib/admin-api';

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`} />;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [growth, setGrowth] = useState<GrowthStats | null>(null);
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const refreshRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [d, g, h] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getGrowthStats(14),
        adminAPI.getPlatformHealth(),
      ]);
      setDashboard(d);
      setGrowth(g);
      setHealth(h);
      setLastRefreshed(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    refreshRef.current = setInterval(() => {
      fetchData();
    }, 30000);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
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

  // Growth trend calc
  const growthTrend = growth ? (() => {
    const data = growth.daily_registrations;
    if (data.length < 8) return 0;
    const recent = data.slice(-7).reduce((a, b) => a + b.count, 0);
    const prev = data.slice(-14, -7).reduce((a, b) => a + b.count, 0);
    return prev === 0 ? 0 : Math.round(((recent - prev) / prev) * 100);
  })() : 0;

  const sparklineMax = growth ? Math.max(...growth.daily_registrations.map(d => d.count), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Command Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {dashboard ? `Last updated ${timeAgo(dashboard.generated_at)}` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-400/80">
            <Radio className="w-3 h-3 animate-pulse" />
            Live — auto-refresh 30s
          </span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Platform Health Banner */}
      {health && health.status !== 'healthy' && (
        <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
          health.status === 'critical'
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-medium">Platform {health.status}</span>
            <span className="text-sm ml-2 opacity-80">
              {health.errors_24h} errors in 24h • {health.suspicious_24h} suspicious events
            </span>
          </div>
        </div>
      )}

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : dashboard && (
          <>
            <MetricCard
              icon={Users} label="Total Users" value={formatNumber(dashboard.users.total)}
              sub={`${dashboard.users.new_24h} new today`}
              trend={growthTrend} color="violet"
            />
            <MetricCard
              icon={Activity} label="Active (30d)" value={formatNumber(dashboard.users.active_30d)}
              sub={`${dashboard.users.active_today} online now`}
              color="emerald"
            />
            <MetricCard
              icon={DollarSign} label="Est. MRR" value={formatCurrency(dashboard.subscriptions.estimated_mrr)}
              sub={`${dashboard.subscriptions.past_due_count} past due`}
              color="blue"
              alert={dashboard.subscriptions.past_due_count > 0}
            />
            <MetricCard
              icon={MessageSquare} label="Messages (7d)" value={formatNumber(dashboard.engagement.messages_7d)}
              sub={`${dashboard.engagement.aria_interventions_7d} ARIA flags`}
              color="amber"
            />
          </>
        )}
      </div>

      {/* Secondary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : dashboard && (
          <>
            <SmallMetric label="Family Files" value={dashboard.family_files.active} icon={FileText} />
            <SmallMetric label="Professionals" value={dashboard.professionals.total} icon={Shield} />
            <SmallMetric label="New Users (7d)" value={dashboard.users.new_7d} icon={UserPlus} />
            <SmallMetric
              label="Platform Health"
              value={health?.status || '—'}
              icon={Zap}
              valueColor={health?.status === 'healthy' ? 'text-emerald-400' : health?.status === 'degraded' ? 'text-amber-400' : 'text-red-400'}
            />
          </>
        )}
      </div>

      {/* Charts & Feeds Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Sparkline Chart */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-300">User Growth (14 days)</h2>
            <button
              onClick={() => router.push('/superadmin/growth')}
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              View details <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <Skeleton className="h-36" />
          ) : growth && (
            <div className="flex items-end gap-1 h-36">
              {growth.daily_registrations.map((d, i) => {
                const height = Math.max((d.count / sparklineMax) * 100, 4);
                const isWeekend = [0, 6].includes(new Date(d.date).getDay());
                return (
                  <div key={i} className="flex-1 group relative">
                    <div
                      className={`w-full rounded-t transition-all ${
                        isWeekend ? 'bg-violet-500/25' : 'bg-violet-500/60 group-hover:bg-violet-400/80'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-zinc-200 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                      {d.count} users • {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {growth && growth.daily_registrations.length > 0 && (
            <div className="flex justify-between mt-2 text-[10px] text-zinc-600">
              <span>{new Date(growth.daily_registrations[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span>{new Date(growth.daily_registrations[growth.daily_registrations.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>

        {/* Subscription Breakdown */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-300">Subscriptions</h2>
            <button
              onClick={() => router.push('/superadmin/billing')}
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              Details <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6" />)}
            </div>
          ) : dashboard && (
            <div className="space-y-2.5">
              {Object.entries(dashboard.subscriptions.tier_breakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([tier, count]) => {
                  const total = dashboard.users.total || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={tier}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400 capitalize">{tier.replace('_', ' ')}</span>
                        <span className="text-zinc-500">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Activity Feeds */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Signups */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-300">Recent Signups</h2>
            <button
              onClick={() => router.push('/superadmin/users')}
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              All users <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : dashboard && (
            <div className="space-y-1">
              {dashboard.recent_signups.map((s) => (
                <div
                  key={s.id}
                  onClick={() => router.push(`/superadmin/users/${s.id}`)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/40 cursor-pointer transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600/40 to-indigo-600/40 flex items-center justify-center text-xs font-medium text-violet-300">
                    {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-300 truncate">{s.name}</div>
                  </div>
                  <span className="text-[11px] text-zinc-600 whitespace-nowrap">{timeAgo(s.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin Activity Feed */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-300">Admin Activity</h2>
            <button
              onClick={() => router.push('/superadmin/audit-log')}
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              Full log <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : dashboard && (
            <div className="space-y-1">
              {dashboard.recent_admin_actions.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500/60 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-zinc-400">
                      <span className="text-zinc-300 font-medium">{a.action.replace('admin:', '').replace(/_/g, ' ')}</span>
                      {a.user_email && <span className="text-zinc-600 ml-1">by {a.user_email.split('@')[0]}</span>}
                    </div>
                    {a.description && (
                      <div className="text-[11px] text-zinc-600 mt-0.5 truncate">{a.description}</div>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-600 whitespace-nowrap flex-shrink-0">{timeAgo(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction icon={Users} label="Manage Users" href="/superadmin/users" onClick={() => router.push('/superadmin/users')} />
        <QuickAction icon={CreditCard} label="Billing Overview" href="/superadmin/billing" onClick={() => router.push('/superadmin/billing')} />
        <QuickAction icon={FileText} label="Request Report" href="/superadmin/reports" onClick={() => router.push('/superadmin/reports')} />
        <QuickAction icon={ScrollText} label="Audit Log" href="/superadmin/audit-log" onClick={() => router.push('/superadmin/audit-log')} />
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon, label, value, sub, trend, color, alert,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  trend?: number; color: string; alert?: boolean;
}) {
  const colorMap: Record<string, string> = {
    violet: 'from-violet-600/20 to-violet-600/5 border-violet-500/20',
    emerald: 'from-emerald-600/20 to-emerald-600/5 border-emerald-500/20',
    blue: 'from-blue-600/20 to-blue-600/5 border-blue-500/20',
    amber: 'from-amber-600/20 to-amber-600/5 border-amber-500/20',
  };
  const iconColorMap: Record<string, string> = {
    violet: 'text-violet-400', emerald: 'text-emerald-400',
    blue: 'text-blue-400', amber: 'text-amber-400',
  };
  return (
    <div className={`bg-gradient-to-b ${colorMap[color]} border rounded-xl p-4 relative overflow-hidden`}>
      {alert && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
      <Icon className={`w-5 h-5 ${iconColorMap[color]} mb-2`} />
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-zinc-500">{label}</span>
        {trend !== undefined && trend !== 0 && (
          <span className={`flex items-center text-[11px] font-medium ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {sub && <div className="text-[11px] text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function SmallMetric({
  label, value, icon: Icon, valueColor,
}: {
  label: string; value: string | number; icon: React.ElementType; valueColor?: string;
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-4 py-3 flex items-center gap-3">
      <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
      <div className="min-w-0">
        <div className={`text-lg font-semibold ${valueColor || 'text-white'} capitalize`}>{typeof value === 'number' ? formatNumber(value) : value}</div>
        <div className="text-[11px] text-zinc-500">{label}</div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, href, onClick }: { icon: React.ElementType; label: string; href: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/40 hover:border-zinc-700/60 transition-all text-left group"
    >
      <Icon className="w-4 h-4 text-zinc-500 group-hover:text-violet-400 transition-colors" />
      <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">{label}</span>
      <ArrowUpRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 ml-auto transition-colors" />
    </button>
  );
}
