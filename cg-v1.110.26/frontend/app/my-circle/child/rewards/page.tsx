'use client';

/**
 * Wave 3 C3 — Child-facing Rewards Store.
 *
 * Two tabs:
 *   Shop             — catalog of rewards the parent has created.
 *                      Child taps "Redeem" to spend wallet balance.
 *   My redemptions   — history of what they've redeemed,
 *                      with status pills (waiting / delivered / cancelled).
 *
 * Auth: requires a child JWT in localStorage (same gate as wallet / chores
 * pages). On redemption success we refresh the wallet balance header so
 * the child sees the new total immediately.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Gift,
  Loader2,
  PartyPopper,
  RefreshCw,
  Sparkles,
  Store,
  Wallet as WalletIcon,
  X,
} from 'lucide-react';
import {
  rewardsAPI,
  walletAPI,
  Reward,
  RewardRedemption,
  ChildWallet,
} from '@/lib/api';
import { safeCurrency } from '@/lib/format-utils';

type Tab = 'shop' | 'mine';

function redemptionStatusLabel(status: RewardRedemption['status']) {
  switch (status) {
    case 'requested':
      return 'Waiting for parent';
    case 'fulfilled':
      return 'Delivered ✓';
    case 'cancelled':
      return 'Cancelled';
  }
}

function redemptionStatusClass(status: RewardRedemption['status']) {
  switch (status) {
    case 'requested':
      return 'bg-cg-slate/30 text-cg-slate-light';
    case 'fulfilled':
      return 'bg-emerald-500/20 text-emerald-300';
    case 'cancelled':
      return 'bg-white/10 text-white/50';
  }
}

export default function ChildRewardsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('shop');
  const [catalog, setCatalog] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [wallet, setWallet] = useState<ChildWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [cat, mine, w] = await Promise.all([
        rewardsAPI.listCatalogAsChild(),
        rewardsAPI.listMyRedemptionsAsChild(),
        walletAPI.getMyChildWalletAsChild().catch(() => null),
      ]);
      setCatalog(cat);
      setRedemptions(mine);
      setWallet(w);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load rewards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('child_token') : null;
    if (!token) {
      router.replace('/my-circle/child');
      return;
    }
    load();
  }, [router, load]);

  const handleRedeem = async (reward: Reward) => {
    setRedeemingId(reward.id);
    setNotice(null);
    setError(null);
    try {
      const created = await rewardsAPI.redeemRewardAsChild(reward.id);
      setRedemptions((prev) => [created, ...prev]);
      // Refresh wallet + catalog (stock may have changed)
      try {
        const [w, cat] = await Promise.all([
          walletAPI.getMyChildWalletAsChild(),
          rewardsAPI.listCatalogAsChild(),
        ]);
        setWallet(w);
        setCatalog(cat);
      } catch {
        /* non-fatal */
      }
      setCelebrate(reward.title);
      // Auto-hide celebratory banner
      window.setTimeout(() => setCelebrate(null), 4000);
    } catch (err) {
      setNotice(
        err instanceof Error
          ? err.message
          : "That didn't work — try again in a bit"
      );
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cg-ink via-foreground to-cg-ink text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-cg-ink/80 backdrop-blur-md border-b border-cg-sage/10">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push('/my-circle/child/dashboard')}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div
            className="text-white font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Rewards Store
          </div>
          <button
            onClick={load}
            className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="max-w-3xl mx-auto px-4 pb-3 flex gap-2 text-xs">
          {(['shop', 'mine'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors flex items-center gap-1.5 ${
                tab === t
                  ? 'bg-cg-sage text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {t === 'shop' ? (
                <>
                  <Store className="h-3.5 w-3.5" />
                  Shop
                </>
              ) : (
                <>
                  <Gift className="h-3.5 w-3.5" />
                  My redemptions
                </>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Celebratory banner */}
        {celebrate && (
          <div
            className="rounded-2xl bg-gradient-to-br from-cg-sage to-cg-slate px-4 py-3 flex items-center gap-3 shadow-lg shadow-cg-sage/20"
            aria-live="polite"
          >
            <PartyPopper className="h-5 w-5 text-white flex-shrink-0" />
            <p
              className="text-white font-semibold text-sm"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Nice! You redeemed <span className="font-bold">{celebrate}</span>.
              A parent will get it to you soon.
            </p>
          </div>
        )}

        {/* Wallet summary */}
        {wallet && (
          <section className="rounded-2xl border border-cg-sage/15 bg-foreground/60 px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cg-sage to-cg-slate flex items-center justify-center">
              <WalletIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/60 text-xs">Your balance</p>
              <p
                className="text-white font-bold text-lg"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {safeCurrency(wallet.balance)}
              </p>
            </div>
          </section>
        )}

        {error && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 text-sm flex items-start gap-2">
            <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-cg-sage" />
          </div>
        ) : tab === 'shop' ? (
          <ShopTab
            catalog={catalog}
            onRedeem={handleRedeem}
            redeemingId={redeemingId}
            walletBalance={wallet?.balance}
          />
        ) : (
          <MyRedemptionsTab
            redemptions={redemptions}
            catalog={catalog}
          />
        )}
      </main>
    </div>
  );
}

/* ---------- Shop tab ---------- */

function ShopTab({
  catalog,
  onRedeem,
  redeemingId,
  walletBalance,
}: {
  catalog: Reward[];
  onRedeem: (r: Reward) => void;
  redeemingId: string | null;
  walletBalance?: string | number;
}) {
  if (catalog.length === 0) {
    return (
      <div className="rounded-2xl border border-cg-sage/15 bg-foreground/40 px-4 py-10 text-center">
        <Store className="h-8 w-8 text-white/40 mx-auto mb-2" />
        <p className="text-white/70 text-sm">
          No rewards yet — ask a parent to add some!
        </p>
      </div>
    );
  }

  const balanceNum = Number(walletBalance ?? 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {catalog.map((reward) => {
        const cost = Number(reward.cost_amount);
        const canAfford = balanceNum >= cost;
        const outOfStock =
          reward.stock_limit !== null && reward.stock_limit !== undefined && reward.stock_limit <= 0;
        const isRedeeming = redeemingId === reward.id;
        const disabled = isRedeeming || !canAfford || outOfStock;

        return (
          <div
            key={reward.id}
            className="rounded-2xl border border-cg-sage/15 bg-foreground/60 px-4 py-4 flex flex-col"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cg-amber to-[#E8941E] flex items-center justify-center text-2xl flex-shrink-0">
                {reward.image_emoji || '🎁'}
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className="text-white font-bold truncate"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {reward.title}
                </h3>
                <p className="text-cg-sage font-bold text-sm">
                  {safeCurrency(reward.cost_amount)}
                </p>
                {reward.stock_limit !== null && reward.stock_limit !== undefined && (
                  <p className="text-white/50 text-xs mt-0.5">
                    {reward.stock_limit > 0
                      ? `${reward.stock_limit} left`
                      : 'Sold out for now'}
                  </p>
                )}
              </div>
            </div>
            {reward.description && (
              <p className="text-white/70 text-sm mb-3 flex-1">
                {reward.description}
              </p>
            )}
            <button
              onClick={() => onRedeem(reward)}
              disabled={disabled}
              className="mt-auto w-full flex items-center justify-center gap-2 bg-cg-sage hover:bg-cg-sage/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
            >
              {isRedeeming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Gift className="h-4 w-4" />
              )}
              {outOfStock
                ? 'Sold out'
                : !canAfford
                  ? 'Save up a bit more'
                  : 'Redeem'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- My redemptions tab ---------- */

function MyRedemptionsTab({
  redemptions,
  catalog,
}: {
  redemptions: RewardRedemption[];
  catalog: Reward[];
}) {
  if (redemptions.length === 0) {
    return (
      <div className="rounded-2xl border border-cg-sage/15 bg-foreground/40 px-4 py-10 text-center">
        <Gift className="h-8 w-8 text-white/40 mx-auto mb-2" />
        <p className="text-white/70 text-sm">
          Nothing redeemed yet. Pick something from the shop!
        </p>
      </div>
    );
  }

  // Build a title lookup so we don't render a bare id
  const rewardById = new Map(catalog.map((r) => [r.id, r]));

  return (
    <ul className="space-y-3">
      {redemptions.map((r) => {
        const reward = rewardById.get(r.reward_id);
        return (
          <li
            key={r.id}
            className="rounded-2xl border border-cg-sage/15 bg-foreground/60 px-4 py-3 flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cg-amber to-[#E8941E] flex items-center justify-center text-xl flex-shrink-0">
              {reward?.image_emoji || '🎁'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p
                  className="text-white font-semibold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {reward?.title || 'Reward'}
                </p>
                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${redemptionStatusClass(r.status)}`}
                >
                  {redemptionStatusLabel(r.status)}
                </span>
              </div>
              <p className="text-cg-sage text-xs font-bold mt-0.5">
                {safeCurrency(r.cost_at_redemption)}
              </p>
              <p className="text-white/50 text-xs mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(r.created_at).toLocaleDateString()}
              </p>
              {r.status === 'cancelled' && (
                <p className="mt-1 text-white/60 text-xs flex items-center gap-1">
                  <X className="h-3 w-3" />
                  Refunded back to your wallet.
                </p>
              )}
              {r.status === 'fulfilled' && (
                <p className="mt-1 text-emerald-300 text-xs flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Enjoy!
                </p>
              )}
              {r.notes && (
                <p className="mt-1 text-white/70 text-xs italic">
                  &ldquo;{r.notes}&rdquo;
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
