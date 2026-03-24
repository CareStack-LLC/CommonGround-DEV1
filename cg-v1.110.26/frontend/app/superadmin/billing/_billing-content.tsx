'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DollarSign, TrendingUp, CreditCard, AlertTriangle,
  Users, Percent, ExternalLink, RefreshCw, UserPlus,
  UserMinus, Clock, CheckCircle, XCircle, Zap, ArrowUpDown,
  ArrowUp, ArrowDown, Shield, Activity, BarChart3,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { adminAPI, type BillingOverview, type SyncResult } from '@/lib/admin-api';

/* ── Constants ─────────────────────────────────────────── */

const TIER_LABELS: Record<string, string> = {
  web_starter: 'Web Starter',
  plus: 'Plus', complete: 'Complete',
  professional_starter: 'Starter (Pro)',
  solo: 'Solo (Pro)', small_firm: 'Small Firm (Pro)', mid_size: 'Mid Size (Pro)',
};

const TIER_COLORS: Record<string, string> = {
  web_starter: '#6B8A9A',
  plus: '#3DAA8A', complete: '#2D6A8F',
  professional_starter: '#8B5CF6', solo: '#7C3AED', small_firm: '#6D28D9', mid_size: '#5B21B6',
};

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  active: { text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  trial: { text: 'text-sky-400', bg: 'bg-sky-400/10' },
  past_due: { text: 'text-amber-400', bg: 'bg-amber-400/10' },
  cancelled: { text: 'text-red-400', bg: 'bg-red-400/10' },
  none: { text: 'text-[#6B8A9A]', bg: 'bg-[#6B8A9A]/10' },
};

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function fmtExact(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/* ── Skeleton ──────────────────────────────────────────── */

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#2D6A8F]/15 rounded-xl ${className}`} />;
}

/* ── Main Component ────────────────────────────────────── */

