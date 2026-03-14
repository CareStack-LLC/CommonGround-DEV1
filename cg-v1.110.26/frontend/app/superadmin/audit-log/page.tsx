"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  User,
  RefreshCw,
} from "lucide-react";
import { adminAPI, AuditLogEntry, AuditLogResult } from "@/lib/admin-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ACTION_FILTERS = [
  { label: "All Actions", value: "" },
  { label: "Dashboard Views", value: "view_dashboard" },
  { label: "User Searches", value: "search_users" },
  { label: "User Views", value: "view_user" },
  { label: "Status Changes", value: "update_user_status" },
  { label: "Billing Views", value: "view_billing" },
  { label: "Growth Stats", value: "view_growth" },
];

const ACTION_COLORS: Record<string, string> = {
  "admin:view_dashboard": "text-blue-400",
  "admin:search_users": "text-zinc-400",
  "admin:view_user": "text-zinc-400",
  "admin:update_user_status": "text-amber-400",
  "admin:view_billing": "text-emerald-400",
  "admin:view_growth_stats": "text-violet-400",
};

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const [result, setResult] = useState<AuditLogResult | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getAuditLog({
        action: actionFilter || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setResult(data);
    } catch (err) {
      console.error("Failed to load audit log:", err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, offset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = result ? Math.ceil(result.total / PAGE_SIZE) : 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const formatDate = (d: string | null) => {
    if (!d) return "---";
    return new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatAction = (action: string) => {
    return action
      .replace("admin:", "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Audit Log</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {result ? `${result.total} entries` : "Loading..."}
          </p>
        </div>
        <Button
          onClick={fetchData}
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-zinc-500" />
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setOffset(0);
          }}
          className="px-3 py-2 bg-[#1a1b26] border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50"
        >
          {ACTION_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Log Table */}
      <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">
                  Target
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3" colSpan={4}>
                      <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : result?.logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-zinc-500">
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                result?.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <Clock className="h-3 w-3" />
                        {formatDate(log.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-medium ${
                          ACTION_COLORS[log.action] || "text-zinc-300"
                        }`}
                      >
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-xs text-zinc-400">
                        <span className="capitalize">{log.resource_type}</span>
                        {log.resource_id && (
                          <span className="text-zinc-600 font-mono ml-1">
                            {log.resource_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-zinc-500 max-w-xs truncate block">
                        {log.description || "---"}
                      </span>
                    </td>
                  </tr>
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
