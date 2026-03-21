'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Mail, RefreshCw, AlertTriangle, Check, X, Send,
  Flame, MessageSquare,
  Link, Inbox, Sparkles, Brain,
} from 'lucide-react';
import { adminAPI, type MonitoredEmail, type InboxStats } from '@/lib/admin-api';

/* eslint-disable @typescript-eslint/no-explicit-any */

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`} />;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

const CATEGORY_COLORS: Record<string, string> = {
  support: 'bg-blue-500/15 text-blue-400',
  billing: 'bg-amber-500/15 text-amber-400',
  feedback: 'bg-emerald-500/15 text-emerald-400',
  sales: 'bg-violet-500/15 text-violet-400',
  legal: 'bg-red-500/15 text-red-400',
  partnership: 'bg-teal-500/15 text-teal-400',
  onboarding: 'bg-cyan-500/15 text-cyan-400',
  notification: 'bg-indigo-500/15 text-indigo-400',
  personal: 'bg-pink-500/15 text-pink-400',
  spam: 'bg-zinc-700/50 text-zinc-500',
  other: 'bg-zinc-700/50 text-zinc-400',
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'High' },
  medium: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Medium' },
  low: { bg: 'bg-zinc-700/40', text: 'text-zinc-500', label: 'Low' },
};

function parseAdminNotes(notes: string | null): { priority?: string; suggested_label?: string; action_needed?: string } {
  if (!notes) return {};
  try { return JSON.parse(notes); } catch { return {}; }
}

export default function InboxPage() {
  const [emails, setEmails] = useState<MonitoredEmail[]>([]);
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [total, setTotal] = useState(0);
  const [selectedEmail, setSelectedEmail] = useState<MonitoredEmail | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [draftStatusFilter, setDraftStatusFilter] = useState('');
  const [recipientFilter, setRecipientFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');

  // Reply
  const [customReply, setCustomReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [approvingDraft, setApprovingDraft] = useState(false);
  const [rejectingDraft, setRejectingDraft] = useState(false);

  // AI Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // OAuth
  const [connectingOAuth, setConnectingOAuth] = useState(false);
  const searchParams = useSearchParams();
  const oauthHandled = useRef(false);

  // Handle OAuth callback — exchange code from URL param
  useEffect(() => {
    const code = searchParams.get('oauth_code');
    const oauthError = searchParams.get('oauth_error');

    if (oauthError && !oauthHandled.current) {
      oauthHandled.current = true;
      setError(`Google OAuth failed: ${oauthError}`);
      // Clean URL
      window.history.replaceState({}, '', '/superadmin/inbox');
      return;
    }

    if (code && !oauthHandled.current) {
      oauthHandled.current = true;
      (async () => {
        try {
          await adminAPI.exchangeOAuthCode(code);
          setSuccess('Google account connected successfully!');
          // Clean URL and refresh
          window.history.replaceState({}, '', '/superadmin/inbox');
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Failed to connect Google account');
          window.history.replaceState({}, '', '/superadmin/inbox');
        }
      })();
    }
  }, [searchParams]);

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [emailResult, statsResult] = await Promise.all([
        adminAPI.getEmails({
          category: categoryFilter || undefined,
          is_urgent: urgentOnly ? true : undefined,
          draft_status: draftStatusFilter || undefined,
          limit: 50,
        }),
        adminAPI.getInboxStats(),
      ]);
      setEmails(emailResult.emails);
      setTotal(emailResult.total);
      setStats(statsResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, urgentOnly, draftStatusFilter]);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  const syncInbox = async () => {
    try {
      setSyncing(true);
      setError(null);
      await adminAPI.syncInbox();
      setSuccess('Inbox synced');
      await fetchEmails();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sync inbox');
    } finally {
      setSyncing(false);
    }
  };

  const viewEmail = async (id: string) => {
    try {
      const detail = await adminAPI.getEmailDetail(id);
      setSelectedEmail(detail);
      setCustomReply('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load email');
    }
  };

  const approveDraft = async () => {
    if (!selectedEmail) return;
    try {
      setApprovingDraft(true);
      await adminAPI.approveDraft(selectedEmail.id);
      setSuccess('Draft approved and sent');
      await fetchEmails();
      const updated = await adminAPI.getEmailDetail(selectedEmail.id);
      setSelectedEmail(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve draft');
    } finally {
      setApprovingDraft(false);
    }
  };

  const rejectDraft = async () => {
    if (!selectedEmail) return;
    try {
      setRejectingDraft(true);
      await adminAPI.rejectDraft(selectedEmail.id);
      setSuccess('Draft rejected');
      await fetchEmails();
      const updated = await adminAPI.getEmailDetail(selectedEmail.id);
      setSelectedEmail(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject draft');
    } finally {
      setRejectingDraft(false);
    }
  };

  const sendReply = async () => {
    if (!selectedEmail || !customReply.trim()) return;
    try {
      setSendingReply(true);
      await adminAPI.sendReply(selectedEmail.id, customReply);
      setSuccess('Reply sent');
      setCustomReply('');
      await fetchEmails();
      const updated = await adminAPI.getEmailDetail(selectedEmail.id);
      setSelectedEmail(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      const result = await adminAPI.analyzeInbox();
      if (result.analysis) {
        setAnalysis(result);
        setShowAnalysis(true);
      } else {
        setError(result.error || 'No analysis available');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const connectGoogleOAuth = async () => {
    try {
      setConnectingOAuth(true);
      setError(null);
      const result = await adminAPI.getOAuthUrl();
      window.open(result.url, '_blank');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to get OAuth URL');
    } finally {
      setConnectingOAuth(false);
    }
  };

  // Client-side filtering and sorting
  const displayEmails = (() => {
    const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
    let filtered = emails;
    if (recipientFilter) {
      filtered = filtered.filter(e => e.to_email === recipientFilter);
    }
    if (sortBy === 'priority') {
      filtered = [...filtered].sort((a, b) => {
        const aPri = parseAdminNotes(a.admin_notes ?? null).priority || 'low';
        const bPri = parseAdminNotes(b.admin_notes ?? null).priority || 'low';
        return (PRIORITY_ORDER[aPri] ?? 3) - (PRIORITY_ORDER[bPri] ?? 3);
      });
    }
    return filtered;
  })();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Email Monitor</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} emails total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runAnalysis} disabled={analyzing} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm font-medium transition-colors disabled:opacity-50">
            <Brain className={`w-4 h-4 ${analyzing ? 'animate-pulse' : ''}`} /> {analyzing ? 'Analyzing...' : 'AI Analysis'}
          </button>
          <button onClick={connectGoogleOAuth} disabled={connectingOAuth} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50">
            <Link className="w-4 h-4" /> Connect Google
          </button>
          <button onClick={syncInbox} disabled={syncing} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Sync
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-4 py-3 flex items-center gap-3">
            <Mail className="w-4 h-4 text-zinc-500" />
            <div>
              <div className="text-lg font-semibold text-white">{stats.total}</div>
              <div className="text-[11px] text-zinc-500">Total Emails</div>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <Flame className="w-4 h-4 text-red-400" />
            <div>
              <div className="text-lg font-semibold text-red-400">{stats.urgent}</div>
              <div className="text-[11px] text-zinc-500">Urgent</div>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-lg font-semibold text-amber-400">{stats.pending_drafts}</div>
              <div className="text-[11px] text-zinc-500">Pending Drafts</div>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-4 py-3">
            <div className="text-[11px] text-zinc-500 mb-1">By Category</div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.by_category || {}).map(([cat, count]) => (
                <span key={cat} className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${CATEGORY_COLORS[cat] || CATEGORY_COLORS.other}`}>
                  {cat}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={recipientFilter} onChange={e => setRecipientFilter(e.target.value)} className="px-3 py-2 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer">
          <option value="">All Inboxes</option>
          <option value="hello@find-commonground.com">hello@ (General)</option>
          <option value="support@find-commonground.com">support@ (Support)</option>
          <option value="teejay@find-commonground.com">teejay@ (CEO)</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer">
          <option value="">All Categories</option>
          <option value="support">Support</option>
          <option value="billing">Billing</option>
          <option value="sales">Sales</option>
          <option value="onboarding">Onboarding</option>
          <option value="feedback">Feedback</option>
          <option value="partnership">Partnership</option>
          <option value="legal">Legal</option>
          <option value="notification">Notification</option>
          <option value="personal">Personal</option>
          <option value="spam">Spam</option>
          <option value="other">Other</option>
        </select>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={urgentOnly} onChange={e => setUrgentOnly(e.target.checked)} className="rounded border-zinc-700 bg-zinc-900 text-violet-500 focus:ring-violet-500/30" />
          <span className="text-sm text-zinc-400">Urgent only</span>
        </label>
        <select value={draftStatusFilter} onChange={e => setDraftStatusFilter(e.target.value)} className="px-3 py-2 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer">
          <option value="">All Drafts</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="sent">Sent</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as 'date' | 'priority')} className="px-3 py-2 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer">
          <option value="date">Sort: Newest</option>
          <option value="priority">Sort: Priority</option>
        </select>
      </div>

      {/* AI Analysis Panel */}
      {showAnalysis && analysis?.analysis && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-semibold text-emerald-300">AI Inbox Analysis</h2>
              <span className="text-[10px] text-zinc-500">{analysis.email_count} emails analyzed via {analysis.provider}</span>
            </div>
            <button onClick={() => setShowAnalysis(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
          </div>
          {analysis.analysis.summary && (
            <p className="text-sm text-zinc-300">{analysis.analysis.summary}</p>
          )}
          {analysis.analysis.action_items?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Action Items</h3>
              <div className="space-y-1.5">
                {analysis.analysis.action_items.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5 ${
                      item.priority === 'high' ? 'bg-red-500/15 text-red-400' :
                      item.priority === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-zinc-700/50 text-zinc-400'
                    }`}>{item.priority}</span>
                    <div>
                      <span className="text-zinc-200">{item.action}</span>
                      {item.email_subject && <span className="text-xs text-zinc-500 ml-2">({item.email_subject})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {analysis.analysis.recommendations?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Recommendations</h3>
              <ul className="space-y-1">
                {analysis.analysis.recommendations.map((r: string, i: number) => (
                  <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm text-emerald-300">{success}</p>
        </div>
      )}

      {/* Split Pane */}
      <div className="flex gap-4 min-h-[600px]">
        {/* Email List (1/3) */}
        <div className="w-1/3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : displayEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <Inbox className="w-10 h-10 text-zinc-700 mb-3" />
                <p className="text-sm text-zinc-500">No emails found</p>
              </div>
            ) : displayEmails.map(email => (
              <button
                key={email.id}
                onClick={() => viewEmail(email.id)}
                className={`w-full text-left px-4 py-3 border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors ${
                  selectedEmail?.id === email.id ? 'bg-zinc-800/50' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const extra = parseAdminNotes(email.admin_notes ?? null);
                        const pri = PRIORITY_COLORS[extra.priority || ''];
                        return pri ? (
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${pri.bg.replace('/15', '/60')}`} title={`${pri.label} priority`} />
                        ) : email.is_urgent ? (
                          <Flame className="w-3 h-3 text-red-400 flex-shrink-0" />
                        ) : null;
                      })()}
                      <span className="text-sm text-zinc-200 font-medium truncate">{email.from_name || email.from_email}</span>
                      <span className="text-[10px] text-zinc-600 ml-auto flex-shrink-0">{timeAgo(email.received_at)}</span>
                    </div>
                    <div className="text-xs text-zinc-400 truncate mt-0.5">{email.subject}</div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {email.to_email && (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800/80 text-zinc-500">
                          {email.to_email.split('@')[0]}@
                        </span>
                      )}
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${CATEGORY_COLORS[email.category] || CATEGORY_COLORS.other}`}>
                        {email.category}
                      </span>
                      {(() => {
                        const extra = parseAdminNotes(email.admin_notes ?? null);
                        return extra.suggested_label ? (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-700/40 text-zinc-400">
                            {extra.suggested_label}
                          </span>
                        ) : null;
                      })()}
                      {email.to_email && (
                        <span className="text-[10px] text-zinc-600 truncate">
                          → {email.to_email.split('@')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Email Detail (2/3) */}
        <div className="w-2/3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden flex flex-col">
          {selectedEmail ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {(() => {
                    const extra = parseAdminNotes(selectedEmail.admin_notes ?? null);
                    const pri = PRIORITY_COLORS[extra.priority || ''];
                    return pri ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${pri.bg} ${pri.text}`}>
                        {pri.label} Priority
                      </span>
                    ) : selectedEmail.is_urgent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/15 text-red-400">
                        <Flame className="w-3 h-3" /> Urgent
                      </span>
                    ) : null;
                  })()}
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${CATEGORY_COLORS[selectedEmail.category] || CATEGORY_COLORS.other}`}>
                    {selectedEmail.category}
                  </span>
                  {(() => {
                    const extra = parseAdminNotes(selectedEmail.admin_notes ?? null);
                    return extra.suggested_label ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-700/50 text-zinc-300">
                        {extra.suggested_label}
                      </span>
                    ) : null;
                  })()}
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    selectedEmail.draft_status === 'pending' ? 'bg-amber-500/15 text-amber-400' :
                    selectedEmail.draft_status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' :
                    selectedEmail.draft_status === 'sent' ? 'bg-blue-500/15 text-blue-400' :
                    'bg-zinc-700/50 text-zinc-400'
                  }`}>
                    Draft: {selectedEmail.draft_status}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-white">{selectedEmail.subject}</h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                  <span>From: <span className="text-zinc-300">{selectedEmail.from_name ? `${selectedEmail.from_name} <${selectedEmail.from_email}>` : selectedEmail.from_email}</span></span>
                  <span>|</span>
                  <span>To: <span className="text-zinc-300">{selectedEmail.to_email}</span></span>
                  <span>|</span>
                  <span>{new Date(selectedEmail.received_at).toLocaleString()}</span>
                </div>
                {(() => {
                  const extra = parseAdminNotes(selectedEmail.admin_notes ?? null);
                  return extra.action_needed ? (
                    <div className="mt-2 text-xs text-violet-300/80 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
                      <span className="font-medium">Action: </span>{extra.action_needed}
                    </div>
                  ) : null;
                })()}
                {selectedEmail.urgency_reason && (
                  <div className="mt-2 text-xs text-red-300/80 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    Urgency: {selectedEmail.urgency_reason}
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="bg-zinc-800/30 rounded-xl p-4">
                <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{selectedEmail.body_full}</div>
              </div>

              {/* AI Summary */}
              {selectedEmail.ai_summary && (
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded bg-violet-500/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-violet-400">AI</span>
                    </div>
                    <span className="text-xs font-semibold text-violet-300">AI Summary</span>
                  </div>
                  <p className="text-sm text-zinc-300">{selectedEmail.ai_summary}</p>
                </div>
              )}

              {/* AI Draft Response */}
              {selectedEmail.ai_draft_response && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-emerald-400">AI</span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-300">AI Draft Response</span>
                  </div>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{selectedEmail.ai_draft_response}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={approveDraft}
                      disabled={approvingDraft || selectedEmail.draft_status !== 'pending'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" /> {approvingDraft ? 'Approving...' : 'Approve & Send'}
                    </button>
                    <button
                      onClick={rejectDraft}
                      disabled={rejectingDraft || selectedEmail.draft_status !== 'pending'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" /> {rejectingDraft ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                </div>
              )}

              {/* Custom Reply */}
              <div className="border border-zinc-800/60 rounded-xl p-4">
                <span className="text-xs font-semibold text-zinc-400 mb-2 block">Send Custom Reply</span>
                <textarea
                  value={customReply}
                  onChange={e => setCustomReply(e.target.value)}
                  placeholder="Type your reply..."
                  rows={4}
                  className="w-full px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 resize-none"
                />
                <button
                  onClick={sendReply}
                  disabled={sendingReply || !customReply.trim()}
                  className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Send className={`w-4 h-4 ${sendingReply ? 'animate-pulse' : ''}`} />
                  {sendingReply ? 'Sending...' : 'Send Reply'}
                </button>
              </div>

              {/* Admin Notes */}
              {selectedEmail.admin_notes && (
                <div className="bg-zinc-800/30 rounded-lg px-3 py-2">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Admin Notes</span>
                  <p className="text-xs text-zinc-400 mt-1">{selectedEmail.admin_notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Mail className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-sm">Select an email to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
