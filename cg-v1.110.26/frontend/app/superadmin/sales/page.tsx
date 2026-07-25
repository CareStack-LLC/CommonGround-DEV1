'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import {
  DollarSign, TrendingUp, Users, Target,
  BarChart3, Brain, Zap, RefreshCw, AlertTriangle,
} from 'lucide-react';
import {
  adminAPI,
  type PipelineStage,
  type UnitEconomics,
} from '@/lib/admin-api';
import {
  MetricCard, PageHeader, TabBar, useTabState,
  Skeleton, SkeletonCards, ErrorState, InfoTooltip,
  FunnelChart, ProgressRing, CompareToggleChart,
  formatNumber, formatCurrency,
} from '@/components/superadmin';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

/* ── Constants ──────────────────────────────────────────────────────── */

const TABS = [
  { key: 'pipeline', label: 'Pipeline', icon: Target },
  { key: 'conversions', label: 'Conversions', icon: TrendingUp },
  { key: 'forecast', label: 'Forecast', icon: BarChart3 },
  { key: 'win-loss', label: 'Win/Loss', icon: AlertTriangle },
  { key: 'unit-economics', label: 'Unit Economics', icon: DollarSign },
  { key: 'ai-advisor', label: 'AI Advisor', icon: Brain },
];

const RECHARTS_TOOLTIP = {
  backgroundColor: 'var(--foreground)',
  border: '1px solid var(--cg-slate)',
  borderRadius: 8,
  color: 'var(--cg-slate-tint)',
  fontSize: 12,
};

const CHART_COLORS = ['var(--cg-sage)', 'var(--cg-slate-light)', 'var(--cg-slate)', 'var(--cg-amber)', '#E8834A', 'var(--cg-error)'];

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const TYPE_COLORS: Record<string, string> = {
  upsell: 'bg-emerald-500/20 text-emerald-400',
  retention: 'bg-blue-500/20 text-blue-400',
  acquisition: 'bg-violet-500/20 text-violet-400',
  pricing: 'bg-amber-500/20 text-amber-400',
  churn: 'bg-red-500/20 text-red-400',
  expansion: 'bg-teal-500/20 text-teal-400',
};

/* ── Main Page ──────────────────────────────────────────────────────── */

export default function SalesIntelligencePage() {
  const [tab, setTab] = useTabState('pipeline');
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['pipeline']));

  const handleTabChange = (key: string) => {
    setTab(key);
    setLoadedTabs((prev) => new Set(prev).add(key));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Sales Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Pipeline, conversions, forecasting, and AI-powered insights</p>
      </div>

      <TabBar tabs={TABS} activeTab={tab} onTabChange={handleTabChange} />

      <Suspense fallback={<SkeletonCards count={4} />}>
        {tab === 'pipeline' && <PipelineTab />}
        {tab === 'conversions' && loadedTabs.has('conversions') && <ConversionsTab />}
        {tab === 'forecast' && loadedTabs.has('forecast') && <ForecastTab />}
        {tab === 'win-loss' && loadedTabs.has('win-loss') && <WinLossTab />}
        {tab === 'unit-economics' && loadedTabs.has('unit-economics') && <UnitEconomicsTab />}
        {tab === 'ai-advisor' && loadedTabs.has('ai-advisor') && <AIAdvisorTab />}
      </Suspense>
    </div>
  );
}

/* ── Pipeline Tab ───────────────────────────────────────────────────── */

