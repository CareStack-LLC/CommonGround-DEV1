'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ScrollText, Clock, ChevronLeft, ChevronRight, Filter,
  Search, User as UserIcon,
} from 'lucide-react';
import { adminAPI, type AuditLogEntry } from '@/lib/admin-api';

const ACTION_FILTERS = [
  { value: '', label: 'All Actions' },
  { value: 'view_dashboard', label: 'Dashboard Views' },
  { value: 'search_users', label: 'User Searches' },
  { value: 'view_user', label: 'User Views' },
  { value: 'update_user_status', label: 'Status Changes' },
  { value: 'view_billing', label: 'Billing Views' },
  { value: 'view_growth', label: 'Growth Stats' },
  { value: 'view_engagement', label: 'Engagement Stats' },
  { value: 'report_', label: 'Report Actions' },
  { value: 'download_report', label: 'Report Downloads' },
  { value: 'sync_stripe', label: 'Stripe Sync' },
  { value: 'view_health', label: 'Health Checks' },
];

const ACTION_COLORS: Record<string, string> = {
  'admin:view_dashboard': 'bg-violet-500/15 text-violet-400',
  'admin:search_users': 'bg-blue-500/15 text-blue-400',
  'admin:view_user': 'bg-blue-500/15 text-blue-400',
  'admin:update_user_status': 'bg-amber-500/15 text-amber-400',
  'admin:view_billing': 'bg-emerald-500/15 text-emerald-400',
  'admin:view_growth_stats': 'bg-indigo-500/15 text-indigo-400',
  'admin:view_engagement_stats': 'bg-indigo-500/15 text-indigo-400',
  'admin:sync_stripe_customers': 'bg-cyan-500/15 text-cyan-400',
  'admin:sync_stripe_subscriptions': 'bg-cyan-500/15 text-cyan-400',
  'admin:download_report': 'bg-emerald-500/15 text-emerald-400',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function formatAction(action: string): string {
  return action
    .replace('admin:', '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [page, setPage] = useState(0);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await adminAPI.getAuditLog({
        action: actionFilter || undefined,
        admin_email: emailFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setLogs(result.logs);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to load audit log:', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, emailFilter, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(0); }, [actionFilter, emailFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Audit Log</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{total.toLocaleString()} admin actions recorded</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
        >
          {ACTION_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <div className="relative flex-1">
          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter by admin email..."
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Time</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Action</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Admin</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Target</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden xl:table-cell">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="animate-pulse bg-zinc-800/60 rounded h-6" /></td></tr>
                ))
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-zinc-500">No audit log entries found.</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Clock className="w-3 h-3" />
                      {formatDate(log.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      ACTION_COLORS[log.action] || 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {formatAction(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-zinc-400">{log.user_email || '—'}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-zinc-500">
                      {log.resource_type}
                      {log.resource_id && <span className="ml-1 text-zinc-600 font-mono">{log.resource_id.slice(0, 8)}</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <span className="text-xs text-zinc-600 truncate max-w-xs block">{log.description || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800/60">
            <span className="text-xs text-zinc-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button disabled={page === 0} onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg hover:bg-zinc-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-zinc-400 px-2">{page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg hover:bg-zinc-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
