'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ScrollText, Clock, ChevronLeft, ChevronRight, Filter,
  Search, User as UserIcon, RefreshCw, AlertTriangle, Radio,
} from 'lucide-react';
import { adminAPI, type AuditLogEntry, type AuditEvent } from '@/lib/admin-api';

// --- Admin Actions constants ---

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

// --- Platform Events constants ---

const EVENT_BADGE_COLORS: Record<string, string> = {
  message_sent: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  exchange_created: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  report_generated: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  agreement_signed: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  payment_made: 'bg-green-500/15 text-green-400 border-green-500/20',
  call_started: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  aria_intervention: 'bg-red-500/15 text-red-400 border-red-500/20',
};

const DEFAULT_BADGE = 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20';

const DATE_RANGES = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
];

const EVENT_TYPES = [
  'all',
  'message_sent',
  'exchange_created',
  'report_generated',
  'agreement_signed',
  'payment_made',
  'call_started',
  'aria_intervention',
];

// --- Helpers ---

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
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

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`} />;
}

const PAGE_SIZE = 50;

type ActiveTab = 'admin' | 'platform';

export default function ActivityLogPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('admin');

  // --- Admin Actions state ---
  const [adminLogs, setAdminLogs] = useState<AuditLogEntry[]>([]);
  const [adminTotal, setAdminTotal] = useState(0);
  const [adminLoading, setAdminLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [adminEmailFilter, setAdminEmailFilter] = useState('');
  const [adminPage, setAdminPage] = useState(0);

  // --- Platform Events state ---
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [platformTotal, setPlatformTotal] = useState(0);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [platformError, setPlatformError] = useState<string | null>(null);
  const [platformPage, setPlatformPage] = useState(0);
  const [eventType, setEventType] = useState('all');
  const [platformEmailSearch, setPlatformEmailSearch] = useState('');
  const [dateRange, setDateRange] = useState(30);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const [platformLoaded, setPlatformLoaded] = useState(false);

  // --- Admin Actions fetch ---
  const fetchAdminLogs = useCallback(async () => {
    try {
      setAdminLoading(true);
      const result = await adminAPI.getAuditLog({
        action: actionFilter || undefined,
        admin_email: adminEmailFilter || undefined,
        limit: PAGE_SIZE,
        offset: adminPage * PAGE_SIZE,
      });
      setAdminLogs(result.logs);
      setAdminTotal(result.total);
    } catch (err) {
      console.error('Failed to load audit log:', err);
    } finally {
      setAdminLoading(false);
    }
  }, [actionFilter, adminEmailFilter, adminPage]);

  useEffect(() => { fetchAdminLogs(); }, [fetchAdminLogs]);
  useEffect(() => { setAdminPage(0); }, [actionFilter, adminEmailFilter]);

  // --- Platform Events fetch ---
  const fetchPlatformEvents = useCallback(async (currentPage?: number) => {
    try {
      setPlatformLoading(true);
      setPlatformError(null);

      const offset = (currentPage ?? platformPage) * PAGE_SIZE;
      const result = await adminAPI.getPlatformAudit({
        limit: PAGE_SIZE,
        offset,
        days: dateRange,
        event_type: eventType !== 'all' ? eventType : undefined,
        user_email: platformEmailSearch.trim() || undefined,
      });

      setEvents(result.events || []);
      setPlatformTotal(result.total || 0);
    } catch (err: unknown) {
      setPlatformError(err instanceof Error ? err.message : 'Failed to load audit events');
    } finally {
      setPlatformLoading(false);
    }
  }, [platformPage, eventType, platformEmailSearch, dateRange]);

  // Load platform data when tab is first switched to
  useEffect(() => {
    if (activeTab === 'platform' && !platformLoaded) {
      setPlatformLoaded(true);
      fetchPlatformEvents();
    }
  }, [activeTab, platformLoaded, fetchPlatformEvents]);

  // Refetch platform data on filter/page changes (only if already loaded)
  useEffect(() => {
    if (platformLoaded) {
      fetchPlatformEvents();
    }
  }, [fetchPlatformEvents, platformLoaded]);

  // Auto-refresh for platform events
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        fetchPlatformEvents();
      }, 15000);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefresh, fetchPlatformEvents]);

  const handlePlatformFilterChange = () => {
    setPlatformPage(0);
  };

  const adminTotalPages = Math.ceil(adminTotal / PAGE_SIZE);
  const platformTotalPages = Math.ceil(platformTotal / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Activity Log</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {activeTab === 'admin'
            ? `${adminTotal.toLocaleString()} admin actions recorded`
            : `Platform-wide event feed`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('admin')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'admin'
              ? 'bg-violet-500/15 text-violet-300'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <ScrollText className="w-4 h-4" />
          Admin Actions
        </button>
        <button
          onClick={() => setActiveTab('platform')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'platform'
              ? 'bg-violet-500/15 text-violet-300'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Radio className="w-4 h-4" />
          Platform Events
        </button>
      </div>

      {/* ========== Admin Actions Tab ========== */}
      {activeTab === 'admin' && (
        <>
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
                value={adminEmailFilter}
                onChange={(e) => setAdminEmailFilter(e.target.value)}
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
                  {adminLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="animate-pulse bg-zinc-800/60 rounded h-6" /></td></tr>
                    ))
                  ) : adminLogs?.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-zinc-500">No audit log entries found.</td></tr>
                  ) : adminLogs?.map((log) => (
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
                        <span className="text-xs text-zinc-400">{log.user_email || '\u2014'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-zinc-500">
                          {log.resource_type}
                          {log.resource_id && <span className="ml-1 text-zinc-600 font-mono">{log.resource_id.slice(0, 8)}</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className="text-xs text-zinc-600 truncate max-w-xs block">{log.description || '\u2014'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {adminTotal > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800/60">
                <span className="text-xs text-zinc-500">
                  {adminPage * PAGE_SIZE + 1}&ndash;{Math.min((adminPage + 1) * PAGE_SIZE, adminTotal)} of {adminTotal}
                </span>
                <div className="flex items-center gap-1">
                  <button aria-label="Previous" disabled={adminPage === 0} onClick={() => setAdminPage(adminPage - 1)}
                    className="p-1.5 rounded-lg hover:bg-zinc-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-zinc-400 px-2">{adminPage + 1} / {adminTotalPages}</span>
                  <button aria-label="Next" disabled={adminPage >= adminTotalPages - 1} onClick={() => setAdminPage(adminPage + 1)}
                    className="p-1.5 rounded-lg hover:bg-zinc-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========== Platform Events Tab ========== */}
      {activeTab === 'platform' && (
        <>
          {/* Header controls */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                autoRefresh
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Radio className={`w-3 h-3 ${autoRefresh ? 'animate-pulse' : ''}`} />
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh'}
            </button>
            <button
              onClick={() => fetchPlatformEvents()}
              disabled={platformLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${platformLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Event Type Dropdown */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-zinc-500" />
                <select
                  value={eventType}
                  onChange={(e) => { setEventType(e.target.value); handlePlatformFilterChange(); }}
                  className="bg-zinc-800/80 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-500/50 appearance-none cursor-pointer"
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t} value={t}>{t === 'all' ? 'All Events' : t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Email Search */}
              <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by email..."
                  value={platformEmailSearch}
                  onChange={(e) => { setPlatformEmailSearch(e.target.value); handlePlatformFilterChange(); }}
                  className="flex-1 bg-zinc-800/80 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                />
              </div>

              {/* Date Range */}
              <div className="flex bg-zinc-800/80 border border-zinc-700/60 rounded-lg p-0.5">
                {DATE_RANGES.map(r => (
                  <button
                    key={r.days}
                    onClick={() => { setDateRange(r.days); handlePlatformFilterChange(); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      dateRange === r.days ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error state */}
          {platformError && (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
              <p className="text-zinc-400 mb-4">{platformError}</p>
              <button onClick={() => fetchPlatformEvents()} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
                Retry
              </button>
            </div>
          )}

          {/* Events Table */}
          {!platformError && (
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
              {platformLoading ? (
                <div className="p-5 space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : events?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800/60 bg-zinc-900/80">
                        <th className="text-left text-xs text-zinc-500 font-medium py-3 px-4">Timestamp</th>
                        <th className="text-left text-xs text-zinc-500 font-medium py-3 px-4">Event Type</th>
                        <th className="text-left text-xs text-zinc-500 font-medium py-3 px-4">User</th>
                        <th className="text-left text-xs text-zinc-500 font-medium py-3 px-4">Target ID</th>
                        <th className="text-left text-xs text-zinc-500 font-medium py-3 px-4">Metadata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events?.map((event) => (
                        <tr key={event.id} className="border-b border-zinc-800/30 last:border-0 hover:bg-zinc-800/20 transition-colors">
                          <td className="py-2.5 px-4 text-xs text-zinc-500 whitespace-nowrap">
                            {new Date(event.timestamp).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
                            })}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              EVENT_BADGE_COLORS[event.event_type] || DEFAULT_BADGE
                            }`}>
                              {event.event_type?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-xs text-zinc-300 font-mono">{event.user_email || '---'}</td>
                          <td className="py-2.5 px-4 text-xs text-zinc-500 font-mono truncate max-w-[140px]">
                            {event.target_id || '---'}
                          </td>
                          <td className="py-2.5 px-4 text-xs text-zinc-600 truncate max-w-[200px]">
                            {event.metadata ? JSON.stringify(event.metadata) : '---'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <Filter className="w-8 h-8 text-zinc-700 mb-3" />
                  <p className="text-zinc-500 text-sm">No events found matching your filters</p>
                </div>
              )}

              {/* Pagination */}
              {platformTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800/60">
                  <span className="text-xs text-zinc-500">
                    Showing {platformPage * PAGE_SIZE + 1}--{Math.min((platformPage + 1) * PAGE_SIZE, platformTotal)} of {platformTotal.toLocaleString()} events
                  </span>
                  <div className="flex items-center gap-1">
                    <button aria-label="Previous"
                      onClick={() => setPlatformPage(Math.max(0, platformPage - 1))}
                      disabled={platformPage === 0}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-zinc-500 px-2">
                      Page {platformPage + 1} of {platformTotalPages}
                    </span>
                    <button aria-label="Next"
                      onClick={() => setPlatformPage(Math.min(platformTotalPages - 1, platformPage + 1))}
                      disabled={platformPage >= platformTotalPages - 1}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
