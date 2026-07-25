'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Rocket, GitBranch, Shield, TrendingUp, Clock, CheckCircle,
  AlertTriangle, Zap, Plus, RefreshCw, Brain,
} from 'lucide-react';
import { adminAPI } from '@/lib/admin-api';
import {
  MetricCard, SkeletonCards, Skeleton, PageHeader, InfoTooltip,
  formatNumber, KanbanBoard, DeploymentTimeline, ProgressRing,
} from '@/components/superadmin';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const RECHARTS_TOOLTIP = { backgroundColor: 'var(--foreground)', border: '1px solid var(--cg-slate)', borderRadius: 8, color: '#D0E4EC', fontSize: 12 };

/* ── Velocity Tab ── */
export function VelocityContent() {
  const [data, setData] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminAPI.getDevOpsVelocity(5).catch(() => null),
      adminAPI.getRepairTrends(30).catch(() => null),
    ]).then(([vel, trn]) => {
      setData(vel);
      setTrends(trn);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? <SkeletonCards count={4} /> : (
          <>
            <MetricCard icon={TrendingUp} label="Sprint Velocity" value={data?.avg_velocity ? `${data.avg_velocity} pts` : '—'} color="sage" tooltip="Average story points completed per sprint" />
            <MetricCard icon={CheckCircle} label="Completion Rate" value={data?.avg_completion ? `${data.avg_completion}%` : '—'} color="sky" tooltip="Percentage of sprint items completed" />
            <MetricCard icon={Clock} label="MTTR" value={trends?.mttr_hours ? `${trends.mttr_hours}h` : '—'} color="ocean" tooltip="Mean time to resolve bugs" />
            <MetricCard icon={Zap} label="Bug Burn Rate" value={trends?.burn_rate ?? '—'} color={trends?.burn_rate < 0 ? 'sage' : 'coral'} tooltip="Net bugs opened vs closed per day" />
          </>
        )}
      </div>

      {/* Velocity Trend */}
      {data?.sprints && data.sprints.length > 0 && (
        <div className="bg-[#1A3648]/60 border border-cg-slate/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">Sprint Velocity Trend <InfoTooltip text="Story points completed per sprint" /></h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.sprints}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--cg-slate)" opacity={0.2} />
              <XAxis dataKey="name" stroke="#4A6E7F" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
              <YAxis stroke="#4A6E7F" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
              <Tooltip contentStyle={RECHARTS_TOOLTIP} />
              <Bar dataKey="completed" fill="var(--cg-sage)" radius={[4, 4, 0, 0]} name="Completed" />
              <Bar dataKey="planned" fill="var(--cg-slate)" radius={[4, 4, 0, 0]} name="Planned" opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Repair Trends */}
      {trends?.daily && trends.daily.length > 0 && (
        <div className="bg-[#1A3648]/60 border border-cg-slate/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">Bug Opened vs Closed <InfoTooltip text="Daily bug resolution trend" /></h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trends.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--cg-slate)" opacity={0.2} />
              <XAxis dataKey="date" stroke="#4A6E7F" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
              <YAxis stroke="#4A6E7F" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
              <Tooltip contentStyle={RECHARTS_TOOLTIP} />
              <Line type="monotone" dataKey="opened" stroke="var(--cg-error)" strokeWidth={2} dot={false} name="Opened" />
              <Line type="monotone" dataKey="closed" stroke="var(--cg-sage)" strokeWidth={2} dot={false} name="Closed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ── Deployments Tab ── */
export function DeploymentsContent() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getDeployments(20).then(d => {
      setDeployments(d?.deployments || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Calculate stats
  const successRate = deployments.length > 0
    ? Math.round((deployments.filter(d => d.status === 'success').length / deployments.length) * 100)
    : 0;
  const totalDeploys = deployments.length;
  const avgDuration = deployments.length > 0
    ? Math.round(deployments.filter(d => d.duration_seconds).reduce((a, d) => a + (d.duration_seconds || 0), 0) / Math.max(deployments.filter(d => d.duration_seconds).length, 1))
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={Rocket} label="Total Deploys" value={totalDeploys} color="sage" tooltip="Total deployments recorded" />
        <MetricCard icon={CheckCircle} label="Success Rate" value={`${successRate}%`} color={successRate >= 90 ? 'sage' : 'gold'} tooltip="Percentage of successful deployments" />
        <MetricCard icon={Clock} label="Avg Duration" value={avgDuration > 0 ? `${avgDuration}s` : '—'} color="sky" tooltip="Average deployment duration" />
        <MetricCard icon={GitBranch} label="Latest" value={deployments[0]?.branch || '—'} color="ocean" tooltip="Most recent deployment branch" />
      </div>

      <div className="bg-[#1A3648]/60 border border-cg-slate/20 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">Deployment History</h2>
        <DeploymentTimeline deployments={deployments} loading={loading} />
      </div>
    </div>
  );
}

/* ── Code Quality Tab ── */
export function QualityContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getCodeQuality().then(d => {
      setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonCards count={4} />;

  const latest = data?.latest;
  const trend = data?.trend || [];

  return (
    <div className="space-y-6">
      {/* Quality Scoreboard */}
      <div className="bg-[#1A3648]/60 border border-cg-slate/20 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-[#D0E4EC] mb-6">Code Quality Scoreboard</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <ProgressRing value={latest?.test_coverage_pct ?? 0} label="Test Coverage" sublabel="% of code covered" />
          <ProgressRing value={latest?.lint_errors === 0 ? 100 : Math.max(100 - (latest?.lint_errors || 0) * 5, 0)} label="Lint Health" sublabel={`${latest?.lint_errors ?? 0} errors`} />
          <ProgressRing value={latest?.type_errors === 0 ? 100 : Math.max(100 - (latest?.type_errors || 0) * 5, 0)} label="Type Safety" sublabel={`${latest?.type_errors ?? 0} errors`} />
          <ProgressRing value={latest?.vulnerability_count === 0 ? 100 : Math.max(100 - (latest?.vulnerability_count || 0) * 20, 0)} label="Security" sublabel={`${latest?.vulnerability_count ?? 0} vulns`} color={latest?.vulnerability_count > 0 ? 'var(--cg-error)' : undefined} />
        </div>
      </div>

      {/* Quality Trends */}
      {trend.length > 0 && (
        <div className="bg-[#1A3648]/60 border border-cg-slate/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">Quality Trends</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--cg-slate)" opacity={0.2} />
              <XAxis dataKey="date" stroke="#4A6E7F" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
              <YAxis stroke="#4A6E7F" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
              <Tooltip contentStyle={RECHARTS_TOOLTIP} />
              <Line type="monotone" dataKey="test_coverage_pct" stroke="var(--cg-sage)" strokeWidth={2} dot={false} name="Coverage %" />
              <Line type="monotone" dataKey="lint_errors" stroke="var(--cg-amber)" strokeWidth={2} dot={false} name="Lint Errors" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bundle Size */}
      {latest?.bundle_size_kb && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1A3648]/60 border border-cg-slate/20 rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">Bundle Size</div>
            <div className="text-lg font-bold text-[#D0E4EC]">{(latest.bundle_size_kb / 1024).toFixed(1)} MB</div>
          </div>
          <div className="bg-[#1A3648]/60 border border-cg-slate/20 rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">Last Updated</div>
            <div className="text-lg font-bold text-[#D0E4EC]">{latest?.date || '—'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sprints Kanban Tab ── */
export function SprintsKanbanContent() {
  const [sprints, setSprints] = useState<any[]>([]);
  const [activeSprint, setActiveSprint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchSprints = useCallback(async () => {
    try {
      const data = await adminAPI.getSprints();
      setSprints(data?.sprints || []);
      const active = (data?.sprints || []).find((s: any) => s.status === 'active');
      if (active) setActiveSprint(active);
      else if ((data?.sprints || []).length > 0) setActiveSprint(data.sprints[0]);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSprints(); }, [fetchSprints]);

  const handleStatusChange = async (itemId: string, newStatus: string) => {
    if (!activeSprint) return;
    try {
      await adminAPI.updateSprintItem(activeSprint.id, itemId, { status: newStatus });
      fetchSprints();
    } catch {}
  };

  const handleCreateSprint = async () => {
    if (!newSprintName.trim()) return;
    setCreating(true);
    try {
      await adminAPI.createSprint({ name: newSprintName.trim() });
      setNewSprintName('');
      setShowCreate(false);
      fetchSprints();
    } catch {} finally {
      setCreating(false);
    }
  };

  if (loading) return <SkeletonCards count={4} />;

  return (
    <div className="space-y-6">
      {/* Sprint selector */}
      <div className="flex items-center gap-3">
        <div className="flex gap-2 flex-1 overflow-x-auto">
          {sprints.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSprint(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeSprint?.id === s.id
                  ? 'bg-cg-sage/20 text-cg-sage border border-cg-sage/30'
                  : 'bg-foreground/60 text-muted-foreground border border-cg-slate/15 hover:border-cg-slate/30'
              }`}
            >
              {s.name}
              <span className="ml-1 text-[10px] opacity-70">({s.status})</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 px-3 py-1.5 bg-cg-sage hover:bg-cg-sage/80 rounded-lg text-xs font-medium text-white transition-colors"
        >
          <Plus className="w-3 h-3" /> New Sprint
        </button>
      </div>

      {/* Create Sprint */}
      {showCreate && (
        <div className="bg-[#1A3648]/60 border border-cg-slate/20 rounded-xl p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Sprint Name</label>
            <input
              value={newSprintName}
              onChange={(e) => setNewSprintName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSprint()}
              placeholder="e.g., Sprint 12 - Auth Fixes"
              className="w-full bg-foreground border border-cg-slate/20 rounded-lg px-3 py-2 text-sm text-[#D0E4EC] placeholder-[#4A6E7F] outline-none focus:border-cg-sage/40"
            />
          </div>
          <button onClick={handleCreateSprint} disabled={creating} className="px-4 py-2 bg-cg-sage rounded-lg text-sm text-white disabled:opacity-50">
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      )}

      {/* Kanban Board */}
      {activeSprint ? (
        <KanbanBoard
          items={activeSprint.items || []}
          onStatusChange={handleStatusChange}
          loading={false}
        />
      ) : (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No sprints yet. Create one to get started.
        </div>
      )}
    </div>
  );
}
