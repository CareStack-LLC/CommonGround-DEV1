"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  FolderOpen,
  Briefcase,
  DollarSign,
  TrendingUp,
  UserPlus,
  Activity,
  ArrowRight,
  RefreshCw,
  CreditCard,
  ScrollText,
} from "lucide-react";
import { adminAPI, DashboardData, GrowthStats } from "@/lib/admin-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function SuperAdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [growth, setGrowth] = useState<GrowthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashData, growthData] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getGrowthStats(30),
      ]);
      setData(dashData);
      setGrowth(growthData);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Command Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5 animate-pulse">
              <div className="h-4 bg-zinc-800 rounded w-24 mb-3" />
              <div className="h-8 bg-zinc-800 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={fetchData} variant="outline" className="border-zinc-700 text-zinc-300">
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const metrics = [
    {
      label: "Total Users",
      value: data.users.total,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Active (30d)",
      value: data.users.active_30d,
      icon: Activity,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "New (7d)",
      value: data.users.new_7d,
      icon: UserPlus,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      label: "Est. MRR",
      value: `$${data.subscriptions.estimated_mrr.toLocaleString()}`,
      icon: DollarSign,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  const secondaryMetrics = [
    {
      label: "Active Family Files",
      value: data.family_files.active,
      icon: FolderOpen,
    },
    {
      label: "Professionals",
      value: data.professionals.total,
      icon: Briefcase,
    },
    {
      label: "New Users (30d)",
      value: growth?.total_new_users ?? "---",
      icon: TrendingUp,
    },
  ];

  // Build simple bar chart data from last 14 days of growth
  const recentGrowth = (growth?.daily_registrations ?? []).slice(-14);
  const maxCount = Math.max(...recentGrowth.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Command Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Platform overview as of{" "}
            {new Date(data.generated_at).toLocaleString()}
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

      {/* Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {m.label}
                </span>
                <div className={`p-1.5 rounded-lg ${m.bg}`}>
                  <Icon className={`h-4 w-4 ${m.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tabular-nums">
                {typeof m.value === "number" ? m.value.toLocaleString() : m.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Metrics + Tier Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Secondary Metrics */}
        <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Platform Stats</h3>
          <div className="space-y-4">
            {secondaryMetrics.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm text-zinc-300">{m.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-white tabular-nums">
                    {typeof m.value === "number" ? m.value.toLocaleString() : m.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscription Tier Breakdown */}
        <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">
            Subscription Tiers
          </h3>
          <div className="space-y-3">
            {Object.entries(data.subscriptions.tier_breakdown).map(
              ([tier, count]) => {
                const pct =
                  data.users.total > 0
                    ? Math.round((count / data.users.total) * 100)
                    : 0;
                return (
                  <div key={tier}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-zinc-300 capitalize">
                        {tier.replace(/_/g, " ")}
                      </span>
                      <span className="text-zinc-400 tabular-nums">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Growth Sparkline */}
        <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">
              New Users (14d)
            </h3>
            <Link
              href="/superadmin/growth"
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentGrowth.length > 0 ? (
            <div className="flex items-end gap-1 h-24">
              {recentGrowth.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-gradient-to-t from-violet-600 to-violet-400 rounded-t"
                    style={{
                      height: `${Math.max((d.count / maxCount) * 100, 4)}%`,
                    }}
                    title={`${d.date}: ${d.count} users`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No registration data yet.</p>
          )}
          {recentGrowth.length > 0 && (
            <div className="flex justify-between mt-2 text-[10px] text-zinc-600">
              <span>{recentGrowth[0]?.date.slice(5)}</span>
              <span>{recentGrowth[recentGrowth.length - 1]?.date.slice(5)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/superadmin/users"
          className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-4 hover:border-violet-500/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-zinc-500 group-hover:text-violet-400 transition-colors" />
              <div>
                <p className="text-sm font-medium text-zinc-200">Manage Users</p>
                <p className="text-xs text-zinc-500">Search, view, activate/deactivate</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-violet-400 transition-colors" />
          </div>
        </Link>
        <Link
          href="/superadmin/billing"
          className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-4 hover:border-violet-500/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-zinc-500 group-hover:text-violet-400 transition-colors" />
              <div>
                <p className="text-sm font-medium text-zinc-200">Billing Overview</p>
                <p className="text-xs text-zinc-500">Subscriptions & revenue</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-violet-400 transition-colors" />
          </div>
        </Link>
        <Link
          href="/superadmin/audit-log"
          className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-4 hover:border-violet-500/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ScrollText className="h-5 w-5 text-zinc-500 group-hover:text-violet-400 transition-colors" />
              <div>
                <p className="text-sm font-medium text-zinc-200">Audit Log</p>
                <p className="text-xs text-zinc-500">Admin activity trail</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-violet-400 transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}
