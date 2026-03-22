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
import { adminAPI, type DashboardData, type GrowthStats, type PlatformHealth } from '@/lib/admin-api';
import {
  MetricCard, SmallMetric, PageHeader, ErrorState,
  Skeleton, SkeletonCards, TabBar,
  formatNumber, formatCurrency, timeAgo, calcTrend,
  InfoTooltip,
} from '@/components/superadmin';

/* ── Dashboard Tab Views ────────────────────────────────────────────── */

const TABS = [
  { key: 'glance', label: 'At a Glance' },
  { key: 'performance', label: 'Performance' },
  { key: 'support', label: 'Support' },
];

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [d, g, h, inbox, bugs] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getGrowthStats(14),
        adminAPI.getPlatformHealth(),
        adminAPI.getInboxStats().catch(() => null),
        adminAPI.getCurrentBugs().catch(() => null),
      ]);
      setDashboard(d);
      setGrowth(g);
      setHealth(h);
      setInboxStats(inbox);
      setBugStats(bugs);

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
  }, [activeTab, loading, perfData, chatbotStats]);

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
          {/* Primary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {loading ? <SkeletonCards count={4} /> : dashboard && (
              <>
                <MetricCard
                  icon={Users} label="Total Users" value={formatNumber(dashboard.users.total)}
                  sub={`${dashboard.users.new_24h} new today`}
                  trend={growthTrend} color="violet"
                  tooltip="Total registered users across all plans"
                  sparklineData={sparklineData}
                />
                <MetricCard
                  icon={DollarSign} label="Est. MRR" value={formatCurrency(dashboard.subscriptions.estimated_mrr)}
                  sub={`${dashboard.subscriptions.past_due_count} past due`}
                  color="blue" alert={dashboard.subscriptions.past_due_count > 0}
                  tooltip="Monthly recurring revenue from all active paid subscriptions"
                />
                <MetricCard
                  icon={Activity} label="Active (30d)" value={formatNumber(dashboard.users.active_30d)}
                  sub={`${dashboard.users.active_today} online now`}
                  color="emerald"
                  tooltip="Users who logged in at least once in the past 30 days"
                />
                <MetricCard
                  icon={MessageSquare} label="Messages (7d)" value={formatNumber(dashboard.engagement.messages_7d)}
                  sub={`${dashboard.engagement.aria_interventions_7d} ARIA flags`}
                  color="amber"
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
            <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-300">
                  User Growth (14 days)
                  <InfoTooltip text="Daily new user registrations. Weekend days are shown lighter." />
                </h2>
                <button onClick={() => router.push('/superadmin/growth')} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
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
                            className={`w-full rounded-t transition-all ${isWeekend ? 'bg-violet-500/25' : 'bg-violet-500/60 group-hover:bg-violet-400/80'}`}
                            style={{ height: `${height}%` }}
                          />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-zinc-200 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                            {d.count} users • {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {growth.daily_registrations?.length > 0 && (
                    <div className="flex justify-between mt-2 text-[10px] text-zinc-600">
                      <span>{new Date(growth.daily_registrations[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <span>{new Date(growth.daily_registrations[growth.daily_registrations.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Revenue Split */}
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-300">
                  Revenue Split
                  <InfoTooltip text="Subscription breakdown by tier as percentage of total users" />
                </h2>
                <button onClick={() => router.push('/superadmin/billing')} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                  Details <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
              ) : dashboard && (
                <div className="space-y-2.5">
                  {Object.entries(dashboard.subscriptions?.tier_breakdown || {})
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
                            <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500" style={{ width: `${pct}%` }} />
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
                <button onClick={() => router.push('/superadmin/users')} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                  All users <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              {loading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <div className="space-y-1">
                  {(dashboard?.recent_signups || []).map((s) => (
                    <div key={s.id} onClick={() => router.push(`/superadmin/users/${s.id}`)} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/40 cursor-pointer transition-colors">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600/40 to-indigo-600/40 flex items-center justify-center text-xs font-medium text-violet-300">
                        {s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
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

            {/* Admin Activity */}
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-300">Admin Activity</h2>
                <button onClick={() => router.push('/superadmin/users?tab=activity')} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                  Full log <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              {loading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <div className="space-y-1">
                  {(dashboard?.recent_admin_actions || []).map((a) => (
                    <div key={a.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500/60 mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-zinc-400">
                          <span className="text-zinc-300 font-medium">{a.action.replace('admin:', '').replace(/_/g, ' ')}</span>
                          {a.user_email && <span className="text-zinc-600 ml-1">by {a.user_email.split('@')[0]}</span>}
                        </div>
                        {a.description && <div className="text-[11px] text-zinc-600 mt-0.5 truncate">{a.description}</div>}
                      </div>
                      <span className="text-[11px] text-zinc-600 whitespace-nowrap flex-shrink-0">{timeAgo(a.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickLink icon={Bug} label="Bug Triage" badge={bugStats?.critical} badgeColor="text-red-400" onClick={() => router.push('/superadmin/bug-triage')} />
            <QuickLink icon={MessageCircle} label="Chatbot" onClick={() => router.push('/superadmin/chatbot')} />
            <QuickLink icon={Mail} label="Inbox" badge={inboxStats?.urgent_pending} badgeColor="text-amber-400" onClick={() => router.push('/superadmin/inbox')} />
            <QuickLink icon={FileText} label="Reports" onClick={() => router.push('/superadmin/billing?tab=reports')} />
          </div>
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
                  color={perfData.summary?.avg_response_p75_ms > 500 ? 'amber' : 'emerald'}
                  tooltip="75th percentile API response time — most users experience this speed or faster"
                />
                <MetricCard
                  icon={AlertTriangle} label="Error Rate"
                  value={`${((perfData.transactions || []).reduce((a: number, t: any) => a + (t.failure_rate || 0), 0) / Math.max((perfData.transactions || []).length, 1) * 100).toFixed(1)}%`}
                  color="red"
                  tooltip="Average failure rate across all API endpoints"
                />
                <MetricCard
                  icon={Server} label="Uptime"
                  value={systemStatus ? `${Math.round((systemStatus.services?.filter((s: any) => s.status === 'operational').length / Math.max(systemStatus.services?.length, 1)) * 100)}%` : '—'}
                  color="emerald"
                  tooltip="Percentage of services currently operational"
                />
                <MetricCard
                  icon={Brain} label="AI Tokens Used" value={formatNumber(perfData.summary?.total_tokens_used || 0)}
                  color="violet"
                  tooltip="Total AI tokens consumed across Claude and OpenAI calls"
                />
              </>
            )}
          </div>

          {/* Service Health Grid */}
          {systemStatus?.services && (
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-zinc-300 mb-4">
                Service Health
                <InfoTooltip text="Real-time status of all backend services and integrations" />
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {systemStatus.services.map((s: any) => (
                  <div key={s.name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/30 border border-zinc-800/40">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      s.status === 'operational' ? 'bg-emerald-400 animate-pulse' :
                      s.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'
                    }`} />
                    <span className="text-xs text-zinc-400 truncate">{s.name}</span>
                    {s.latency_ms && <span className="text-[10px] text-zinc-600 ml-auto">{s.latency_ms}ms</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Endpoints Table */}
          {perfData?.transactions && (
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-zinc-300 mb-4">
                Top API Endpoints
                <InfoTooltip text="Busiest endpoints by request volume with latency and failure metrics" />
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-zinc-500 border-b border-zinc-800/60">
                      <th className="text-left py-2 font-medium">Endpoint</th>
                      <th className="text-right py-2 font-medium">Requests</th>
                      <th className="text-right py-2 font-medium">p75</th>
                      <th className="text-right py-2 font-medium">p95</th>
                      <th className="text-right py-2 font-medium">Fail %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perfData.transactions.slice(0, 10).map((t: any, i: number) => (
                      <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                        <td className="py-2 text-zinc-300 font-mono text-xs truncate max-w-xs">{t.transaction}</td>
                        <td className="py-2 text-right text-zinc-400">{t.count}</td>
                        <td className="py-2 text-right text-zinc-400">{t.p75_ms}ms</td>
                        <td className={`py-2 text-right ${t.p95_ms > 1000 ? 'text-amber-400' : 'text-zinc-400'}`}>{t.p95_ms}ms</td>
                        <td className={`py-2 text-right ${t.failure_rate > 5 ? 'text-red-400' : 'text-zinc-400'}`}>{(t.failure_rate || 0).toFixed(1)}%</td>
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
              color="emerald"
              tooltip="Chatbot conversations currently active today"
            />
            <MetricCard
              icon={AlertTriangle} label="Escalated" value={chatbotStats?.escalated_count ?? '—'}
              color={chatbotStats?.escalated_count > 0 ? 'red' : 'slate'}
              tooltip="Conversations escalated to human support"
            />
            <MetricCard
              icon={Brain} label="ARIA Flags (7d)" value={dashboard?.engagement?.aria_interventions_7d ?? '—'}
              color="amber"
              tooltip="Messages flagged by ARIA for hostile or inappropriate language"
            />
            <MetricCard
              icon={Mail} label="Unread Emails" value={inboxStats?.urgent_pending ?? '—'}
              color={inboxStats?.urgent_pending > 0 ? 'amber' : 'slate'}
              tooltip="Urgent emails awaiting response in the inbox"
            />
          </div>

          {/* Chatbot + Inbox Summary */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-300">Chatbot Overview</h2>
                <button onClick={() => router.push('/superadmin/chatbot')} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                  Manage <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              {chatbotStats ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Total Sessions</span>
                    <span className="text-zinc-300">{chatbotStats.total_sessions ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Avg Messages/Session</span>
                    <span className="text-zinc-300">{chatbotStats.avg_messages ?? '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Escalation Rate</span>
                    <span className={`${chatbotStats.escalation_rate > 20 ? 'text-amber-400' : 'text-zinc-300'}`}>
                      {chatbotStats.escalation_rate ?? 0}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Unique Visitors</span>
                    <span className="text-zinc-300">{chatbotStats.unique_visitors ?? 0}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
              )}
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-300">Inbox Summary</h2>
                <button onClick={() => router.push('/superadmin/inbox')} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                  Open inbox <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              {inboxStats ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Total Emails</span>
                    <span className="text-zinc-300">{inboxStats.total ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Urgent</span>
                    <span className={`${inboxStats.urgent_pending > 0 ? 'text-amber-400 font-medium' : 'text-zinc-300'}`}>
                      {inboxStats.urgent_pending ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Support</span>
                    <span className="text-zinc-300">{inboxStats.by_category?.support ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Sales</span>
                    <span className="text-zinc-300">{inboxStats.by_category?.sales ?? 0}</span>
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
    <button onClick={onClick} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/40 hover:border-zinc-700/60 transition-all text-left group">
      <Icon className="w-4 h-4 text-zinc-500 group-hover:text-violet-400 transition-colors" />
      <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`text-xs font-medium ml-auto ${badgeColor || 'text-zinc-400'}`}>{badge}</span>
      )}
      <ArrowUpRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 ml-auto transition-colors" />
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
