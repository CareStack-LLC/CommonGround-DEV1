'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, ArrowUpRight, ArrowDownRight, Users,
  BarChart3, RefreshCw, Zap, MessageSquare,
  FileText, CheckCircle,
} from 'lucide-react';
import { adminAPI, type GrowthStats, type EngagementStats } from '@/lib/admin-api';
import { CompareToggleChart } from '@/components/superadmin';

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function GrowthContent() {
  const [days, setDays] = useState(30);
  const [growth, setGrowth] = useState<GrowthStats | null>(null);
  const [engagement, setEngagement] = useState<EngagementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<'users' | 'messages' | 'aria'>('users');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [g, e] = await Promise.all([
        adminAPI.getGrowthStats(days),
        adminAPI.getEngagementStats(days),
      ]);
      setGrowth(g);
      setEngagement(e);
    } catch (err) {
      console.error('Failed to load growth data:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const calcTrend = (data?: { date: string; count: number }[]) => {
    if (!data || data.length < 8) return 0;
    const recent = data.slice(-7).reduce((a, b) => a + b.count, 0);
    const prev = data.slice(-14, -7).reduce((a, b) => a + b.count, 0);
    return prev === 0 ? 0 : Math.round(((recent - prev) / prev) * 100);
  };

  const userTrend = growth ? calcTrend(growth.daily_registrations) : 0;
  const msgTrend = engagement ? calcTrend(engagement.daily_messages) : 0;
  const avgPerDay = growth && growth.daily_registrations?.length > 0
    ? (growth.total_new_users / growth.daily_registrations.length).toFixed(1) : '0';

  const chartData = activeChart === 'users'
    ? growth?.daily_registrations || []
    : activeChart === 'messages'
    ? engagement?.daily_messages || []
    : engagement?.daily_aria_interventions || [];

  const chartMax = Math.max(...chartData.map(d => d.count), 1);
  const chartLabel = activeChart === 'users' ? 'registrations' : activeChart === 'messages' ? 'messages' : 'interventions';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Growth & Engagement</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform metrics over time</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-900/80 border border-cg-slate/20 rounded-lg p-0.5">
            {[7, 14, 30, 60, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  days === d ? 'bg-cg-sage text-white' : 'text-cg-slate-muted hover:text-white'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button onClick={fetchData} disabled={loading}
            className="p-2 rounded-lg bg-cg-slate/20 hover:bg-cg-slate/30 text-cg-slate-muted hover:text-white transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse bg-cg-slate/20 rounded-xl h-24" />)
        ) : (
          <>
            <SummaryCard icon={Users} label="New Users" value={growth?.total_new_users || 0} trend={userTrend} color="violet" />
            <SummaryCard icon={BarChart3} label="Avg / Day" value={avgPerDay} color="blue" isText />
            <SummaryCard icon={MessageSquare} label="Messages" value={engagement?.totals?.messages || 0} trend={msgTrend} color="emerald" />
            <SummaryCard icon={Zap} label="ARIA Flags" value={engagement?.totals?.aria_interventions || 0} color="amber" />
            <SummaryCard icon={CheckCircle} label="ARIA Accept" value={`${engagement?.totals?.aria_acceptance_rate || 0}%`} color="indigo" isText />
          </>
        )}
      </div>

      {/* Chart */}
      <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-1">
            {[
              { key: 'users', label: 'Registrations', icon: Users },
              { key: 'messages', label: 'Messages', icon: MessageSquare },
              { key: 'aria', label: 'ARIA Flags', icon: Zap },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveChart(tab.key as 'users' | 'messages' | 'aria')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeChart === tab.key
                    ? 'bg-cg-sage/15 text-cg-sage'
                    : 'text-muted-foreground hover:text-cg-slate-tint hover:bg-cg-slate/15'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-cg-slate-strong">Peak: {chartMax} {chartLabel}/day</span>
        </div>

        {loading ? (
          <div className="animate-pulse bg-cg-slate/20 rounded-lg h-48" />
        ) : (
          <div className="flex items-end gap-[2px] h-48">
            {chartData.map((d, i) => {
              const height = Math.max((d.count / chartMax) * 100, 3);
              const isWeekend = [0, 6].includes(new Date(d.date).getDay());
              return (
                <div key={i} className="flex-1 group relative">
                  <div
                    className={`w-full rounded-t transition-all duration-150 ${
                      isWeekend ? 'bg-violet-500/20 group-hover:bg-cg-sage-light/40' : 'bg-violet-500/50 group-hover:bg-violet-400/70'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700/60 text-white text-[10px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-xl">
                    <div className="font-semibold">{d.count} {chartLabel}</div>
                    <div className="text-cg-slate-muted">{new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {chartData.length > 0 && (
          <div className="flex justify-between mt-2 text-[10px] text-cg-slate-strong">
            <span>{new Date(chartData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            {chartData.length > 10 && (
              <span>{new Date(chartData[Math.floor(chartData.length / 2)].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            )}
            <span>{new Date(chartData[chartData.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
        )}
      </div>

      {/* Engagement + Breakdown */}
      {engagement && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-cg-slate-tint mb-4">Feature Adoption ({days}d)</h3>
            <div className="space-y-3">
              <FeatureRow label="New Family Files" value={engagement.totals?.new_family_files ?? 0} icon={FileText} />
              <FeatureRow label="New Agreements" value={engagement.totals?.new_agreements ?? 0} icon={CheckCircle} />
              <FeatureRow label="ARIA Acceptance Rate" value={`${engagement.totals?.aria_acceptance_rate ?? 0}%`} icon={Zap} />
            </div>
          </div>

          <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-cg-slate-tint mb-4">Daily Breakdown</h3>
            <div className="max-h-64 overflow-y-auto space-y-0">
              {growth && [...(growth.daily_registrations || [])].reverse().slice(0, 14).map((d) => (
                <div key={d.date} className="flex items-center justify-between py-2 border-b border-cg-slate/10 last:border-0">
                  <span className="text-xs text-muted-foreground">
                    {new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-cg-sage/60" style={{ width: `${(d.count / chartMax) * 100}%` }} />
                    </div>
                    <span className="text-xs text-cg-slate-tint font-medium w-8 text-right">{d.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Signups — compare current window to prior window of same length */}
      {!loading && growth?.daily_registrations && growth.daily_registrations.length > 0 && (() => {
        const all = [...growth.daily_registrations].sort((a, b) => a.date.localeCompare(b.date));
        const halfCount = Math.min(Math.floor(days / 2), Math.floor(all.length / 2));
        // current = last half, prior = first half
        const current = all.slice(-halfCount).map((d) => ({ date: d.date, value: d.count }));
        const prior = halfCount > 0
          ? all.slice(-halfCount * 2, -halfCount).map((d) => ({ date: d.date, prior_value: d.count }))
          : [];
        return (
          <CompareToggleChart
            title={`Daily signups — last ${halfCount} days`}
            data={current}
            priorData={prior.length === halfCount && halfCount > 0 ? prior : undefined}
            valueLabel="signups"
            color="var(--cg-sage)"
            height={220}
            tooltip={`Toggle to overlay the prior ${halfCount} days so you can compare the same-length windows side by side.`}
          />
        );
      })()}
    </div>
  );
}

function SummaryCard({
  icon: Icon, label, value, trend, color, isText,
}: {
  icon: React.ElementType; label: string; value: string | number; trend?: number; color: string; isText?: boolean;
}) {
  const colors: Record<string, string> = {
    violet: 'text-cg-sage', blue: 'text-blue-400', emerald: 'text-emerald-400',
    amber: 'text-amber-400', indigo: 'text-indigo-400',
  };
  return (
    <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${colors[color]}`} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-xl font-bold text-white ${isText ? 'text-base' : ''}`}>
          {typeof value === 'number' ? formatNumber(value) : value}
        </span>
        {trend !== undefined && trend !== 0 && (
          <span className={`flex items-center text-[11px] font-medium mb-0.5 ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

function FeatureRow({ label, value, icon: Icon }: {
  label: string; value: string | number; icon: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-cg-slate-muted">{label}</span>
      </div>
      <span className="text-sm font-semibold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  );
}
