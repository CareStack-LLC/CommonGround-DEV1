'use client';

/**
 * Wave 3 C1 / 3.5 D3 — Child-facing wallet page.
 *
 * Read-only view of the child's own balance + recent gifts. Authenticated
 * via child-user JWT (PIN login). Children can NOT initiate transfers here
 * — spending requires parent approval flows that haven't shipped yet.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Wallet,
  Gift,
  Sparkles,
  Loader2,
  RefreshCw,
  Heart,
} from 'lucide-react';
import { walletAPI, ChildWallet } from '@/lib/api';
import { safeCurrency } from '@/lib/format-utils';

export default function ChildWalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<ChildWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await walletAPI.getMyChildWalletAsChild();
      setWallet(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load your wallet';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // If the child hasn't logged in yet, bounce them to PIN login.
    const token = typeof window !== 'undefined' ? localStorage.getItem('child_token') : null;
    if (!token) {
      router.replace('/my-circle/child');
      return;
    }
    load();
  }, [router, load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cg-ink via-foreground to-cg-ink flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cg-sage" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cg-ink via-foreground to-cg-ink text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-cg-ink/80 backdrop-blur-md border-b border-cg-sage/10">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push('/my-circle/child/dashboard')}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div
            className="text-white font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            My Wallet
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {wallet && (
          <>
            {/* Hero balance card */}
            <section
              className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-cg-sage to-cg-slate shadow-lg shadow-cg-sage/20"
              aria-live="polite"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className="text-white/80 text-sm"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Hi {wallet.child_name || 'there'} — your balance
                  </p>
                  <p
                    className="mt-2 text-5xl font-extrabold tracking-tight text-white"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {safeCurrency(wallet.balance)}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-white/80 text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <Gift className="h-3.5 w-3.5" />
                      {wallet.contribution_count ?? 0}{' '}
                      {wallet.contribution_count === 1 ? 'gift' : 'gifts'}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      {safeCurrency(wallet.total_received)} total received
                    </span>
                  </div>
                </div>
                <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/15 items-center justify-center">
                  <Wallet className="h-7 w-7 text-white" />
                </div>
              </div>

              <p
                className="mt-5 text-white/80 text-sm"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Ask a parent before you want to spend any of this.
              </p>
            </section>

            {/* Recent gifts */}
            <section>
              <h2
                className="text-white/90 font-bold text-sm mb-3"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Recent gifts
              </h2>

              {wallet.recent_contributions && wallet.recent_contributions.length > 0 ? (
                <ul className="space-y-2">
                  {wallet.recent_contributions.map((gift) => (
                    <li
                      key={gift.id}
                      className="rounded-2xl border border-cg-sage/15 bg-foreground/60 px-4 py-3 flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cg-amber to-[#E8941E] flex items-center justify-center flex-shrink-0">
                        <Heart className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className="text-white font-semibold truncate"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                          >
                            {gift.contributor_name || 'A friend'}
                          </p>
                          <p
                            className="text-cg-sage font-bold"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            +{safeCurrency(gift.net_amount ?? gift.amount)}
                          </p>
                        </div>
                        {gift.message && (
                          <p
                            className="text-white/70 text-sm mt-1 break-words"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                          >
                            &ldquo;{gift.message}&rdquo;
                          </p>
                        )}
                        {gift.purpose && (
                          <p className="text-white/50 text-xs mt-1">
                            For: {gift.purpose}
                          </p>
                        )}
                        {gift.status !== 'completed' && (
                          <p className="text-amber-300 text-xs mt-1">
                            Pending — will clear soon
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-cg-sage/15 bg-foreground/40 px-4 py-8 text-center">
                  <Gift className="h-8 w-8 text-white/40 mx-auto mb-2" />
                  <p className="text-white/70 text-sm">
                    No gifts yet — share your family file link so grandparents
                    and friends can send you something.
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
