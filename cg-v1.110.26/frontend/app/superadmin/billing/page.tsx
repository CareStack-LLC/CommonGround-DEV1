"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  AlertTriangle,
  DollarSign,
  Users,
  Briefcase,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { adminAPI, BillingOverview } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";

const TIER_PRICES: Record<string, number> = {
  starter: 0,
  plus: 12,
  family_plus: 25,
  solo: 99,
  small_firm: 299,
  mid_size: 799,
};

const TIER_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  starter: { bg: "bg-zinc-700/30", text: "text-zinc-300", bar: "bg-zinc-500" },
  plus: { bg: "bg-blue-500/15", text: "text-blue-300", bar: "bg-blue-500" },
  family_plus: { bg: "bg-violet-500/15", text: "text-violet-300", bar: "bg-violet-500" },
  solo: { bg: "bg-emerald-500/15", text: "text-emerald-300", bar: "bg-emerald-500" },
  small_firm: { bg: "bg-amber-500/15", text: "text-amber-300", bar: "bg-amber-500" },
  mid_size: { bg: "bg-rose-500/15", text: "text-rose-300", bar: "bg-rose-500" },
  unknown: { bg: "bg-zinc-700/30", text: "text-zinc-400", bar: "bg-zinc-600" },
};

export default function BillingOverviewPage() {
  const [data, setData] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const d = await adminAPI.getBillingOverview();
      setData(d);
    } catch (err) {
      console.error("Failed to load billing:", err);
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
        <h1 className="text-2xl font-semibold text-white">Billing Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5 animate-pulse">
              <div className="h-4 bg-zinc-800 rounded w-24 mb-3" />
              <div className="h-8 bg-zinc-800 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Calculate MRR from consumer subscriptions
  let totalConsumers = 0;
  let estimatedMRR = 0;
  Object.entries(data.consumer_subscriptions).forEach(([tier, info]) => {
    totalConsumers += info.total;
    const activeCount =
      (info.statuses["active"] || 0) + (info.statuses["trial"] || 0);
    estimatedMRR += activeCount * (TIER_PRICES[tier] || 0);
  });

  // Professional totals
  let totalProfessionals = 0;
  Object.values(data.professional_subscriptions).forEach(
    (c) => (totalProfessionals += c)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Billing Overview</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Subscription metrics and revenue
          </p>
        </div>
        <div className="flex items-center gap-2">
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
              Est. MRR
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            ${estimatedMRR.toLocaleString()}
          </div>
          <p className="text-xs text-zinc-500 mt-1">From active subscriptions</p>
        </div>

        <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Consumers
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {totalConsumers.toLocaleString()}
          </div>
          <p className="text-xs text-zinc-500 mt-1">Total consumer accounts</p>
        </div>

        <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Past Due
            </span>
            <div className={`p-1.5 rounded-lg ${data.past_due_count > 0 ? "bg-amber-500/10" : "bg-zinc-800"}`}>
              <AlertTriangle className={`h-4 w-4 ${data.past_due_count > 0 ? "text-amber-400" : "text-zinc-600"}`} />
            </div>
          </div>
          <div className={`text-2xl font-bold tabular-nums ${data.past_due_count > 0 ? "text-amber-400" : "text-white"}`}>
            {data.past_due_count}
          </div>
          <p className="text-xs text-zinc-500 mt-1">Accounts needing attention</p>
        </div>
      </div>

      {/* Consumer Subscription Breakdown */}
      <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5">
        <h3 className="text-sm font-medium text-zinc-400 mb-5">
          Consumer Subscriptions
        </h3>
        <div className="space-y-4">
          {Object.entries(data.consumer_subscriptions).map(([tier, info]) => {
            const colors = TIER_COLORS[tier] || TIER_COLORS.unknown;
            const pct =
              totalConsumers > 0
                ? Math.round((info.total / totalConsumers) * 100)
                : 0;
            const price = TIER_PRICES[tier] || 0;
            return (
              <div key={tier} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} capitalize`}
                    >
                      {tier.replace(/_/g, " ")}
                    </span>
                    {price > 0 && (
                      <span className="text-xs text-zinc-500">
                        ${price}/mo
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-zinc-300 tabular-nums">
                    {info.total} ({pct}%)
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${colors.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {/* Status breakdown */}
                <div className="flex gap-3 text-[11px] text-zinc-500 pl-1">
                  {Object.entries(info.statuses).map(([status, count]) => (
                    <span key={status} className="capitalize">
                      {status}: {count}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Professional Subscriptions */}
      <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-medium text-zinc-400">
            Professional Subscriptions
          </h3>
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Briefcase className="h-3 w-3" />
            {totalProfessionals} total
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(data.professional_subscriptions).map(([tier, count]) => {
            const colors = TIER_COLORS[tier] || TIER_COLORS.unknown;
            return (
              <div
                key={tier}
                className="bg-[#0f1117] rounded-lg border border-zinc-800 p-3 text-center"
              >
                <p className="text-lg font-bold text-white tabular-nums">{count}</p>
                <p className={`text-xs capitalize ${colors.text}`}>
                  {tier.replace(/_/g, " ")}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stripe Link */}
      <div className="bg-[#1a1b26] rounded-xl border border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-zinc-500" />
            <div>
              <p className="text-sm text-zinc-300">
                Need detailed transaction data?
              </p>
              <p className="text-xs text-zinc-500">
                Use the Stripe Dashboard for individual payments, refunds, and invoices.
              </p>
            </div>
          </div>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 transition-colors"
          >
            Stripe Dashboard <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
