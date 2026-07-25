'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { getAccessToken } from '@/lib/api';
import {
  Shield, RefreshCw, Brain, Activity, Layers,
  BarChart3, MessageSquare, TrendingUp, PhoneOff, Send, Clock, Users, Phone,
} from 'lucide-react';
import {
  TabBar, useTabState, TimePeriodSelector, MetricCard,
  Skeleton, SkeletonCards, formatNumber,
} from '@/components/superadmin';
import OverviewTab from './_overview-tab';
import CategoriesTab from './_categories-tab';
import ActionsTab from './_actions-tab';
import MessagesTab from './_messages-tab';
import EffectivenessTab from './_effectiveness-tab';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Shared types ──

export interface AriaInsights {
  total_interventions: number;
  last_7d: number;
  last_range: number;
  days: number;
  acceptance_rate: number;
  blocked_count: number;
  sent_anyway_count: number;
  rejected_count: number;
  intervention_rate: number;
  avg_messages_per_day: number;
  total_messages_period: number;
  daily_interventions: { date: string; count: number }[];
  top_categories: { category: string; count: number }[];
  detailed_categories: { category: string; count: number }[];
  action_breakdown: Record<string, number>;
  intervention_levels: { level: number; label: string; count: number }[];
  sentiment_distribution: Record<string, number>;
  recent_flagged: FlaggedMessage[];
  processing_time: { avg_ms: number; min_ms: number; max_ms: number };
  weekly_trends: WeeklyTrend[];
  circle_data: CircleData;
  call_data: CallData;
  top_cases: { family_file_id: string; count: number }[];
}

export interface FlaggedMessage {
  timestamp: string;
  severity: string;
  categories: string[];
  toxicity_score: number;
  user_action: string;
  intervention_level: number;
  processing_time_ms: number | null;
  sender_id: string;
}

export interface WeeklyTrend {
  week: string;
  total: number;
  accepted: number;
  acceptance_rate: number;
  avg_toxicity: number;
}

export interface CircleData {
  total_analyzed: number;
  total_flagged: number;
  intervention_rate: number;
  action_breakdown: Record<string, number>;
  categories: { category: string; count: number }[];
  avg_response_time_ms: number;
}

export interface CallData {
  total_sessions: number;
  total_interventions: number;
  terminated_count: number;
  avg_safety_score: number;
  flag_severity: { severity: string; count: number }[];
}

export const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#10b981',
  neutral: '#71717a',
  negative: '#ef4444',
};

export const ACTION_COLORS: Record<string, string> = {
  accepted: '#10b981',
  modified: '#3b82f6',
  rejected: '#f59e0b',
  sent_anyway: '#ef4444',
  cancelled: '#71717a',
};

export const LEVEL_COLORS = ['#71717a', '#f59e0b', '#f97316', '#ef4444'];

export const SEVERITY_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  severe: '#ef4444',
};

export const CustomTooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid rgba(63,63,70,0.6)',
  borderRadius: '8px',
  color: '#e4e4e7',
  fontSize: '12px',
};

const TABS = [
  { key: 'overview', label: 'Overview', icon: Activity },
  { key: 'categories', label: 'Categories', icon: Layers },
  { key: 'actions', label: 'User Actions', icon: BarChart3 },
  { key: 'messages', label: 'Flagged Messages', icon: MessageSquare },
  { key: 'effectiveness', label: 'Effectiveness', icon: TrendingUp },
];

