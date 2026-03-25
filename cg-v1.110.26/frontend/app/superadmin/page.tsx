'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users, Activity, TrendingUp, DollarSign, Zap,
  MessageSquare, Shield, Clock, ArrowUpRight,
  ArrowDownRight, UserPlus, CreditCard,
  FileText, ExternalLink, RefreshCw, AlertTriangle,
  Radio, Mail, Bug, Brain, PenTool, Server,
  MessageCircle, Gauge,
} from 'lucide-react';
import { adminAPI, type DashboardData, type GrowthStats, type PlatformHealth, type RevenueMetrics, type ExecutiveSummary } from '@/lib/admin-api';
import {
  MetricCard, SmallMetric, PageHeader, ErrorState,
  Skeleton, SkeletonCards, TabBar,
  formatNumber, formatCurrency, timeAgo, calcTrend,
  InfoTooltip, CohortHeatmap, FunnelChart, WaterfallChart,
} from '@/components/superadmin';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

/* ── Dashboard Tab Views ────────────────────────────────────────────── */

const TABS = [
  { key: 'glance', label: 'At a Glance' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'growth', label: 'Growth' },
  { key: 'performance', label: 'Performance' },
  { key: 'support', label: 'Support' },
];

const CHART_COLORS = ['#3DAA8A', '#4BA8C8', '#2D6A8F', '#F5A623', '#E8834A', '#C53030'];
const RECHARTS_TOOLTIP = { backgroundColor: '#1E3A4A', border: '1px solid #2D6A8F', borderRadius: 8, color: '#D0E4EC', fontSize: 12 };

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('view') || 'glance';

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [growth, setGrowth] = useState<GrowthStats | null>(null);
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [inboxStats, setInboxStats] = useState<any>(null);
  const [bugStats, setBugStats] = useState<any>(null);
  const [perfData, setPerfData] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [chatbotStats, setChatbotStats] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<RevenueMetrics | null>(null);
  const [execSummary, setExecSummary] = useState<ExecutiveSummary | null>(null);
  const [cohortData, setCohortData] = useState<any>(null);
  const [retentionCurve, setRetentionCurve] = useState<any>(null);
  const [aiSummary, setAISummary] = useState<any>(null);
  const [unitEcon, setUnitEcon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [d, g, h, inbox, bugs, ai] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getGrowthStats(14),
        adminAPI.getPlatformHealth(),
        adminAPI.getInboxStats().catch(() => null),
        adminAPI.getCurrentBugs().catch(() => null),
        adminAPI.getAISummary().catch(() => null),
      ]);
      setDashboard(d);
      setGrowth(g);
      setHealth(h);
      setInboxStats(inbox);
      setBugStats(bugs);
      setAISummary(ai);

      // Lazy load per-tab data
      if (activeTab === 'performance') {
        const [perf, status] = await Promise.all([
          adminAPI.getPerformanceOverview(7).catch(() => null),
          adminAPI.getSystemStatus().catch(() => null),
        ]);
        setPerfData(perf);
        setSystemStatus(status);
      }
      if (activeTab === 'support') {
        const cs = await adminAPI.getChatbotStats().catch(() => null);
        setChatbotStats(cs);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
    refreshRef.current = setInterval(fetchData, 30000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [fetchData]);

  // Load tab-specific data when switching
  useEffect(() => {
    if (!loading && activeTab === 'performance' && !perfData) {
      Promise.all([
        adminAPI.getPerformanceOverview(7).catch(() => null),
        adminAPI.getSystemStatus().catch(() => null),
      ]).then(([perf, status]) => {
        setPerfData(perf);
        setSystemStatus(status);
      });
    }
    if (!loading && activeTab === 'support' && !chatbotStats) {
      adminAPI.getChatbotStats().catch(() => null).then(setChatbotStats);
    }
    if (!loading && activeTab === 'revenue' && !revenueData) {
      Promise.all([
        adminAPI.getRevenueMetrics().catch(() => null),
        adminAPI.getUnitEconomics().catch(() => null),
      ]).then(([rev, econ]) => {
        setRevenueData(rev);
        setUnitEcon(econ);
      });
    }
    if (!loading && activeTab === 'growth' && !cohortData) {
      Promise.all([
        adminAPI.getExecutiveSummary().catch(() => null),
        adminAPI.getCohortAnalysis(6).catch(() => null),
        adminAPI.getRetentionCurve(90).catch(() => null),
      ]).then(([exec, cohorts, retention]) => {
        setExecSummary(exec);
        setCohortData(cohorts);
        setRetentionCurve(retention);
      });
    }
  }, [activeTab, loading, perfData, chatbotStats, revenueData, cohortData]);

  const setTab = useCallback((tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'glance') params.delete('view');
    else params.set('view', tab);
    const qs = params.toString();
    router.replace(`/superadmin${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [searchParams, router]);

  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const growthTrend = growth ? calcTrend(growth.daily_registrations || [], 7) : 0;
  const sparklineData = growth?.daily_registrations?.map(d => d.count) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={dashboard ? `Updated ${timeAgo(dashboard.generated_at)}` : 'Loading...'}
        onRefresh={fetchData}
        loading={loading}
        showLiveIndicator
      />

      {/* Health Banner */}
      {health && health.status !== 'healthy' && (
        <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
          health.status === 'critical'
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">Platform {health.status}</span>
          <span className="text-sm ml-2 opacity-80">
            {health.errors_24h} errors • {health.suspicious_24h} suspicious events
          </span>
        </div>
      )}

      {/* View Tabs */}
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setTab} />

      {/* ── At a Glance View ── */}
      {activeTab === 'glance' && (
        <div className="space-y-6">
          {/* Executive Pulse — top of dashboard */}
          {aiSummary?.summary && aiSummary.generated && (
            <div className="bg-gradient-to-br from-[#3DAA8A]/10 via-[#2D6A8F]/5 to-transparent border border-[#3DAA8A]/20 rounded-2xl p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#3DAA8A]/15 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-[#3DAA8A]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#D0E4EC] tracking-tight">Executive Pulse</h2>
                  <span className="text-[10px] text-[#4A6E7F]">Platform overview</span>
                </div>
                {aiSummary.generated_at && (
                  <span className="text-[10px] text-[#4A6E7F] ml-auto">{timeAgo(aiSummary.generated_at)}</span>
                )}
              </div>

              {/* Key metric chips */}
              {aiSummary.metrics && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#3DAA8A]/10 border border-[#3DAA8A]/15 text-xs font-medium text-[#5BC4A0]">
                    <Users className="w-3 h-3" /> {formatNumber(aiSummary.metrics.total_users)} users
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2D6A8F]/15 border border-[#2D6A8F]/20 text-xs font-medium text-[#4BA8C8]">
                    <DollarSign className="w-3 h-3" /> {formatCurrency(aiSummary.metrics.mrr)} MRR
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#3DAA8A]/10 border border-[#3DAA8A]/15 text-xs font-medium text-[#5BC4A0]">
                    <Activity className="w-3 h-3" /> {aiSummary.metrics.dau_mau_ratio ?? (aiSummary.metrics.mau > 0 ? Math.round(aiSummary.metrics.dau / aiSummary.metrics.mau * 100) : 0)}% DAU/MAU
                  </span>
                  {aiSummary.metrics.paying_users > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5A623]/10 border border-[#F5A623]/15 text-xs font-medium text-[#F5A623]">
                      <CreditCard className="w-3 h-3" /> {aiSummary.metrics.paying_users} paying
                    </span>
                  )}
                  {aiSummary.metrics.messages_7d > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2D6A8F]/15 border border-[#2D6A8F]/20 text-xs font-medium text-[#4BA8C8]">
                      <MessageSquare className="w-3 h-3" /> {formatNumber(aiSummary.metrics.messages_7d)} msgs (7d)
                    </span>
                  )}
                  {aiSummary.metrics.active_family_files > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#3DAA8A]/10 border border-[#3DAA8A]/15 text-xs font-medium text-[#5BC4A0]">
                      <FileText className="w-3 h-3" /> {aiSummary.metrics.active_family_files} family files
                    </span>
                  )}
                </div>
              )}

              {/* Summary bullets in 2-column layout */}
              <ul className={`grid gap-x-6 gap-y-2 ${aiSummary.summary.length > 4 ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                {aiSummary.summary.map((bullet: string, i: number) => (
                  <li key={i} className="flex gap-2 text-[13px] text-[#8AACBC] leading-relaxed">
                    <span className="text-[#3DAA8A] mt-0.5 flex-shrink-0">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Primary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {loading ? <SkeletonCards count={4} /> : dashboard && (
              <>
                <MetricCard
                  icon={Users} label="Total Users" value={formatNumber(dashboard.users.total)}
                  sub={`${dashboard.users.new_24h} new today`}
                  trend={growthTrend} color="sage"
                  tooltip="Total registered users across all plans"
                  sparklineData={sparklineData}
                />
                <MetricCard
                  icon={DollarSign} label={dashboard.subscriptions.mrr_source === 'stripe' ? 'MRR' : 'Est. MRR'} value={formatCurrency(dashboard.subscriptions.mrr ?? dashboard.subscriptions.estimated_mrr)}
                  sub={`${dashboard.subscriptions.past_due_count} past due`}
                  color="ocean" alert={dashboard.subscriptions.past_due_count > 0}
                  tooltip={dashboard.subscriptions.mrr_source === 'stripe' ? 'Verified MRR from Stripe' : 'Estimated MRR from database'}
                />
                <MetricCard
                  icon={Activity} label="Active (30d)" value={formatNumber(dashboard.users.active_30d)}
                  sub={`${dashboard.users.active_today} online now`}
                  color="sky"
                  tooltip="Users who logged in at least once in the past 30 days"
                />
                <MetricCard
                  icon={MessageSquare} label="Messages (7d)" value={formatNumber(dashboard.engagement.messages_7d)}
                  sub={`${dashboard.engagement.aria_interventions_7d} ARIA flags`}
                  color="gold"
                  tooltip="Total co-parent messages sent in the past 7 days"
                />
              </>
            )}
          </div>

          {/* Today's Pulse */}
          <div className="grid grid-cols-3 gap-3">
            {loading ? <SkeletonCards count={3} /> : dashboard && (
              <>
                <SmallMetric label="Signups Today" value={dashboard.users.new_24h} icon={UserPlus} tooltip="New registrations in the last 24 hours" />
                <SmallMetric label="Online Now" value={dashboard.users.active_today} icon={Zap} valueColor="text-emerald-400" tooltip="Users currently active on the platform" />
                <SmallMetric
                  label="Platform Health"
                  value={health?.status || '—'}
                  icon={Server}
                  valueColor={health?.status === 'healthy' ? 'text-emerald-400' : health?.status === 'degraded' ? 'text-amber-400' : 'text-red-400'}
                  tooltip="Overall health of backend services"
                />
              </>
            )}
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* User Growth Chart */}
            <div className="lg:col-span-2 bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#D0E4EC]">
                  User Growth (14 days)
                  <InfoTooltip text="Daily new user registrations. Weekend days are shown lighter." />
                </h2>
                <button onClick={() => router.push('/superadmin/growth')} className="text-xs text-[#3DAA8A] hover:text-[#5BC4A0] flex items-center gap-1">
                  View details <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              {loading ? <Skeleton className="h-36" /> : growth && (
                <>
                  <div className="flex items-end gap-1 h-36">
                    {(growth.daily_registrations || []).map((d, i) => {
                      const max = Math.max(...(growth.daily_registrations || []).map(x => x.count), 1);
                      const height = Math.max((d.count / max) * 100, 4);
                      const isWeekend = [0, 6].includes(new Date(d.date).getDay());
                      return (
                        <div key={i} className="flex-1 group relative">
                          <div
                            className={`w-full rounded-t transition-all ${isWeekend ? 'bg-[#3DAA8A]/25' : 'bg-[#3DAA8A]/60 group-hover:bg-[#5BC4A0]/80'}`}
                            style={{ height: `${height}%` }}
                          />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1E3A4A] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                            {d.count} users • {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {growth.daily_registrations?.length > 0 && (
                    <div className="flex justify-between mt-2 text-[10px] text-[#4A6E7F]">
                      <span>{new Date(growth.daily_registrations[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <span>{new Date(growth.daily_registrations[growth.daily_registrations.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Revenue Split */}
            <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#D0E4EC]">
                  Revenue Split
                  <InfoTooltip text="Subscription breakdown by tier as percentage of total users" />
                </h2>
                <button onClick={() => router.push('/superadmin/billing')} className="text-xs text-[#3DAA8A] hover:text-[#5BC4A0] flex items-center gap-1">
                  Details <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
              ) : dashboard && (
                <div className="space-y-2.5">
                  {Object.keys(dashboard.subscriptions?.tier_breakdown || {}).length === 0 ? (
                    <p className="text-xs text-[#4A6E7F] text-center py-4">No active subscriptions</p>
                  ) : Object.entries(dashboard.subscriptions?.tier_breakdown || {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([tier, count]) => {
                      const total = Object.values(dashboard.subscriptions?.tier_breakdown || {}).reduce((s: number, c: number) => s + c, 0) || 1;
                      const pct = Math.round(((count as number) / total) * 100);
                      return (
                        <div key={tier}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-[#8AACBC] capitalize">{tier.replace('_', ' ')}</span>
                            <span className="text-[#6B8A9A]">{count as number} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-[#1E3A4A] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#3DAA8A] to-[#5BC4A0] transition-all duration-500" style={{ width: `${pct}%` }} />
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
            <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#D0E4EC]">Recent Signups</h2>
                <button onClick={() => router.push('/superadmin/users')} className="text-xs text-[#3DAA8A] hover:text-[#5BC4A0] flex items-center gap-1">
                  All users <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              {loading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <div className="space-y-1">
                  {(dashboard?.recent_signups || []).map((s) => (
                    <div key={s.id} onClick={() => router.push(`/superadmin/users/${s.id}`)} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#2D6A8F]/15 cursor-pointer transition-colors">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3DAA8A]/40 to-[#2D6A8F]/40 flex items-center justify-center text-xs font-medium text-[#5BC4A0]">
                        {s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#D0E4EC] truncate">{s.name}</div>
                      </div>
                      <span className="text-[11px] text-[#4A6E7F] whitespace-nowrap">{timeAgo(s.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Activity */}
            <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#D0E4EC]">Admin Activity</h2>
                <button onClick={() => router.push('/superadmin/users?tab=activity')} className="text-xs text-[#3DAA8A] hover:text-[#5BC4A0] flex items-center gap-1">
                  Full log <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              {loading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <div className="space-y-1">
                  {(dashboard?.recent_admin_actions || []).map((a) => (
                    <div key={a.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-[#2D6A8F]/15 transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#3DAA8A]/60 mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#8AACBC]">
                          <span className="text-[#D0E4EC] font-medium">{a.action.replace('admin:', '').replace(/_/g, ' ')}</span>
                          {a.user_email && <span className="text-[#4A6E7F] ml-1">by {a.user_email.split('@')[0]}</span>}
                        </div>
                        {a.description && <div className="text-[11px] text-[#4A6E7F] mt-0.5 truncate">{a.description}</div>}
                      </div>
                      <span className="text-[11px] text-[#4A6E7F] whitespace-nowrap flex-shrink-0">{timeAgo(a.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickLink icon={Bug} label="DevOps Hub" badge={bugStats?.critical} badgeColor="text-red-400" onClick={() => router.push('/superadmin/bug-triage')} />
            <QuickLink icon={Users} label="Customer Success" onClick={() => router.push('/superadmin/customer-success')} />
            <QuickLink icon={DollarSign} label="Sales Intelligence" onClick={() => router.push('/superadmin/sales')} />
            <QuickLink icon={TrendingUp} label="Marketing Analytics" onClick={() => router.push('/superadmin/marketing-analytics')} />
          </div>
        </div>
      )}

      {/* ── Revenue View ── */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {!revenueData ? <SkeletonCards count={4} /> : (
              <>
                <MetricCard icon={DollarSign} label="MRR" value={formatCurrency(revenueData.mrr)} sub={`${revenueData.mrr_growth_rate > 0 ? '+' : ''}${revenueData.mrr_growth_rate}% growth`} trend={revenueData.mrr_growth_rate} color="sage" tooltip="Monthly recurring revenue from all active subscriptions" />
                <MetricCard icon={TrendingUp} label="ARR" value={formatCurrency(revenueData.arr)} color="ocean" tooltip="Annual run rate (MRR × 12)" />
                <MetricCard icon={Activity} label="LTV:CAC" value={unitEcon?.ltv_cac_ratio ? `${unitEcon.ltv_cac_ratio}x` : '—'} color={unitEcon?.ltv_cac_ratio >= 3 ? 'sage' : 'gold'} tooltip="Customer lifetime value to acquisition cost ratio. 3x+ is healthy." />
                <MetricCard icon={AlertTriangle} label="At-Risk MRR" value={formatCurrency(revenueData.at_risk_mrr)} color={revenueData.at_risk_mrr > 0 ? 'coral' : 'neutral'} tooltip="Revenue from past-due subscriptions" />
              </>
            )}
          </div>

          {/* MRR Trend Chart */}
          {revenueData?.mrr_trend && revenueData.mrr_trend.length > 0 && (
            <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">MRR Trend <InfoTooltip text="Monthly recurring revenue over time" /></h2>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueData.mrr_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D6A8F" opacity={0.2} />
                  <XAxis dataKey="date" stroke="#4A6E7F" tick={{ fill: '#6B8A9A', fontSize: 10 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis stroke="#4A6E7F" tick={{ fill: '#6B8A9A', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={RECHARTS_TOOLTIP} formatter={(v: number | undefined) => [`$${(v ?? 0).toFixed(2)}`, 'MRR']} />
                  <defs>
                    <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3DAA8A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3DAA8A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="mrr" stroke="#3DAA8A" fill="url(#mrrGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Revenue Breakdown + Waterfall */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Revenue by Tier */}
            {revenueData?.breakdown && (
              <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">Revenue by Tier <InfoTooltip text="Monthly revenue contribution by subscription tier" /></h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={Object.entries(revenueData.breakdown).map(([tier, data]: [string, any]) => ({ name: tier.replace('_', ' '), value: data.revenue }))} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={(props: any) => `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`}>
                      {Object.keys(revenueData.breakdown).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={RECHARTS_TOOLTIP} formatter={(v: number | undefined) => [`$${(v ?? 0).toFixed(2)}`, 'Revenue']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Unit Economics Summary */}
            {unitEcon && (
              <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">Unit Economics <InfoTooltip text="Key SaaS metrics for financial health" /></h2>
                <div className="space-y-3">
                  {[
                    { label: 'ARPU', value: formatCurrency(unitEcon.arpu), desc: 'Avg revenue per paying user' },
                    { label: 'LTV', value: formatCurrency(unitEcon.ltv), desc: 'Customer lifetime value' },
                    { label: 'CAC', value: unitEcon.cac > 0 ? formatCurrency(unitEcon.cac) : 'N/A', desc: 'Customer acquisition cost' },
                    { label: 'Churn Rate', value: `${unitEcon.monthly_churn_rate}%`, desc: 'Monthly churn rate' },
                    { label: 'Payback Period', value: unitEcon.payback_months > 0 ? `${unitEcon.payback_months} mo` : 'N/A', desc: 'Months to recover CAC' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-[#8AACBC]">{item.label}</span>
                        <span className="text-[10px] text-[#4A6E7F] ml-2">{item.desc}</span>
                      </div>
                      <span className="text-sm font-medium text-[#D0E4EC]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Growth View ── */}
      {activeTab === 'growth' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {!execSummary ? <SkeletonCards count={4} /> : (
              <>
                <MetricCard icon={Activity} label="DAU/MAU Ratio" value={`${execSummary.dau_mau_ratio}%`} color={execSummary.dau_mau_ratio >= 20 ? 'sage' : 'gold'} tooltip="Daily to monthly active user ratio. 20%+ is considered healthy for SaaS." />
                <MetricCard icon={Zap} label="Activation Rate" value={`${execSummary.activation_rate}%`} color="sky" tooltip="% of new users who create a family file within 7 days" />
                <MetricCard icon={CreditCard} label="Paying Conversion" value={`${execSummary.paying_conversion}%`} color="ocean" tooltip="% of all users on a paid subscription" />
                <MetricCard icon={UserPlus} label="New Users (7d)" value={formatNumber(execSummary.new_users_7d)} color="sage" tooltip="New user registrations in the last 7 days" />
              </>
            )}
          </div>

          {/* User Funnel */}
          {execSummary && (
            <FunnelChart
              title="User Funnel"
              tooltip="Conversion from registration through to paid subscription"
              stages={[
                { name: 'Registered', count: execSummary.total_users },
                { name: 'Active (30d)', count: execSummary.mau },
                { name: 'Activated', count: Math.round(execSummary.total_users * (execSummary.activation_rate / 100)) },
                { name: 'Paying', count: execSummary.paying_users },
              ]}
            />
          )}

          {/* Retention Curve */}
          {retentionCurve?.curve && retentionCurve.curve.length > 0 && (
            <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">Retention Curve <InfoTooltip text="Percentage of users retained over days since signup" /></h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={retentionCurve.curve.filter((_: any, i: number) => i % 3 === 0 || i <= 7)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D6A8F" opacity={0.2} />
                  <XAxis dataKey="day" stroke="#4A6E7F" tick={{ fill: '#6B8A9A', fontSize: 10 }} label={{ value: 'Days', position: 'insideBottom', offset: -5, fill: '#6B8A9A', fontSize: 10 }} />
                  <YAxis stroke="#4A6E7F" tick={{ fill: '#6B8A9A', fontSize: 10 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={RECHARTS_TOOLTIP} formatter={(v: number | undefined) => [`${v ?? 0}%`, 'Retained']} />
                  <Line type="monotone" dataKey="pct" stroke="#3DAA8A" strokeWidth={2} dot={{ r: 2, fill: '#3DAA8A' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Cohort Heatmap */}
          {cohortData?.cohorts && <CohortHeatmap cohorts={cohortData.cohorts} />}
        </div>
      )}

      {/* ── Performance View ── */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {!perfData ? <SkeletonCards count={4} /> : (
              <>
                <MetricCard
                  icon={Gauge} label="API Latency (p75)" value={`${perfData.summary?.avg_response_p75_ms || 0}ms`}
                  color={perfData.summary?.avg_response_p75_ms > 500 ? 'gold' : 'sky'}
                  tooltip="75th percentile API response time — most users experience this speed or faster"
                />
                <MetricCard
                  icon={AlertTriangle} label="Error Rate"
                  value={`${((perfData.transactions || []).reduce((a: number, t: any) => a + (t.failure_rate || 0), 0) / Math.max((perfData.transactions || []).length, 1) * 100).toFixed(1)}%`}
                  color="coral"
                  tooltip="Average failure rate across all API endpoints"
                />
                <MetricCard
                  icon={Server} label="Uptime"
                  value={systemStatus ? `${Math.round((systemStatus.services?.filter((s: any) => s.status === 'operational').length / Math.max(systemStatus.services?.length, 1)) * 100)}%` : '—'}
                  color="sky"
                  tooltip="Percentage of services currently operational"
                />
                <MetricCard
                  icon={Brain} label="AI Tokens Used" value={formatNumber(perfData.summary?.total_tokens_used || 0)}
                  color="sage"
                  tooltip="Total AI tokens consumed across Claude and OpenAI calls"
                />
              </>
            )}
          </div>

          {/* Service Health Grid */}
          {systemStatus?.services && (
            <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">
                Service Health
                <InfoTooltip text="Real-time status of all backend services and integrations" />
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {systemStatus.services.map((s: any) => (
                  <div key={s.name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2D6A8F]/10 border border-[#2D6A8F]/15">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      s.status === 'operational' ? 'bg-emerald-400 animate-pulse' :
                      s.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'
                    }`} />
                    <span className="text-xs text-[#8AACBC] truncate">{s.name}</span>
                    {s.latency_ms && <span className="text-[10px] text-[#4A6E7F] ml-auto">{s.latency_ms}ms</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Endpoints Table */}
          {perfData?.transactions && (
            <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">
                Top API Endpoints
                <InfoTooltip text="Busiest endpoints by request volume with latency and failure metrics" />
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-[#6B8A9A] border-b border-[#2D6A8F]/20">
                      <th className="text-left py-2 font-medium">Endpoint</th>
                      <th className="text-right py-2 font-medium">Requests</th>
                      <th className="text-right py-2 font-medium">p75</th>
                      <th className="text-right py-2 font-medium">p95</th>
                      <th className="text-right py-2 font-medium">Fail %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perfData.transactions.slice(0, 10).map((t: any, i: number) => (
                      <tr key={i} className="border-b border-[#2D6A8F]/10 hover:bg-[#2D6A8F]/10">
                        <td className="py-2 text-[#D0E4EC] font-mono text-xs truncate max-w-xs">{t.transaction}</td>
                        <td className="py-2 text-right text-[#8AACBC]">{t.count}</td>
                        <td className="py-2 text-right text-[#8AACBC]">{t.p75_ms}ms</td>
                        <td className={`py-2 text-right ${t.p95_ms > 1000 ? 'text-amber-400' : 'text-[#8AACBC]'}`}>{t.p95_ms}ms</td>
                        <td className={`py-2 text-right ${t.failure_rate > 5 ? 'text-red-400' : 'text-[#8AACBC]'}`}>{(t.failure_rate || 0).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Support View ── */}
      {activeTab === 'support' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              icon={MessageCircle} label="Active Chats" value={chatbotStats?.active_today ?? '—'}
              color="sky"
              tooltip="Chatbot conversations currently active today"
            />
            <MetricCard
              icon={AlertTriangle} label="Escalated" value={chatbotStats?.escalated_count ?? '—'}
              color={chatbotStats?.escalated_count > 0 ? 'coral' : 'neutral'}
              tooltip="Conversations escalated to human support"
            />
            <MetricCard
              icon={Brain} label="ARIA Flags (7d)" value={dashboard?.engagement?.aria_interventions_7d ?? '—'}
              color="gold"
              tooltip="Messages flagged by ARIA for hostile or inappropriate language"
            />
            <MetricCard
              icon={Mail} label="Unread Emails" value={inboxStats?.urgent_pending ?? '—'}
              color={inboxStats?.urgent_pending > 0 ? 'gold' : 'neutral'}
              tooltip="Urgent emails awaiting response in the inbox"
            />
          </div>

          {/* Chatbot + Inbox Summary */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#D0E4EC]">Chatbot Overview</h2>
                <button onClick={() => router.push('/superadmin/chatbot')} className="text-xs text-[#3DAA8A] hover:text-[#5BC4A0] flex items-center gap-1">
                  Manage <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              {chatbotStats ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B8A9A]">Total Sessions</span>
                    <span className="text-[#D0E4EC]">{chatbotStats.total_sessions ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B8A9A]">Avg Messages/Session</span>
                    <span className="text-[#D0E4EC]">{chatbotStats.avg_messages ?? '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B8A9A]">Escalation Rate</span>
                    <span className={`${chatbotStats.escalation_rate > 20 ? 'text-amber-400' : 'text-[#D0E4EC]'}`}>
                      {chatbotStats.escalation_rate ?? 0}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B8A9A]">Unique Visitors</span>
                    <span className="text-[#D0E4EC]">{chatbotStats.unique_visitors ?? 0}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
              )}
            </div>

            <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#D0E4EC]">Inbox Summary</h2>
                <button onClick={() => router.push('/superadmin/inbox')} className="text-xs text-[#3DAA8A] hover:text-[#5BC4A0] flex items-center gap-1">
                  Open inbox <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              {inboxStats ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B8A9A]">Total Emails</span>
                    <span className="text-[#D0E4EC]">{inboxStats.total ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B8A9A]">Urgent</span>
                    <span className={`${inboxStats.urgent_pending > 0 ? 'text-amber-400 font-medium' : 'text-[#D0E4EC]'}`}>
                      {inboxStats.urgent_pending ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B8A9A]">Support</span>
                    <span className="text-[#D0E4EC]">{inboxStats.by_category?.support ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B8A9A]">Sales</span>
                    <span className="text-[#D0E4EC]">{inboxStats.by_category?.sales ?? 0}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <QuickLink icon={MessageCircle} label="View All Chats" onClick={() => router.push('/superadmin/chatbot')} />
            <QuickLink icon={Brain} label="ARIA Insights" onClick={() => router.push('/superadmin/aria')} />
            <QuickLink icon={Mail} label="Email Inbox" badge={inboxStats?.urgent_pending} badgeColor="text-amber-400" onClick={() => router.push('/superadmin/inbox')} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Quick Link Card ── */
function QuickLink({ icon: Icon, label, badge, badgeColor, onClick }: {
  icon: React.ElementType; label: string; badge?: number; badgeColor?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-[#2D6A8F]/15 hover:border-zinc-700/60 transition-all text-left group">
      <Icon className="w-4 h-4 text-[#6B8A9A] group-hover:text-[#3DAA8A] transition-colors" />
      <span className="text-sm text-[#8AACBC] group-hover:text-white transition-colors">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`text-xs font-medium ml-auto ${badgeColor || 'text-[#8AACBC]'}`}>{badge}</span>
      )}
      <ArrowUpRight className="w-3.5 h-3.5 text-[#3A5A6A] group-hover:text-[#6B8A9A] ml-auto transition-colors" />
    </button>
  );
}

/* ── Wrapper with Suspense for useSearchParams ── */
export default function SuperAdminDashboard() {
  return (
    <Suspense fallback={<div className="space-y-6"><SkeletonCards count={4} /></div>}>
      <DashboardInner />
    </Suspense>
  );
}