export default function BillingContent() {
  const [data, setData] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    stripe: false,
    payments: true,
    subscriptions: true,
  });

  const toggle = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.getBillingOverview();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async (type: 'customers' | 'subscriptions') => {
    try {
      setSyncing(type);
      setSyncResult(null);
      const result = type === 'customers'
        ? await adminAPI.syncStripeCustomers()
        : await adminAPI.syncStripeSubscriptions();
      setSyncResult(result);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(null);
    }
  };

  /* ── Derived ── */
  const totalConsumers = data ? Object.values(data.consumer_subscriptions || {}).reduce((a, b) => a + b.total, 0) : 0;
  const paidConsumers = data ? Object.entries(data.mrr_by_tier || {})
    .filter(([, v]) => v.price > 0)
    .reduce((a, [, v]) => a + v.count, 0) : 0;
  const stripeLive = data?.stripe_live;
  const stripeAvailable = stripeLive?.stripe_available === true;
  const mrr = stripeAvailable && stripeLive?.total_mrr != null ? stripeLive.total_mrr : (data?.total_mrr ?? 0);
  const conversionRate = totalConsumers > 0 ? Math.round((paidConsumers / totalConsumers) * 100) : 0;
  const arpu = paidConsumers > 0 && data ? data.total_mrr / paidConsumers : 0;

  /* ── Error State ── */
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-amber-400" />
        </div>
        <p className="text-[#8AACBC] mb-5 text-sm">{error}</p>
        <button onClick={fetchData} className="px-5 py-2.5 rounded-xl bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-semibold transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Revenue Command Center</h1>
          <p className="text-sm text-[#6B8A9A] mt-1">Real-time subscription metrics powered by Stripe</p>
        </div>
        <div className="flex items-center gap-3">
          {stripeAvailable && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
          {stripeLive && !stripeAvailable && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-medium">
              <AlertTriangle className="w-3 h-3" />
              Stripe Offline
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#D0E4EC] text-xs font-medium transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ═══ HERO KPI ROW ═══ */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[120px]" />)}
        </div>
      ) : data && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* MRR — Hero Card */}
          <div className="relative overflow-hidden rounded-2xl border border-[#3DAA8A]/30 bg-gradient-to-br from-[#3DAA8A]/15 via-[#1A3648]/80 to-[#1A3648]/60 p-5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#3DAA8A]/5 rounded-full -translate-y-8 translate-x-8" />
            <DollarSign className="w-5 h-5 text-[#3DAA8A] mb-3" />
            <div className="text-3xl font-bold text-white tracking-tight">
              {data.verified_mrr != null ? fmt(data.verified_mrr) : fmt(data.estimated_mrr ?? data.total_mrr)}
            </div>
            <div className="text-xs text-[#3DAA8A] font-medium mt-1">
              {data.verified_mrr != null ? 'Verified MRR' : 'Estimated MRR'}
            </div>
            {data.verified_mrr != null && data.estimated_mrr != null && Math.abs(data.verified_mrr - data.estimated_mrr) > 0.01 && (
              <div className="text-[10px] text-amber-400/60 mt-1.5">DB: {fmt(data.estimated_mrr)}</div>
            )}
          </div>

          {/* Active Subscribers */}
          <KPICard
            icon={<Users className="w-5 h-5 text-sky-400" />}
            value={stripeAvailable && stripeLive?.active_subscriptions != null
              ? stripeLive.active_subscriptions.toString()
              : totalConsumers.toLocaleString()}
            label={stripeAvailable ? 'Verified Subscribers' : 'DB Subscribers'}
          />

          {/* New Paid */}
          <KPICard
            icon={<UserPlus className="w-5 h-5 text-emerald-400" />}
            value={data.new_paid_30d.toString()}
            label="New Paid (30d)"
            badge={data.new_paid_30d > 0 ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : undefined}
          />

          {/* Past Due */}
          <KPICard
            icon={<AlertTriangle className={`w-5 h-5 ${data.past_due_count > 0 ? 'text-amber-400' : 'text-[#4A6E7F]'}`} />}
            value={data.past_due_count.toString()}
            label="Past Due"
            alert={data.past_due_count > 0}
          />

          {/* Cancelled */}
          <KPICard
            icon={<UserMinus className="w-5 h-5 text-red-400" />}
            value={data.cancelled_30d.toString()}
            label="Cancelled (30d)"
            badge={data.cancelled_30d > 0 ? <ArrowDown className="w-3 h-3 text-red-400" /> : undefined}
          />
        </div>
      )}

      {/* ═══ REVENUE + QUICK METRICS ROW ═══ */}
      {data && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Revenue by Tier — 2 cols */}
          <div className="lg:col-span-2">
            <Section title="Revenue by Tier" icon={<BarChart3 className="w-4 h-4 text-[#3DAA8A]" />}>
              <div className="space-y-4">
                {Object.entries(data.mrr_by_tier || {})
                  .filter(([, v]) => v.price > 0)
                  .sort(([, a], [, b]) => b.mrr - a.mrr)
                  .map(([tier, info]) => {
                    const pct = data.total_mrr > 0 ? Math.round((info.mrr / data.total_mrr) * 100) : 0;
                    return (
                      <div key={tier} className="group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TIER_COLORS[tier] || '#3DAA8A' }} />
                            <span className="text-sm text-white font-medium">{TIER_LABELS[tier] || tier}</span>
                            <span className="text-xs text-[#4A6E7F]">${info.price}/mo</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-[#6B8A9A] tabular-nums">{info.count} active</span>
                            <span className="text-sm font-bold text-white tabular-nums w-20 text-right">{fmtExact(info.mrr)}</span>
                          </div>
                        </div>
                        <div className="h-2.5 bg-[#0D1F2D] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: TIER_COLORS[tier] || '#3DAA8A', opacity: 0.85 }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                <span className="text-sm text-[#8AACBC] font-semibold">Total MRR</span>
                <span className="text-xl font-bold text-white tabular-nums">{fmtExact(data.total_mrr)}</span>
              </div>
              {data.stripe_health && data.stripe_health.paid_no_stripe_sub > 0 && (
                <p className="text-[10px] text-amber-400/60 mt-2">{data.stripe_health.paid_no_stripe_sub} subscriber(s) are DB-assigned only. MRR estimated.</p>
              )}
            </Section>
          </div>

          {/* Quick Metrics + Actions — 1 col */}
          <div className="space-y-6">
            <Section title="Quick Metrics" icon={<Activity className="w-4 h-4 text-sky-400" />}>
              <div className="space-y-4">
                <MetricRow icon={<Clock className="w-4 h-4 text-sky-400" />} label="Trial Users" value={data.trial_count?.toString() || '0'} color="text-sky-400" />
                <MetricRow icon={<Percent className="w-4 h-4 text-emerald-400" />} label="Paid Conversion" value={`${conversionRate}%`} color="text-emerald-400" />
                <MetricRow icon={<DollarSign className="w-4 h-4 text-[#3DAA8A]" />} label="ARPU (paid)" value={arpu > 0 ? fmtExact(arpu) : '—'} color="text-[#3DAA8A]" />
                {stripeAvailable && stripeLive?.total_customers != null && (
                  <MetricRow icon={<CreditCard className="w-4 h-4 text-violet-400" />} label="Stripe Customers" value={stripeLive.total_customers.toString()} color="text-violet-400" />
                )}
              </div>
            </Section>

            <div className="space-y-2.5">
              <button onClick={() => handleSync('customers')} disabled={syncing !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-[#8AACBC] hover:text-white hover:bg-white/[0.06] hover:border-violet-500/20 transition-all disabled:opacity-40">
                <ArrowUpDown className={`w-4 h-4 ${syncing === 'customers' ? 'animate-spin' : ''}`} />
                {syncing === 'customers' ? 'Syncing...' : 'Sync Stripe Customers'}
              </button>
              <button onClick={() => handleSync('subscriptions')} disabled={syncing !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-[#8AACBC] hover:text-white hover:bg-white/[0.06] hover:border-violet-500/20 transition-all disabled:opacity-40">
                <ArrowUpDown className={`w-4 h-4 ${syncing === 'subscriptions' ? 'animate-spin' : ''}`} />
                {syncing === 'subscriptions' ? 'Syncing...' : 'Sync Subscriptions'}
              </button>
              <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#635BFF]/10 border border-[#635BFF]/20 text-sm text-[#A5A0FF] hover:text-white hover:bg-[#635BFF]/15 transition-all">
                <CreditCard className="w-4 h-4" /> Stripe Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {syncResult && (
              <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-300 font-semibold">Sync Complete</span>
                </div>
                <div className="text-xs text-[#8AACBC] space-y-1">
                  {syncResult.synced != null && syncResult.synced > 0 && <div>Synced: <span className="text-emerald-400 font-medium">{syncResult.synced}</span></div>}
                  {syncResult.updated != null && syncResult.updated > 0 && <div>Updated: <span className="text-sky-400 font-medium">{syncResult.updated}</span></div>}
                  {(syncResult.checked ?? syncResult.total_checked) != null && <div>Checked: {syncResult.checked ?? syncResult.total_checked}</div>}
                  {syncResult.failed > 0 && (
                    <div className="mt-2 p-2.5 bg-red-500/10 border border-red-500/15 rounded-lg">
                      <span className="text-red-400 font-medium">{syncResult.failed} failed</span>
                      {syncResult.errors?.slice(0, 3).map((e, i) => (
                        <div key={i} className="text-[11px] text-red-300/70 mt-0.5">{e.email || e.user_id}: {e.error}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ STRIPE INTEGRATION HEALTH ═══ */}
      {data?.stripe_health && (
        <CollapsibleSection
          title="Stripe Integration Health"
          icon={<Shield className="w-4 h-4 text-violet-400" />}
          badge={data.stripe_health.paid_no_stripe_sub > 0
            ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 font-medium">{data.stripe_health.paid_no_stripe_sub} mismatch</span>
            : <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 font-medium">Healthy</span>}
          expanded={expandedSections.stripe}
          onToggle={() => toggle('stripe')}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <StatBox value={data.stripe_health.with_stripe_customer} label="Stripe Customers" sub={`of ${data.stripe_health.total_profiles} users`} />
            <StatBox value={data.stripe_health.with_stripe_subscription} label="Stripe Subscriptions" />
            <StatBox value={data.stripe_health.paid_no_stripe_sub} label="Paid, No Stripe Sub" alert={data.stripe_health.paid_no_stripe_sub > 0} />
            <StatBox value={`${data.stripe_health.products_verified?.filter(p => p.found).length ?? 0}/${data.stripe_health.products_expected?.length ?? 0}`} label="Products Verified" />
          </div>

          {data.stripe_health.products_verified && data.stripe_health.products_verified.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#8AACBC] uppercase tracking-wider mb-3">Product Catalog</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {data.stripe_health.products_verified.map((prod) => (
                  <div key={prod.id} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    {prod.found ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                    <span className="text-xs text-[#D0E4EC] font-medium">{TIER_LABELS[prod.tier] || prod.tier}</span>
                    {prod.found && <span className={`text-[10px] ml-auto ${prod.active ? 'text-emerald-400/50' : 'text-amber-400'}`}>{prod.active ? 'active' : 'inactive'}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.stripe_health.paid_no_stripe_sub > 0 && (
            <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-amber-500/5 border border-amber-500/15 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-amber-300/70 leading-relaxed">
                {data.stripe_health.paid_no_stripe_sub} user{data.stripe_health.paid_no_stripe_sub !== 1 ? 's' : ''} have
                a paid tier but no Stripe subscription. Use &ldquo;Sync Subscriptions&rdquo; to reconcile.
              </span>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* ═══ RECENT PAYMENTS ═══ */}
      {stripeAvailable && stripeLive?.recent_payments && stripeLive.recent_payments.length > 0 && (
        <CollapsibleSection
          title="Recent Payments"
          icon={<CreditCard className="w-4 h-4 text-emerald-400" />}
          badge={<span className="text-[10px] text-[#4A6E7F]">{stripeLive.recent_payments.length} invoices</span>}
          expanded={expandedSections.payments}
          onToggle={() => toggle('payments')}
        >
          <div className="overflow-x-auto -mx-5">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left pb-3 pl-5 text-[11px] text-[#4A6E7F] font-semibold uppercase tracking-wider">Customer</th>
                  <th className="text-left pb-3 text-[11px] text-[#4A6E7F] font-semibold uppercase tracking-wider">Amount</th>
                  <th className="text-left pb-3 text-[11px] text-[#4A6E7F] font-semibold uppercase tracking-wider hidden md:table-cell">Description</th>
                  <th className="text-left pb-3 text-[11px] text-[#4A6E7F] font-semibold uppercase tracking-wider">Date</th>
                  <th className="text-left pb-3 pr-5 text-[11px] text-[#4A6E7F] font-semibold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {stripeLive.recent_payments.map((payment, i) => (
                  <tr key={payment.id} className={`border-b border-white/[0.03] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                    <td className="py-3.5 pl-5 text-sm text-[#D0E4EC]">{payment.customer_email || payment.customer}</td>
                    <td className="py-3.5 text-sm text-white font-semibold tabular-nums">{fmtExact(payment.amount)}</td>
                    <td className="py-3.5 text-xs text-[#6B8A9A] hidden md:table-cell max-w-48 truncate">{payment.description || '—'}</td>
                    <td className="py-3.5 text-xs text-[#6B8A9A]">{fmtDateTime(payment.created)}</td>
                    <td className="py-3.5 pr-5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle className="w-3 h-3" /> paid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      )}

      {/* ═══ SUBSCRIPTIONS + VALUATION ROW ═══ */}
      {data && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Subscriptions by Category */}
          <Section title="Subscriptions by Category" icon={<Users className="w-4 h-4 text-sky-400" />}>
            {(() => {
              const TIER_GROUPS = [
                { label: 'Standard Plans', color: 'text-[#3DAA8A]', tiers: ['plus', 'complete'] },
                { label: 'Professional Plans', color: 'text-violet-400', tiers: ['professional_starter', 'solo', 'small_firm', 'mid_size'] },
                { label: 'Free / Starter', color: 'text-[#6B8A9A]', tiers: ['web_starter'] },
              ];
              return (
                <div className="space-y-6">
                  {TIER_GROUPS.map((group) => {
                    const groupEntries = Object.entries(data.consumer_subscriptions || {})
                      .filter(([tier]) => group.tiers.includes(tier)).sort(([, a], [, b]) => b.total - a.total);
                    const proEntries = Object.entries(data.professional_subscriptions || {})
                      .filter(([tier]) => group.tiers.includes(tier));
                    const allEntries = [
                      ...groupEntries.map(([t, info]) => ({ tier: t, total: info.total, statuses: info.statuses })),
                      ...proEntries.map(([t, count]) => ({ tier: t, total: count, statuses: {} as Record<string, number> })),
                    ];
                    if (allEntries.length === 0) return null;
                    const groupTotal = allEntries.reduce((s, e) => s + e.total, 0);
                    return (
                      <div key={group.label}>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-[11px] uppercase tracking-wider font-bold ${group.color}`}>{group.label}</span>
                          <span className="text-xs text-[#4A6E7F] font-medium">{groupTotal} total</span>
                        </div>
                        <div className="space-y-2">
                          {allEntries.map(({ tier, total, statuses }) => {
                            const tierPrice = data.mrr_by_tier[tier]?.price ?? 0;
                            return (
                              <div key={tier} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TIER_COLORS[tier] || '#6B8A9A' }} />
                                  <span className="text-sm text-white font-medium">{TIER_LABELS[tier] || tier}</span>
                                  {tierPrice > 0 && <span className="text-[11px] text-[#4A6E7F]">${tierPrice}/mo</span>}
                                </div>
                                <div className="flex items-center gap-3">
                                  {Object.entries(statuses).map(([status, count]) => (
                                    <span key={status} className={`text-[11px] px-1.5 py-0.5 rounded ${STATUS_COLORS[status]?.bg || ''} ${STATUS_COLORS[status]?.text || 'text-[#6B8A9A]'}`}>
                                      {count} {status}
                                    </span>
                                  ))}
                                  <span className="text-sm font-bold text-white tabular-nums ml-1">{total}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Section>

          {/* Valuation + Projections */}
          <div className="space-y-6">
            {data.valuation && Object.keys(data.valuation).length > 0 && (
              <Section title="Valuation Metrics" icon={<TrendingUp className="w-4 h-4 text-[#3DAA8A]" />} badge={<span className="text-[10px] text-emerald-500/60">Live</span>}>
                <div className="grid grid-cols-2 gap-3">
                  <ValuationCard label="LTV" value={fmt(data.valuation.ltv || 0)} sub={`${data.valuation.avg_lifetime_months || 0} mo avg`} />
                  <ValuationCard label="ARPU" value={fmtExact(data.valuation.arpu || 0)} sub="monthly per user" />
                  <ValuationCard label="Retention" value={`${data.valuation.retention_rate_pct || 0}%`} sub={`${data.valuation.monthly_churn_pct || 0}% churn`} highlight={(data.valuation.retention_rate_pct || 0) >= 90} />
                  <ValuationCard label="LTV:CAC" value={`${data.valuation.ltv_cac_ratio || 0}x`} sub={(data.valuation.ltv_cac_ratio || 0) >= 3 ? '>=3x target' : 'Below 3x target'} highlight={(data.valuation.ltv_cac_ratio || 0) >= 3} />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <StatBox value={fmt(data.valuation.arr || 0)} label="ARR" />
                  <StatBox value={(data.valuation.active_paying || 0).toString()} label="Paying Users" />
                  <StatBox value={(data.valuation.total_users || 0).toLocaleString()} label="Total Users" />
                </div>
              </Section>
            )}

            {data.total_mrr > 0 && (
              <Section title="Revenue Projections" icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}>
                {(() => {
                  const monthlyGrowth = 0.05;
                  const projections = [
                    { label: '1 Year', months: 12 },
                    { label: '3 Years', months: 36 },
                    { label: '5 Years', months: 60 },
                  ].map(({ label, months }) => {
                    const factor = ((Math.pow(1 + monthlyGrowth, months) - 1) / monthlyGrowth);
                    const totalRevenue = mrr * factor;
                    const endingMrr = mrr * Math.pow(1 + monthlyGrowth, months);
                    return { label, totalRevenue, arr: endingMrr * 12 };
                  });
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        {projections.map((p) => (
                          <div key={p.label} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 text-center">
                            <div className="text-[10px] uppercase tracking-widest text-[#4A6E7F] font-bold mb-2">{p.label}</div>
                            <div className="text-lg font-bold text-white tabular-nums">{fmt(p.totalRevenue)}</div>
                            <div className="text-[11px] text-[#4A6E7F] mt-0.5">cumulative</div>
                            <div className="mt-2 pt-2 border-t border-white/5">
                              <div className="text-sm font-bold text-emerald-400 tabular-nums">{fmt(p.arr)}</div>
                              <div className="text-[10px] text-[#4A6E7F]">proj. ARR</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#4A6E7F] mt-3">Based on {fmtExact(mrr)} MRR with 5% assumed monthly growth.</p>
                    </>
                  );
                })()}
              </Section>
            )}
          </div>
        </div>
      )}

      {/* ═══ REFUNDS & DISPUTES ═══ */}
      {data?.refunds && (
        <Section title="Refunds & Disputes" icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <StatBox value={data.refunds.refund_count_30d.toString()} label="Refunds (30d)" alert={data.refunds.refund_count_30d > 0} />
            <StatBox value={fmtExact(data.refunds.total_refunded_30d)} label="Refunded Amount" alert={data.refunds.total_refunded_30d > 0} />
            <StatBox value={data.refunds.dispute_count.toString()} label="Open Disputes" alert={data.refunds.dispute_count > 0} />
          </div>
          {data.refunds.recent_refunds?.length > 0 && (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left pb-3 pl-5 text-[11px] text-[#4A6E7F] font-semibold uppercase tracking-wider">Amount</th>
                    <th className="text-left pb-3 text-[11px] text-[#4A6E7F] font-semibold uppercase tracking-wider">Reason</th>
                    <th className="text-left pb-3 text-[11px] text-[#4A6E7F] font-semibold uppercase tracking-wider">Status</th>
                    <th className="text-left pb-3 pr-5 text-[11px] text-[#4A6E7F] font-semibold uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.refunds.recent_refunds.map((r: { id: string; amount: number; reason: string | null; status: string; created: string }) => (
                    <tr key={r.id} className="border-b border-white/[0.03]">
                      <td className="py-3 pl-5 text-sm text-amber-400 font-semibold tabular-nums">{fmtExact(r.amount)}</td>
                      <td className="py-3 text-xs text-[#8AACBC] capitalize">{r.reason?.replace('_', ' ') || 'N/A'}</td>
                      <td className="py-3 text-xs text-[#8AACBC] capitalize">{r.status}</td>
                      <td className="py-3 pr-5 text-xs text-[#6B8A9A]">{fmtDate(r.created)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.refunds.recent_refunds?.length === 0 && data.refunds.dispute_count === 0 && (
            <div className="flex items-center justify-center gap-2 py-6 text-[#4A6E7F] text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-400/40" /> No refunds or disputes. Looking good!
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   REUSABLE SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function KPICard({ icon, value, label, alert, badge }: {
  icon: React.ReactNode; value: string; label: string;
  alert?: boolean; badge?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border ${alert ? 'border-amber-500/30' : 'border-white/[0.06]'} bg-white/[0.02] p-5 relative overflow-hidden`}>
      <div className="flex items-center justify-between mb-3">{icon}{badge}</div>
      <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
      <div className="text-xs text-[#4A6E7F] font-medium mt-1">{label}</div>
    </div>
  );
}

function Section({ title, icon, badge, children }: {
  title: string; icon: React.ReactNode; badge?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <h2 className="text-sm font-bold text-[#D0E4EC] tracking-tight">{title}</h2>
        {badge && <div className="ml-auto">{badge}</div>}
      </div>
      {children}
    </div>
  );
}

function CollapsibleSection({ title, icon, badge, expanded, onToggle, children }: {
  title: string; icon: React.ReactNode; badge?: React.ReactNode;
  expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <button onClick={onToggle} className="w-full flex items-center gap-2 p-5 text-left hover:bg-white/[0.01] transition-colors rounded-2xl">
        {icon}
        <h2 className="text-sm font-bold text-[#D0E4EC] tracking-tight">{title}</h2>
        {badge && <div className="ml-auto mr-2">{badge}</div>}
        {expanded ? <ChevronUp className="w-4 h-4 text-[#4A6E7F]" /> : <ChevronDown className="w-4 h-4 text-[#4A6E7F]" />}
      </button>
      {expanded && <div className="px-5 pb-5 -mt-1">{children}</div>}
    </div>
  );
}

function MetricRow({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">{icon}<span className="text-sm text-[#8AACBC]">{label}</span></div>
      <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function StatBox({ value, label, sub, alert }: {
  value: string | number; label: string; sub?: string; alert?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 text-center">
      <div className={`text-lg font-bold tabular-nums ${alert ? 'text-amber-400' : 'text-white'}`}>{value}</div>
      <div className="text-[11px] text-[#4A6E7F] font-medium mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-[#4A6E7F] mt-0.5">{sub}</div>}
    </div>
  );
}

function ValuationCard({ label, value, sub, highlight }: {
  label: string; value: string; sub: string; highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
      <div className="text-[10px] text-[#4A6E7F] uppercase tracking-widest font-bold mb-1">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
      <div className="text-[11px] text-[#4A6E7F] mt-0.5">{sub}</div>
    </div>
  );
}
