'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Mail, RefreshCw, AlertTriangle, Check, X, Send,
  Flame, MessageSquare, Inbox, Sparkles, Brain,
  Link, ChevronDown, ChevronRight, Clock, Reply,
  Archive, Star, Filter, Search, BarChart3, Zap,
  ArrowUpRight, ArrowDownRight, Users, DollarSign,
  Headphones, Shield, TrendingUp, Eye,
} from 'lucide-react';
import { adminAPI, type MonitoredEmail, type InboxStats } from '@/lib/admin-api';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Helpers ──────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#2D6A8F]/20 rounded-lg ${className}`} />;
}

function formatEmailTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function parseAdminNotes(notes: string | null): { priority?: string; suggested_label?: string; action_needed?: string } {
  if (!notes) return {};
  try { return JSON.parse(notes); } catch { return {}; }
}

// ── Constants ────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  support: { color: 'bg-blue-500/15 text-blue-400 border-blue-500/20', icon: Headphones, label: 'Support' },
  billing: { color: 'bg-amber-500/15 text-amber-400 border-amber-500/20', icon: DollarSign, label: 'Billing' },
  feedback: { color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: MessageSquare, label: 'Feedback' },
  sales: { color: 'bg-[#3DAA8A]/15 text-[#3DAA8A] border-[#3DAA8A]/20', icon: TrendingUp, label: 'Sales' },
  legal: { color: 'bg-red-500/15 text-red-400 border-red-500/20', icon: Shield, label: 'Legal' },
  partnership: { color: 'bg-teal-500/15 text-teal-400 border-teal-500/20', icon: Users, label: 'Partnership' },
  onboarding: { color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20', icon: Zap, label: 'Onboarding' },
  notification: { color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20', icon: Mail, label: 'Notification' },
  personal: { color: 'bg-pink-500/15 text-pink-400 border-pink-500/20', icon: Star, label: 'Personal' },
  spam: { color: 'bg-zinc-700/50 text-[#6B8A9A] border-zinc-700/30', icon: Archive, label: 'Spam' },
  other: { color: 'bg-zinc-700/50 text-[#8AACBC] border-zinc-700/30', icon: Mail, label: 'Other' },
};

const PRIORITY_COLORS: Record<string, { dot: string; label: string }> = {
  high: { dot: 'bg-red-500', label: 'High' },
  medium: { dot: 'bg-amber-500', label: 'Medium' },
  low: { dot: 'bg-zinc-500', label: 'Low' },
};

const INBOX_ALIASES = [
  { alias: 'hello@', full: 'hello@find-commonground.com', icon: '📬', label: 'Hello' },
  { alias: 'support@', full: 'support@find-commonground.com', icon: '🛟', label: 'Support' },
  { alias: 'info@', full: 'info@find-commonground.com', icon: 'ℹ️', label: 'Info' },
  { alias: 'sales@', full: 'sales@find-commonground.com', icon: '💼', label: 'Sales' },
  { alias: 'onboarding@', full: 'onboarding@find-commonground.com', icon: '🚀', label: 'Onboarding' },
  { alias: 'partnerships@', full: 'partnerships@find-commonground.com', icon: '🤝', label: 'Partnerships' },
  { alias: 'teejay@', full: 'teejay@find-commonground.com', icon: '👤', label: 'TeeJay' },
];

// ── Thread Grouping ──────────────────────────────────────────────────────

interface EmailThread {
  id: string; // thread_id or first email's id
  subject: string;
  emails: MonitoredEmail[];
  latestEmail: MonitoredEmail;
  category: string;
  hasUrgent: boolean;
  hasPendingDraft: boolean;
  priority: string;
  to_email: string;
}

function groupEmailsIntoThreads(emails: MonitoredEmail[]): EmailThread[] {
  const threadMap = new Map<string, MonitoredEmail[]>();

  for (const email of emails) {
    // Group by subject line (strip Re: Fwd: etc) to create threads
    const normalizedSubject = email.subject
      .replace(/^(Re|Fwd|FW|RE|Fw):\s*/gi, '')
      .replace(/^(Re|Fwd|FW|RE|Fw)\[\d+\]:\s*/gi, '')
      .trim();
    const threadKey = `${normalizedSubject}__${email.from_email}__${email.to_email}`;

    if (!threadMap.has(threadKey)) {
      threadMap.set(threadKey, []);
    }
    threadMap.get(threadKey)!.push(email);
  }

  const threads: EmailThread[] = [];
  for (const [, threadEmails] of threadMap) {
    // Sort thread emails oldest to newest for conversation view
    threadEmails.sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime());
    const latest = threadEmails[threadEmails.length - 1];
    const notes = parseAdminNotes(latest.admin_notes ?? null);

    threads.push({
      id: latest.id,
      subject: latest.subject.replace(/^(Re|Fwd|FW|RE|Fw):\s*/gi, '').trim(),
      emails: threadEmails,
      latestEmail: latest,
      category: latest.category,
      hasUrgent: threadEmails.some(e => e.is_urgent),
      hasPendingDraft: threadEmails.some(e => e.draft_status === 'pending'),
      priority: notes.priority || 'low',
      to_email: latest.to_email,
    });
  }

  // Sort threads: urgent first, then by latest email date
  threads.sort((a, b) => {
    if (a.hasUrgent && !b.hasUrgent) return -1;
    if (!a.hasUrgent && b.hasUrgent) return 1;
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (a.priority !== 'high' && b.priority === 'high') return 1;
    return new Date(b.latestEmail.received_at).getTime() - new Date(a.latestEmail.received_at).getTime();
  });

  return threads;
}

