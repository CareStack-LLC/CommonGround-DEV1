"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  ExternalLink,
  Filter,
} from "lucide-react";
import { adminAPI, AdminUser, UserSearchResult } from "@/lib/admin-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TIERS = ["all", "starter", "plus", "family_plus", "solo", "small_firm", "mid_size"];
const PAGE_SIZE = 25;

export default function SuperAdminUsers() {
  const [result, setResult] = useState<UserSearchResult | null>(null);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: PAGE_SIZE, offset };
      if (query) params.q = query;
      if (tier !== "all") params.tier = tier;
      if (activeFilter === "active") params.is_active = true;
      if (activeFilter === "inactive") params.is_active = false;
      const data = await adminAPI.searchUsers(params);
      setResult(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }, [query, tier, activeFilter, offset]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const totalPages = result ? Math.ceil(result.total / PAGE_SIZE) : 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">User Management</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {result ? `${result.total} total users` : "Loading..."}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#1a1b26] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
          />
        </div>
        <select
          value={tier}
          onChange={(e) => { setTier(e.target.value); setOffset(0); }}
          className="px-3 py-2 bg-[#1a1b26] border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50"
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All Tiers" : t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => { setActiveFilter(e.target.value); setOffset(0); }}
          className="px-3 py-2 bg-[#1a1b26] border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">
                  Tier
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">
                  Last Active
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3" colSpan={5}>
                      <div className="h-4 bg-zinc-800 rounded w-64 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : result?.users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                result?.users.map((user) => (
                  <UserRow key={user.id} user={user} onRefresh={fetchUsers} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <span className="text-xs text-zinc-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                className="text-zinc-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={currentPage >= totalPages}
                className="text-zinc-400 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({ user, onRefresh }: { user: AdminUser; onRefresh: () => void }) {
  const tierColors: Record<string, string> = {
    starter: "bg-zinc-700/50 text-zinc-300",
    plus: "bg-blue-500/20 text-blue-300",
    family_plus: "bg-violet-500/20 text-violet-300",
    solo: "bg-emerald-500/20 text-emerald-300",
    small_firm: "bg-amber-500/20 text-amber-300",
    mid_size: "bg-rose-500/20 text-rose-300",
  };

  const formatDate = (d: string | null) => {
    if (!d) return "Never";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <tr className="hover:bg-zinc-800/30 transition-colors">
      <td className="px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-200">
              {user.first_name} {user.last_name}
            </span>
            {user.is_admin && (
              <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-[10px]">
                Admin
              </Badge>
            )}
          </div>
          <span className="text-xs text-zinc-500">{user.email}</span>
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
            tierColors[user.subscription_tier || "starter"] || tierColors.starter
          }`}
        >
          {(user.subscription_tier || "starter").replace(/_/g, " ")}
        </span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-xs text-zinc-400">
        {formatDate(user.last_active)}
      </td>
      <td className="px-4 py-3">
        {user.is_active ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Inactive
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/superadmin/users/${user.id}`}
          className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          View <ExternalLink className="h-3 w-3" />
        </Link>
      </td>
    </tr>
  );
}
