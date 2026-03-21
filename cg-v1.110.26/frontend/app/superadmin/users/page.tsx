'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Search, ChevronLeft, ChevronRight, Shield,
  ArrowUpDown, Eye, UserPlus, UserCheck, UserX, Briefcase,
  TrendingUp, PieChart as PieChartIcon,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { adminAPI, type AdminUser, type UserSearchResult } from '@/lib/admin-api';

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
  web_starter: 'bg-zinc-700/50 text-zinc-400',
  plus: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  complete: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  professional_starter: 'bg-teal-500/15 text-teal-400 border border-teal-500/20',
  solo: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  small_firm: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  mid_size: 'bg-rose-500/15 text-rose-400 border border-rose-500/20',
  none: 'bg-zinc-800 text-zinc-500',
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

export default function UsersPage() {
  const router = useRouter();
  const [data, setData] = useState<ExtendedSearchResult | null>(null);
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
        <p className="text-sm text-zinc-500 mt-0.5">{data ? `${(data.total ?? 0).toLocaleString()} total users` : 'Loading...'}</p>
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
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-zinc-300">Subscription Tier Distribution</h2>
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
                formatter={(value: string) => <span className="text-zinc-400 text-xs capitalize">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

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
              ) : data?.users?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">No users found matching your criteria.</td>
                </tr>
              ) : data?.users?.map((user) => (
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
                      {(user.subscription_tier || 'free').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-zinc-500 text-xs">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '\u2014'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-zinc-500 text-xs">
                    {timeAgo(user.last_active)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      user.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
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
              Showing {page * PAGE_SIZE + 1}\u2013{Math.min((page + 1) * PAGE_SIZE, data.total)} of {data.total}
            </span>
            <div className="flex items-center gap-1">
              <button disabled={page === 0} onClick={() => setPage(page - 1)} className="p-1.5 rounded-lg hover:bg-zinc-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-zinc-400 px-2">{page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="p-1.5 rounded-lg hover:bg-zinc-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-600/20 to-emerald-600/5 border-emerald-500/20',
    red: 'from-red-600/20 to-red-600/5 border-red-500/20',
    violet: 'from-violet-600/20 to-violet-600/5 border-violet-500/20',
    blue: 'from-blue-600/20 to-blue-600/5 border-blue-500/20',
    teal: 'from-teal-600/20 to-teal-600/5 border-teal-500/20',
  };
  const iconColorMap: Record<string, string> = {
    emerald: 'text-emerald-400', red: 'text-red-400',
    violet: 'text-violet-400', blue: 'text-blue-400', teal: 'text-teal-400',
  };
  return (
    <div className={`bg-gradient-to-b ${colorMap[color]} border rounded-xl p-4`}>
      <Icon className={`w-4 h-4 ${iconColorMap[color]} mb-1.5`} />
      <div className="text-xl font-bold text-white tracking-tight">{value}</div>
      <span className="text-[11px] text-zinc-500">{label}</span>
    </div>
  );
}