// ── KPI Card ─────────────────────────────────────────────────────────────

function KPICard({ label, value, icon: Icon, trend, color = 'text-white' }: {
  label: string; value: string | number; icon: any; trend?: string; color?: string;
}) {
  return (
    <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/15 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-[#2D6A8F]/30 transition-colors">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
        color === 'text-red-400' ? 'bg-red-500/10' :
        color === 'text-amber-400' ? 'bg-amber-500/10' :
        color === 'text-emerald-400' ? 'bg-emerald-500/10' :
        color === 'text-blue-400' ? 'bg-blue-500/10' :
        'bg-[#2D6A8F]/15'
      }`}>
        <Icon className={`w-4.5 h-4.5 ${color}`} />
      </div>
      <div>
        <div className={`text-lg font-bold ${color}`}>{value}</div>
        <div className="text-[11px] text-[#6B8A9A]">{label}</div>
      </div>
      {trend && (
        <div className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded ${
          trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {trend}
        </div>
      )}
    </div>
  );
}

// ── Thread Message Bubble ────────────────────────────────────────────────

function ThreadMessage({ email, isLatest }: { email: MonitoredEmail; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(isLatest);
  const isOutbound = email.from_email.endsWith('@find-commonground.com');

  return (
    <div className={`rounded-xl border transition-all ${
      isLatest ? 'border-[#2D6A8F]/30 bg-[#1A3648]/40' : 'border-[#2D6A8F]/10 bg-[#1A3648]/20'
    }`}>
      {/* Message Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
          isOutbound ? 'bg-[#3DAA8A]/20 text-[#3DAA8A]' : 'bg-[#2D6A8F]/30 text-[#8AACBC]'
        }`}>
          {(email.from_name || email.from_email).charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isOutbound ? 'text-[#5BC4A0]' : 'text-white'}`}>
              {email.from_name || email.from_email.split('@')[0]}
            </span>
            {isOutbound && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#3DAA8A]/10 text-[#3DAA8A] font-medium">Sent</span>
            )}
            <span className="text-[10px] text-[#4A6E7F] ml-auto">{formatFullDate(email.received_at)}</span>
          </div>
          {!expanded && (
            <p className="text-xs text-[#6B8A9A] truncate mt-0.5">{email.body_preview || email.body_full?.slice(0, 120)}</p>
          )}
        </div>

        {expanded ? <ChevronDown className="w-4 h-4 text-[#4A6E7F]" /> : <ChevronRight className="w-4 h-4 text-[#4A6E7F]" />}
      </button>

      {/* Message Body */}
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="text-xs text-[#6B8A9A] mb-2">
            To: {email.to_email}
          </div>
          <div className="text-sm text-[#D0E4EC] whitespace-pre-wrap leading-relaxed pl-11">
            {email.body_full}
          </div>

          {/* AI Summary inline */}
          {email.ai_summary && (
            <div className="mt-3 ml-11 bg-violet-500/5 border border-violet-500/15 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3 h-3 text-violet-400" />
                <span className="text-[10px] font-semibold text-violet-300">AI Summary</span>
              </div>
              <p className="text-xs text-[#D0E4EC]">{email.ai_summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [emails, setEmails] = useState<MonitoredEmail[]>([]);
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [total, setTotal] = useState(0);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [recipientFilter, setRecipientFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [urgentOnly, setUrgentOnly] = useState(false);

  // Reply
  const [customReply, setCustomReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [generatingReply, setGeneratingReply] = useState(false);
  const [replyInstructions, setReplyInstructions] = useState('');
  const [showReplyComposer, setShowReplyComposer] = useState(false);

  // AI Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // KPIs
  const [kpis, setKpis] = useState<any>(null);

  // OAuth
  const [connectingOAuth, setConnectingOAuth] = useState(false);
  const searchParams = useSearchParams();
  const oauthHandled = useRef(false);
  const successTimeout = useRef<NodeJS.Timeout>();

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('oauth_code');
    const oauthError = searchParams.get('oauth_error');
    if (oauthError && !oauthHandled.current) {
      oauthHandled.current = true;
      setError(`Google OAuth failed: ${oauthError}`);
      window.history.replaceState({}, '', '/superadmin/inbox');
    }
    if (code && !oauthHandled.current) {
      oauthHandled.current = true;
      (async () => {
        try {
          await adminAPI.exchangeOAuthCode(code);
          showSuccessMsg('Google account connected!');
          window.history.replaceState({}, '', '/superadmin/inbox');
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Failed to connect');
          window.history.replaceState({}, '', '/superadmin/inbox');
        }
      })();
    }
  }, [searchParams]);

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg);
    if (successTimeout.current) clearTimeout(successTimeout.current);
    successTimeout.current = setTimeout(() => setSuccess(null), 4000);
  };

  // ── Data Fetching ──────────────────────────────────────────────────────

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [emailResult, statsResult] = await Promise.all([
        adminAPI.getEmails({
          category: categoryFilter || undefined,
          is_urgent: urgentOnly ? true : undefined,
          limit: 100,
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
  }, [categoryFilter, urgentOnly]);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  // Auto-poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchEmails, 30000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  // Fetch KPIs
  useEffect(() => {
    adminAPI.getInboxKPIs().then(setKpis).catch(() => {});
  }, []);

  // ── Threads ────────────────────────────────────────────────────────────

  const allThreads = groupEmailsIntoThreads(emails);

  const filteredThreads = allThreads.filter(t => {
    if (recipientFilter && t.to_email !== recipientFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSubject = t.subject.toLowerCase().includes(q);
      const matchesSender = t.emails.some(e =>
        (e.from_name || '').toLowerCase().includes(q) ||
        e.from_email.toLowerCase().includes(q)
      );
      if (!matchesSubject && !matchesSender) return false;
    }
    if (urgentOnly && !t.hasUrgent) return false;
    return true;
  });

  // ── Actions ────────────────────────────────────────────────────────────

  const syncInbox = async () => {
    try {
      setSyncing(true);
      setError(null);
      await adminAPI.syncInbox();
      showSuccessMsg('Inbox synced successfully');
      await fetchEmails();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const selectThread = async (thread: EmailThread) => {
    try {
      // Load full detail for latest email
      const detail = await adminAPI.getEmailDetail(thread.latestEmail.id);
      const updatedThread = { ...thread };
      updatedThread.emails = thread.emails.map(e =>
        e.id === detail.id ? detail : e
      );
      updatedThread.latestEmail = detail;
      setSelectedThread(updatedThread);
      setCustomReply('');
      setShowReplyComposer(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load email');
    }
  };

  const generateAIReply = async () => {
    if (!selectedThread) return;
    try {
      setGeneratingReply(true);
      setError(null);
      const result = await adminAPI.generateReply(selectedThread.latestEmail.id, replyInstructions);
      setCustomReply(result.draft_response);
      setReplyInstructions('');
      setShowReplyComposer(true);
      showSuccessMsg(`AI reply generated (${result.thread_length} messages, via ${result.provider})`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate reply');
    } finally {
      setGeneratingReply(false);
    }
  };

  const sendReply = async () => {
    if (!selectedThread || !customReply.trim()) return;
    try {
      setSendingReply(true);
      await adminAPI.sendReply(selectedThread.latestEmail.id, customReply);
      showSuccessMsg('Reply sent');
      setCustomReply('');
      setShowReplyComposer(false);
      await fetchEmails();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSendingReply(false);
    }
  };

  const approveDraft = async () => {
    if (!selectedThread) return;
    try {
      await adminAPI.approveDraft(selectedThread.latestEmail.id);
      showSuccessMsg('Draft approved & sent');
      await fetchEmails();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const rejectDraft = async () => {
    if (!selectedThread) return;
    try {
      await adminAPI.rejectDraft(selectedThread.latestEmail.id);
      showSuccessMsg('Draft rejected');
      await fetchEmails();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
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
      const result = await adminAPI.getOAuthUrl();
      window.open(result.url, '_blank');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'OAuth failed');
    } finally {
      setConnectingOAuth(false);
    }
  };

  // ── Computed Stats ─────────────────────────────────────────────────────

  const urgentCount = allThreads.filter(t => t.hasUrgent).length;
  const pendingDrafts = allThreads.filter(t => t.hasPendingDraft).length;
  const highPriority = allThreads.filter(t => t.priority === 'high').length;
  const categoryCounts = emails.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#3DAA8A]" /> Command Inbox
          </h1>
          <p className="text-sm text-[#6B8A9A] mt-0.5">
            {total} emails · {allThreads.length} threads · Auto-refreshes every 30s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runAnalysis} disabled={analyzing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 text-xs font-medium transition-colors disabled:opacity-50">
            <Brain className={`w-3.5 h-3.5 ${analyzing ? 'animate-pulse' : ''}`} /> {analyzing ? 'Analyzing...' : 'AI Summary'}
          </button>
          <button onClick={connectGoogleOAuth} disabled={connectingOAuth} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2D6A8F]/20 hover:bg-[#2D6A8F]/30 text-[#8AACBC] text-xs font-medium transition-colors disabled:opacity-50">
            <Link className="w-3.5 h-3.5" /> Connect
          </button>
          <button onClick={syncInbox} disabled={syncing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-xs font-medium transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Total Emails" value={total} icon={Mail} color="text-white" />
        <KPICard label="Urgent" value={urgentCount} icon={Flame} color={urgentCount > 0 ? 'text-red-400' : 'text-white'} />
        <KPICard label="High Priority" value={highPriority} icon={AlertTriangle} color={highPriority > 0 ? 'text-amber-400' : 'text-white'} />
        <KPICard label="Pending Drafts" value={pendingDrafts} icon={MessageSquare} color={pendingDrafts > 0 ? 'text-emerald-400' : 'text-white'} />
      </div>

      {/* ── Inbox Aliases ───────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setRecipientFilter('')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border whitespace-nowrap text-xs font-medium transition-all flex-shrink-0 ${
            !recipientFilter
              ? 'bg-[#3DAA8A]/15 border-[#3DAA8A]/30 text-[#5BC4A0]'
              : 'bg-[#1A3648]/40 border-[#2D6A8F]/15 text-[#8AACBC] hover:border-[#2D6A8F]/30'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" /> All ({total})
        </button>
        {INBOX_ALIASES.map(({ alias, full, icon, label }) => {
          const count = emails.filter(e => e.to_email === full).length;
          const isActive = recipientFilter === full;
          return (
            <button
              key={alias}
              onClick={() => setRecipientFilter(isActive ? '' : full)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border whitespace-nowrap text-xs font-medium transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-[#3DAA8A]/15 border-[#3DAA8A]/30 text-[#5BC4A0]'
                  : count > 0
                    ? 'bg-[#1A3648]/40 border-[#2D6A8F]/15 text-[#8AACBC] hover:border-[#2D6A8F]/30'
                    : 'bg-[#1A3648]/20 border-[#2D6A8F]/10 text-[#4A6E7F]'
              }`}
            >
              <span>{icon}</span> {label} {count > 0 && <span className="bg-[#2D6A8F]/30 px-1.5 py-0.5 rounded-full text-[10px]">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* ── Alerts ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <p className="text-sm text-emerald-300">{success}</p>
        </div>
      )}

      {/* ── AI Analysis Panel ───────────────────────────────────────────── */}
      {showAnalysis && analysis?.analysis && (
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-violet-400" />
              <h2 className="text-sm font-semibold text-violet-300">AI Inbox Intelligence</h2>
              <span className="text-[10px] text-[#6B8A9A]">{analysis.email_count} emails · via {analysis.provider}</span>
            </div>
            <button onClick={() => setShowAnalysis(false)} className="text-[#6B8A9A] hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          {analysis.analysis.summary && (
            <p className="text-sm text-[#D0E4EC] leading-relaxed">{analysis.analysis.summary}</p>
          )}
          {analysis.analysis.action_items?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#8AACBC] uppercase tracking-wider mb-2">Action Items</h3>
              <div className="space-y-1.5">
                {analysis.analysis.action_items.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5 ${
                      item.priority === 'high' ? 'bg-red-500/15 text-red-400' :
                      item.priority === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-zinc-700/50 text-[#8AACBC]'
                    }`}>{item.priority}</span>
                    <span className="text-[#D0E4EC]">{item.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {analysis.analysis.recommendations?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#8AACBC] uppercase tracking-wider mb-2">Recommendations</h3>
              <ul className="space-y-1">
                {analysis.analysis.recommendations.map((r: string, i: number) => (
                  <li key={i} className="text-sm text-[#D0E4EC] flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" /> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Main Split Layout ───────────────────────────────────────────── */}
      <div className="flex gap-4" style={{ height: 'calc(100vh - 380px)', minHeight: '500px' }}>

        {/* ── Left: Category Sidebar ────────────────────────────────────── */}
        <div className="w-44 flex-shrink-0 space-y-1">
          <button
            onClick={() => setCategoryFilter('')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              !categoryFilter ? 'bg-[#2D6A8F]/20 text-white' : 'text-[#8AACBC] hover:bg-[#2D6A8F]/10'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" /> All Mail
            <span className="ml-auto text-[10px] bg-[#2D6A8F]/30 px-1.5 py-0.5 rounded-full">{total}</span>
          </button>
          {urgentCount > 0 && (
            <button
              onClick={() => setUrgentOnly(!urgentOnly)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                urgentOnly ? 'bg-red-500/15 text-red-400' : 'text-red-400/70 hover:bg-red-500/10'
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> Urgent
              <span className="ml-auto text-[10px] bg-red-500/20 px-1.5 py-0.5 rounded-full">{urgentCount}</span>
            </button>
          )}
          <div className="h-px bg-[#2D6A8F]/15 my-2" />
          {Object.entries(categoryCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, count]) => {
              const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
              const Icon = cfg.icon;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    categoryFilter === cat ? `${cfg.color}` : 'text-[#8AACBC] hover:bg-[#2D6A8F]/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {cfg.label}
                  <span className="ml-auto text-[10px] opacity-60">{count}</span>
                </button>
              );
            })}
        </div>

        {/* ── Center: Thread List ────────────────────────────────────────── */}
        <div className="w-[340px] flex-shrink-0 bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl overflow-hidden flex flex-col">
          {/* Search */}
          <div className="px-3 py-2.5 border-b border-[#2D6A8F]/15">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4A6E7F]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search threads..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#162D3A] border border-[#2D6A8F]/15 rounded-lg text-xs text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]/30"
              />
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[72px]" />)}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <Inbox className="w-10 h-10 text-[#3A5A6A] mb-3" />
                <p className="text-sm text-[#6B8A9A]">No threads found</p>
              </div>
            ) : filteredThreads.map(thread => {
              const isSelected = selectedThread?.id === thread.id;
              const cfg = CATEGORY_CONFIG[thread.category] || CATEGORY_CONFIG.other;
              const pri = PRIORITY_COLORS[thread.priority];

              return (
                <button
                  key={thread.id}
                  onClick={() => selectThread(thread)}
                  className={`w-full text-left px-4 py-3 border-b border-[#2D6A8F]/10 hover:bg-[#2D6A8F]/10 transition-colors ${
                    isSelected ? 'bg-[#2D6A8F]/20 border-l-2 border-l-[#3DAA8A]' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* Priority dot */}
                    {pri && <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${pri.dot}`} />}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm text-white font-medium truncate">
                          {thread.latestEmail.from_name || thread.latestEmail.from_email.split('@')[0]}
                        </span>
                        {thread.emails.length > 1 && (
                          <span className="text-[10px] text-[#6B8A9A] bg-[#2D6A8F]/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            {thread.emails.length}
                          </span>
                        )}
                        <span className="text-[10px] text-[#4A6E7F] ml-auto flex-shrink-0">{formatEmailTime(thread.latestEmail.received_at)}</span>
                      </div>
                      <div className="text-xs text-[#8AACBC] truncate">{thread.subject}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {thread.hasUrgent && <Flame className="w-3 h-3 text-red-400" />}
                        {thread.hasPendingDraft && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">Draft</span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-[10px] text-[#4A6E7F] truncate">→ {thread.to_email.split('@')[0]}@</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: Thread Detail ──────────────────────────────────────── */}
        <div className="flex-1 bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl overflow-hidden flex flex-col">
          {selectedThread ? (
            <>
              {/* Thread Header */}
              <div className="px-5 py-4 border-b border-[#2D6A8F]/15">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {selectedThread.hasUrgent && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/15 text-red-400">
                      <Flame className="w-3 h-3" /> Urgent
                    </span>
                  )}
                  {PRIORITY_COLORS[selectedThread.priority] && selectedThread.priority !== 'low' && (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      selectedThread.priority === 'high' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {PRIORITY_COLORS[selectedThread.priority].label} Priority
                    </span>
                  )}
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    (CATEGORY_CONFIG[selectedThread.category] || CATEGORY_CONFIG.other).color
                  }`}>
                    {(CATEGORY_CONFIG[selectedThread.category] || CATEGORY_CONFIG.other).label}
                  </span>
                  {selectedThread.hasPendingDraft && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-400">Pending Draft</span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-white">{selectedThread.subject}</h2>
                <p className="text-xs text-[#6B8A9A] mt-1">
                  {selectedThread.emails.length} message{selectedThread.emails.length > 1 ? 's' : ''} in thread · To: {selectedThread.to_email}
                </p>
              </div>

              {/* Thread Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedThread.emails.map((email, i) => (
                  <ThreadMessage
                    key={email.id}
                    email={email}
                    isLatest={i === selectedThread.emails.length - 1}
                  />
                ))}

                {/* AI Draft Response (if pending) */}
                {selectedThread.latestEmail.ai_draft_response && selectedThread.latestEmail.draft_status === 'pending' && (
                  <div className="bg-emerald-500/5 border border-[#3DAA8A]/25 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-[#3DAA8A]/20 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-[#3DAA8A]" />
                      </div>
                      <span className="text-xs font-semibold text-[#5BC4A0]">AI Draft Reply</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">Pending Review</span>
                    </div>
                    <p className="text-sm text-[#D0E4EC] whitespace-pre-wrap leading-relaxed mb-4">
                      {selectedThread.latestEmail.ai_draft_response}
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={approveDraft} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-xs font-medium transition-colors">
                        <Send className="w-3.5 h-3.5" /> Approve & Send
                      </button>
                      <button onClick={() => { setCustomReply(selectedThread.latestEmail.ai_draft_response || ''); setShowReplyComposer(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2D6A8F]/20 hover:bg-[#2D6A8F]/30 text-[#8AACBC] text-xs font-medium transition-colors">
                        <Eye className="w-3.5 h-3.5" /> Edit Before Sending
                      </button>
                      <button onClick={rejectDraft} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors">
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Reply Composer */}
              <div className="border-t border-[#2D6A8F]/15">
                {!showReplyComposer ? (
                  <div className="flex items-center gap-2 px-4 py-3">
                    <button
                      onClick={() => setShowReplyComposer(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2D6A8F]/20 hover:bg-[#2D6A8F]/30 text-[#D0E4EC] text-xs font-medium transition-colors"
                    >
                      <Reply className="w-3.5 h-3.5" /> Reply
                    </button>
                    <button
                      onClick={generateAIReply}
                      disabled={generatingReply}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3DAA8A]/15 hover:bg-[#3DAA8A]/25 text-[#3DAA8A] text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${generatingReply ? 'animate-pulse' : ''}`} />
                      {generatingReply ? 'Generating...' : 'AI Reply'}
                    </button>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#D0E4EC]">Compose Reply</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={generateAIReply}
                          disabled={generatingReply}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#3DAA8A]/15 hover:bg-[#3DAA8A]/25 text-[#3DAA8A] text-[11px] font-medium transition-colors disabled:opacity-50"
                        >
                          <Sparkles className={`w-3 h-3 ${generatingReply ? 'animate-pulse' : ''}`} />
                          {generatingReply ? 'Generating...' : 'AI Generate'}
                        </button>
                        <button onClick={() => { setShowReplyComposer(false); setCustomReply(''); }} className="text-[#6B8A9A] hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={replyInstructions}
                      onChange={e => setReplyInstructions(e.target.value)}
                      placeholder="AI instructions: e.g., be empathetic, mention refund policy..."
                      className="w-full px-3 py-1.5 bg-[#162D3A] border border-[#2D6A8F]/15 rounded-lg text-xs text-[#D0E4EC] placeholder:text-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]/30"
                    />
                    <textarea
                      value={customReply}
                      onChange={e => setCustomReply(e.target.value)}
                      placeholder="Type your reply or generate with AI..."
                      rows={4}
                      className="w-full px-3 py-2.5 bg-[#162D3A] border border-[#2D6A8F]/15 rounded-lg text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]/40 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#4A6E7F]">CommonGround signature auto-attached</span>
                      <button
                        onClick={sendReply}
                        disabled={sendingReply || !customReply.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <Send className={`w-4 h-4 ${sendingReply ? 'animate-pulse' : ''}`} />
                        {sendingReply ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-[#2D6A8F]/10 flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-[#3A5A6A]" />
              </div>
              <p className="text-[#6B8A9A] text-sm font-medium">Select a thread to view conversation</p>
              <p className="text-[#4A6E7F] text-xs mt-1">Messages are grouped by conversation thread</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
