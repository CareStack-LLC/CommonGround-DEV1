"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Calendar,
  Users,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { adminAPI, GrowthStats } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";

const PERIOD_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
];

export default function GrowthPage() {
  const [data, setData] = useState<GrowthStats | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const d = await adminAPI.getGrowthStats(days);
      setData(d);
    } catch (err) {
      console.error("Failed to load growth stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days]);

  const maxCount = data
    ? Math.max(...data.daily_registrations.map((d) => d.count), 1)
    : 1;

  // Calculate trend (last 7 days vs previous 7 days)
  const registrations = data?.daily_registrations ?? [];
  const last7 = registrations.slice(-7);
  const prev7 = registrations.slice(-14, -7);
  const last7Total = last7.reduce((s, d) => s + d.count, 0);
  const prev7Total = prev7.reduce((s, d) => s + d.count, 0);
  const trendPct =
    prev7Total > 0 ? Math.round(((last7Total - prev7Total) / prev7Total) * 100) : 0;

  // Average per day
  const avgPerDay =
    registrations.length > 0
      ? (
          registrations.reduce((s, d) => s + d.count, 0) / registrations.length
        ).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Growth Analytics</h1>
          <p className="text-sm text-zinc-500 mt-1">
            User registration trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-1.5 bg-[#1a1b26] border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50"
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <Button
            onClick={fetchData}
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              New Users ({days}d)
            </span>
            <div className="p-1.5 rounded-lg bg-violet-500/10">
              <Users className="h-4 w-4 text-violet-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {data?.total_new_users?.toLocaleString() ?? "---"}
          </div>
        </div>

        <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Avg / Day
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <Calendar className="h-4 w-4 text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {loading ? "---" : avgPerDay}
          </div>
        </div>

        <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              7d Trend
            </span>
            <div
              className={`p-1.5 rounded-lg ${
                trendPct >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"
              }`}
            >
              {trendPct >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-400" />
              )}
            </div>
          </div>
          <div
            className={`text-2xl font-bold tabular-nums ${
              trendPct >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {loading ? "---" : `${trendPct >= 0 ? "+" : ""}${trendPct}%`}
          </div>
          <p className="text-xs text-zinc-500 mt-1">vs previous 7 days</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5">
        <h3 className="text-sm font-medium text-zinc-400 mb-6">
          Daily Registrations
        </h3>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
            No registration data for this period.
          </div>
        ) : (
          <>
            {/* Y-axis labels + bars */}
            <div className="flex items-end gap-px h-48">
              {registrations.map((d, i) => {
                const heightPct = Math.max((d.count / maxCount) * 100, 2);
                const isWeekend = [0, 6].includes(new Date(d.date).getDay());
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      {d.date}: {d.count} users
                    </div>
                    <div
                      className={`w-full rounded-t transition-all ${
                        isWeekend
                          ? "bg-violet-600/50 group-hover:bg-violet-500"
                          : "bg-violet-500 group-hover:bg-violet-400"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between mt-2 text-[10px] text-zinc-600">
              {registrations.length > 0 && (
                <>
                  <span>{registrations[0].date.slice(5)}</span>
                  {registrations.length > 14 && (
                    <span>
                      {
                        registrations[
                          Math.floor(registrations.length / 2)
                        ].date.slice(5)
                      }
                    </span>
                  )}
                  <span>
                    {registrations[registrations.length - 1].date.slice(5)}
                  </span>
                </>
              )}
            </div>

            {/* Max label */}
            <div className="flex justify-end mt-3">
              <span className="text-[10px] text-zinc-600">
                Peak: {maxCount} users/day
              </span>
            </div>
          </>
        )}
      </div>

      {/* Daily Data Table */}
      <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-400">Daily Breakdown</h3>
        </div>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#1a1b26]">
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">
                  Date
                </th>
                <th className="text-right px-4 py-2 text-xs font-medium text-zinc-500">
                  New Users
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {[...registrations].reverse().map((d) => (
                <tr key={d.date} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-2 text-zinc-300">{d.date}</td>
                  <td className="px-4 py-2 text-right text-zinc-200 font-medium tabular-nums">
                    {d.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
