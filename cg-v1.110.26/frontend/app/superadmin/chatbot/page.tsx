'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  MessageCircle, Users, TrendingUp, AlertTriangle,
  Mail, Search, ChevronLeft, RefreshCw, X,
} from 'lucide-react';
import {
  adminAPI,
  type ChatbotSessionListItem,
  type ChatbotSessionDetail,
  type ChatbotAdminStats,
} from '@/lib/admin-api';

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: any; color: string;
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-zinc-400 text-xs">{label}</p>
          <p className="text-zinc-100 text-xl font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    closed: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    escalated: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.closed}`}>
      {status}
    </span>
  );
}

export default function ChatbotAdminPage() {
  const [stats, setStats] = useState<ChatbotAdminStats | null>(null);
  const [sessions, setSessions] = useState<ChatbotSessionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail panel
  const [selectedSession, setSelectedSession] = useState<ChatbotSessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  const perPage = 25;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, sessionsRes] = await Promise.all([
        adminAPI.getChatbotStats(),
        adminAPI.getChatbotSessions({
          status: statusFilter || undefined,
          search: searchQuery || undefined,
          page,
          per_page: perPage,
        }),
      ]);

      setStats(statsRes);
      setSessions(sessionsRes.sessions);
      setTotal(sessionsRes.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load chatbot data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDetail = async (sessionId: string) => {
    try {
      setDetailLoading(true);
      const detail = await adminAPI.getChatbotSession(sessionId);
      setSelectedSession(detail);
    } catch (err: any) {
      setError(err.message || 'Failed to load session');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEmailTranscript = async () => {
    if (!selectedSession) return;
    try {
      setEmailSending(true);
      await adminAPI.emailChatbotTranscript(selectedSession.id);
      setSelectedSession({ ...selectedSession, transcript_emailed: true });
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setEmailSending(false);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Chatbot Conversations</h1>
          <p className="text-zinc-400 text-sm mt-1">Aria customer success chatbot transcripts</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Sessions" value={stats.total_sessions} icon={MessageCircle} color="bg-emerald-500/10 text-emerald-400" />
          <StatCard label="Active Today" value={stats.active_today} icon={TrendingUp} color="bg-blue-500/10 text-blue-400" />
          <StatCard label="Avg Messages" value={stats.avg_messages_per_session} icon={MessageCircle} color="bg-purple-500/10 text-purple-400" />
          <StatCard label="Escalation Rate" value={`${stats.escalation_rate}%`} icon={AlertTriangle} color="bg-amber-500/10 text-amber-400" />
          <StatCard label="Unique Visitors" value={stats.total_visitors} icon={Users} color="bg-zinc-500/10 text-zinc-400" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-600"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-sm outline-none focus:border-zinc-600"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="escalated">Escalated</option>
        </select>
      </div>

      {/* Sessions Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="text-left px-4 py-3 font-medium">Visitor</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Messages</th>
                <th className="text-left px-4 py-3 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {loading && sessions.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-4 bg-zinc-800/60 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    No chatbot conversations yet.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => openDetail(s.id)}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-zinc-200">{s.visitor_name || 'Anonymous'}</td>
                    <td className="px-4 py-3 text-zinc-400">{s.visitor_email || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-zinc-300">{s.message_count}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatDate(s.started_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <p className="text-zinc-500 text-xs">{total} total sessions</p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded bg-zinc-800 text-zinc-300 text-xs disabled:opacity-40 hover:bg-zinc-700"
              >
                Previous
              </button>
              <span className="text-zinc-500 text-xs flex items-center">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded bg-zinc-800 text-zinc-300 text-xs disabled:opacity-40 hover:bg-zinc-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Slide-over Panel */}
      {(selectedSession || detailLoading) && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedSession(null)}
          />
          {/* Panel */}
          <div className="relative w-full max-w-lg bg-zinc-950 border-l border-zinc-800 overflow-y-auto animate-in slide-in-from-right duration-300">
            {detailLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-8 bg-zinc-800/60 rounded animate-pulse" />
                ))}
              </div>
            ) : selectedSession ? (
              <>
                {/* Panel Header */}
                <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-5 py-4 flex items-center justify-between z-10">
                  <div>
                    <h2 className="text-zinc-100 font-semibold text-lg">
                      {selectedSession.visitor.name || 'Anonymous'}
                    </h2>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      {selectedSession.visitor.email || 'No email'} &middot; <StatusBadge status={selectedSession.status} />
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Visitor Info */}
                <div className="px-5 py-4 border-b border-zinc-800 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Phone</span>
                    <span className="text-zinc-300">{selectedSession.visitor.phone || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Source Page</span>
                    <span className="text-zinc-300 text-right truncate max-w-[200px]">{selectedSession.visitor.source_page || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Started</span>
                    <span className="text-zinc-300">{formatDate(selectedSession.started_at)} {formatTime(selectedSession.started_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Messages</span>
                    <span className="text-zinc-300">{selectedSession.message_count}</span>
                  </div>
                  {selectedSession.escalation_reason && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-2">
                      <p className="text-amber-400 text-xs font-medium">Escalation Reason</p>
                      <p className="text-zinc-300 text-sm mt-1">{selectedSession.escalation_reason}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-5 py-3 border-b border-zinc-800 flex gap-2">
                  <button
                    onClick={handleEmailTranscript}
                    disabled={emailSending || selectedSession.transcript_emailed}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm disabled:opacity-50 transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {selectedSession.transcript_emailed ? 'Emailed' : emailSending ? 'Sending...' : 'Email Transcript'}
                  </button>
                </div>

                {/* Messages */}
                <div className="px-5 py-4 space-y-3">
                  <h3 className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Conversation</h3>
                  {selectedSession.messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                          msg.role === 'user'
                            ? 'bg-emerald-600/20 text-emerald-200'
                            : msg.role === 'system'
                            ? 'bg-zinc-800/50 text-zinc-500 text-xs text-center w-full'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className="text-zinc-600 text-[10px] mt-1">{formatTime(msg.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