export default function AriaInsightsPage() {
  const [data, setData] = useState<AriaInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noData, setNoData] = useState(false);
  const [days, setDays] = useState(30);
  const [tab, setTab] = useTabState('overview');

  const fetchData = useCallback(async (d: number) => {
    try {
      setLoading(true);
      setError(null);
      setNoData(false);

      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${API_BASE}/api/v1/admin/aria/insights?days=${d}`, {
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
  }, [noData]);

  useEffect(() => { fetchData(days); }, [days]);

  const handleDaysChange = (d: number) => {
    setDays(d);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-[#8AACBC] mb-4">{error}</p>
        <button onClick={() => fetchData(days)} className="px-4 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium transition-colors">
          Retry
        </button>
      </div>
    );
  }

  if (!loading && noData) {
    return (
      <div className="space-y-6">
        <Header loading={false} onRefresh={() => fetchData(days)} days={days} onDaysChange={handleDaysChange} />
        <div className="flex flex-col items-center justify-center py-20 bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl">
          <Brain className="w-12 h-12 text-[#4A6E7F] mb-4" />
          <p className="text-[#8AACBC] text-lg font-medium">No ARIA data available yet</p>
          <p className="text-[#4A6E7F] text-sm mt-1">ARIA insights will appear once the system processes interactions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header loading={loading} onRefresh={() => fetchData(days)} days={days} onDaysChange={handleDaysChange} />

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3">
        {loading ? (
          <SkeletonCards count={8} />
        ) : data && (
          <>
            <MetricCard
              icon={Shield}
              label="Total Interventions"
              value={formatNumber(data.total_interventions)}
              sub={`${formatNumber(data.last_range)} in ${data.days}d`}
              color="sage"
              sparklineData={data.daily_interventions?.slice(-7).map(d => d.count)}
            />
            <MetricCard
              icon={Activity}
              label="Acceptance Rate"
              value={`${data.acceptance_rate}%`}
              sub="Accepted + Modified"
              color="sage"
              tooltip="Percentage of ARIA suggestions that were accepted or modified by users"
            />
            <MetricCard
              icon={PhoneOff}
              label="Blocked"
              value={formatNumber(data.blocked_count)}
              sub="Severe violations"
              color="coral"
            />
            <MetricCard
              icon={Send}
              label="Sent Anyway"
              value={formatNumber(data.sent_anyway_count)}
              sub={data.total_interventions > 0 ? `${((data.sent_anyway_count / data.total_interventions) * 100).toFixed(1)}% override rate` : ''}
              color="gold"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3">
        {loading ? (
          <SkeletonCards count={4} />
        ) : data && (
          <>
            <MetricCard
              icon={TrendingUp}
              label="Intervention Rate"
              value={`${data.intervention_rate}%`}
              sub={`${formatNumber(data.avg_messages_per_day)} msgs/day`}
              color="ocean"
            />
            <MetricCard
              icon={Clock}
              label="Avg Processing"
              value={`${Math.round(data.processing_time?.avg_ms || 0)}ms`}
              sub={`Max: ${data.processing_time?.max_ms || 0}ms`}
              color="sky"
            />
            <MetricCard
              icon={Users}
              label="Circle Flags"
              value={formatNumber(data.circle_data?.total_flagged || 0)}
              sub={`${data.circle_data?.intervention_rate || 0}% of circle msgs`}
              color="ocean"
              tooltip="Child safety message flags from KidComs Circle"
            />
            <MetricCard
              icon={Phone}
              label="Call Interventions"
              value={formatNumber(data.call_data?.total_interventions || 0)}
              sub={`${data.call_data?.terminated_count || 0} terminated`}
              color="coral"
              tooltip="ARIA interventions during monitored calls"
            />
          </>
        )}
      </div>

      {/* ── Tab Navigation ── */}
      <TabBar tabs={TABS} activeTab={tab} onTabChange={setTab} size="sm" />

      {/* ── Tab Content ── */}
      {!loading && data && (
        <Suspense fallback={<Skeleton className="h-96" />}>
          {tab === 'overview' && <OverviewTab data={data} />}
          {tab === 'categories' && <CategoriesTab data={data} />}
          {tab === 'actions' && <ActionsTab data={data} />}
          {tab === 'messages' && <MessagesTab data={data} days={days} />}
          {tab === 'effectiveness' && <EffectivenessTab data={data} />}
        </Suspense>
      )}

      {loading && <Skeleton className="h-96" />}
    </div>
  );
}

function Header({
  loading,
  onRefresh,
  days,
  onDaysChange,
}: {
  loading: boolean;
  onRefresh: () => void;
  days: number;
  onDaysChange: (d: number) => void;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-xl font-bold text-white">ARIA Insights</h1>
        <p className="text-sm text-[#6B8A9A] mt-0.5">
          AI moderation analytics — interventions, blocks, overrides, categories &amp; effectiveness
        </p>
      </div>
      <div className="flex items-center gap-3">
        <TimePeriodSelector options={[7, 30, 90]} selected={days} onChange={onDaysChange} />
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2D6A8F]/20 hover:bg-[#2D6A8F]/30 text-[#8AACBC] hover:text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}
