'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Search, ChevronLeft, ChevronRight, Shield,
  Filter, ArrowUpDown, UserCheck, UserX, Eye,
} from 'lucide-react';
import { adminAPI, type AdminUser, type UserSearchResult } from '@/lib/admin-api';

const TIERS = [
  { value: '', label: 'All tiers' },
  { value: 'essential', label: 'Essential' },
  { value: 'starter', label: 'Starter' },
  { value: 'plus', label: 'Plus' },
  { value: 'family_plus', label: 'Family Plus' },
  { value: 'solo', label: 'Solo' },
  { value: 'small_firm', label: 'Small Firm' },
  { value: 'mid_size', label: 'Mid Size' },
];

const TIER_COLORS: Record<string, string> = {
  essential: 'bg-zinc-700/50 text-zinc-400',
  starter: 'bg-zinc-700/50 text-zinc-300',
  plus: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  family_plus: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  solo: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  small_firm: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  mid_size: 'bg-rose-500/15 text-rose-400 border border-rose-500/20',
};

const PAGE_SIZE = 25;

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

export default function UsersPage() {
  const router = useRouter();
  const [data, setData] = useState<UserSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

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
      setData(result);
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

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">User Management</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{data ? `${data.total.toLocaleString()} total users` : 'Loading...'}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
          >
            {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  <button onClick={() => toggleSort('first_name')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                    User <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Tier</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">
                  <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                    Joined <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">
                  <button onClick={() => toggleSort('last_active')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                    Last Active <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-3"><div className="animate-pulse bg-zinc-800/60 rounded h-8" /></td>
                  </tr>
                ))
              ) : data?.users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">No users found matching your criteria.</td>
                </tr>
              ) : data?.users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => router.push(`/superadmin/users/${user.id}`)}
                  className="hover:bg-zinc-800/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-400">
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-zinc-200 font-medium truncate flex items-center gap-1.5">
                          {user.first_name} {user.last_name}
                          {user.is_admin && <Shield className="w-3 h-3 text-violet-400" />}
                        </div>
                        <div className="text-xs text-zinc-500 truncate">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${TIER_COLORS[user.subscription_tier || ''] || 'bg-zinc-800 text-zinc-500'}`}>
                      {(user.subscription_tier || 'unknown').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-zinc-500 text-xs">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-zinc-500 text-xs">
                    {timeAgo(user.last_active)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      user.is_active
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Eye className="w-4 h-4 text-zinc-600 hover:text-zinc-300 inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800/60">
            <span className="text-xs text-zinc-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.total)} of {data.total}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg hover:bg-zinc-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-zinc-400 px-2">{page + 1} / {totalPages}</span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg hover:bg-zinc-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
