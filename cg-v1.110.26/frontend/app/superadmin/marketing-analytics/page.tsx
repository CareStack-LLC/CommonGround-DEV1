'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  FileText, Search, Share2, GitBranch, Sparkles,
  Eye, Clock, MousePointerClick, ArrowRightLeft,
  TrendingUp, Users, ExternalLink, RefreshCw, Loader2,
  Lightbulb, Target, UserCheck, CalendarClock,
  AlertTriangle, Link2, PlugZap,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { adminAPI } from '@/lib/admin-api';
import {
  MetricCard, PageHeader, TabBar, useTabState,
  Skeleton, SkeletonCards, ErrorState, InfoTooltip, formatNumber,
  CompareToggleChart,
} from '@/components/superadmin';

/* ── Types ─────────────────────────────────────────────────────────── */

interface ContentPost {
  title: string;
  views: number;
  avg_duration: number;
  ctr: number;
  conversions: number;
}

interface ContentPerformance {
  connected: boolean;
  posts: ContentPost[];
  trend: { date: string; views: number }[];
  reason?: string;
}

interface SEOQuery {
  query: string;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface SEOPage {
  page: string;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface SEOInsights {
  connected: boolean;
  queries: SEOQuery[];
  top_pages: SEOPage[];
  position_trend: { date: string; avg_position: number; clicks?: number; impressions?: number }[];
  site?: string | null;
}

// Matches the new backend shape — numeric fields, not rate-as-fraction.
interface SocialPlatform {
  platform: string;
  followers: number;
  impressions: number;
  engagement: number;
  referral_clicks: number;
  leads_generated: number;
  connected: boolean;
}

interface SocialTracking {
  platforms: SocialPlatform[];
  referral_chart: { platform: string; visits: number }[];
  reddit_connected?: boolean;
  ga4_connected?: boolean;
}

interface AttributionChannel {
  channel: string;
  first_touch: number;
  last_touch: number;
  assisted: number;
  total_leads?: number;
  conversion_rate: number;
  attributed_mrr?: number;
}

interface Attribution {
  period_days?: number;
  first_touch: { channel: string; value: number }[];
  last_touch: { channel: string; value: number }[];
  channels: AttributionChannel[];
  total_conversions?: number;
  total_attributed_mrr?: number;
}

interface AIInsights {
  content_ideas: string[];
  campaign_suggestions: { title: string; description: string }[];
  audience_insights: string[];
  timing_recommendations: string[];
  context?: {
    recent_signups_30d?: number;
    prev_signups_30d?: number;
    growth_pct?: number;
    top_sources?: { source: string; leads: number }[];
    best_campaign?: { name: string; ctr: number } | null;
  };
}

type TabKey = 'content' | 'seo' | 'social' | 'attribution' | 'ai';

const TABS = [
  { key: 'content', label: 'Content', icon: FileText },
  { key: 'seo', label: 'SEO', icon: Search },
  { key: 'social', label: 'Social', icon: Share2 },
  { key: 'attribution', label: 'Attribution', icon: GitBranch },
  { key: 'ai', label: 'AI Insights', icon: Sparkles },
];

/* ── Recharts dark theme ───────────────────────────────────────────── */

const GRID_PROPS = { strokeDasharray: '3 3', stroke: '#2D6A8F', opacity: 0.2 } as const;
const AXIS_PROPS = { stroke: '#4A6E7F', tick: { fill: '#6B8A9A', fontSize: 10 } } as const;
const TOOLTIP_STYLE = {
  backgroundColor: '#1E3A4A',
  border: '1px solid #2D6A8F',
  borderRadius: 8,
  color: '#D0E4EC',
  fontSize: 12,
};

const CHART_COLORS = ['#3DAA8A', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

/* ── Shared card wrapper ───────────────────────────────────────────── */

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-white mb-4">{children}</h3>;
}

function EmptyData({ message = 'No data yet' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-[#6B8A9A] text-sm">
      {message}
    </div>
  );
}

/**
 * Compact "integration not connected" CTA shown inline in a tab. Used when a
 * specific data source (Search Console, Reddit) isn't wired up — different
 * from the page-level GA4 gate.
 */
function IntegrationNotConnected({
  title,
  description,
  cta,
  ctaHref,
}: {
  title: string;
  description: string;
  cta?: string;
  ctaHref?: string;
}) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-400" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">{description}</p>
          {cta && ctaHref && (
            <a
              href={ctaHref}
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 rounded-md border border-amber-500/40 transition-colors"
            >
              <Link2 className="w-3 h-3" />
              {cta}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Content Tab ───────────────────────────────────────────────────── */

function ContentTab() {
  const [data, setData] = useState<ContentPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.getContentPerformance();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load content data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return <SkeletonCards count={3} />;
  if (error) return <ErrorState message={error} onRetry={fetch_} />;
  if (!data) return <EmptyData />;

  if (data.connected === false) {
    return (
      <IntegrationNotConnected
        title="Google Analytics 4 not connected"
        description="Content performance reads real blog page views from GA4. Connect GA4 above to populate this tab."
      />
    );
  }

  const posts = data.posts ?? [];
  const trend = data.trend ?? [];

  return (
    <div className="space-y-6">
      {/* Top performing posts table */}
      <Card>
        <SectionTitle>Top Performing Posts</SectionTitle>
        {posts.length === 0 ? (
          <EmptyData message="No content performance data yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2D6A8F]/20">
                  <th className="text-left py-2 pr-4 text-[#6B8A9A] font-medium">Title</th>
                  <th className="text-right py-2 px-3 text-[#6B8A9A] font-medium">
                    <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" />Views</span>
                  </th>
                  <th className="text-right py-2 px-3 text-[#6B8A9A] font-medium">
                    <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />Avg Duration</span>
                  </th>
                  <th className="text-right py-2 px-3 text-[#6B8A9A] font-medium">
                    <span className="inline-flex items-center gap-1"><MousePointerClick className="w-3 h-3" />CTR</span>
                  </th>
                  <th className="text-right py-2 pl-3 text-[#6B8A9A] font-medium">
                    <span className="inline-flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" />Conversions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post, i) => (
                  <tr key={i} className="border-b border-[#2D6A8F]/10 last:border-0 hover:bg-[#2D6A8F]/10 transition-colors">
                    <td className="py-2.5 pr-4 text-[#D0E4EC] font-medium max-w-[280px] truncate">{post.title}</td>
                    <td className="py-2.5 px-3 text-right text-[#D0E4EC]">{formatNumber(post.views)}</td>
                    <td className="py-2.5 px-3 text-right text-[#D0E4EC]">{post.avg_duration}s</td>
                    <td className="py-2.5 px-3 text-right text-[#3DAA8A]">{(post.ctr * 100).toFixed(1)}%</td>
                    <td className="py-2.5 pl-3 text-right text-[#D0E4EC]">{formatNumber(post.conversions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Content views trend chart with compare-to-prior-period toggle */}
      {trend.length === 0 ? (
        <Card>
          <SectionTitle>Content Views Over Time</SectionTitle>
          <EmptyData message="No trend data yet" />
        </Card>
      ) : (() => {
        // Split trend into current + prior halves for compare overlay
        const sorted = [...trend].sort((a, b) => a.date.localeCompare(b.date));
        const half = Math.floor(sorted.length / 2);
        const current = sorted.slice(-half).map((d) => ({ date: d.date, value: d.views }));
        const prior = half > 0
          ? sorted.slice(-half * 2, -half).map((d) => ({ date: d.date, prior_value: d.views }))
          : [];
        return (
          <CompareToggleChart
            title="Content Views Over Time"
            data={current}
            priorData={prior.length === half && half > 0 ? prior : undefined}
            valueLabel="views"
            color="#3DAA8A"
            height={280}
            tooltip="Daily page views from GA4. Toggle 'Compare' to overlay the previous same-length window."
          />
        );
      })()}
    </div>
  );
}

/* ── SEO Tab ───────────────────────────────────────────────────────── */

function SEOTab() {
  const [data, setData] = useState<SEOInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.getSEOInsights();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load SEO data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return <SkeletonCards count={3} />;
  if (error) return <ErrorState message={error} onRetry={fetch_} />;
  if (!data) return <EmptyData />;

  if (!data.connected) {
    return (
      <IntegrationNotConnected
        title="Google Search Console not connected"
        description={`Search Console uses the same OAuth token as GA4 — once you've connected GA4 with the webmasters.readonly scope, verify the property ${data.site ?? 'www.find-commonground.com'} at search.google.com/search-console. This tab will then populate with real queries, clicks, and positions.`}
        cta="Open Search Console"
        ctaHref="https://search.google.com/search-console"
      />
    );
  }

  const queries = data.queries ?? [];
  const topPages = data.top_pages ?? [];
  const positionTrend = data.position_trend ?? [];

  return (
    <div className="space-y-6">
      {/* Top queries table */}
      <Card>
        <SectionTitle>Top Search Queries</SectionTitle>
        {queries.length === 0 ? (
          <EmptyData message="No search query data yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2D6A8F]/20">
                  <th className="text-left py-2 pr-4 text-[#6B8A9A] font-medium">Query</th>
                  <th className="text-right py-2 px-3 text-[#6B8A9A] font-medium">Position</th>
                  <th className="text-right py-2 px-3 text-[#6B8A9A] font-medium">Impressions</th>
                  <th className="text-right py-2 px-3 text-[#6B8A9A] font-medium">Clicks</th>
                  <th className="text-right py-2 pl-3 text-[#6B8A9A] font-medium">CTR</th>
                </tr>
              </thead>
              <tbody>
                {queries.map((q, i) => (
                  <tr key={i} className="border-b border-[#2D6A8F]/10 last:border-0 hover:bg-[#2D6A8F]/10 transition-colors">
                    <td className="py-2.5 pr-4 text-[#D0E4EC] font-medium max-w-[280px] truncate">{q.query}</td>
                    <td className="py-2.5 px-3 text-right text-[#D0E4EC]">{q.position.toFixed(1)}</td>
                    <td className="py-2.5 px-3 text-right text-[#D0E4EC]">{formatNumber(q.impressions)}</td>
                    <td className="py-2.5 px-3 text-right text-[#D0E4EC]">{formatNumber(q.clicks)}</td>
                    <td className="py-2.5 pl-3 text-right text-[#3DAA8A]">{(q.ctr * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Top landing pages from organic search */}
      <Card>
        <SectionTitle>Top Landing Pages (Organic)</SectionTitle>
        {topPages.length === 0 ? (
          <EmptyData message="No page data yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2D6A8F]/20">
                  <th className="text-left py-2 pr-4 text-[#6B8A9A] font-medium">Page</th>
                  <th className="text-right py-2 px-3 text-[#6B8A9A] font-medium">Position</th>
                  <th className="text-right py-2 px-3 text-[#6B8A9A] font-medium">Impressions</th>
                  <th className="text-right py-2 px-3 text-[#6B8A9A] font-medium">Clicks</th>
                  <th className="text-right py-2 pl-3 text-[#6B8A9A] font-medium">CTR</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map((p, i) => (
                  <tr key={i} className="border-b border-[#2D6A8F]/10 last:border-0 hover:bg-[#2D6A8F]/10 transition-colors">
                    <td className="py-2.5 pr-4 text-[#D0E4EC] font-medium max-w-[320px] truncate">{p.page}</td>
                    <td className="py-2.5 px-3 text-right text-[#D0E4EC]">{p.position.toFixed(1)}</td>
                    <td className="py-2.5 px-3 text-right text-[#D0E4EC]">{formatNumber(p.impressions)}</td>
                    <td className="py-2.5 px-3 text-right text-[#D0E4EC]">{formatNumber(p.clicks)}</td>
                    <td className="py-2.5 pl-3 text-right text-[#3DAA8A]">{(p.ctr * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Avg position trend chart */}
      <Card>
        <SectionTitle>Average Position Trend (lower is better)</SectionTitle>
        {positionTrend.length === 0 ? (
          <EmptyData message="No position trend data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={positionTrend}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="date" {...AXIS_PROPS} />
              <YAxis reversed {...AXIS_PROPS} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="avg_position"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6' }}
                name="Avg Position"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

/* ── Social Tab ────────────────────────────────────────────────────── */

const PLATFORM_ICONS: Record<string, string> = {
  facebook: '📘', instagram: '📸', twitter: '🐦', linkedin: '💼',
  tiktok: '🎵', youtube: '🎬', pinterest: '📌', reddit: '🟠',
};

function SocialTab() {
  const [data, setData] = useState<SocialTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.getSocialTracking();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load social data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return <SkeletonCards count={4} />;
  if (error) return <ErrorState message={error} onRetry={fetch_} />;
  if (!data) return <EmptyData />;

  const platforms = data.platforms ?? [];
  const referralChart = data.referral_chart ?? [];
  const anyConnected = data.reddit_connected || data.ga4_connected || platforms.some((p) => p.connected);

  return (
    <div className="space-y-6">
      {!anyConnected && (
        <IntegrationNotConnected
          title="No social data sources connected"
          description="Connect Reddit (admin settings) or GA4 above to see real engagement, referral traffic, and lead attribution per platform. Until then, every row will show zeros."
        />
      )}
      {/* Platform cards */}
      {platforms.length === 0 ? (
        <EmptyData message="No social platform data yet" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((p) => (
            <Card key={p.platform}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{PLATFORM_ICONS[p.platform.toLowerCase().replace('/x', '').replace(' ', '')] ?? '🌐'}</span>
                  <span className="text-sm font-semibold text-white capitalize">{p.platform}</span>
                </div>
                {p.connected ? (
                  <span className="text-[10px] font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-1.5 py-0.5">
                    live
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-[#6B8A9A] bg-[#0F2533]/80 border border-[#2D6A8F]/20 rounded px-1.5 py-0.5">
                    no data
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-[#6B8A9A]">Followers</span>
                  <span className="text-sm font-medium text-[#D0E4EC]">{formatNumber(p.followers)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-[#6B8A9A]">Impressions</span>
                  <span className="text-sm font-medium text-[#D0E4EC]">{formatNumber(p.impressions)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-[#6B8A9A]">Engagement</span>
                  <span className="text-sm font-medium text-[#3DAA8A]">{formatNumber(p.engagement)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-[#6B8A9A]">Referral Clicks</span>
                  <span className="text-sm font-medium text-[#D0E4EC]">{formatNumber(p.referral_clicks)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#2D6A8F]/20">
                  <span className="text-xs text-[#6B8A9A]">Leads Generated</span>
                  <span className="text-sm font-medium text-[#3DAA8A]">{formatNumber(p.leads_generated)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Referral traffic bar chart */}
      <Card>
        <SectionTitle>Referral Traffic by Platform</SectionTitle>
        {referralChart.length === 0 ? (
          <EmptyData message="No referral traffic data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={referralChart}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="platform" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="visits" fill="#3DAA8A" radius={[4, 4, 0, 0]} name="Visits" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

/* ── Attribution Tab ───────────────────────────────────────────────── */

function AttributionTab() {
  const [data, setData] = useState<Attribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.getAttribution();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load attribution data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return <SkeletonCards count={3} />;
  if (error) return <ErrorState message={error} onRetry={fetch_} />;
  if (!data) return <EmptyData />;

  const firstTouch = data.first_touch ?? [];
  const lastTouch = data.last_touch ?? [];
  const channels = data.channels ?? [];

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <div className="text-xs text-[#6B8A9A] mb-1">Window</div>
          <div className="text-lg font-semibold text-white">
            {data.period_days ?? 90} days
          </div>
        </Card>
        <Card>
          <div className="text-xs text-[#6B8A9A] mb-1">Total Conversions</div>
          <div className="text-lg font-semibold text-white">
            {formatNumber(data.total_conversions ?? 0)}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-[#6B8A9A] mb-1">Attributed MRR</div>
          <div className="text-lg font-semibold text-[#3DAA8A]">
            ${formatNumber(Math.round(data.total_attributed_mrr ?? 0))}
          </div>
        </Card>
      </div>

      {/* Side-by-side bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionTitle>First-Touch Attribution</SectionTitle>
          {firstTouch.length === 0 ? (
            <EmptyData message="No first-touch data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={firstTouch} layout="vertical">
                <CartesianGrid {...GRID_PROPS} />
                <XAxis type="number" {...AXIS_PROPS} />
                <YAxis type="category" dataKey="channel" {...AXIS_PROPS} width={90} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" fill="#3DAA8A" radius={[0, 4, 4, 0]} name="Conversions" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <SectionTitle>Last-Touch Attribution</SectionTitle>
          {lastTouch.length === 0 ? (
            <EmptyData message="No last-touch data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={lastTouch} layout="vertical">
                <CartesianGrid {...GRID_PROPS} />
                <XAxis type="number" {...AXIS_PROPS} />
                <YAxis type="category" dataKey="channel" {...AXIS_PROPS} width={90} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Conversions" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Channel effectiveness table */}
      <Card>
        <SectionTitle>Channel Effectiveness</SectionTitle>
        {channels.length === 0 ? (
          <EmptyData message="No channel data yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2D6A8F]/20">
                  <th className="text-left py-2 pr-4 text-[#6B8A9A] font-medium">Channel</th>
                  <th className="text-right py-2 px-3 text-[#6B8A9A] font-medium">Total Leads</th>
                  <th className="text-right py-2 px-3 text-[#6B8A9A] font-medium">First Touch</th>
                  <th className="text-right py-2 px-3 text-[#6B8A9A] font-medium">Last Touch</th>
                  <th className="text-right py-2 px-3 text-[#6B8A9A] font-medium">Assisted</th>
                  <th className="text-right py-2 px-3 text-[#6B8A9A] font-medium">Conv. Rate</th>
                  <th className="text-right py-2 pl-3 text-[#6B8A9A] font-medium">Attr. MRR</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((ch, i) => (
                  <tr key={i} className="border-b border-[#2D6A8F]/10 last:border-0 hover:bg-[#2D6A8F]/10 transition-colors">
                    <td className="py-2.5 pr-4 text-[#D0E4EC] font-medium">{ch.channel}</td>
                    <td className="py-2.5 px-3 text-right text-[#D0E4EC]">{formatNumber(ch.total_leads ?? 0)}</td>
                    <td className="py-2.5 px-3 text-right text-[#D0E4EC]">{formatNumber(ch.first_touch)}</td>
                    <td className="py-2.5 px-3 text-right text-[#D0E4EC]">{formatNumber(ch.last_touch)}</td>
                    <td className="py-2.5 px-3 text-right text-[#D0E4EC]">{formatNumber(ch.assisted)}</td>
                    <td className="py-2.5 px-3 text-right text-[#3DAA8A]">{(ch.conversion_rate * 100).toFixed(1)}%</td>
                    <td className="py-2.5 pl-3 text-right text-[#D0E4EC]">${formatNumber(Math.round(ch.attributed_mrr ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── AI Insights Tab ───────────────────────────────────────────────── */

function AIInsightsTab() {
  const [data, setData] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const generate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.postMarketingAISuggestions();
      setData(result);
      setGenerated(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  }, []);

  if (error) return <ErrorState message={error} onRetry={generate} />;

  if (!generated) {
    return (
      <Card className="flex flex-col items-center justify-center py-16">
        <Sparkles className="w-10 h-10 text-[#3DAA8A] mb-4" />
        <p className="text-[#D0E4EC] text-sm mb-1">Generate AI-powered marketing insights</p>
        <p className="text-[#6B8A9A] text-xs mb-6 max-w-md text-center">
          Analyze your marketing data to get content ideas, campaign suggestions, audience insights, and timing recommendations.
        </p>
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3DAA8A] hover:bg-[#2E8B6E] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Marketing Insights
            </>
          )}
        </button>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#3DAA8A] animate-spin mb-4" />
        <p className="text-[#D0E4EC] text-sm">Analyzing your marketing data...</p>
        <p className="text-[#6B8A9A] text-xs mt-1">This may take a moment</p>
      </Card>
    );
  }

  if (!data) return <EmptyData />;

  const contentIdeas = data.content_ideas ?? [];
  const campaignSuggestions = data.campaign_suggestions ?? [];
  const audienceInsights = data.audience_insights ?? [];
  const timingRecs = data.timing_recommendations ?? [];

  return (
    <div className="space-y-6">
      {/* Context + regenerate */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {data.context && (
          <div className="text-xs text-[#6B8A9A] bg-[#0F2533]/60 border border-[#2D6A8F]/20 rounded-lg px-3 py-2 flex-1 min-w-[280px]">
            <span className="font-medium text-[#D0E4EC]">Grounded on: </span>
            {data.context.recent_signups_30d ?? 0} signups (30d),
            {' '}growth {data.context.growth_pct != null && data.context.growth_pct >= 0 ? '+' : ''}{data.context.growth_pct?.toFixed(1) ?? '0'}%
            {data.context.top_sources && data.context.top_sources.length > 0 && (
              <>, top source <span className="text-[#D0E4EC]">{data.context.top_sources[0].source}</span></>
            )}
            {data.context.best_campaign && (
              <>, best campaign <span className="text-[#D0E4EC]">{data.context.best_campaign.name}</span> (CTR {(data.context.best_campaign.ctr * 100).toFixed(1)}%)</>
            )}
          </div>
        )}
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6B8A9A] hover:text-white border border-[#2D6A8F]/30 hover:border-[#2D6A8F]/60 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Regenerate
        </button>
      </div>

      {/* Content Ideas */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-[#f59e0b]" />
          <SectionTitle>Content Ideas</SectionTitle>
        </div>
        {contentIdeas.length === 0 ? (
          <EmptyData message="No content ideas generated" />
        ) : (
          <ul className="space-y-2">
            {contentIdeas.map((idea, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#D0E4EC]">
                <span className="text-[#3DAA8A] mt-0.5 shrink-0">-</span>
                {idea}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Campaign Suggestions */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-[#3b82f6]" />
          <SectionTitle>Campaign Suggestions</SectionTitle>
        </div>
        {campaignSuggestions.length === 0 ? (
          <EmptyData message="No campaign suggestions generated" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {campaignSuggestions.map((s, i) => (
              <div
                key={i}
                className="bg-[#0F2533]/60 border border-[#2D6A8F]/15 rounded-lg p-4"
              >
                <h4 className="text-sm font-medium text-white mb-1">{s.title}</h4>
                <p className="text-xs text-[#6B8A9A] leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Audience Insights */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="w-4 h-4 text-[#8b5cf6]" />
          <SectionTitle>Audience Insights</SectionTitle>
        </div>
        {audienceInsights.length === 0 ? (
          <EmptyData message="No audience insights generated" />
        ) : (
          <ul className="space-y-2">
            {audienceInsights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#D0E4EC]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] mt-1.5 shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Timing Recommendations */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="w-4 h-4 text-[#3DAA8A]" />
          <SectionTitle>Timing Recommendations</SectionTitle>
        </div>
        {timingRecs.length === 0 ? (
          <EmptyData message="No timing recommendations generated" />
        ) : (
          <ul className="space-y-2">
            {timingRecs.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#D0E4EC]">
                <span className="text-[#3DAA8A] mt-0.5 shrink-0">-</span>
                {rec}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────── */

interface Ga4Status {
  status?: 'ok' | 'not_connected' | string;
  connect_url?: string;
  message?: string;
}

/**
 * Top-level gate. GA4 is the source of truth for every tab on this page.
 * When OAuth isn't connected the backend returns
 * `{status: "not_connected", connect_url}` (Wave 5 graceful response).
 * We render a dedicated Connect GA4 card instead of the red ErrorState
 * that previously showed because the page treated not_connected as a fetch
 * failure.
 */
function ConnectGa4Card({ connectUrl, message }: { connectUrl?: string; message?: string }) {
  return (
    <div className="rounded-xl border border-[#2D6A8F]/30 bg-gradient-to-br from-[#1A3648]/80 to-[#0F2533]/60 p-8 max-w-2xl mx-auto text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#3DAA8A]/10 border border-[#3DAA8A]/30 mb-4">
        <PlugZap className="w-7 h-7 text-[#3DAA8A]" />
      </div>
      <h2 className="text-lg font-semibold text-white mb-2">
        Connect Google Analytics 4
      </h2>
      <p className="text-sm text-[#6B8A9A] leading-relaxed mb-5">
        {message ||
          'This page reads real content, SEO, social, and attribution data from GA4. Link your Google account to populate the tabs with live numbers — otherwise every tab shows sample data.'}
      </p>
      {connectUrl ? (
        <a
          href={connectUrl}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#3DAA8A] hover:bg-[#2E8A6E] text-white text-sm font-semibold transition-colors"
        >
          <Link2 className="w-4 h-4" />
          Connect GA4
        </a>
      ) : (
        <p className="text-xs text-[#6B8A9A]">
          Ask an engineer to set <code className="text-[#D0E4EC]">GA4_*</code> env vars and restart the API.
        </p>
      )}
    </div>
  );
}

export default function MarketingAnalyticsPage() {
  const [tab, setTab] = useTabState('content');
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['content']));
  const [ga4, setGa4] = useState<Ga4Status | null>(null);
  const [ga4Loading, setGa4Loading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await adminAPI.getGa4Status();
        setGa4(result as Ga4Status);
      } catch {
        // On hard error (network, 500) assume not_connected so we show the
        // Connect card rather than the red ErrorState — admins have always
        // been able to retry by reloading.
        setGa4({ status: 'not_connected' });
      } finally {
        setGa4Loading(false);
      }
    })();
  }, []);

  const handleTabChange = (key: string) => {
    setTab(key);
    setLoadedTabs((prev) => new Set(prev).add(key));
  };

  const notConnected = !ga4Loading && ga4?.status === 'not_connected';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Marketing Analytics</h1>
        <p className="text-sm text-[#6B8A9A] mt-0.5">
          Content performance, SEO insights, social tracking, and attribution analysis
        </p>
      </div>

      {ga4Loading ? (
        <div className="flex items-center gap-2 text-[#6B8A9A] text-sm py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking GA4 connection…
        </div>
      ) : notConnected ? (
        <ConnectGa4Card connectUrl={ga4?.connect_url} message={ga4?.message} />
      ) : (
        <>
          <TabBar tabs={TABS} activeTab={tab} onTabChange={handleTabChange} />

          {tab === 'content' && <ContentTab />}
          {tab === 'seo' && loadedTabs.has('seo') && <SEOTab />}
          {tab === 'social' && loadedTabs.has('social') && <SocialTab />}
          {tab === 'attribution' && loadedTabs.has('attribution') && <AttributionTab />}
          {tab === 'ai' && loadedTabs.has('ai') && <AIInsightsTab />}
        </>
      )}
    </div>
  );
}
