'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import {
  Users,
  Activity,
  AlertTriangle,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  Mail,
  MessageSquare,
  Shield,
  HeartHandshake,
} from 'lucide-react';
import {
  MetricCard,
  TabBar,
  useTabState,
  SkeletonCards,
  SkeletonRows,
  ErrorState,
  EmptyState,
  HealthScoreBadge,
  SafetyScoreExplainer,
  CSAgentChat,
  formatNumber,
  timeAgo,
} from '@/components/superadmin';
import {
  adminAPI,
  type CSOverview,
  type HealthScoreEntry,
  type HealthScoringExplainer,
} from '@/lib/admin-api';

// ── Types ────────────────────────────────────────────────────────────────

interface Intervention {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  type: string;
  channel?: string;
  notes?: string;
  outcome?: string;
  created_at: string;
  follow_up_date?: string;
}

// ── Constants ────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview', label: 'Overview', icon: Activity },
  { key: 'health', label: 'Health Scores', icon: HeartHandshake },
  { key: 'at-risk', label: 'At Risk', icon: AlertTriangle },
  { key: 'ai-agent', label: 'AI Agent', icon: MessageSquare },
  { key: 'interventions', label: 'Interventions', icon: Shield },
];

const HEALTH_RANGES = [
  { label: '0-20', min: 0, max: 20, color: '#EF4444' },
  { label: '20-40', min: 20, max: 40, color: '#F97316' },
  { label: '40-60', min: 40, max: 60, color: 'var(--cg-amber)' },
  { label: '60-80', min: 60, max: 80, color: 'var(--cg-sage)' },
  { label: '80-100', min: 80, max: 100, color: '#22C55E' },
];

const INTERVENTION_TYPES = ['outreach', 'discount', 'guidance', 'escalation', 'retention'] as const;