function PipelineTab() {
  const [pipeline, setPipeline] = useState<{ stages: PipelineStage[]; total_pipeline_value: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminAPI.getSalesPipeline();
      setPipeline(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error && !pipeline) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-cg-slate-muted mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-cg-sage hover:bg-cg-sage-light text-white text-sm font-medium">Retry</button>
      </div>
    );
  }

  const funnelStages = pipeline?.stages.map((s) => ({
    name: s.name,
    count: s.count,
  })) || [];

  return (
    <div className="space-y-6">
      {loading ? (
        <SkeletonCards count={3} />
      ) : pipeline && (
        <>
          <FunnelChart
            stages={funnelStages}
            title="Sales Pipeline"
            tooltip="Conversion funnel from visitors to paying customers"
          />

          {/* Pipeline Value Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gradient-to-b from-cg-sage/20 to-cg-sage/5 border border-cg-sage/20 rounded-xl p-4">
              <DollarSign className="w-5 h-5 text-cg-sage mb-2" />
              <div className="text-2xl font-bold text-white">{formatCurrency(pipeline.total_pipeline_value)}</div>
              <div className="text-xs text-muted-foreground">Total Pipeline Value</div>
            </div>
            {pipeline.stages.map((stage, i) => (
              <div key={stage.name} className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-4">
                <div className="text-xs text-muted-foreground mb-1">{stage.name}</div>
                <div className="text-lg font-bold text-white">{formatNumber(stage.count)}</div>
                <div className="text-xs text-cg-slate-strong">
                  {formatCurrency(stage.value)}
                  {stage.conversion_from_prev_pct > 0 && (
                    <span className="ml-1 text-cg-sage">({stage.conversion_from_prev_pct.toFixed(1)}%)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Conversions Tab ────────────────────────────────────────────────── */

function ConversionsTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.getSalesConversions(30);
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load conversion data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-cg-slate-muted mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-cg-sage hover:bg-cg-sage-light text-white text-sm font-medium">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse bg-cg-slate/20 rounded-xl h-24" />)
        ) : data && (
          <>
            <MetricCard
              icon={TrendingUp} label="Trial-to-Paid"
              value={`${data.trial_to_paid_pct?.toFixed(1) ?? 0}%`}
              sub="conversion rate"
              color="sage"
              tooltip="Percentage of trial users who convert to paid"
            />
            <MetricCard
              icon={Zap} label="Upgrade Rate"
              value={`${data.upgrade_rate_pct?.toFixed(1) ?? 0}%`}
              sub="plan upgrades"
              color="sky"
              tooltip="Percentage of users who upgrade their plan"
            />
            <MetricCard
              icon={Target} label="Avg Days to Convert"
              value={data.avg_days_to_convert?.toFixed(1) ?? '—'}
              sub="trial to paid"
              color="gold"
              tooltip="Average number of days from trial start to first payment"
            />
            <MetricCard
              icon={DollarSign} label="Conversion Revenue"
              value={formatCurrency(data.conversion_revenue ?? 0)}
              sub="from conversions (30d)"
              color="sage"
              tooltip="Revenue generated from new conversions in the last 30 days"
            />
          </>
        )}
      </div>

      {/* Conversion Trend */}
      <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-cg-slate-tint mb-4">
          Conversion Trend (30 days)
          <InfoTooltip text="Daily conversion rate over the past 30 days" />
        </h2>
        {loading ? <Skeleton className="h-64" /> : data?.daily_conversions?.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.daily_conversions}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--cg-slate)" opacity={0.2} />
              <XAxis
                dataKey="date"
                stroke="var(--cg-slate-strong)"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                axisLine={{ stroke: 'var(--cg-slate-strong)' }}
                tickLine={false}
              />
              <YAxis
                stroke="var(--cg-slate-strong)"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={RECHARTS_TOOLTIP}
                labelFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              />
              <Line
                type="monotone"
                dataKey="conversions"
                name="Conversions"
                stroke="var(--cg-sage)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'var(--cg-sage)' }}
              />
              <Line
                type="monotone"
                dataKey="rate"
                name="Rate %"
                stroke="var(--cg-slate-light)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'var(--cg-slate-light)' }}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-cg-slate-strong text-sm text-center py-10">No conversion data available</p>
        )}
      </div>

      {/* Conversion by Source */}
      {data?.by_source?.length > 0 && (
        <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-cg-slate-tint mb-4">
            Conversions by Source
            <InfoTooltip text="Conversion performance broken down by acquisition channel" />
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-cg-slate/20">
                  <th className="text-left pb-2 font-medium">Source</th>
                  <th className="text-right pb-2 font-medium">Trials</th>
                  <th className="text-right pb-2 font-medium">Conversions</th>
                  <th className="text-right pb-2 font-medium">Rate</th>
                  <th className="text-right pb-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.by_source.map((src: any) => (
                  <tr key={src.source} className="border-b border-cg-slate/10 last:border-0 hover:bg-cg-slate/10">
                    <td className="py-2.5 text-cg-slate-tint capitalize">{src.source?.replace(/_/g, ' ') || 'Unknown'}</td>
                    <td className="py-2.5 text-right text-cg-slate-muted">{formatNumber(src.trials)}</td>
                    <td className="py-2.5 text-right text-cg-slate-muted">{formatNumber(src.conversions)}</td>
                    <td className="py-2.5 text-right">
                      <span className={src.rate > 10 ? 'text-cg-sage' : 'text-cg-slate-muted'}>
                        {src.rate?.toFixed(1) ?? 0}%
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-white font-medium">{formatCurrency(src.revenue ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Forecast Tab ───────────────────────────────────────────────────── */

function ForecastTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.getSalesForecast(3);
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load forecast data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-cg-slate-muted mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-cg-sage hover:bg-cg-sage-light text-white text-sm font-medium">Retry</button>
      </div>
    );
  }

  // Merge historical (actual) + forecast (projected) into a single series
  // keyed by label so Recharts can render a continuous line with a confidence
  // band on the projected half.
  const chartData = (() => {
    if (!data) return [];
    const hist = (data.historical ?? []) as { date: string; mrr: number }[];
    const fcst = (data.forecast ?? []) as {
      month: string;
      projected_mrr: number;
      projected_arr: number;
      low_mrr: number;
      high_mrr: number;
    }[];
    // Downsample historical to weekly points to keep chart readable
    const historicalSparse = hist.filter((_, i) => i % 7 === 0 || i === hist.length - 1);
    const historicalRows = historicalSparse.map((h) => ({
      label: h.date,
      actual: h.mrr,
    }));
    const forecastRows = fcst.map((f) => ({
      label: `${f.month}-30`,
      projected: f.projected_mrr,
      low: f.low_mrr,
      high: f.high_mrr,
    }));
    return [...historicalRows, ...forecastRows];
  })();

  const lastForecast = data?.forecast?.[data.forecast.length - 1];

  return (
    <div className="space-y-6">
      {/* MRR Forecast Chart */}
      <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-cg-slate-tint">
            MRR Forecast
            <InfoTooltip text="OLS linear regression on real daily MRR history; shaded band is ±1σ residual." />
          </h2>
          {data && (
            <span className="text-[11px] text-muted-foreground">
              method: <span className="text-cg-slate-tint">{data.method}</span>
              {' · '}implied MoM growth:{' '}
              <span className={(data.implied_mom_growth_pct ?? 0) >= 0 ? 'text-cg-sage' : 'text-red-400'}>
                {(data.implied_mom_growth_pct ?? 0) >= 0 ? '+' : ''}
                {(data.implied_mom_growth_pct ?? 0).toFixed(2)}%
              </span>
            </span>
          )}
        </div>
        {loading ? <Skeleton className="h-72" /> : chartData.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--cg-slate)" opacity={0.2} />
              <XAxis
                dataKey="label"
                stroke="var(--cg-slate-strong)"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                axisLine={{ stroke: 'var(--cg-slate-strong)' }}
                tickLine={false}
              />
              <YAxis
                stroke="var(--cg-slate-strong)"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={RECHARTS_TOOLTIP}
                formatter={(value: any) => [formatCurrency(Number(value ?? 0)), '']}
              />
              <Area type="monotone" dataKey="high" name="High" stroke="none" fill="var(--cg-sage)" fillOpacity={0.1} />
              <Area type="monotone" dataKey="low" name="Low" stroke="none" fill="var(--cg-slate-deep)" fillOpacity={0.8} />
              <Area
                type="monotone"
                dataKey="projected"
                name="Projected MRR"
                stroke="var(--cg-sage)"
                strokeWidth={2}
                fill="var(--cg-sage)"
                fillOpacity={0.15}
              />
              <Area
                type="monotone"
                dataKey="actual"
                name="Actual MRR"
                stroke="var(--cg-slate-light)"
                strokeWidth={2}
                fill="var(--cg-slate-light)"
                fillOpacity={0.1}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-cg-slate-strong text-sm text-center py-10">No forecast data available</p>
        )}
      </div>

      {/* Forecast Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse bg-cg-slate/20 rounded-xl h-24" />)
        ) : data && (
          <>
            <MetricCard
              icon={DollarSign} label="Current MRR"
              value={formatCurrency(data.current_mrr ?? 0)}
              sub={`${data.paying_subscribers ?? 0} paying subscribers`}
              color="sage"
              tooltip="MRR at today across all paying subscription tiers."
            />
            <MetricCard
              icon={TrendingUp} label={`Projected MRR (${data.forecast?.length ?? 3}mo)`}
              value={formatCurrency(lastForecast?.projected_mrr ?? 0)}
              color="sage"
              tooltip="OLS projection at end of the last forecasted month."
            />
            <MetricCard
              icon={BarChart3} label="Low Band"
              value={formatCurrency(lastForecast?.low_mrr ?? 0)}
              sub="-1σ residual"
              color="sky"
              tooltip="Pessimistic scenario — one standard deviation below the regression line."
            />
            <MetricCard
              icon={BarChart3} label="High Band"
              value={formatCurrency(lastForecast?.high_mrr ?? 0)}
              sub="+1σ residual"
              color="sage"
              tooltip="Optimistic scenario — one standard deviation above the regression line."
            />
          </>
        )}
      </div>

      {/* Period-over-period MRR compare — toggleable overlay of prior 30d */}
      {!loading && data?.historical?.length > 0 && (() => {
        const hist = data.historical as { date: string; mrr: number }[];
        const last30 = hist.slice(-30).map((h) => ({ date: h.date, value: h.mrr }));
        const prior30 = hist
          .slice(-60, -30)
          .map((h) => ({ date: h.date, prior_value: h.mrr }));
        return (
          <CompareToggleChart
            title="Historical MRR — last 30 days"
            data={last30}
            priorData={prior30.length === 30 ? prior30 : undefined}
            valueLabel="MRR"
            color="var(--cg-sage)"
            height={240}
            formatValue={(n) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            tooltip="Daily MRR for the last 30 days. Toggle 'Compare' to overlay the 30 days before that."
          />
        );
      })()}
    </div>
  );
}

