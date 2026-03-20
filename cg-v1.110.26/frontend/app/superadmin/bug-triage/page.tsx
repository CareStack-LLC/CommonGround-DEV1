'use client';

import { useState } from 'react';
import {
  Bug, RefreshCw, Brain, Calendar, ChevronDown, ChevronRight,
  AlertTriangle, Clock, History, Zap,
} from 'lucide-react';
import { adminAPI, type BugCategory, type SprintPlan } from '@/lib/admin-api';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400 border border-red-500/20',
  high: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  medium: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  low: 'bg-zinc-700/50 text-zinc-400',
};

const PLATFORM_COLORS: Record<string, string> = {
  frontend: 'bg-blue-500/15 text-blue-400',
  backend: 'bg-violet-500/15 text-violet-400',
};

type Tab = 'live' | 'sprint' | 'history';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`} />;
}

export default function BugTriagePage() {
  const [activeTab, setActiveTab] = useState<Tab>('live');
  const [bugs, setBugs] = useState<BugCategory | null>(null);
  const [sprint, setSprint] = useState<{ sprint_id: string; plan: SprintPlan } | null>(null);
  const [sprints, setSprints] = useState<any[] | null>(null);
  const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [triaging, setTriaging] = useState(false);
  const [generatingSprint, setGeneratingSprint] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBugs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminAPI.getCurrentBugs(7);
      setBugs(data);
      setActiveTab('live');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch issues');
    } finally {
      setLoading(false);
    }
  };

  const runTriage = async () => {
    try {
      setTriaging(true);
      setError(null);
      await adminAPI.runBugTriage(7);
      await fetchBugs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to run triage');
    } finally {
      setTriaging(false);
    }
  };

  const generateSprint = async () => {
    try {
      setGeneratingSprint(true);
      setError(null);
      const result = await adminAPI.createSprint(3);
      setSprint(result);
      setActiveTab('sprint');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate sprint');
    } finally {
      setGeneratingSprint(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminAPI.listSprints(10);
      setSprints(data);
      setActiveTab('history');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load sprint history');
    } finally {
      setLoading(false);
    }
  };

  const toggleSprintExpand = (id: string) => {
    setExpandedSprints(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'live', label: 'Live Issues', icon: Bug },
    { id: 'sprint', label: 'Sprint Plan', icon: Calendar },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Sentry Bug Triage</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {bugs ? `${bugs.total} total issues | ${bugs.critical} critical` : 'Fetch issues to begin triage'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchBugs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Fetch Issues
          </button>
          <button
            onClick={runTriage}
            disabled={triaging}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Brain className={`w-4 h-4 ${triaging ? 'animate-pulse' : ''}`} />
            Run AI Triage
          </button>
          <button
            onClick={generateSprint}
            disabled={generatingSprint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Calendar className={`w-4 h-4 ${generatingSprint ? 'animate-pulse' : ''}`} />
            Generate Sprint
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'history' && !sprints) fetchHistory();
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-violet-500/15 text-violet-300'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Bar */}
      {bugs && activeTab === 'live' && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <SeverityCard label="Critical" count={bugs.critical} color="red" />
          <SeverityCard label="High" count={bugs.high} color="orange" />
          <SeverityCard label="Medium" count={bugs.medium} color="yellow" />
          <SeverityCard label="Low" count={bugs.low} color="zinc" />
          <SeverityCard label="User Reported" count={bugs.user_reported} color="violet" />
        </div>
      )}

      {/* Live Issues Tab */}
      {activeTab === 'live' && (
        <>
          {loading && !bugs && (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          )}
          {bugs && (
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800/80">
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Issue</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Severity</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Platform</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Users</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {Object.entries(bugs.issues).flatMap(([severity, issues]) =>
                    issues.map((issue: any, idx: number) => (
                      <tr key={`${severity}-${idx}`} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-zinc-200 font-medium truncate max-w-md">{issue.title || issue.culprit || 'Untitled issue'}</div>
                          {issue.culprit && issue.title && (
                            <div className="text-xs text-zinc-600 truncate">{issue.culprit}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${SEVERITY_COLORS[severity] || SEVERITY_COLORS.low}`}>
                            {severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${PLATFORM_COLORS[issue.platform] || 'bg-zinc-700/50 text-zinc-400'}`}>
                            {issue.platform || 'unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-400 hidden lg:table-cell">
                          {issue.userCount ?? issue.user_count ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-400">
                          {issue.count ?? issue.events ?? '—'}
                        </td>
                      </tr>
                    ))
                  )}
                  {Object.values(bugs.issues).flat().length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">No issues found for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {!bugs && !loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Bug className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-sm">Click &ldquo;Fetch Issues&rdquo; to load current Sentry issues</p>
            </div>
          )}
        </>
      )}

      {/* Sprint Plan Tab */}
      {activeTab === 'sprint' && (
        <>
          {generatingSprint && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          )}
          {sprint && (
            <div className="space-y-4">
              {/* Sprint Summary */}
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-zinc-300 mb-2">Sprint Summary</h3>
                <p className="text-sm text-zinc-400">{sprint.plan.summary}</p>
                {sprint.plan.top_3 && sprint.plan.top_3.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">Top Priorities</span>
                    <ul className="mt-1 space-y-1">
                      {sprint.plan.top_3.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                          <Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-3 text-xs text-zinc-600">
                  {sprint.plan.days}-day sprint | {sprint.plan.total_items} items total
                </div>
              </div>

              {/* Day-by-Day Breakdown */}
              {Object.entries(sprint.plan.plan).map(([day, items]) => (
                <div key={day} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3 capitalize">{day}</h3>
                  <div className="space-y-2">
                    {(items as any[]).map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/30">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.low}`}>
                          {item.severity || 'med'}
                        </span>
                        <span className="flex-1 text-sm text-zinc-300 truncate">{item.title || item.description || 'Task'}</span>
                        {item.effort && (
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Clock className="w-3 h-3" />
                            {item.effort}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Deferred / Investigate */}
              {sprint.plan.deferred && sprint.plan.deferred.length > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-amber-400 mb-3">Deferred</h3>
                  <div className="space-y-1">
                    {sprint.plan.deferred.map((item: any, i: number) => (
                      <div key={i} className="text-sm text-zinc-400 px-3 py-1.5">{item.title || item.description || item}</div>
                    ))}
                  </div>
                </div>
              )}
              {sprint.plan.investigate && sprint.plan.investigate.length > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-blue-400 mb-3">Investigate</h3>
                  <div className="space-y-1">
                    {sprint.plan.investigate.map((item: any, i: number) => (
                      <div key={i} className="text-sm text-zinc-400 px-3 py-1.5">{item.title || item.description || item}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!sprint && !generatingSprint && (
            <div className="flex flex-col items-center justify-center py-20">
              <Calendar className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-sm">Click &ldquo;Generate Sprint&rdquo; to create a bug-fix sprint plan</p>
            </div>
          )}
        </>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <>
          {loading && !sprints && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          )}
          {sprints && sprints.length > 0 && (
            <div className="space-y-2">
              {sprints.map((s: any) => (
                <div key={s.id || s.sprint_id} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleSprintExpand(s.id || s.sprint_id)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-zinc-800/30 transition-colors text-left"
                  >
                    {expandedSprints.has(s.id || s.sprint_id) ? (
                      <ChevronDown className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-zinc-200 font-medium">
                        Sprint {s.id?.slice(0, 8) || s.sprint_id?.slice(0, 8)}
                      </div>
                      <div className="text-xs text-zinc-500">{s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}</div>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      s.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' :
                      s.status === 'active' ? 'bg-violet-500/15 text-violet-400' :
                      'bg-zinc-700/50 text-zinc-400'
                    }`}>
                      {s.status || 'pending'}
                    </span>
                    <span className="text-xs text-zinc-500">{s.plan?.total_items || '—'} items</span>
                  </button>
                  {expandedSprints.has(s.id || s.sprint_id) && s.plan && (
                    <div className="border-t border-zinc-800/60 px-5 py-4 space-y-2">
                      <p className="text-sm text-zinc-400">{s.plan.summary}</p>
                      {s.plan.top_3 && (
                        <ul className="space-y-1 mt-2">
                          {s.plan.top_3.map((t: string, i: number) => (
                            <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                              <span className="text-violet-400 mt-0.5">-</span> {t}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {sprints && sprints.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <History className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-sm">No past sprints found</p>
            </div>
          )}
          {!sprints && !loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <History className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-sm">Loading sprint history...</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SeverityCard({ label, count, color }: { label: string; count: number; color: string }) {
  const colorMap: Record<string, string> = {
    red: 'border-red-500/20 text-red-400',
    orange: 'border-orange-500/20 text-orange-400',
    yellow: 'border-yellow-500/20 text-yellow-400',
    zinc: 'border-zinc-700/60 text-zinc-400',
    violet: 'border-violet-500/20 text-violet-400',
  };
  return (
    <div className={`bg-zinc-900/50 border ${colorMap[color]} rounded-xl px-4 py-3`}>
      <div className={`text-2xl font-bold ${colorMap[color].split(' ')[1]}`}>{count}</div>
      <div className="text-[11px] text-zinc-500">{label}</div>
    </div>
  );
}
