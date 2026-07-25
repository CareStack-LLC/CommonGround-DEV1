'use client';

/**
 * Impersonation audit viewer.
 *
 * Lists every "View as user" session with:
 *   - who impersonated whom
 *   - when it started / ended / how long
 *   - a button to force-end any still-open session
 *
 * Every admin action inside an impersonation session is already written to
 * the AuditLog with action="admin:impersonate_*" — this page surfaces the
 * session index; drill-down opens the detail user page for further audit.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, CheckCircle2, Clock, Loader2,
  ChevronLeft, ChevronRight, ExternalLink, XCircle, RefreshCw,
} from 'lucide-react';
import { adminAPI } from '@/lib/admin-api';
import { PageHeader, ErrorState, UserHoverCard } from '@/components/superadmin';

interface Session {
  id: string;
  superadmin_id: string;
  superadmin_email: string | null;
  target_user_id: string;
  target_email: string | null;
  started_at: string | null;
  ended_at: string | null;
  end_reason: string | null;
  duration_seconds: number | null;
  action_count: number;
  ip_address: string | null;
  reason: string | null;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '\u2014';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ${seconds % 60}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ImpersonationAuditPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [openOnly, setOpenOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endingId, setEndingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.listImpersonationSessions({
        page,
        page_size: pageSize,
        open_only: openOnly,
      });
      setSessions(result.sessions);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, openOnly]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleEndSession = async (sessionId: string) => {
    if (!confirm('Force-end this impersonation session? The user holding the token will need to re-authenticate.')) return;
    setEndingId(sessionId);
    try {
      await adminAPI.endImpersonation(sessionId, 'admin_ended');
      await fetchSessions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to end session');
    } finally {
      setEndingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const openCount = sessions.filter((s) => !s.ended_at).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Impersonation Audit"
        subtitle="Every 'View as user' session is logged here. Force-end open sessions from this page."
        onRefresh={fetchSessions}
        loading={loading}
      />

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(e) => { setOpenOnly(e.target.checked); setPage(1); }}
              className="rounded border-cg-slate/40 bg-zinc-900/80 text-cg-sage focus:ring-cg-sage/30"
            />
            <span className="text-sm text-[#D0E4EC]">Only show open sessions</span>
          </label>
          {openOnly && openCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <AlertTriangle className="w-3 h-3" />
              {openCount} open
            </span>
          )}
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-white border border-cg-slate/30 hover:border-cg-slate/60 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && <ErrorState message={error} onRetry={fetchSessions} />}

      {/* Table */}
      {!error && (
        <div className="bg-[#1A3648]/60 border border-cg-slate/20 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cg-slate/20">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">State</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Superadmin</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Target</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Started</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Ended</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">IP</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cg-slate/10">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="px-4 py-3">
                        <div className="animate-pulse bg-cg-slate/20 rounded h-8" />
                      </td>
                    </tr>
                  ))
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      {openOnly
                        ? 'No open impersonation sessions.'
                        : 'No impersonation sessions yet.'}
                    </td>
                  </tr>
                ) : sessions.map((s) => {
                  const isOpen = !s.ended_at;
                  return (
                    <tr key={s.id} className={isOpen ? 'bg-amber-500/5' : ''}>
                      <td className="px-4 py-3">
                        {isOpen ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            Open
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Closed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[#D0E4EC] font-medium">{s.superadmin_email || s.superadmin_id.slice(0, 8)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <UserHoverCard userId={s.target_user_id}>
                          <Link
                            href={`/superadmin/users/${s.target_user_id}`}
                            className="inline-flex items-center gap-1 text-cg-sage hover:text-cg-sage-light transition-colors"
                          >
                            {s.target_email || s.target_user_id.slice(0, 8)}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </UserHoverCard>
                      </td>
                      <td className="px-4 py-3 text-[#8AACBC] text-xs">{formatTime(s.started_at)}</td>
                      <td className="px-4 py-3 text-[#8AACBC] text-xs">
                        {s.ended_at ? formatTime(s.ended_at) : '\u2014'}
                        {s.end_reason && <span className="block text-[10px] opacity-75">{s.end_reason.replace(/_/g, ' ')}</span>}
                      </td>
                      <td className="px-4 py-3 text-[#D0E4EC] text-xs">{formatDuration(s.duration_seconds)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{s.ip_address || '\u2014'}</td>
                      <td className="px-4 py-3 text-right">
                        {isOpen && (
                          <button
                            onClick={() => handleEndSession(s.id)}
                            disabled={endingId === s.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            {endingId === s.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <XCircle className="w-3 h-3" />}
                            End
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-cg-slate/20">
              <span className="text-xs text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}\u2013{Math.min(page * pageSize, total)} of {total}
              </span>
              <div className="flex items-center gap-1">
                <button aria-label="Previous"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded text-[#8AACBC] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-[#D0E4EC] px-2">{page} / {totalPages}</span>
                <button aria-label="Next"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded text-[#8AACBC] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
