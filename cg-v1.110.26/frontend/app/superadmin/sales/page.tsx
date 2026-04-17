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
  FunnelChart, ProgressRing,
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
  { key: 'unit-economics', label: 'Unit Economics', icon: DollarSign },
  { key: 'ai-advisor', label: 'AI Advisor', icon: Brain },
];

const RECHARTS_TOOLTIP = {
  backgroundColor: '#1E3A4A',
  border: '1px solid #2D6A8F',
  borderRadius: 8,
  color: '#D0E4EC',
  fontSize: 12,
};

const CHART_COLORS = ['#3DAA8A', '#4BA8C8', '#2D6A8F', '#F5A623', '#E8834A', '#C53030'];

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
        <p className="text-sm text-[#6B8A9A] mt-0.5">Pipeline, conversions, forecasting, and AI-powered insights</p>
      </div>

      <TabBar tabs={TABS} activeTab={tab} onTabChange={handleTabChange} />

      <Suspense fallback={<SkeletonCards count={4} />}>
        {tab === 'pipeline' && <PipelineTab />}
        {tab === 'conversions' && loadedTabs.has('conversions') && <ConversionsTab />}
        {tab === 'forecast' && loadedTabs.has('forecast') && <ForecastTab />}
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
        <p className="text-[#8AACBC] mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium">Retry</button>
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
            <div className="bg-gradient-to-b from-[#3DAA8A]/20 to-[#3DAA8A]/5 border border-[#3DAA8A]/20 rounded-xl p-4">
              <DollarSign className="w-5 h-5 text-[#3DAA8A] mb-2" />
              <div className="text-2xl font-bold text-white">{formatCurrency(pipeline.total_pipeline_value)}</div>
              <div className="text-xs text-[#6B8A9A]">Total Pipeline Value</div>
            </div>
            {pipeline.stages.map((stage, i) => (
              <div key={stage.name} className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-4">
                <div className="text-xs text-[#6B8A9A] mb-1">{stage.name}</div>
                <div className="text-lg font-bold text-white">{formatNumber(stage.count)}</div>
                <div className="text-xs text-[#4A6E7F]">
                  {formatCurrency(stage.value)}
                  {stage.conversion_from_prev_pct > 0 && (
                    <span className="ml-1 text-[#3DAA8A]">({stage.conversion_from_prev_pct.toFixed(1)}%)</span>
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
        <p className="text-[#8AACBC] mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse bg-[#2D6A8F]/20 rounded-xl h-24" />)
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
      <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">
          Conversion Trend (30 days)
          <InfoTooltip text="Daily conversion rate over the past 30 days" />
        </h2>
        {loading ? <Skeleton className="h-64" /> : data?.daily_conversions?.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.daily_conversions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D6A8F" opacity={0.2} />
              <XAxis
                dataKey="date"
                stroke="#4A6E7F"
                tick={{ fill: '#6B8A9A', fontSize: 10 }}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                axisLine={{ stroke: '#4A6E7F' }}
                tickLine={false}
              />
              <YAxis
                stroke="#4A6E7F"
                tick={{ fill: '#6B8A9A', fontSize: 10 }}
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
                stroke="#3DAA8A"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3DAA8A' }}
              />
              <Line
                type="monotone"
                dataKey="rate"
                name="Rate %"
                stroke="#4BA8C8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#4BA8C8' }}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[#4A6E7F] text-sm text-center py-10">No conversion data available</p>
        )}
      </div>

      {/* Conversion by Source */}
      {data?.by_source?.length > 0 && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">
            Conversions by Source
            <InfoTooltip text="Conversion performance broken down by acquisition channel" />
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#6B8A9A] border-b border-[#2D6A8F]/20">
                  <th className="text-left pb-2 font-medium">Source</th>
                  <th className="text-right pb-2 font-medium">Trials</th>
                  <th className="text-right pb-2 font-medium">Conversions</th>
                  <th className="text-right pb-2 font-medium">Rate</th>
                  <th className="text-right pb-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.by_source.map((src: any) => (
                  <tr key={src.source} className="border-b border-[#2D6A8F]/10 last:border-0 hover:bg-[#2D6A8F]/10">
                    <td className="py-2.5 text-[#D0E4EC] capitalize">{src.source?.replace(/_/g, ' ') || 'Unknown'}</td>
                    <td className="py-2.5 text-right text-[#8AACBC]">{formatNumber(src.trials)}</td>
                    <td className="py-2.5 text-right text-[#8AACBC]">{formatNumber(src.conversions)}</td>
                    <td className="py-2.5 text-right">
                      <span className={src.rate > 10 ? 'text-[#3DAA8A]' : 'text-[#8AACBC]'}>
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
        <p className="text-[#8AACBC] mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* MRR Forecast Chart */}
      <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">
          MRR Forecast
          <InfoTooltip text="Projected monthly recurring revenue with confidence intervals" />
        </h2>
        {loading ? <Skeleton className="h-72" /> : data?.forecast_points?.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.forecast_points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D6A8F" opacity={0.2} />
              <XAxis
                dataKey="month"
                stroke="#4A6E7F"
                tick={{ fill: '#6B8A9A', fontSize: 10 }}
                axisLine={{ stroke: '#4A6E7F' }}
                tickLine={false}
              />
              <YAxis
                stroke="#4A6E7F"
                tick={{ fill: '#6B8A9A', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={RECHARTS_TOOLTIP}
                formatter={(value: any) => [formatCurrency(Number(value ?? 0)), '']}
              />
              {/* Confidence band (high) */}
              <Area
                type="monotone"
                dataKey="high"
                name="High"
                stroke="none"
                fill="#3DAA8A"
                fillOpacity={0.1}
              />
              {/* Confidence band (low) */}
              <Area
                type="monotone"
                dataKey="low"
                name="Low"
                stroke="none"
                fill="#1A3648"
                fillOpacity={0.8}
              />
              {/* Projected MRR line */}
              <Area
                type="monotone"
                dataKey="projected"
                name="Projected MRR"
                stroke="#3DAA8A"
                strokeWidth={2}
                fill="#3DAA8A"
                fillOpacity={0.15}
              />
              {/* Actual MRR line */}
              <Area
                type="monotone"
                dataKey="actual"
                name="Actual MRR"
                stroke="#4BA8C8"
                strokeWidth={2}
                fill="#4BA8C8"
                fillOpacity={0.1}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[#4A6E7F] text-sm text-center py-10">No forecast data available</p>
        )}
      </div>

      {/* Forecast Metrics */}
      <div className="grid grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="animate-pulse bg-[#2D6A8F]/20 rounded-xl h-24" />)
        ) : data && (
          <>
            <MetricCard
              icon={TrendingUp} label="Projected MRR (3mo)"
              value={formatCurrency(data.projected_mrr_3mo ?? 0)}
              color="sage"
              tooltip="Expected MRR in 3 months based on current trends"
            />
            <MetricCard
              icon={BarChart3} label="Confidence Low"
              value={formatCurrency(data.confidence_low ?? 0)}
              sub="pessimistic scenario"
              color="sky"
              tooltip="Lower bound of MRR projection at 90% confidence"
            />
            <MetricCard
              icon={BarChart3} label="Confidence High"
              value={formatCurrency(data.confidence_high ?? 0)}
              sub="optimistic scenario"
              color="sage"
              tooltip="Upper bound of MRR projection at 90% confidence"
            />
          </>
        )}
      </div>

      {/* Scenario Summary */}
      {data?.scenario_summary && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-3">Scenario Analysis</h2>
          <p className="text-sm text-[#8AACBC] leading-relaxed">{data.scenario_summary}</p>
        </div>
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
        <p className="text-[#8AACBC] mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium">Retry</button>
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
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-6">Key Ratios</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <ProgressRing
              value={ltvCacPct}
              label="LTV:CAC Ratio"
              sublabel={`${unitEcon.ltv_cac_ratio.toFixed(1)}x`}
              color={unitEcon.ltv_cac_ratio >= 3 ? '#3DAA8A' : unitEcon.ltv_cac_ratio >= 2 ? '#F5A623' : '#C53030'}
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
              color={unitEcon.monthly_churn_rate < 0.03 ? '#3DAA8A' : unitEcon.monthly_churn_rate < 0.07 ? '#F5A623' : '#C53030'}
            />
            <ProgressRing
              value={paybackPct}
              label="Payback Period"
              sublabel={`${unitEcon.payback_months.toFixed(1)} months`}
              color={unitEcon.payback_months <= 12 ? '#3DAA8A' : unitEcon.payback_months <= 18 ? '#F5A623' : '#C53030'}
            />
          </div>
        </div>
      )}

      {/* CAC by Channel */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">
            CAC by Channel
            <InfoTooltip text="Customer acquisition cost broken down by marketing channel" />
          </h2>
          {loading ? <Skeleton className="h-60" /> : cacData?.by_channel?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cacData.by_channel} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D6A8F" opacity={0.2} horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#4A6E7F"
                  tick={{ fill: '#6B8A9A', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="channel"
                  stroke="#4A6E7F"
                  tick={{ fill: '#8AACBC', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip contentStyle={RECHARTS_TOOLTIP} formatter={(v: any) => [formatCurrency(Number(v ?? 0)), 'CAC']} />
                <Bar dataKey="cac" name="CAC" fill="#4BA8C8" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[#4A6E7F] text-sm text-center py-10">No CAC data available</p>
          )}
        </div>

        {/* LTV by Tier */}
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">
            LTV by Tier
            <InfoTooltip text="Lifetime value broken down by subscription tier" />
          </h2>
          {loading ? <Skeleton className="h-60" /> : ltvData?.by_tier?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ltvData.by_tier} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D6A8F" opacity={0.2} horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#4A6E7F"
                  tick={{ fill: '#6B8A9A', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="tier"
                  stroke="#4A6E7F"
                  tick={{ fill: '#8AACBC', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip contentStyle={RECHARTS_TOOLTIP} formatter={(v: any) => [formatCurrency(Number(v ?? 0)), 'LTV']} />
                <Bar dataKey="ltv" name="LTV" fill="#3DAA8A" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[#4A6E7F] text-sm text-center py-10">No LTV data available</p>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      {unitEcon && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">Key Metrics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#2D6A8F]/10 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-white">{formatCurrency(unitEcon.mrr)}</div>
              <div className="text-[11px] text-[#6B8A9A]">MRR</div>
            </div>
            <div className="bg-[#2D6A8F]/10 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-white">{formatCurrency(unitEcon.arr)}</div>
              <div className="text-[11px] text-[#6B8A9A]">ARR</div>
            </div>
            <div className="bg-[#2D6A8F]/10 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-white">{formatCurrency(unitEcon.arpu)}</div>
              <div className="text-[11px] text-[#6B8A9A]">ARPU</div>
            </div>
            <div className="bg-[#2D6A8F]/10 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-white">{formatCurrency(unitEcon.ltv)}</div>
              <div className="text-[11px] text-[#6B8A9A]">LTV</div>
            </div>
          </div>

          {/* Tier Breakdown */}
          {Object.keys(unitEcon.tier_breakdown || {}).length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#2D6A8F]/20">
              <h3 className="text-xs font-medium text-[#8AACBC] mb-3">Revenue by Tier</h3>
              <div className="space-y-2">
                {Object.entries(unitEcon.tier_breakdown)
                  .sort(([, a], [, b]) => b.revenue - a.revenue)
                  .map(([tier, info]) => {
                    const pct = unitEcon.mrr > 0 ? Math.round((info.revenue / unitEcon.mrr) * 100) : 0;
                    return (
                      <div key={tier}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#8AACBC] capitalize">{tier.replace(/_/g, ' ')}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#6B8A9A]">{info.count} users x ${info.price}/mo</span>
                            <span className="text-xs font-medium text-white">{formatCurrency(info.revenue)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#1E3A4A] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#3DAA8A] to-[#5BC4A0] transition-all duration-500"
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
  const [isSample, setIsSample] = useState(false);
  const [sampleReason, setSampleReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.postSalesAISuggestions();
      setSuggestions(result.suggestions || result);
      setIsSample(!!result.is_sample);
      setSampleReason(result.sample_reason ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Generate Button */}
      <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-6 text-center">
        <Brain className="w-10 h-10 text-[#3DAA8A] mx-auto mb-3" />
        <h2 className="text-sm font-semibold text-[#D0E4EC] mb-2">AI Sales Advisor</h2>
        <p className="text-xs text-[#6B8A9A] mb-4 max-w-md mx-auto">
          Analyze your sales data to generate actionable insights, identify opportunities, and surface risks.
        </p>
        <button
          onClick={generateInsights}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium transition-colors disabled:opacity-50"
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
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-[#3DAA8A] rounded-full animate-pulse" />
            <span className="text-sm text-[#8AACBC]">AI is analyzing your sales data...</span>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-[#2D6A8F]/20 rounded w-3/4 mb-2" />
                <div className="h-3 bg-[#2D6A8F]/15 rounded w-full mb-1" />
                <div className="h-3 bg-[#2D6A8F]/10 rounded w-5/6" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center py-10">
          <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
          <p className="text-[#8AACBC] mb-3 text-sm">{error}</p>
          <button
            onClick={generateInsights}
            className="px-4 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Suggestions */}
      {suggestions && !loading && (
        <div className="space-y-3">
          {isSample && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-100 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
              <div className="flex-1">
                <p className="font-semibold">Placeholder suggestions — not from live sales data.</p>
                {sampleReason && (
                  <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">{sampleReason}</p>
                )}
              </div>
            </div>
          )}
          <h2 className="text-sm font-semibold text-[#D0E4EC]">
            AI Suggestions ({suggestions.length})
          </h2>
          {suggestions.map((s: any, i: number) => (
            <div
              key={i}
              className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5 hover:border-[#2D6A8F]/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Type Badge */}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${TYPE_COLORS[s.type] || 'bg-[#2D6A8F]/20 text-[#8AACBC]'}`}>
                    {s.type}
                  </span>
                  {/* Target */}
                  {s.target && (
                    <span className="text-xs text-[#6B8A9A]">
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
                <p className="text-xs text-[#8AACBC] leading-relaxed mb-3">{s.reasoning}</p>
              )}

              {/* Expected Impact */}
              {s.expected_impact && (
                <div className="flex items-center gap-2 pt-2 border-t border-[#2D6A8F]/15">
                  <TrendingUp className="w-3.5 h-3.5 text-[#3DAA8A]" />
                  <span className="text-xs text-[#3DAA8A] font-medium">{s.expected_impact}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state if no suggestions yet */}
      {!suggestions && !loading && !error && (
        <div className="text-center py-10">
          <p className="text-[#4A6E7F] text-sm">Click the button above to generate AI-powered sales insights.</p>
        </div>
      )}
    </div>
  );
}
