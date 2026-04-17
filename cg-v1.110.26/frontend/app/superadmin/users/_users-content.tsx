'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Search, ChevronLeft, ChevronRight, Shield,
  ArrowUpDown, Eye, UserPlus, UserCheck, UserX, Briefcase,
  TrendingUp, PieChart as PieChartIcon,
  CheckSquare, Square, UserCog, Loader2, AlertTriangle, X,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { adminAPI, type AdminUser, type UserSearchResult } from '@/lib/admin-api';
import { ExportCsvButton } from '@/components/superadmin';

const TIERS = [
  { value: '', label: 'All tiers' },
  { value: 'web_starter', label: 'Web Starter' },
  { value: 'plus', label: 'Plus' },
  { value: 'complete', label: 'Complete' },
  { value: 'professional_starter', label: 'Starter (Pro)' },
  { value: 'solo', label: 'Solo (Pro)' },
  { value: 'small_firm', label: 'Small Firm (Pro)' },
  { value: 'mid_size', label: 'Mid Size (Pro)' },
];

const TIER_COLORS: Record<string, string> = {
  web_starter: 'bg-zinc-700/50 text-[#8AACBC]',
  plus: 'bg-blue-500/15 text-blue-400 border border-[#2D6A8F]/20',
  complete: 'bg-[#3DAA8A]/15 text-[#3DAA8A] border border-[#3DAA8A]/20',
  professional_starter: 'bg-teal-500/15 text-teal-400 border border-teal-500/20',
  solo: 'bg-emerald-500/15 text-emerald-400 border border-[#3DAA8A]/20',
  small_firm: 'bg-amber-500/15 text-amber-400 border border-[#F5A623]/20',
  mid_size: 'bg-rose-500/15 text-rose-400 border border-rose-500/20',
  none: 'bg-zinc-800 text-[#6B8A9A]',
};

const PIE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#14b8a6', '#f59e0b', '#ec4899', '#ef4444', '#71717a'];

const PAGE_SIZE = 25;

interface UserSummary {
  total_active: number;
  total_inactive: number;
  professionals: number;
  new_7d: number;
  new_30d: number;
  tier_breakdown: Record<string, number>;
}

interface ExtendedSearchResult extends UserSearchResult {
  summary?: UserSummary | null;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

const CustomTooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid rgba(63,63,70,0.6)',
  borderRadius: '8px',
  color: '#e4e4e7',
  fontSize: '12px',
};

