'use client';

/**
 * Wave 5 B5 — Partner admin dashboard.
 *
 * Read-only view of a partner staff member's own partner metrics. Calls
 * `/partners/my-partners` to resolve which partners the current user
 * belongs to, then `/partners/{slug}/dashboard` for the authed metrics.
 *
 * Auth: gated by `ProtectedRoute`. The partners endpoint already enforces
 * staff-role access; this UI won't render data for non-staff.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Users,
  MessageCircle,
  ShieldCheck,
  Calendar,
  TrendingUp,
  Ticket,
  AlertCircle,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { fetchAPI } from '@/lib/api';

interface PartnerStaffInfo {
  partner_id: string;
  partner_slug: string;
  display_name: string;
  role: 'admin' | 'viewer';
}

interface PartnerMetrics {
  codes_distributed: number;
  codes_activated: number;
  activation_rate: number;
  active_users: number;
  messages_sent: number;
  aria_interventions: number;
  schedules_created: number;
  conflict_reduction_pct: number | null;
}

interface PartnerDashboardData {
  partner: {
    partner_slug: string;
    display_name: string;
    codes_remaining: number;
    is_active: boolean;
  };
  metrics: PartnerMetrics;
  period_start: string;
  period_end: string;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  helper,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value}</div>
      {helper && <div className="mt-1 text-xs text-muted-foreground">{helper}</div>}
    </div>
  );
}

function DashboardInner() {
  const [partners, setPartners] = useState<PartnerStaffInfo[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [data, setData] = useState<PartnerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await fetchAPI<PartnerStaffInfo[]>('/partners/my-partners');
        setPartners(rows);
        if (rows.length > 0) {
          setActiveSlug(rows[0].partner_slug);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load partner list');
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeSlug) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const payload = await fetchAPI<PartnerDashboardData>(
          `/partners/${activeSlug}/dashboard`,
        );
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [activeSlug]);

  const conflictPctLabel = useMemo(() => {
    const v = data?.metrics?.conflict_reduction_pct;
    if (v === null || v === undefined) return 'Not enough data yet';
    return `${v}%`;
  }, [data]);

  if (partners.length === 0 && !loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h1 className="text-xl font-bold">No partner access</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Your account isn&apos;t linked to a partner organization yet. If
          this looks wrong, contact your partner admin or{' '}
          <Link href="mailto:support@find-commonground.com" className="underline">
            support
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Partner dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Read-only snapshot of your partnership metrics. Updated in real time
            (with a 24h cache when the system is under load).
          </p>
        </div>
        {partners.length > 1 && (
          <select
            value={activeSlug ?? ''}
            onChange={(e) => setActiveSlug(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {partners.map((p) => (
              <option key={p.partner_slug} value={p.partner_slug}>
                {p.display_name}
              </option>
            ))}
          </select>
        )}
      </header>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !data && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Codes distributed"
              value={data.metrics.codes_distributed}
              icon={Ticket}
              helper={`${data.partner.codes_remaining} remaining`}
            />
            <MetricCard
              label="Activation rate"
              value={`${data.metrics.activation_rate}%`}
              icon={TrendingUp}
              helper={`${data.metrics.codes_activated} of ${data.metrics.codes_distributed} redeemed`}
            />
            <MetricCard
              label="Active users"
              value={data.metrics.active_users}
              icon={Users}
              helper="Clients using CommonGround"
            />
            <MetricCard
              label="Conflict reduction"
              value={conflictPctLabel}
              icon={ShieldCheck}
              helper="Calm messages vs. ARIA-flagged over 30 days"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Messages sent"
              value={data.metrics.messages_sent.toLocaleString()}
              icon={MessageCircle}
              helper="Co-parent messages in the last 30 days"
            />
            <MetricCard
              label="ARIA interventions"
              value={data.metrics.aria_interventions.toLocaleString()}
              icon={ShieldCheck}
              helper="Potentially harmful messages ARIA softened"
            />
            <MetricCard
              label="Schedules created"
              value={data.metrics.schedules_created}
              icon={Calendar}
              helper="Custody events set up by your clients"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Window: {new Date(data.period_start).toLocaleDateString()} &rarr;{' '}
            {new Date(data.period_end).toLocaleDateString()}. Metrics are
            anonymized — no individual user data is ever shown.
          </p>
        </>
      )}
    </div>
  );
}

export default function PartnerAdminDashboardPage() {
  return (
    <ProtectedRoute>
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <DashboardInner />
      </div>
    </ProtectedRoute>
  );
}
