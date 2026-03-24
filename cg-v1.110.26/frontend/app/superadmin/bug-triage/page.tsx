'use client';

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  Bug, RefreshCw, Brain, Calendar, ChevronDown, ChevronRight,
  AlertTriangle, Clock, History, Zap, Clipboard, Check,
  AlertCircle, MessageSquare, Rocket, GitBranch, Shield, TrendingUp,
} from 'lucide-react';
import { adminAPI, type BugCategory, type SprintPlan } from '@/lib/admin-api';
import { VelocityContent, DeploymentsContent, QualityContent, SprintsKanbanContent } from './_devops-content';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400 border border-red-500/20',
  high: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  medium: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  low: 'bg-zinc-700/50 text-[#8AACBC]',
};

const PLATFORM_COLORS: Record<string, string> = {
  frontend: 'bg-blue-500/15 text-blue-400',
  backend: 'bg-[#3DAA8A]/15 text-[#3DAA8A]',
};

type Tab = 'live' | 'triage' | 'sprint' | 'history' | 'kanban' | 'velocity' | 'deployments' | 'quality';
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
  return <div className={`animate-pulse bg-[#2D6A8F]/20 rounded-lg ${className}`} />;
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
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

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
      const result = await adminAPI.createBugSprint(3);
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
      // Filter out empty notes and send completed items + resolution notes
      const notes: Record<string, string> = {};
      Object.entries(resolutionNotes).forEach(([key, val]) => {
        if (val.trim()) notes[key] = val.trim();
      });
      const completedItems = Array.from(checkedSprintItems);
      await adminAPI.updateSprintStatus(sprint.sprint_id, 'completed', {
        resolution_notes: notes,
        completed_items: completedItems,
      });
      setShowCloseConfirm(false);
      setResolutionNotes({});
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
    { id: 'kanban', label: 'Sprints', icon: Clipboard },
    { id: 'velocity', label: 'Velocity', icon: TrendingUp },
    { id: 'deployments', label: 'Deployments', icon: Rocket },
    { id: 'quality', label: 'Quality', icon: Shield },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">DevOps Hub</h1>
            <span className="flex items-center gap-1.5 text-[11px] text-[#6B8A9A]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Auto-refreshing every 60s
            </span>
          </div>
          <p className="text-sm text-[#6B8A9A] mt-0.5">
            {bugs ? `${bugs.total} total issues | ${bugs.critical} critical` : 'Fetch issues to begin triage'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchBugs()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2D6A8F]/20 hover:bg-[#2D6A8F]/30 text-[#D0E4EC] text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Fetch Issues
          </button>
          <button
            onClick={runTriage}
            disabled={triaging}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium transition-colors disabled:opacity-50"
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
      <div className="flex gap-1 bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'history' && !sprints) fetchHistory();
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[#3DAA8A]/15 text-[#5BC4A0]'
                : 'text-[#8AACBC] hover:text-white hover:bg-[#2D6A8F]/20'
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
                      ? 'bg-[#3DAA8A]/15 text-[#5BC4A0] border border-violet-500/30'
                      : 'bg-[#2D6A8F]/20 text-[#8AACBC] border border-[#2D6A8F]/20 hover:text-white'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  System Errors ({systemErrors.length})
                </button>
                <button
                  onClick={() => setIssueSubTab('user')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    issueSubTab === 'user'
                      ? 'bg-[#3DAA8A]/15 text-[#5BC4A0] border border-violet-500/30'
                      : 'bg-[#2D6A8F]/20 text-[#8AACBC] border border-[#2D6A8F]/20 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  User Reports ({userReports.length})
                </button>
              </div>
              {(() => {
                const filteredIssues = issueSubTab === 'system' ? systemErrors : userReports;
                return (
                  <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#2D6A8F]/20">
                          <th className="text-left px-4 py-3 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider">Issue</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider">Severity</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider hidden md:table-cell">Platform</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider hidden lg:table-cell">Users</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {filteredIssues.map((issue: any, idx: number) => (
                          <tr key={`${issue._severity}-${idx}`} className="hover:bg-[#2D6A8F]/10 transition-colors">
                            <td className="px-4 py-3">
                              <div className="text-white font-medium truncate max-w-md">{issue.title || issue.culprit || 'Untitled issue'}</div>
                              {issue.culprit && issue.title && (
                                <div className="text-xs text-[#4A6E7F] truncate">{issue.culprit}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${SEVERITY_COLORS[issue._severity] || SEVERITY_COLORS.low}`}>
                                {issue._severity}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${PLATFORM_COLORS[issue.platform] || 'bg-zinc-700/50 text-[#8AACBC]'}`}>
                                {issue.platform || 'unknown'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-[#8AACBC] hidden lg:table-cell">
                              {issue.userCount ?? issue.user_count ?? '\u2014'}
                            </td>
                            <td className="px-4 py-3 text-right text-[#8AACBC]">
                              {issue.count ?? issue.events ?? '\u2014'}
                            </td>
                          </tr>
                        ))}
                        {filteredIssues.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-[#6B8A9A]">
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
              <Bug className="w-12 h-12 text-[#3A5A6A] mb-4" />
              <p className="text-[#6B8A9A] text-sm">Click &ldquo;Fetch Issues&rdquo; to load current Sentry issues</p>
            </div>
          )}
        </>
      )}

      {/* AI Analysis Tab */}
      {activeTab === 'triage' && (
        <>
          {triaging && (
            <div className="space-y-3">
              <div className="bg-[#1A3648]/60 border border-[#3DAA8A]/20 rounded-xl p-5 flex items-center gap-3">
                <Brain className="w-5 h-5 text-[#3DAA8A] animate-pulse" />
                <p className="text-sm text-[#D0E4EC]">Analyzing issues with Claude AI...</p>
              </div>
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          )}
          {triageResult && !triaging && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-[#D0E4EC] mb-2 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#3DAA8A]" /> AI Summary
                </h3>
                <p className="text-sm text-[#8AACBC] leading-relaxed">{triageResult.summary}</p>
              </div>

              {/* Top 3 Priorities */}
              {triageResult.top_3 && triageResult.top_3.length > 0 && (
                <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Top Priorities
                  </h3>
                  <ul className="space-y-2">
                    {triageResult.top_3.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-[#D0E4EC]">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Patterns */}
              {triageResult.patterns && triageResult.patterns.length > 0 && (
                <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-blue-400 mb-3">Common Patterns</h3>
                  <ul className="space-y-1.5">
                    {triageResult.patterns.map((p, i) => (
                      <li key={i} className="text-sm text-[#8AACBC] flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations Table */}
              {triageResult.recommendations && triageResult.recommendations.length > 0 && (
                <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#2D6A8F]/20">
                    <h3 className="text-sm font-semibold text-[#D0E4EC]">Recommendations ({triageResult.recommendations.length})</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2D6A8F]/20">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider">Issue</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider">Severity</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider">Action</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider hidden md:table-cell">Effort</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider hidden lg:table-cell">Reason</th>
                        <th className="text-center px-4 py-2.5 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider">Fix Prompt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {triageResult.recommendations.map((rec, idx) => {
                        const actionColors: Record<string, string> = {
                          resolve: 'bg-emerald-500/15 text-emerald-400',
                          defer: 'bg-zinc-700/50 text-[#8AACBC]',
                          investigate: 'bg-blue-500/15 text-blue-400',
                          ignore: 'bg-[#2D6A8F]/20 text-[#4A6E7F]',
                        };
                        return (
                          <tr key={idx} className="hover:bg-[#2D6A8F]/10 transition-colors">
                            <td className="px-4 py-3">
                              <div className="text-white font-medium truncate max-w-xs">{rec.title}</div>
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
                              <span className="text-xs text-[#6B8A9A] flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {rec.estimated_effort || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#6B8A9A] text-xs hidden lg:table-cell max-w-xs truncate">{rec.reason}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => copyFixPrompt(rec, idx)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#2D6A8F]/20 hover:bg-zinc-700/60 text-[#8AACBC] hover:text-white text-[11px] font-medium transition-colors"
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
              <Brain className="w-12 h-12 text-[#3A5A6A] mb-4" />
              <p className="text-[#6B8A9A] text-sm">Click &ldquo;Run AI Triage&rdquo; to analyze issues with Claude</p>
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
                <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#D0E4EC] font-medium">
                      {sprintCompletedCount} of {sprintTotalCount} items completed
                    </span>
                    <span className="text-xs text-[#6B8A9A]">
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
                        <span className="text-xs text-[#D0E4EC]">
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
                          className="px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-[#D0E4EC] text-xs font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sprint Summary */}
              <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-[#D0E4EC] mb-2">Sprint Summary</h3>
                <p className="text-sm text-[#8AACBC]">{sprint.plan.summary}</p>
                {sprint.plan.top_3 && sprint.plan.top_3.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs text-[#6B8A9A] uppercase tracking-wider">Top Priorities</span>
                    <ul className="mt-1 space-y-1">
                      {sprint.plan.top_3.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#D0E4EC]">
                          <Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-3 text-xs text-[#4A6E7F]">
                  {sprint.plan.days}-day sprint | {sprint.plan.total_items} items total
                </div>
              </div>

              {/* Day-by-Day Breakdown with Checkboxes */}
              {Object.entries(sprint.plan.plan || {}).map(([day, items]) => (
                <div key={day} className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-[#D0E4EC] mb-3 capitalize">{day}</h3>
                  <div className="space-y-2">
                    {(items as any[])?.map((item: any, idx: number) => {
                      const itemKey = `${day}-${idx}`;
                      const isChecked = checkedSprintItems.has(itemKey);
                      return (
                        <React.Fragment key={idx}>
                        <div
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            isChecked ? 'bg-zinc-800/15 opacity-60' : 'bg-[#2D6A8F]/10'
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
                          <span className={`flex-1 text-sm truncate ${isChecked ? 'text-[#6B8A9A] line-through' : 'text-[#D0E4EC]'}`}>
                            {item.title || item.description || 'Task'}
                          </span>
                          {item.effort && (
                            <span className="flex items-center gap-1 text-xs text-[#6B8A9A]">
                              <Clock className="w-3 h-3" />
                              {item.effort}
                            </span>
                          )}
                        </div>
                        {/* Resolution note input — shown for checked items when closing */}
                        {showCloseConfirm && isChecked && (
                          <div className="ml-8 mt-1 mb-2">
                            <input
                              type="text"
                              placeholder="How was this resolved? (optional)"
                              value={resolutionNotes[itemKey] || ''}
                              onChange={(e) =>
                                setResolutionNotes((prev) => ({ ...prev, [itemKey]: e.target.value }))
                              }
                              className="w-full px-3 py-1.5 rounded-lg bg-[#2D6A8F]/15 border border-[#2D6A8F]/30 text-sm text-[#D0E4EC] placeholder-[#6B8A9A] focus:outline-none focus:border-[#3DAA8A]/50"
                            />
                          </div>
                        )}
                      </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Carry Over Section (unchecked items when close confirmed) */}
              {showCloseConfirm && sprintTotalCount - sprintCompletedCount > 0 && (
                <div className="bg-[#1A3648]/60 border border-[#F5A623]/20 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-amber-400 mb-3">Carry Over ({sprintTotalCount - sprintCompletedCount} items)</h3>
                  <div className="space-y-1.5">
                    {allSprintItems
                      .filter((si) => !checkedSprintItems.has(si.key))
                      .map((si) => (
                        <div key={si.key} className="text-sm text-[#8AACBC] px-3 py-1.5 flex items-center gap-2">
                          <span className="text-amber-400/60">&bull;</span>
                          {si.item?.title || si.item?.description || 'Task'}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Deferred / Investigate */}
              {sprint.plan.deferred && sprint.plan.deferred.length > 0 && (
                <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-amber-400 mb-3">Deferred</h3>
                  <div className="space-y-1">
                    {sprint.plan.deferred.map((item: any, i: number) => (
                      <div key={i} className="text-sm text-[#8AACBC] px-3 py-1.5">{item.title || item.description || item}</div>
                    ))}
                  </div>
                </div>
              )}
              {sprint.plan.investigate && sprint.plan.investigate.length > 0 && (
                <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-blue-400 mb-3">Investigate</h3>
                  <div className="space-y-1">
                    {sprint.plan.investigate.map((item: any, i: number) => (
                      <div key={i} className="text-sm text-[#8AACBC] px-3 py-1.5">{item.title || item.description || item}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!sprint && !generatingSprint && (
            <div className="flex flex-col items-center justify-center py-20">
              <Calendar className="w-12 h-12 text-[#3A5A6A] mb-4" />
              <p className="text-[#6B8A9A] text-sm">Click &ldquo;Generate Sprint&rdquo; to create a bug-fix sprint plan</p>
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
                <div key={s.id || s.sprint_id} className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleSprintExpand(s.id || s.sprint_id)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#2D6A8F]/10 transition-colors text-left"
                  >
                    {expandedSprints.has(s.id || s.sprint_id) ? (
                      <ChevronDown className="w-4 h-4 text-[#6B8A9A]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#6B8A9A]" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium">
                        Sprint {s.id?.slice(0, 8) || s.sprint_id?.slice(0, 8)}
                      </div>
                      <div className="text-xs text-[#6B8A9A]">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}
                        {s.plan?.days ? ` \u00b7 ${s.plan.days}-day sprint` : ''}
                      </div>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                      s.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400 border border-[#3DAA8A]/20' :
                      s.status === 'active' ? 'bg-[#3DAA8A]/15 text-[#3DAA8A] border border-[#3DAA8A]/20' :
                      'bg-zinc-700/50 text-[#8AACBC] border border-zinc-600/20'
                    }`}>
                      {s.status || 'draft'}
                    </span>
                    {s.completed_items != null && s.plan?.total_items != null ? (
                      <span className="text-xs text-[#6B8A9A]">{s.completed_items}/{s.plan.total_items} completed</span>
                    ) : (
                      <span className="text-xs text-[#6B8A9A]">{s.plan?.total_items || '\u2014'} items</span>
                    )}
                  </button>
                  {expandedSprints.has(s.id || s.sprint_id) && s.plan && (
                    <div className="border-t border-[#2D6A8F]/20 px-5 py-4 space-y-4">
                      <p className="text-sm text-[#8AACBC]">{s.plan.summary}</p>
                      {s.plan.top_3 && (
                        <ul className="space-y-1 mt-2">
                          {s.plan.top_3.map((t: string, i: number) => (
                            <li key={i} className="text-xs text-[#8AACBC] flex items-start gap-2">
                              <span className="text-[#3DAA8A] mt-0.5">-</span> {t}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Sprint Items with Resolution Notes */}
                      {s.plan.plan && Object.entries(s.plan.plan).map(([day, dayItems]) => (
                        <div key={day} className="mt-3">
                          <h4 className="text-xs font-semibold text-[#6B8A9A] uppercase tracking-wider mb-2">{day.replace('_', ' ')}</h4>
                          <div className="space-y-1.5">
                            {(dayItems as any[])?.map((item: any, idx: number) => {
                              const itemKey = `${day}-${idx}`;
                              const notes = s.resolution_notes?.notes || {};
                              const completedItems: string[] = s.resolution_notes?.completed_items || [];
                              const wasCompleted = completedItems.includes(itemKey);
                              const fixNote = notes[itemKey];
                              return (
                                <div key={idx} className="pl-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${wasCompleted ? 'bg-emerald-500' : 'bg-[#6B8A9A]/40'}`} />
                                    <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize ${SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.low}`}>
                                      {item.severity || 'med'}
                                    </span>
                                    <span className={`text-sm ${wasCompleted ? 'text-[#8AACBC]' : 'text-[#6B8A9A]'}`}>
                                      {item.title || item.description || 'Task'}
                                    </span>
                                  </div>
                                  {fixNote && (
                                    <div className="ml-6 mt-1 text-xs text-[#5BC4A0] bg-[#3DAA8A]/10 rounded px-2.5 py-1.5 border-l-2 border-[#3DAA8A]/30">
                                      <span className="font-medium">Fix:</span> {fixNote}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {sprints && sprints.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <History className="w-12 h-12 text-[#3A5A6A] mb-4" />
              <p className="text-[#6B8A9A] text-sm">No past sprints found</p>
            </div>
          )}
          {!sprints && !loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <History className="w-12 h-12 text-[#3A5A6A] mb-4" />
              <p className="text-[#6B8A9A] text-sm">Loading sprint history...</p>
            </div>
          )}
        </>
      )}

      {/* ── DevOps: Kanban Sprints ── */}
      {activeTab === 'kanban' && <SprintsKanbanContent />}

      {/* ── DevOps: Velocity ── */}
      {activeTab === 'velocity' && <VelocityContent />}

      {/* ── DevOps: Deployments ── */}
      {activeTab === 'deployments' && <DeploymentsContent />}

      {/* ── DevOps: Code Quality ── */}
      {activeTab === 'quality' && <QualityContent />}
    </div>
  );
}

function SeverityCard({ label, count, color }: { label: string; count: number; color: string }) {
  const colorMap: Record<string, string> = {
    red: 'border-red-500/20 text-red-400',
    orange: 'border-orange-500/20 text-orange-400',
    yellow: 'border-yellow-500/20 text-yellow-400',
    zinc: 'border-zinc-700/60 text-[#8AACBC]',
    violet: 'border-[#3DAA8A]/20 text-[#3DAA8A]',
  };
  return (
    <div className={`bg-[#1A3648]/60 border ${colorMap[color]} rounded-xl px-4 py-3`}>
      <div className={`text-2xl font-bold ${colorMap[color].split(' ')[1]}`}>{count}</div>
      <div className="text-[11px] text-[#6B8A9A]">{label}</div>
    </div>
  );
}
