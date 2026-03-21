'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bug, RefreshCw, Brain, Calendar, ChevronDown, ChevronRight,
  AlertTriangle, Clock, History, Zap, Clipboard, Check,
  AlertCircle, MessageSquare,
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

type Tab = 'live' | 'triage' | 'sprint' | 'history';
type IssueSubTab = 'system' | 'user';

interface TriageResult {
  summary: string;
  top_3?: string[];
  patterns?: string[];
  recommendations?: {
    issue_id?: string;
    title: string;
    severity: string;
    action: string;
    reason: string;
    estimated_effort?: string;
  }[];
  error?: boolean;
}

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
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issueSubTab, setIssueSubTab] = useState<IssueSubTab>('system');
  const [checkedSprintItems, setCheckedSprintItems] = useState<Set<string>>(new Set());
  const [copiedPromptIdx, setCopiedPromptIdx] = useState<number | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closingSprint, setClosingSprint] = useState(false);

  const fetchBugs = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      setError(null);
      const data = await adminAPI.getCurrentBugs(7);
      setBugs(data);
      if (!isPolling) setActiveTab('live');
    } catch (err: unknown) {
      if (!isPolling) {
        setError(err instanceof Error ? err.message : 'Failed to fetch issues');
      }
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBugs();
    const interval = setInterval(() => {
      fetchBugs(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchBugs]);

  const runTriage = async () => {
    try {
      setTriaging(true);
      setError(null);
      const result = await adminAPI.runBugTriage(7);
      setTriageResult(result as TriageResult);
      setActiveTab('triage');
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

  // Helper: flatten all issues and filter by user feedback
  const issuesRecord = bugs?.issues || {};
  const allIssues = Object.entries(issuesRecord)
    .filter(([, val]) => Array.isArray(val))
    .flatMap(([severity, issues]) =>
      (issues as any[]).map((issue: any) => ({ ...issue, _severity: severity }))
    );
  const systemErrors = allIssues.filter((i) => !i.has_user_feedback);
  const userReports = allIssues.filter((i) => i.has_user_feedback);

  // Sprint items helpers
  const allSprintItems: { key: string; day: string; item: any; idx: number }[] = [];
  if (sprint?.plan?.plan) {
    Object.entries(sprint.plan.plan).forEach(([day, items]) => {
      (items as any[])?.forEach((item: any, idx: number) => {
        const key = `${day}-${idx}`;
        allSprintItems.push({ key, day, item, idx });
      });
    });
  }
  const sprintCompletedCount = allSprintItems.filter((si) => checkedSprintItems.has(si.key)).length;
  const sprintTotalCount = allSprintItems.length;

  const toggleSprintItem = (key: string) => {
    setCheckedSprintItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCloseSprint = async () => {
    if (!sprint) return;
    try {
      setClosingSprint(true);
      await adminAPI.updateSprintStatus(sprint.sprint_id, 'completed');
      setShowCloseConfirm(false);
      // Refresh history if loaded
      if (sprints) {
        const data = await adminAPI.listSprints(10);
        setSprints(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to close sprint');
    } finally {
      setClosingSprint(false);
    }
  };

  const copyFixPrompt = (rec: NonNullable<TriageResult['recommendations']>[number], idx: number) => {
    const prompt = `Fix the following bug in the CommonGround codebase:\n\nIssue: ${rec.title}\nSeverity: ${rec.severity}\nReason: ${rec.reason}\n\nPlease analyze the root cause and provide a complete fix with code changes.`;
    navigator.clipboard.writeText(prompt);
    setCopiedPromptIdx(idx);
    setTimeout(() => setCopiedPromptIdx(null), 2000);
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'live', label: 'Live Issues', icon: Bug },
    { id: 'triage', label: 'AI Analysis', icon: Brain },
    { id: 'sprint', label: 'Sprint Plan', icon: Calendar },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">Sentry Bug Triage</h1>
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Auto-refreshing every 60s
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            {bugs ? `${bugs.total} total issues | ${bugs.critical} critical` : 'Fetch issues to begin triage'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchBugs()}
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
            <>
              {/* Sub-tab pills */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIssueSubTab('system')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    issueSubTab === 'system'
                      ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                      : 'bg-zinc-800/50 text-zinc-400 border border-zinc-800/60 hover:text-zinc-200'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  System Errors ({systemErrors.length})
                </button>
                <button
                  onClick={() => setIssueSubTab('user')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    issueSubTab === 'user'
                      ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                      : 'bg-zinc-800/50 text-zinc-400 border border-zinc-800/60 hover:text-zinc-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  User Reports ({userReports.length})
                </button>
              </div>
              {(() => {
                const filteredIssues = issueSubTab === 'system' ? systemErrors : userReports;
                return (
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
                        {filteredIssues.map((issue: any, idx: number) => (
                          <tr key={`${issue._severity}-${idx}`} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="text-zinc-200 font-medium truncate max-w-md">{issue.title || issue.culprit || 'Untitled issue'}</div>
                              {issue.culprit && issue.title && (
                                <div className="text-xs text-zinc-600 truncate">{issue.culprit}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${SEVERITY_COLORS[issue._severity] || SEVERITY_COLORS.low}`}>
                                {issue._severity}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${PLATFORM_COLORS[issue.platform] || 'bg-zinc-700/50 text-zinc-400'}`}>
                                {issue.platform || 'unknown'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-400 hidden lg:table-cell">
                              {issue.userCount ?? issue.user_count ?? '\u2014'}
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-400">
                              {issue.count ?? issue.events ?? '\u2014'}
                            </td>
                          </tr>
                        ))}
                        {filteredIssues.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                              {issueSubTab === 'system' ? 'No system errors found for this period.' : 'No user reports found for this period.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </>
          )}
          {!bugs && !loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Bug className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-sm">Click &ldquo;Fetch Issues&rdquo; to load current Sentry issues</p>
            </div>
          )}
        </>
      )}

      {/* AI Analysis Tab */}
      {activeTab === 'triage' && (
        <>
          {triaging && (
            <div className="space-y-3">
              <div className="bg-zinc-900/50 border border-violet-500/20 rounded-xl p-5 flex items-center gap-3">
                <Brain className="w-5 h-5 text-violet-400 animate-pulse" />
                <p className="text-sm text-zinc-300">Analyzing issues with Claude AI...</p>
              </div>
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          )}
          {triageResult && !triaging && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-400" /> AI Summary
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{triageResult.summary}</p>
              </div>

              {/* Top 3 Priorities */}
              {triageResult.top_3 && triageResult.top_3.length > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Top Priorities
                  </h3>
                  <ul className="space-y-2">
                    {triageResult.top_3.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Patterns */}
              {triageResult.patterns && triageResult.patterns.length > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-blue-400 mb-3">Common Patterns</h3>
                  <ul className="space-y-1.5">
                    {triageResult.patterns.map((p, i) => (
                      <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations Table */}
              {triageResult.recommendations && triageResult.recommendations.length > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-zinc-800/60">
                    <h3 className="text-sm font-semibold text-zinc-300">Recommendations ({triageResult.recommendations.length})</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800/80">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Issue</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Severity</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Action</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Effort</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Reason</th>
                        <th className="text-center px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Fix Prompt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {triageResult.recommendations.map((rec, idx) => {
                        const actionColors: Record<string, string> = {
                          resolve: 'bg-emerald-500/15 text-emerald-400',
                          defer: 'bg-zinc-700/50 text-zinc-400',
                          investigate: 'bg-blue-500/15 text-blue-400',
                          ignore: 'bg-zinc-800/50 text-zinc-600',
                        };
                        return (
                          <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="text-zinc-200 font-medium truncate max-w-xs">{rec.title}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${SEVERITY_COLORS[rec.severity] || SEVERITY_COLORS.low}`}>
                                {rec.severity}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${actionColors[rec.action] || actionColors.defer}`}>
                                {rec.action}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className="text-xs text-zinc-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {rec.estimated_effort || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-500 text-xs hidden lg:table-cell max-w-xs truncate">{rec.reason}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => copyFixPrompt(rec, idx)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-200 text-[11px] font-medium transition-colors"
                                title="Copy AI fix prompt to clipboard"
                              >
                                {copiedPromptIdx === idx ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Clipboard className="w-3 h-3" />
                                    Copy
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {!triageResult && !triaging && (
            <div className="flex flex-col items-center justify-center py-20">
              <Brain className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-sm">Click &ldquo;Run AI Triage&rdquo; to analyze issues with Claude</p>
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
              {/* Completion Bar */}
              {sprintTotalCount > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-300 font-medium">
                      {sprintCompletedCount} of {sprintTotalCount} items completed
                    </span>
                    <span className="text-xs text-zinc-500">
                      {sprintTotalCount > 0 ? Math.round((sprintCompletedCount / sprintTotalCount) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all duration-300"
                      style={{ width: `${sprintTotalCount > 0 ? (sprintCompletedCount / sprintTotalCount) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-end mt-3">
                    {!showCloseConfirm ? (
                      <button
                        onClick={() => setShowCloseConfirm(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Close Sprint
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-zinc-800/80 rounded-lg px-3 py-2">
                        <span className="text-xs text-zinc-300">
                          Close this sprint? {sprintCompletedCount} completed, {sprintTotalCount - sprintCompletedCount} remaining.
                        </span>
                        <button
                          onClick={handleCloseSprint}
                          disabled={closingSprint}
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium disabled:opacity-50"
                        >
                          {closingSprint ? 'Closing...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setShowCloseConfirm(false)}
                          className="px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

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

              {/* Day-by-Day Breakdown with Checkboxes */}
              {Object.entries(sprint.plan.plan || {}).map(([day, items]) => (
                <div key={day} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3 capitalize">{day}</h3>
                  <div className="space-y-2">
                    {(items as any[])?.map((item: any, idx: number) => {
                      const itemKey = `${day}-${idx}`;
                      const isChecked = checkedSprintItems.has(itemKey);
                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            isChecked ? 'bg-zinc-800/15 opacity-60' : 'bg-zinc-800/30'
                          }`}
                        >
                          <button
                            onClick={() => toggleSprintItem(itemKey)}
                            className={`flex-shrink-0 w-4.5 h-4.5 rounded border transition-colors flex items-center justify-center ${
                              isChecked
                                ? 'bg-violet-500 border-violet-500'
                                : 'border-zinc-600 hover:border-violet-400'
                            }`}
                            style={{ width: 18, height: 18 }}
                          >
                            {isChecked && <Check className="w-3 h-3 text-white" />}
                          </button>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.low}`}>
                            {item.severity || 'med'}
                          </span>
                          <span className={`flex-1 text-sm truncate ${isChecked ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                            {item.title || item.description || 'Task'}
                          </span>
                          {item.effort && (
                            <span className="flex items-center gap-1 text-xs text-zinc-500">
                              <Clock className="w-3 h-3" />
                              {item.effort}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Carry Over Section (unchecked items when close confirmed) */}
              {showCloseConfirm && sprintTotalCount - sprintCompletedCount > 0 && (
                <div className="bg-zinc-900/50 border border-amber-500/20 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-amber-400 mb-3">Carry Over ({sprintTotalCount - sprintCompletedCount} items)</h3>
                  <div className="space-y-1.5">
                    {allSprintItems
                      .filter((si) => !checkedSprintItems.has(si.key))
                      .map((si) => (
                        <div key={si.key} className="text-sm text-zinc-400 px-3 py-1.5 flex items-center gap-2">
                          <span className="text-amber-400/60">&bull;</span>
                          {si.item?.title || si.item?.description || 'Task'}
                        </div>
                      ))}
                  </div>
                </div>
              )}

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
                      <div className="text-xs text-zinc-500">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}
                        {s.plan?.days ? ` \u00b7 ${s.plan.days}-day sprint` : ''}
                      </div>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                      s.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                      s.status === 'active' ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20' :
                      'bg-zinc-700/50 text-zinc-400 border border-zinc-600/20'
                    }`}>
                      {s.status || 'draft'}
                    </span>
                    {s.completed_items != null && s.plan?.total_items != null ? (
                      <span className="text-xs text-zinc-500">{s.completed_items}/{s.plan.total_items} completed</span>
                    ) : (
                      <span className="text-xs text-zinc-500">{s.plan?.total_items || '\u2014'} items</span>
                    )}
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