/* ── Win/Loss Tab ──────────────────────────────────────────────────── */

function WinLossTab() {
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.getSalesWinLoss(days);
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load win/loss data');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-cg-slate-muted mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-cg-sage hover:bg-cg-sage-light text-white text-sm font-medium">Retry</button>
      </div>
    );
  }

  const funnel = data?.funnel;
  const signups = data?.signups;
  const funnelEmpty = funnel && funnel.tracked_leads === 0;

  return (
    <div className="space-y-6">
      {/* Period picker */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Window:</span>
        {[30, 60, 90, 180, 365].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              days === d
                ? 'bg-cg-sage text-white'
                : 'bg-cg-slate-deep/60 text-cg-slate-muted hover:text-white border border-cg-slate/20'
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {loading ? <SkeletonCards count={4} /> : (
        <>
          {/* Funnel summary */}
          <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-cg-slate-tint">
                Funnel-based Win/Loss
                <InfoTooltip text="Based on Lead.stage — populated by the 'Close as lost' UX on the Leads page." />
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {funnel?.tracked_leads ?? 0} leads tracked
              </span>
            </div>

            {funnelEmpty ? (
              <div className="text-center py-8">
                <p className="text-sm text-cg-slate-muted mb-1">No funnel-tracked leads in this window.</p>
                <p className="text-xs text-muted-foreground">
                  Mark leads as <span className="text-cg-slate-tint">closed_won</span> or{' '}
                  <span className="text-cg-slate-tint">closed_lost</span> from the Leads page
                  to populate this view.
                </p>
              </div>
            ) : funnel && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard icon={TrendingUp} label="Wins" value={formatNumber(funnel.wins)} color="sage" />
                <MetricCard icon={AlertTriangle} label="Losses" value={formatNumber(funnel.losses)} color="sky" />
                <MetricCard
                  icon={Target}
                  label="Win Rate"
                  value={`${funnel.win_rate?.toFixed(1) ?? 0}%`}
                  color={funnel.win_rate >= 25 ? 'sage' : 'sky'}
                />
                <MetricCard
                  icon={BarChart3}
                  label="Avg Days to Close"
                  value={`${funnel.avg_days_to_close?.toFixed(1) ?? 0}`}
                  sub="days"
                  color="sage"
                />
              </div>
            )}

            {/* Loss reasons breakdown */}
            {funnel?.by_reason?.length > 0 && (
              <div className="mt-5 pt-5 border-t border-cg-slate/20">
                <h3 className="text-xs font-medium text-cg-slate-muted mb-3">Why Deals Are Lost</h3>
                <div className="space-y-2">
                  {funnel.by_reason.map((r: any) => (
                    <div key={r.reason}>
                      <div className="flex items-center justify-between mb-1 text-xs">
                        <span className="text-cg-slate-tint capitalize">{r.reason?.replace(/_/g, ' ')}</span>
                        <span className="text-muted-foreground">
                          {r.count} ({r.pct_of_losses?.toFixed(1) ?? 0}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-foreground rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-red-500/60 to-amber-500/60 transition-all duration-500"
                          style={{ width: `${Math.max(r.pct_of_losses ?? 0, 2)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Signup fallback view — shown alongside for context */}
          {signups && (
            <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-cg-slate-tint mb-4">
                Signup-based (fallback)
                <InfoTooltip text="Signups vs paid conversions in window. Useful when funnel tracking is sparse." />
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard icon={TrendingUp} label="Signups" value={formatNumber(signups.total)} color="sky" />
                <MetricCard icon={TrendingUp} label="Paid" value={formatNumber(signups.wins)} color="sage" />
                <MetricCard icon={Target} label="Win Rate" value={`${signups.win_rate?.toFixed(1) ?? 0}%`} color="sage" />
                <MetricCard icon={AlertTriangle} label="Loss Rate" value={`${signups.loss_rate?.toFixed(1) ?? 0}%`} color="sky" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Unit Economics Tab ──────────────────────────────────────────────── */

function UnitEconomicsTab() {
  const [unitEcon, setUnitEcon] = useState<UnitEconomics | null>(null);
  const [cacData, setCacData] = useState<any>(null);
  const [ltvData, setLtvData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [econ, cac, ltv] = await Promise.all([
        adminAPI.getUnitEconomics(),
        adminAPI.getSalesCAC(90),
        adminAPI.getSalesLTV(),
      ]);
      setUnitEcon(econ);
      setCacData(cac);
      setLtvData(ltv);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load unit economics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error && !unitEcon) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-cg-slate-muted mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-cg-sage hover:bg-cg-sage-light text-white text-sm font-medium">Retry</button>
      </div>
    );
  }

  const ltvCacPct = unitEcon ? Math.min((unitEcon.ltv_cac_ratio / 5) * 100, 100) : 0;
  const churnPct = unitEcon ? Math.min(unitEcon.monthly_churn_rate * 100, 100) : 0;
  const paybackPct = unitEcon ? Math.min((12 / Math.max(unitEcon.payback_months, 1)) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress Rings */}
      {loading ? (
        <SkeletonCards count={4} />
      ) : unitEcon && (
        <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-cg-slate-tint mb-6">Key Ratios</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <ProgressRing
              value={ltvCacPct}
              label="LTV:CAC Ratio"
              sublabel={`${unitEcon.ltv_cac_ratio.toFixed(1)}x`}
              color={unitEcon.ltv_cac_ratio >= 3 ? 'var(--cg-sage)' : unitEcon.ltv_cac_ratio >= 2 ? 'var(--cg-amber)' : 'var(--cg-error)'}
            />
            <ProgressRing
              value={unitEcon.paying_users > 0 ? Math.min((unitEcon.paying_users / (unitEcon.paying_users + 100)) * 100, 100) : 0}
              label="Trial Conversion"
              sublabel={`${unitEcon.paying_users} paid`}
            />
            <ProgressRing
              value={100 - churnPct}
              label="Monthly Retention"
              sublabel={`${(unitEcon.monthly_churn_rate * 100).toFixed(1)}% churn`}
              color={unitEcon.monthly_churn_rate < 0.03 ? 'var(--cg-sage)' : unitEcon.monthly_churn_rate < 0.07 ? 'var(--cg-amber)' : 'var(--cg-error)'}
            />
            <ProgressRing
              value={paybackPct}
              label="Payback Period"
              sublabel={`${unitEcon.payback_months.toFixed(1)} months`}
              color={unitEcon.payback_months <= 12 ? 'var(--cg-sage)' : unitEcon.payback_months <= 18 ? 'var(--cg-amber)' : 'var(--cg-error)'}
            />
          </div>
        </div>
      )}

      {/* CAC by Channel */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-cg-slate-tint mb-4">
            CAC by Channel
            <InfoTooltip text="Customer acquisition cost broken down by marketing channel" />
          </h2>
          {loading ? <Skeleton className="h-60" /> : cacData?.by_channel?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cacData.by_channel} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cg-slate)" opacity={0.2} horizontal={false} />
                <XAxis
                  type="number"
                  stroke="var(--cg-slate-strong)"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="channel"
                  stroke="var(--cg-slate-strong)"
                  tick={{ fill: 'var(--cg-slate-muted)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip contentStyle={RECHARTS_TOOLTIP} formatter={(v: any) => [formatCurrency(Number(v ?? 0)), 'CAC']} />
                <Bar dataKey="cac" name="CAC" fill="var(--cg-slate-light)" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-cg-slate-strong text-sm text-center py-10">No CAC data available</p>
          )}
        </div>

        {/* LTV by Tier */}
        <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-cg-slate-tint mb-4">
            LTV by Tier
            <InfoTooltip text="Lifetime value broken down by subscription tier" />
          </h2>
          {loading ? <Skeleton className="h-60" /> : ltvData?.by_tier?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ltvData.by_tier} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cg-slate)" opacity={0.2} horizontal={false} />
                <XAxis
                  type="number"
                  stroke="var(--cg-slate-strong)"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="tier"
                  stroke="var(--cg-slate-strong)"
                  tick={{ fill: 'var(--cg-slate-muted)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip contentStyle={RECHARTS_TOOLTIP} formatter={(v: any) => [formatCurrency(Number(v ?? 0)), 'LTV']} />
                <Bar dataKey="ltv" name="LTV" fill="var(--cg-sage)" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-cg-slate-strong text-sm text-center py-10">No LTV data available</p>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      {unitEcon && (
        <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-cg-slate-tint mb-4">Key Metrics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-cg-slate/10 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-white">{formatCurrency(unitEcon.mrr)}</div>
              <div className="text-[11px] text-muted-foreground">MRR</div>
            </div>
            <div className="bg-cg-slate/10 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-white">{formatCurrency(unitEcon.arr)}</div>
              <div className="text-[11px] text-muted-foreground">ARR</div>
            </div>
            <div className="bg-cg-slate/10 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-white">{formatCurrency(unitEcon.arpu)}</div>
              <div className="text-[11px] text-muted-foreground">ARPU</div>
            </div>
            <div className="bg-cg-slate/10 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-white">{formatCurrency(unitEcon.ltv)}</div>
              <div className="text-[11px] text-muted-foreground">LTV</div>
            </div>
          </div>

          {/* Tier Breakdown */}
          {Object.keys(unitEcon.tier_breakdown || {}).length > 0 && (
            <div className="mt-4 pt-4 border-t border-cg-slate/20">
              <h3 className="text-xs font-medium text-cg-slate-muted mb-3">Revenue by Tier</h3>
              <div className="space-y-2">
                {Object.entries(unitEcon.tier_breakdown)
                  .sort(([, a], [, b]) => b.revenue - a.revenue)
                  .map(([tier, info]) => {
                    const pct = unitEcon.mrr > 0 ? Math.round((info.revenue / unitEcon.mrr) * 100) : 0;
                    return (
                      <div key={tier}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-cg-slate-muted capitalize">{tier.replace(/_/g, ' ')}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{info.count} users x ${info.price}/mo</span>
                            <span className="text-xs font-medium text-white">{formatCurrency(info.revenue)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-foreground rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cg-sage to-cg-sage-light transition-all duration-500"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── AI Advisor Tab ─────────────────────────────────────────────────── */

function AIAdvisorTab() {
  const [suggestions, setSuggestions] = useState<any[] | null>(null);
  const [dataSummary, setDataSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.postSalesAISuggestions();
      // Backend now always returns { suggestions: [...], data_summary: {...} }
      // Normalize old field names if Claude returns them: category→type alias,
      // suggestion→action alias, estimated_impact→expected_impact alias.
      const normalized = (result.suggestions || []).map((s: any) => ({
        type: s.type || s.category || 'general',
        action: s.action || s.suggestion || '',
        reasoning: s.reasoning,
        expected_impact: s.expected_impact || s.estimated_impact,
        priority: s.priority,
        target: s.target,
      }));
      setSuggestions(normalized);
      setDataSummary(result.data_summary ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Generate Button */}
      <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-6 text-center">
        <Brain className="w-10 h-10 text-cg-sage mx-auto mb-3" />
        <h2 className="text-sm font-semibold text-cg-slate-tint mb-2">AI Sales Advisor</h2>
        <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
          Analyze your sales data to generate actionable insights, identify opportunities, and surface risks.
        </p>
        <button aria-label="Refresh"
          onClick={generateInsights}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cg-sage hover:bg-cg-sage-light text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Generate Sales Insights
            </>
          )}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-cg-sage rounded-full animate-pulse" />
            <span className="text-sm text-cg-slate-muted">AI is analyzing your sales data...</span>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-cg-slate/20 rounded w-3/4 mb-2" />
                <div className="h-3 bg-cg-slate/15 rounded w-full mb-1" />
                <div className="h-3 bg-cg-slate/10 rounded w-5/6" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center py-10">
          <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
          <p className="text-cg-slate-muted mb-3 text-sm">{error}</p>
          <button
            onClick={generateInsights}
            className="px-4 py-2 rounded-lg bg-cg-sage hover:bg-cg-sage-light text-white text-sm font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Suggestions */}
      {suggestions && !loading && (
        <div className="space-y-3">
          {dataSummary && (
            <div className="bg-cg-ink/60 border border-cg-slate/20 rounded-lg p-3 text-xs text-cg-slate-muted">
              <span className="font-medium text-cg-slate-tint">Grounded on: </span>
              {formatNumber(dataSummary.total_users ?? 0)} users,
              {' '}{formatNumber(dataSummary.paid_users ?? 0)} paying
              {' '}({(dataSummary.conversion_rate ?? 0).toFixed(1)}% conversion),
              {' '}MRR {formatCurrency(dataSummary.current_mrr ?? 0)},
              {' '}growth {(dataSummary.growth_pct ?? 0) >= 0 ? '+' : ''}{(dataSummary.growth_pct ?? 0).toFixed(1)}% MoM
              {dataSummary.top_lost_reasons?.length > 0 && (
                <>, top lost reason: <span className="text-cg-slate-tint">{dataSummary.top_lost_reasons[0].reason}</span> ({dataSummary.top_lost_reasons[0].count})</>
              )}
            </div>
          )}
          <h2 className="text-sm font-semibold text-cg-slate-tint">
            AI Suggestions ({suggestions.length})
          </h2>
          {suggestions.map((s: any, i: number) => (
            <div
              key={i}
              className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5 hover:border-cg-slate/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Type Badge */}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${TYPE_COLORS[s.type] || 'bg-cg-slate/20 text-cg-slate-muted'}`}>
                    {s.type}
                  </span>
                  {/* Target */}
                  {s.target && (
                    <span className="text-xs text-muted-foreground">
                      <Target className="w-3 h-3 inline mr-1" />
                      {s.target}
                    </span>
                  )}
                </div>
                {/* Priority */}
                {s.priority && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${PRIORITY_COLORS[s.priority] || PRIORITY_COLORS.medium}`}>
                    {s.priority}
                  </span>
                )}
              </div>

              {/* Action */}
              <h3 className="text-sm font-medium text-white mb-2">{s.action}</h3>

              {/* Reasoning */}
              {s.reasoning && (
                <p className="text-xs text-cg-slate-muted leading-relaxed mb-3">{s.reasoning}</p>
              )}

              {/* Expected Impact */}
              {s.expected_impact && (
                <div className="flex items-center gap-2 pt-2 border-t border-cg-slate/15">
                  <TrendingUp className="w-3.5 h-3.5 text-cg-sage" />
                  <span className="text-xs text-cg-sage font-medium">{s.expected_impact}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state if no suggestions yet */}
      {!suggestions && !loading && !error && (
        <div className="text-center py-10">
          <p className="text-cg-slate-strong text-sm">Click the button above to generate AI-powered sales insights.</p>
        </div>
      )}
    </div>
  );
}
