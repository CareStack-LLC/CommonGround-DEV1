'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  RefreshCw, AlertTriangle, Search, Filter,
  ChevronLeft, ChevronRight, Radio,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AuditEvent {
  id: string;
  timestamp: string;
  event_type: string;
  user_email: string;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
}

interface AuditResponse {
  events: AuditEvent[];
  total: number;
  limit: number;
  offset: number;
}

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

const PAGE_SIZE = 50;

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

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`} />;
}

export default function PlatformAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  // Filters
  const [eventType, setEventType] = useState('all');
  const [emailSearch, setEmailSearch] = useState('');
  const [dateRange, setDateRange] = useState(30);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (currentPage?: number) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Not authenticated');

      const offset = (currentPage ?? page) * PAGE_SIZE;
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));
      params.set('days', String(dateRange));
      if (eventType !== 'all') params.set('event_type', eventType);
      if (emailSearch.trim()) params.set('user_email', emailSearch.trim());

      const res = await fetch(`${API_BASE}/api/v1/admin/platform-audit?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `API error ${res.status}`);
      }

      const json: AuditResponse = await res.json();
      setEvents(json.events || []);
      setTotal(json.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit events');
    } finally {
      setLoading(false);
    }
  }, [page, eventType, emailSearch, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        fetchData();
      }, 15000);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefresh, fetchData]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleFilterChange = () => {
    setPage(0);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-zinc-400 mb-4">{error}</p>
        <button onClick={() => fetchData()} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Platform Audit</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Platform-wide event feed</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
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
            onClick={() => fetchData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Event Type Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={eventType}
              onChange={(e) => { setEventType(e.target.value); handleFilterChange(); }}
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
              value={emailSearch}
              onChange={(e) => { setEmailSearch(e.target.value); handleFilterChange(); }}
              className="flex-1 bg-zinc-800/80 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            />
          </div>

          {/* Date Range */}
          <div className="flex bg-zinc-800/80 border border-zinc-700/60 rounded-lg p-0.5">
            {DATE_RANGES.map(r => (
              <button
                key={r.days}
                onClick={() => { setDateRange(r.days); handleFilterChange(); }}
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

      {/* Events Table */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : events.length > 0 ? (
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
                {events.map((event) => (
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
                        {event.event_type.replace(/_/g, ' ')}
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800/60">
            <span className="text-xs text-zinc-500">
              Showing {page * PAGE_SIZE + 1}--{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()} events
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-zinc-500 px-2">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