const TYPE_COLORS: Record<string, string> = {
  outreach: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  discount: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  guidance: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  escalation: 'bg-red-500/15 text-red-400 border-red-500/30',
  retention: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

// ── Overview Tab ─────────────────────────────────────────────────────────

function OverviewTab() {
  const [overview, setOverview] = useState<CSOverview | null>(null);
  const [healthScores, setHealthScores] = useState<HealthScoreEntry[]>([]);
  const [scoring, setScoring] = useState<HealthScoringExplainer | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, hs, iv] = await Promise.all([
        adminAPI.getCSOverview(),
        adminAPI.getHealthScores({ limit: 200 }),
        adminAPI.getInterventions({ limit: 10 }),
      ]);
      setOverview(ov);
      setHealthScores(hs.scores);
      setScoring(hs.scoring);
      setInterventions(iv.interventions as Intervention[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SkeletonCards count={4} />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!overview) return null;

  // Build distribution from scores
  const distribution = HEALTH_RANGES.map((range) => ({
    ...range,
    count: healthScores.filter((s) => s.overall_score >= range.min && s.overall_score < (range.max === 100 ? 101 : range.max)).length,
  }));
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Total Accounts"
          value={formatNumber(overview.total_accounts)}
          color="sage"
        />
        <MetricCard
          icon={Activity}
          label="Avg Health Score"
          value={Math.round(overview.avg_health_score)}
          color="sky"
        />
        <MetricCard
          icon={AlertTriangle}
          label="At-Risk Count"
          value={overview.at_risk_count}
          color={overview.at_risk_count > 0 ? 'coral' : 'sage'}
          alert={overview.at_risk_count > 0}
        />
        <MetricCard
          icon={TrendingUp}
          label="Est. NPS"
          value={overview.estimated_nps}
          color="gold"
        />
      </div>

      {/* Health Distribution Chart */}
      <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-cg-slate-tint">Health Score Distribution</h3>
          <SafetyScoreExplainer scoring={scoring} variant="inline" />
        </div>
        <div className="space-y-3">
          {distribution.map((range) => (
            <div key={range.label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-12 text-right font-mono">{range.label}</span>
              <div className="flex-1 bg-cg-slate-deep rounded-full h-6 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  style={{
                    width: `${Math.max((range.count / maxCount) * 100, 2)}%`,
                    backgroundColor: range.color,
                    minWidth: range.count > 0 ? '2rem' : '0',
                  }}
                >
                  {range.count > 0 && (
                    <span className="text-[10px] font-bold text-white">{range.count}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Interventions Feed */}
      <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-cg-slate-tint mb-4">Recent Interventions</h3>
        {interventions.length === 0 ? (
          <p className="text-xs text-cg-slate-strong py-4 text-center">No interventions recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {interventions.map((iv) => (
              <div key={iv.id} className="flex items-start gap-3 py-2 border-b border-cg-slate/10 last:border-0">
                <div className="mt-0.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${TYPE_COLORS[iv.type] || 'bg-cg-slate/15 text-cg-slate-muted border-cg-slate/30'}`}>
                    {iv.type}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-cg-slate-tint truncate">
                    {iv.user_name || iv.user_email || iv.user_id}
                  </p>
                  {iv.notes && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{iv.notes}</p>
                  )}
                </div>
                <span className="text-[10px] text-cg-slate-strong whitespace-nowrap">
                  {timeAgo(iv.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Health Scores Tab ────────────────────────────────────────────────────

function HealthScoresTab() {
  const [scores, setScores] = useState<HealthScoreEntry[]>([]);
  const [scoring, setScoring] = useState<HealthScoringExplainer | null>(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminAPI.getHealthScores({ limit, offset });
      setScores(data.scores);
      setScoring(data.scoring);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load health scores');
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? scores.filter(
        (s) =>
          s.email.toLowerCase().includes(search.toLowerCase()) ||
          `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()),
      )
    : scores;

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      {/* Explainer row — so admins understand what "25" actually means. */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {total} account{total === 1 ? '' : 's'} · sorted by newest
        </p>
        <SafetyScoreExplainer scoring={scoring} variant="badge" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cg-slate-strong" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full bg-cg-slate-deep/60 border border-cg-slate/20 rounded-lg pl-9 pr-4 py-2.5 text-sm text-cg-slate-tint placeholder-cg-slate-strong outline-none focus:border-cg-sage/40"
        />
      </div>

      {/* Table */}
      <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cg-slate/20">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Risk Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-4">
                    <SkeletonRows count={5} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState message={search ? 'No accounts match your search.' : 'No health scores available.'} />
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.user_id} className="border-b border-cg-slate/10 hover:bg-cg-slate/10 transition-colors">
                    <td className="px-4 py-3 text-sm text-cg-slate-tint">
                      {entry.first_name} {entry.last_name}
                    </td>
                    <td className="px-4 py-3 text-xs text-cg-slate-muted">{entry.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <HealthScoreBadge score={entry.overall_score} riskLevel={entry.risk_level} size="sm" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${
                        entry.risk_level === 'critical' ? 'text-red-400' :
                        entry.risk_level === 'at_risk' ? 'text-amber-400' :
                        'text-emerald-400'
                      }`}>
                        {entry.risk_level?.replace('_', ' ') || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-cg-slate-muted capitalize">
                      {entry.subscription_tier || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {entry.last_active ? timeAgo(entry.last_active) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-cg-slate/20">
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages} ({formatNumber(total)} total)
            </span>
            <div className="flex gap-1">
              <button aria-label="Previous"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-cg-slate/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button aria-label="Next"
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-cg-slate/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── At Risk Tab ──────────────────────────────────────────────────────────

function AtRiskTab() {
  const [atRisk, setAtRisk] = useState<HealthScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminAPI.getChurnRisk(0.7);
      setAtRisk(data.at_risk);
    } catch (err: any) {
      setError(err.message || 'Failed to load at-risk accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleTakeAction = async (entry: HealthScoreEntry) => {
    setCreating(entry.user_id);
    try {
      await adminAPI.createIntervention({
        user_id: entry.user_id,
        type: 'outreach',
        channel: 'email',
        notes: `Auto-created for at-risk account (score: ${entry.overall_score})`,
      });
      // Refresh list
      load();
    } catch (err: any) {
      alert(`Failed to create intervention: ${err.message}`);
    } finally {
      setCreating(null);
    }
  };

  if (loading) return <SkeletonCards count={3} />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (atRisk.length === 0) {
    return <EmptyState icon={HeartHandshake} title="All clear" message="No at-risk accounts detected." />;
  }

  return (
    <div className="space-y-3">
      {atRisk.map((entry) => {
        const daysSinceActive = entry.last_active
          ? Math.floor((Date.now() - new Date(entry.last_active).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return (
          <div
            key={entry.user_id}
            className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-4 hover:border-cg-slate/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <HealthScoreBadge score={entry.overall_score} riskLevel={entry.risk_level} size="lg" showLabel />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-cg-slate-tint truncate">
                    {entry.first_name} {entry.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{entry.email}</p>
                  {daysSinceActive !== null && (
                    <p className="text-[11px] text-cg-slate-strong mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {daysSinceActive === 0 ? 'Active today' : `${daysSinceActive} day${daysSinceActive === 1 ? '' : 's'} since last active`}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleTakeAction(entry)}
                disabled={creating === entry.user_id}
                className="px-3 py-1.5 rounded-lg bg-cg-sage hover:bg-cg-sage-light disabled:bg-cg-sage/30 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors whitespace-nowrap"
              >
                {creating === entry.user_id ? 'Creating...' : 'Take Action'}
              </button>
            </div>

            {/* Risk factors */}
            {entry.factors && Object.keys(entry.factors).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-cg-slate/10">
                {Object.entries(entry.factors).map(([factor, score]) => (
                  <span
                    key={factor}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                      score < 40
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : score < 70
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    {factor.replace(/_/g, ' ')}: {score}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── AI Agent Tab ─────────────────────────────────────────────────────────

function AIAgentTab() {
  const handleSend = async (userId: string | null, message: string) => {
    return adminAPI.postCSAgent({
      user_id: userId || undefined,
      issue_description: message,
    });
  };

  const handleSearchUser = async (query: string) => {
    const data = await adminAPI.searchUsers({ q: query, limit: 10 });
    return data.users;
  };

  return <CSAgentChat onSend={handleSend} onSearchUser={handleSearchUser} />;
}

// ── Interventions Tab ────────────────────────────────────────────────────

function InterventionsTab() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminAPI.getInterventions({
        type: typeFilter || undefined,
        limit,
        offset,
      });
      setInterventions(data.interventions as Intervention[]);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load interventions');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, offset]);

  useEffect(() => { load(); }, [load]);

  // Reset offset when filter changes
  useEffect(() => { setOffset(0); }, [typeFilter]);

  if (error) return <ErrorState message={error} onRetry={load} />;

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setTypeFilter('')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              !typeFilter ? 'bg-cg-sage/15 text-cg-sage-light' : 'text-muted-foreground hover:text-white hover:bg-cg-slate/15'
            }`}
          >
            All
          </button>
          {INTERVENTION_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                typeFilter === type ? 'bg-cg-sage/15 text-cg-sage-light' : 'text-muted-foreground hover:text-white hover:bg-cg-slate/15'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
        {loading ? (
          <SkeletonRows count={5} />
        ) : interventions.length === 0 ? (
          <EmptyState message={typeFilter ? `No ${typeFilter} interventions found.` : 'No interventions recorded yet.'} />
        ) : (
          <div className="space-y-0">
            {interventions.map((iv, idx) => (
              <div key={iv.id} className="relative flex gap-4 pb-6 last:pb-0">
                {/* Timeline line */}
                {idx < interventions.length - 1 && (
                  <div className="absolute left-[11px] top-6 bottom-0 w-px bg-cg-slate/20" />
                )}
                {/* Timeline dot */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cg-slate-deep border-2 border-cg-slate/30 flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-cg-sage" />
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${TYPE_COLORS[iv.type] || 'bg-cg-slate/15 text-cg-slate-muted border-cg-slate/30'}`}>
                      {iv.type}
                    </span>
                    <span className="text-xs text-cg-slate-tint font-medium">
                      {iv.user_name || iv.user_email || iv.user_id}
                    </span>
                    {iv.outcome && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        iv.outcome === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' :
                        iv.outcome === 'failed' ? 'bg-red-500/10 text-red-400' :
                        'bg-cg-slate/15 text-cg-slate-muted'
                      }`}>
                        {iv.outcome}
                      </span>
                    )}
                  </div>
                  {iv.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{iv.notes}</p>
                  )}
                  <p className="text-[10px] text-cg-slate-strong mt-1">{timeAgo(iv.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-cg-slate/20">
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button aria-label="Previous"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-cg-slate/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button aria-label="Next"
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-cg-slate/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page Inner ───────────────────────────────────────────────────────────

function PageInner() {
  const [tab, setTab] = useTabState('overview');
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['overview']));

  const handleTabChange = (key: string) => {
    setTab(key);
    setLoadedTabs((prev) => new Set(prev).add(key));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Customer Success</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Health scores, at-risk accounts, and AI-powered interventions</p>
      </div>

      <TabBar tabs={TABS} activeTab={tab} onTabChange={handleTabChange} />

      {tab === 'overview' && <OverviewTab />}
      {tab === 'health' && loadedTabs.has('health') && <HealthScoresTab />}
      {tab === 'at-risk' && loadedTabs.has('at-risk') && <AtRiskTab />}
      {tab === 'ai-agent' && loadedTabs.has('ai-agent') && <AIAgentTab />}
      {tab === 'interventions' && loadedTabs.has('interventions') && <InterventionsTab />}
    </div>
  );
}

// ── Default Export ───────────────────────────────────────────────────────

export default function Page() {
  return (
    <Suspense fallback={<SkeletonCards count={4} />}>
      <PageInner />
    </Suspense>
  );
}
