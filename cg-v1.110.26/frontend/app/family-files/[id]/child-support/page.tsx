'use client';

/**
 * Wave 4-Alt — Child Support Tracking page.
 *
 * CommonGround does NOT process child-support money. Parents pay their
 * state SDU directly via the state portal. This page:
 *   1. Shows the user their state's SDU with a deep link to the portal
 *   2. Lets them record a payment they just made (amount, date, confirmation #)
 *   3. Shows the ledger of logged payments for court/parent visibility
 *   4. Lets the other parent contest a log if they disagree
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Flag,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  sduAPI,
  SduInfo,
  ChildSupportPaymentLog,
  familyFilesAPI,
} from '@/lib/api';
import { safeCurrency } from '@/lib/format-utils';
import { useAuth } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';

function todayIsoDate(): string {
  const d = new Date();
  // yyyy-mm-dd, rendered as naive ISO for <input type="date">
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function statusLabel(log: ChildSupportPaymentLog): { text: string; tone: string } {
  switch (log.status) {
    case 'verified':
      return { text: 'Verified', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    case 'contested':
      return { text: 'Contested', tone: 'text-red-700 bg-red-50 border-red-200' };
    case 'voided':
      return { text: 'Voided', tone: 'text-slate-600 bg-slate-100 border-slate-200' };
    default:
      return { text: 'Logged', tone: 'text-slate-700 bg-slate-50 border-slate-200' };
  }
}

function ChildSupportTrackingInner() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const familyFileId = params.id as string;

  const [states, setStates] = useState<SduInfo[]>([]);
  const [selectedState, setSelectedState] = useState<string>('CA');
  const [sdu, setSdu] = useState<SduInfo | null>(null);

  const [logs, setLogs] = useState<ChildSupportPaymentLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const [showLogForm, setShowLogForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New-log form fields
  const [county, setCounty] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayIsoDate());
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [channel, setChannel] = useState<'sdu' | 'informal'>('sdu');
  const [notes, setNotes] = useState('');

  const loadStates = useCallback(async () => {
    try {
      const rows = await sduAPI.listStates();
      setStates(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load state directory');
    }
  }, []);

  // Pre-fill the parent's state from the family file if available.
  useEffect(() => {
    (async () => {
      try {
        const ff = await familyFilesAPI.get(familyFileId);
        // If the user has a state on their profile, prefer that — else CA
        // as a sane default (our registry's anchor).
        const userState = (user as { timezone?: string; state?: string } | null)?.state;
        const initial = (userState || 'CA').toUpperCase();
        setSelectedState(initial.length === 2 ? initial : 'CA');
        void ff; // retained for future (e.g. auto-fill county from case jurisdiction)
      } catch {
        // non-fatal
      }
    })();
  }, [familyFileId, user]);

  // Fetch the selected SDU's details whenever the state changes.
  useEffect(() => {
    if (!selectedState) return;
    (async () => {
      try {
        const info = await sduAPI.getState(selectedState);
        setSdu(info);
      } catch (err) {
        console.warn('SDU lookup failed', err);
        setSdu(null);
      }
    })();
  }, [selectedState]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const rows = await sduAPI.listPaymentLogs({ family_file_id: familyFileId });
      setLogs(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load payment history');
    } finally {
      setLoadingLogs(false);
    }
  }, [familyFileId]);

  useEffect(() => {
    loadStates();
    loadLogs();
  }, [loadStates, loadLogs]);

  const totalLogged = useMemo(
    () =>
      logs
        .filter((l) => l.status !== 'voided' && l.status !== 'contested')
        .reduce((sum, l) => sum + Number(l.amount || 0), 0),
    [logs],
  );

  const handleOpenSduPortal = () => {
    if (!sdu) return;
    window.open(sdu.sdu_url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setSubmitting(true);
    try {
      const paymentIsoDate = new Date(paymentDate).toISOString();
      await sduAPI.createPaymentLog({
        family_file_id: familyFileId,
        state_code: selectedState,
        county: county || undefined,
        amount: Number(amount),
        payment_date: paymentIsoDate,
        confirmation_number: confirmationNumber || undefined,
        receipt_url: receiptUrl || undefined,
        payment_channel: channel,
        notes: notes || undefined,
      });
      setAmount('');
      setConfirmationNumber('');
      setReceiptUrl('');
      setCounty('');
      setNotes('');
      setShowLogForm(false);
      await loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save payment log');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContest = async (log: ChildSupportPaymentLog) => {
    const reason = window.prompt('Why are you contesting this payment?');
    if (!reason || reason.trim().length < 3) return;
    try {
      await sduAPI.contestPaymentLog(log.id, reason.trim());
      await loadLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not contest payment');
    }
  };

  const handleVerify = async (log: ChildSupportPaymentLog) => {
    try {
      await sduAPI.verifyPaymentLog(log.id);
      await loadLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not verify payment');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(`/family-files/${familyFileId}`)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to family file
          </button>
          <button
            onClick={loadLogs}
            className="p-2 rounded-md hover:bg-muted"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <header>
          <h1 className="text-2xl font-bold">Child support tracking</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            CommonGround doesn&apos;t process child-support payments — your state does,
            through its State Disbursement Unit. Pay through the state portal,
            then log it here so both parents (and the court) see the record.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* SDU card */}
        <section className="rounded-2xl border bg-card border-border p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Pay through your state SDU
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose your state, open the portal, and make your payment there.
                When you&apos;re back, use the log form below to record it.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[240px_1fr]">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">State</span>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {states.map((s) => (
                  <option key={s.state_code} value={s.state_code}>
                    {s.state_name}
                  </option>
                ))}
              </select>
            </label>

            {sdu && (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="font-medium">{sdu.sdu_name}</p>
                {sdu.notes && (
                  <p className="text-xs text-muted-foreground mt-1">{sdu.notes}</p>
                )}
                {sdu.phone && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Phone: {sdu.phone}
                  </p>
                )}
                {sdu.requires_county && (
                  <p className="text-xs text-amber-700 mt-1">
                    This state routes by county — have your county ready.
                  </p>
                )}
                {!sdu.accepts_online && (
                  <p className="text-xs text-amber-700 mt-1">
                    Online payments aren&apos;t available for this state — you may
                    need to mail a money order.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={handleOpenSduPortal}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open {sdu.state_name} SDU
                  </button>
                  <a
                    href={sdu.info_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    <FileText className="h-4 w-4" />
                    More info
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Payment log form toggle */}
        <section className="rounded-2xl border bg-card border-border p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Log a payment</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Already paid? Record it for the other parent and the court.
              </p>
            </div>
            <button
              onClick={() => setShowLogForm((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90"
            >
              {showLogForm ? (
                <>
                  <X className="h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  New log
                </>
              )}
            </button>
          </div>

          {showLogForm && (
            <form onSubmit={handleSubmitLog} className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-1">
                <span className="text-xs font-medium text-muted-foreground">Amount ($)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block md:col-span-1">
                <span className="text-xs font-medium text-muted-foreground">Payment date</span>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block md:col-span-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Confirmation # <span className="text-muted-foreground/60">(recommended)</span>
                </span>
                <input
                  type="text"
                  value={confirmationNumber}
                  onChange={(e) => setConfirmationNumber(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="From the SDU portal"
                />
              </label>
              <label className="block md:col-span-1">
                <span className="text-xs font-medium text-muted-foreground">
                  County <span className="text-muted-foreground/60">(if applicable)</span>
                </span>
                <input
                  type="text"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block md:col-span-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Receipt URL <span className="text-muted-foreground/60">(optional)</span>
                </span>
                <input
                  type="url"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  placeholder="https://…"
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block md:col-span-1">
                <span className="text-xs font-medium text-muted-foreground">Channel</span>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as 'sdu' | 'informal')}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="sdu">Paid through SDU</option>
                  <option value="informal">Informal / direct pay</option>
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Notes <span className="text-muted-foreground/60">(optional)</span>
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save log entry
                </button>
              </div>
            </form>
          )}
        </section>

        {/* History */}
        <section className="rounded-2xl border bg-card border-border p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Payment history</h2>
            <div className="text-sm text-muted-foreground">
              {logs.length} {logs.length === 1 ? 'entry' : 'entries'} ·{' '}
              <span className="font-semibold">{safeCurrency(totalLogged)}</span> total
            </div>
          </div>

          {loadingLogs ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No payments logged yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {logs.map((log) => {
                const badge = statusLabel(log);
                const loggedByMe = log.logged_by === user?.id;
                const canContest = !loggedByMe && log.status === 'logged';
                const canVerify =
                  loggedByMe && log.status === 'logged' && log.confirmation_number;
                return (
                  <li key={log.id} className="py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">
                          {safeCurrency(log.amount)}
                        </span>
                        <span
                          className={`text-[11px] uppercase font-medium px-2 py-0.5 rounded-full border ${badge.tone}`}
                        >
                          {badge.text}
                        </span>
                        {log.payment_channel === 'informal' && (
                          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            Informal
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {new Date(log.payment_date).toLocaleDateString()} ·{' '}
                        {log.state_code}
                        {log.county ? `, ${log.county}` : ''}
                      </div>
                      {log.confirmation_number && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Confirmation: {log.confirmation_number}
                        </div>
                      )}
                      {log.notes && (
                        <div className="text-sm mt-1">{log.notes}</div>
                      )}
                      {log.status === 'contested' && log.contested_reason && (
                        <div className="mt-1 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1">
                          Contested: {log.contested_reason}
                        </div>
                      )}
                      {log.receipt_url && (
                        <Link
                          href={log.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          <FileText className="h-3 w-3" />
                          View receipt
                        </Link>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {canContest && (
                        <button
                          onClick={() => handleContest(log)}
                          className="text-xs inline-flex items-center gap-1 text-red-700 hover:text-red-800"
                        >
                          <Flag className="h-3 w-3" />
                          Contest
                        </button>
                      )}
                      {canVerify && (
                        <button
                          onClick={() => handleVerify(log)}
                          className="text-xs inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Mark verified
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ChildSupportTrackingPage() {
  return (
    <ProtectedRoute>
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <ChildSupportTrackingInner />
      </div>
    </ProtectedRoute>
  );
}