export default function UsersContent() {
  const router = useRouter();
  const [data, setData] = useState<ExtendedSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  // --- Bulk selection state ---
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'suspend' | 'reactivate' | 'tier' | null>(null);
  const [bulkTierChoice, setBulkTierChoice] = useState('plus');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResult, setBulkResult] = useState<
    | { succeeded: number; failed: number; failures: Array<{ user_id: string; error: string }> }
    | null
  >(null);

  // --- Impersonation state (for "View as") ---
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const toggleSelect = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data?.users) return;
    setSelected((prev) => {
      const pageIds = data.users.map((u) => u.id);
      const allSelected = pageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const runBulkAction = async () => {
    if (!bulkAction || selected.size === 0) return;
    const reason = bulkReason.trim();
    if (!reason || reason.length < 3) {
      setBulkResult({ succeeded: 0, failed: selected.size, failures: [{ user_id: '-', error: 'Reason (min 3 chars) required' }] });
      return;
    }
    setBulkRunning(true);
    setBulkResult(null);
    try {
      const userIds = Array.from(selected);
      let result;
      if (bulkAction === 'suspend') {
        result = await adminAPI.bulkUserAction({
          user_ids: userIds,
          action: 'status',
          params: { is_active: false, reason },
        });
      } else if (bulkAction === 'reactivate') {
        result = await adminAPI.bulkUserAction({
          user_ids: userIds,
          action: 'status',
          params: { is_active: true, reason },
        });
      } else {
        // tier
        result = await adminAPI.bulkUserAction({
          user_ids: userIds,
          action: 'tier',
          params: { subscription_tier: bulkTierChoice, reason },
        });
      }
      setBulkResult({
        succeeded: result.succeeded,
        failed: result.failed,
        failures: result.failures,
      });
      // Clear selection on success and refetch list
      if (result.succeeded > 0) {
        clearSelection();
        await fetchUsers();
      }
    } catch (err) {
      setBulkResult({
        succeeded: 0,
        failed: selected.size,
        failures: [{ user_id: '-', error: err instanceof Error ? err.message : 'Bulk action failed' }],
      });
    } finally {
      setBulkRunning(false);
    }
  };

  const closeBulkModal = () => {
    setBulkAction(null);
    setBulkReason('');
    setBulkResult(null);
  };

  const startImpersonation = async (userId: string, email: string) => {
    if (!confirm(`View the app as ${email}?\n\nThe session is audit-logged and expires after 30 minutes.`)) return;
    setImpersonating(userId);
    try {
      const result = await adminAPI.startImpersonation(userId, 'Superadmin viewing user account for support/debug');
      // Swap out the admin's token for the impersonation token. localStorage key
      // matches `getAuthToken` in admin-api.ts (access_token).
      const prevToken = localStorage.getItem('access_token');
      if (prevToken) {
        localStorage.setItem('admin_original_token', prevToken);
      }
      localStorage.setItem('access_token', result.access_token);
      localStorage.setItem('impersonation_session_id', result.session_id);
      alert(
        `Now viewing as ${result.target_email}.\n\nSession expires in ${result.expires_in_minutes} minutes.\n\nClick "End impersonation" from the profile menu (or /superadmin/audit/impersonation → End) to return to your admin session.`,
      );
      // Redirect to the target user's dashboard
      router.push('/dashboard');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start impersonation');
    } finally {
      setImpersonating(null);
    }
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await adminAPI.searchUsers({
        q: query || undefined,
        tier: tier || undefined,
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setData(result as ExtendedSearchResult);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [query, tier, statusFilter, page, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  useEffect(() => { setPage(0); }, [query, tier, statusFilter, sortBy, sortOrder]);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const summary = data?.summary;

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const tierPieData = summary?.tier_breakdown
    ? Object.entries(summary.tier_breakdown)
        .filter(([, v]) => v > 0)
        .map(([tier, count]) => ({
          name: tier.replace(/_/g, ' '),
          value: count,
        }))
    : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">User Management</h1>
        <p className="text-sm text-[#6B8A9A] mt-0.5">{data ? `${(data.total ?? 0).toLocaleString()} total users` : 'Loading...'}</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <SummaryCard icon={UserCheck} label="Active Users" value={summary.total_active.toLocaleString()} color="emerald" />
          <SummaryCard icon={UserX} label="Inactive" value={summary.total_inactive.toLocaleString()} color="red" />
          <SummaryCard icon={Briefcase} label="Professionals" value={summary.professionals.toLocaleString()} color="violet" />
          <SummaryCard icon={UserPlus} label="New (7d)" value={summary.new_7d.toLocaleString()} color="blue" />
          <SummaryCard icon={TrendingUp} label="New (30d)" value={summary.new_30d.toLocaleString()} color="teal" />
        </div>
      )}

      {/* Tier Breakdown Chart */}
      {tierPieData.length > 0 && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-4 h-4 text-[#3DAA8A]" />
            <h2 className="text-sm font-semibold text-[#D0E4EC]">Subscription Tier Distribution</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={tierPieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                stroke="none"
              >
                {tierPieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={CustomTooltipStyle} />
              <Legend
                verticalAlign="middle"
                align="right"
                layout="vertical"
                formatter={(value: any) => <span className="text-[#8AACBC] text-xs capitalize">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B8A9A]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/80 border border-[#2D6A8F]/20 rounded-lg text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="px-3 py-2.5 bg-zinc-900/80 border border-[#2D6A8F]/20 rounded-lg text-sm text-[#D0E4EC] focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
          >
            {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-zinc-900/80 border border-[#2D6A8F]/20 rounded-lg text-sm text-[#D0E4EC] focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ExportCsvButton
            endpoint="/admin/users/export.csv"
            filenameHint="users"
            filters={{
              search: query || undefined,
              tier: tier || undefined,
              is_active:
                statusFilter === 'all'
                  ? undefined
                  : statusFilter === 'active'
                    ? 'true'
                    : 'false',
            }}
          />
        </div>
      </div>

      {/* Bulk action toolbar — visible when 1+ rows are selected */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#3DAA8A]/10 border border-[#3DAA8A]/30 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-4 h-4 text-[#3DAA8A]" />
            <span className="text-sm text-white font-medium">
              {selected.size} user{selected.size === 1 ? '' : 's'} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-[#8AACBC] hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkAction('suspend')}
              className="px-3 py-1.5 text-xs font-medium rounded border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors"
            >
              <UserX className="w-3 h-3 inline mr-1" />
              Suspend
            </button>
            <button
              onClick={() => setBulkAction('reactivate')}
              className="px-3 py-1.5 text-xs font-medium rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
            >
              <UserCheck className="w-3 h-3 inline mr-1" />
              Reactivate
            </button>
            <button
              onClick={() => setBulkAction('tier')}
              className="px-3 py-1.5 text-xs font-medium rounded border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-colors"
            >
              <UserCog className="w-3 h-3 inline mr-1" />
              Change Tier
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2D6A8F]/20">
                <th className="w-10 px-4 py-3">
                  <button
                    onClick={toggleSelectAll}
                    className="text-[#6B8A9A] hover:text-[#3DAA8A] transition-colors"
                    title="Select all on this page"
                  >
                    {(data?.users && data.users.length > 0 && data.users.every(u => selected.has(u.id)))
                      ? <CheckSquare className="w-4 h-4 text-[#3DAA8A]" />
                      : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider">
                  <button onClick={() => toggleSort('first_name')} className="flex items-center gap-1 hover:text-[#D0E4EC] transition-colors">
                    User <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider">Tier</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider hidden lg:table-cell">
                  <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-[#D0E4EC] transition-colors">
                    Joined <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider hidden md:table-cell">
                  <button onClick={() => toggleSort('last_active')} className="flex items-center gap-1 hover:text-[#D0E4EC] transition-colors">
                    Last Active <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3"><div className="animate-pulse bg-[#2D6A8F]/20 rounded h-8" /></td>
                  </tr>
                ))
              ) : data?.users?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#6B8A9A]">No users found matching your criteria.</td>
                </tr>
              ) : data?.users?.map((user) => (
                <tr
                  key={user.id}
                  className={`transition-colors ${selected.has(user.id) ? 'bg-[#3DAA8A]/5' : 'hover:bg-[#2D6A8F]/10'}`}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(user.id); }}
                      className="text-[#6B8A9A] hover:text-[#3DAA8A] transition-colors"
                      disabled={user.is_admin}
                      title={user.is_admin ? 'Cannot bulk-select admin users' : 'Select'}
                    >
                      {selected.has(user.id)
                        ? <CheckSquare className="w-4 h-4 text-[#3DAA8A]" />
                        : <Square className={`w-4 h-4 ${user.is_admin ? 'opacity-30' : ''}`} />}
                    </button>
                  </td>
                  <td
                    className="px-4 py-3 cursor-pointer"
                    onClick={() => router.push(`/superadmin/users/${user.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-[#8AACBC]">
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate flex items-center gap-1.5">
                          {user.first_name} {user.last_name}
                          {user.is_admin && <Shield className="w-3 h-3 text-[#3DAA8A]" />}
                        </div>
                        <div className="text-xs text-[#6B8A9A] truncate">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td
                    className="px-4 py-3 cursor-pointer"
                    onClick={() => router.push(`/superadmin/users/${user.id}`)}
                  >
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${TIER_COLORS[user.subscription_tier || ''] || 'bg-zinc-800 text-[#6B8A9A]'}`}>
                      {(user.subscription_tier || 'free').replace('_', ' ')}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 hidden lg:table-cell text-[#6B8A9A] text-xs cursor-pointer"
                    onClick={() => router.push(`/superadmin/users/${user.id}`)}
                  >
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '\u2014'}
                  </td>
                  <td
                    className="px-4 py-3 hidden md:table-cell text-[#6B8A9A] text-xs cursor-pointer"
                    onClick={() => router.push(`/superadmin/users/${user.id}`)}
                  >
                    {timeAgo(user.last_active)}
                  </td>
                  <td
                    className="px-4 py-3 cursor-pointer"
                    onClick={() => router.push(`/superadmin/users/${user.id}`)}
                  >
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      user.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {!user.is_admin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); startImpersonation(user.id, user.email); }}
                          disabled={impersonating === user.id}
                          title="View the app as this user (audit-logged)"
                          className="p-1.5 rounded text-[#8AACBC] hover:bg-[#3DAA8A]/20 hover:text-[#3DAA8A] transition-colors disabled:opacity-50"
                        >
                          {impersonating === user.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <UserCog className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/superadmin/users/${user.id}`)}
                        title="Open detail"
                        className="p-1.5 rounded text-[#4A6E7F] hover:bg-[#2D6A8F]/30 hover:text-[#D0E4EC] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#2D6A8F]/20">
            <span className="text-xs text-[#6B8A9A]">
              Showing {page * PAGE_SIZE + 1}\u2013{Math.min((page + 1) * PAGE_SIZE, data.total)} of {data.total}
            </span>
            <div className="flex items-center gap-1">
              <button disabled={page === 0} onClick={() => setPage(page - 1)} className="p-1.5 rounded-lg hover:bg-[#2D6A8F]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-[#8AACBC] px-2">{page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="p-1.5 rounded-lg hover:bg-[#2D6A8F]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk action confirmation modal */}
      {bulkAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeBulkModal}
        >
          <div
            className="bg-[#0F2533] border border-[#2D6A8F]/30 rounded-xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-semibold text-white">
                {bulkAction === 'suspend' && `Suspend ${selected.size} user${selected.size === 1 ? '' : 's'}`}
                {bulkAction === 'reactivate' && `Reactivate ${selected.size} user${selected.size === 1 ? '' : 's'}`}
                {bulkAction === 'tier' && `Change tier for ${selected.size} user${selected.size === 1 ? '' : 's'}`}
              </h3>
              <button
                onClick={closeBulkModal}
                className="p-1 rounded text-[#8AACBC] hover:bg-[#2D6A8F]/30 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bulkAction === 'suspend' && (
              <div className="flex items-start gap-2 px-3 py-2 mb-4 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Suspended users cannot log in. All existing sessions remain valid until expiry.
                </span>
              </div>
            )}

            {bulkAction === 'tier' && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-[#8AACBC] mb-2">New Tier</label>
                <select
                  value={bulkTierChoice}
                  onChange={(e) => setBulkTierChoice(e.target.value)}
                  className="w-full bg-[#1A3648]/80 border border-[#2D6A8F]/30 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3DAA8A]"
                >
                  {TIERS.filter(t => t.value).map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-medium text-[#8AACBC] mb-2">
                Reason <span className="text-red-400">*</span>
                <span className="ml-1 text-[#6B8A9A] font-normal">(min 3 chars, recorded in audit log)</span>
              </label>
              <textarea
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                placeholder="Why are you making this change?"
                rows={3}
                className="w-full bg-[#1A3648]/80 border border-[#2D6A8F]/30 rounded px-3 py-2 text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A] resize-none"
              />
            </div>

            {bulkResult && (
              <div className={`mb-4 px-3 py-2 rounded text-xs ${
                bulkResult.failed === 0
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
              }`}>
                <div className="font-medium mb-1">
                  {bulkResult.succeeded} succeeded, {bulkResult.failed} failed.
                </div>
                {bulkResult.failures.slice(0, 3).map((f, i) => (
                  <div key={i} className="text-[11px] opacity-80">
                    {f.user_id.slice(0, 8)}…: {f.error}
                  </div>
                ))}
                {bulkResult.failures.length > 3 && (
                  <div className="text-[11px] opacity-60">
                    …and {bulkResult.failures.length - 3} more.
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={closeBulkModal}
                disabled={bulkRunning}
                className="px-4 py-2 rounded text-sm font-medium text-[#8AACBC] hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={runBulkAction}
                disabled={bulkRunning || bulkReason.trim().length < 3}
                className="px-4 py-2 rounded bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {bulkRunning && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'from-[#3DAA8A]/20 to-[#3DAA8A]/5 border-[#3DAA8A]/20',
    red: 'from-red-600/20 to-red-600/5 border-red-500/20',
    violet: 'from-[#3DAA8A]/20 to-[#3DAA8A]/5 border-[#3DAA8A]/20',
    blue: 'from-[#2D6A8F]/20 to-[#2D6A8F]/5 border-[#2D6A8F]/20',
    teal: 'from-teal-600/20 to-teal-600/5 border-teal-500/20',
  };
  const iconColorMap: Record<string, string> = {
    emerald: 'text-emerald-400', red: 'text-red-400',
    violet: 'text-[#3DAA8A]', blue: 'text-blue-400', teal: 'text-teal-400',
  };
  return (
    <div className={`bg-gradient-to-b ${colorMap[color]} border rounded-xl p-4`}>
      <Icon className={`w-4 h-4 ${iconColorMap[color]} mb-1.5`} />
      <div className="text-xl font-bold text-white tracking-tight">{value}</div>
      <span className="text-[11px] text-[#6B8A9A]">{label}</span>
    </div>
  );
}
