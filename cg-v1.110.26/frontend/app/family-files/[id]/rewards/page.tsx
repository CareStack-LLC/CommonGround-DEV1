'use client';

/**
 * Wave 3 C3 — Parent-facing Rewards catalog + redemption queue.
 *
 * Two sections, side-by-side on desktop:
 *   1. Catalog — every reward (active + inactive) the parent has created.
 *      Cards support inline edit, active toggle, and soft-delete.
 *   2. Redemptions — pending queue where a parent marks redemptions fulfilled
 *      or cancels them (which refunds the child's wallet).
 *
 * Uses the main app's light-theme layout (Navigation + PageContainer). Same
 * access pattern as sibling parent pages under /family-files/[id]/*.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Gift,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Store,
  Trash2,
  X,
  XCircle,
  Edit2,
  Power,
} from 'lucide-react';
import {
  rewardsAPI,
  familyFilesAPI,
  Reward,
  RewardRedemption,
  FamilyFileChild,
} from '@/lib/api';
import { safeCurrency } from '@/lib/format-utils';
import { Navigation } from '@/components/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { PageContainer } from '@/components/layout';

const EMOJI_CHOICES = ['🎁', '🍦', '🍕', '🎮', '🎬', '📚', '🧸', '⚽️', '🎨', '🚲', '💵', '⭐️'];

function redemptionStatusLabel(status: RewardRedemption['status']) {
  switch (status) {
    case 'requested':
      return 'Pending';
    case 'fulfilled':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
  }
}

function redemptionStatusBadgeClass(status: RewardRedemption['status']) {
  switch (status) {
    case 'requested':
      return 'bg-cg-amber-subtle text-[#E09520] border border-cg-amber-subtle';
    case 'fulfilled':
      return 'bg-cg-sage-subtle text-cg-sage-dark border border-cg-sage-subtle';
    case 'cancelled':
      return 'bg-muted text-muted-foreground border border-border';
  }
}

export default function ParentRewardsPage() {
  const params = useParams();
  const router = useRouter();
  const familyFileId = params.id as string;

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [children, setChildren] = useState<FamilyFileChild[]>([]);
  const [familyTitle, setFamilyTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Reward | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [family, rwList, reds] = await Promise.all([
        familyFilesAPI.get(familyFileId),
        rewardsAPI.listRewards(familyFileId, true),
        rewardsAPI.listRedemptions(familyFileId),
      ]);
      setFamilyTitle(family.title);
      setChildren(family.children || []);
      setRewards(rwList);
      setRedemptions(reds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rewards');
    } finally {
      setLoading(false);
    }
  }, [familyFileId]);

  useEffect(() => {
    load();
  }, [load]);

  const childById = useMemo(
    () => new Map(children.map((c) => [c.id, c])),
    [children]
  );
  const rewardById = useMemo(
    () => new Map(rewards.map((r) => [r.id, r])),
    [rewards]
  );

  const pendingRedemptions = redemptions.filter((r) => r.status === 'requested');
  const redemptionHistory = redemptions.filter((r) => r.status !== 'requested');

  const toggleActive = async (reward: Reward) => {
    setActingId(reward.id);
    try {
      const updated = await rewardsAPI.updateReward(reward.id, {
        is_active: !reward.is_active,
      });
      setRewards((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update');
    } finally {
      setActingId(null);
    }
  };

  const deleteReward = async (reward: Reward) => {
    if (
      !window.confirm(
        `Remove "${reward.title}" from the catalog? Children won't see it anymore.`
      )
    )
      return;
    setActingId(reward.id);
    try {
      await rewardsAPI.deleteReward(reward.id);
      setRewards((prev) => prev.filter((r) => r.id !== reward.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove');
    } finally {
      setActingId(null);
    }
  };

  const fulfill = async (red: RewardRedemption) => {
    setActingId(red.id);
    try {
      const updated = await rewardsAPI.fulfillRedemption(red.id);
      setRedemptions((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark fulfilled');
    } finally {
      setActingId(null);
    }
  };

  const cancelRedemption = async (red: RewardRedemption) => {
    if (
      !window.confirm(
        'Cancel this redemption and refund the child? This cannot be undone.'
      )
    )
      return;
    setActingId(red.id);
    try {
      const updated = await rewardsAPI.cancelRedemption(red.id);
      setRedemptions((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel');
    } finally {
      setActingId(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <Navigation />
        <PageContainer background="transparent">
          {/* Header */}
          <div className="flex items-start gap-4 mb-8">
            <button aria-label="Back"
              onClick={() => router.push(`/family-files/${familyFileId}`)}
              className="w-10 h-10 rounded-lg hover:bg-muted flex items-center justify-center transition-colors mt-1"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="flex-1">
              <h1
                className="text-3xl font-bold text-foreground flex items-center gap-3"
                style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cg-sage/10 to-cg-slate/5 flex items-center justify-center shadow-md">
                  <Gift className="h-6 w-6 text-cg-sage" />
                </div>
                Rewards Store
              </h1>
              <p className="text-muted-foreground font-medium mt-1">
                Create rewards and approve redemptions for{' '}
                {familyTitle || 'your family'}
              </p>
            </div>
            <button
              onClick={load}
              className="w-10 h-10 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="cg-btn-primary flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <Plus className="h-4 w-4" />
              Add reward
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-cg-error-subtle border-2 border-cg-error-subtle rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-cg-error" />
                <p className="text-[#9B2C2C] font-medium">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-cg-sage" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Catalog */}
              <section className="bg-card border-2 border-border rounded-2xl shadow-lg p-6">
                <h2
                  className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  <Store className="h-5 w-5 text-cg-sage" />
                  Catalog
                  <span className="ml-auto text-xs font-medium text-muted-foreground">
                    {rewards.filter((r) => r.is_active).length} active
                  </span>
                </h2>

                {rewards.length === 0 ? (
                  <div className="text-center py-10">
                    <Gift className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-foreground font-bold mb-1">
                      No rewards yet
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add a reward so kids have something to save up for.
                    </p>
                    <button
                      onClick={() => setShowCreate(true)}
                      className="cg-btn-primary inline-flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add your first reward
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {rewards.map((reward) => (
                      <RewardCard
                        key={reward.id}
                        reward={reward}
                        isEditing={editing?.id === reward.id}
                        onStartEdit={() => setEditing(reward)}
                        onCancelEdit={() => setEditing(null)}
                        onSaved={(u) => {
                          setRewards((prev) =>
                            prev.map((r) => (r.id === u.id ? u : r))
                          );
                          setEditing(null);
                        }}
                        onToggle={() => toggleActive(reward)}
                        onDelete={() => deleteReward(reward)}
                        busy={actingId === reward.id}
                      />
                    ))}
                  </ul>
                )}
              </section>

              {/* Redemption queue */}
              <section className="bg-card border-2 border-border rounded-2xl shadow-lg p-6">
                <h2
                  className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  <Package className="h-5 w-5 text-[#E09520]" />
                  To fulfill
                  {pendingRedemptions.length > 0 && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-cg-amber-subtle text-[#E09520] border border-cg-amber-subtle">
                      {pendingRedemptions.length}
                    </span>
                  )}
                </h2>

                {pendingRedemptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No pending redemptions. Everything is delivered.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {pendingRedemptions.map((red) => {
                      const reward = rewardById.get(red.reward_id);
                      const child = childById.get(red.child_id);
                      const busy = actingId === red.id;
                      return (
                        <li
                          key={red.id}
                          className="rounded-xl border-2 border-cg-amber-subtle bg-cg-amber-subtle/50 p-4"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cg-amber to-[#E8941E] flex items-center justify-center text-xl flex-shrink-0">
                              {reward?.image_emoji || '🎁'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-foreground">
                                {reward?.title || 'Reward'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                For{' '}
                                {child?.preferred_name ||
                                  child?.first_name ||
                                  'child'}{' '}
                                • {new Date(red.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-cg-sage flex-shrink-0">
                              {safeCurrency(red.cost_at_redemption)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => fulfill(red)}
                              disabled={busy}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-cg-sage hover:bg-cg-sage-dark text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50"
                            >
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                              Mark fulfilled
                            </button>
                            <button
                              onClick={() => cancelRedemption(red)}
                              disabled={busy}
                              className="flex items-center justify-center gap-1.5 border-2 border-cg-amber bg-white hover:bg-cg-amber-subtle text-[#E09520] text-sm font-semibold px-3 py-2 rounded-lg disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                              Cancel &amp; refund
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* History */}
              <section className="bg-card border-2 border-border rounded-2xl shadow-lg p-6 lg:col-span-2">
                <h2
                  className="text-lg font-bold text-foreground mb-4"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  Redemption history
                </h2>
                {redemptionHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Delivered and cancelled redemptions will appear here.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {redemptionHistory.map((red) => {
                      const reward = rewardById.get(red.reward_id);
                      const child = childById.get(red.child_id);
                      const when =
                        red.fulfilled_at || red.updated_at || red.created_at;
                      return (
                        <li
                          key={red.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xl flex-shrink-0">
                              {reward?.image_emoji || '🎁'}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {reward?.title || 'Reward'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {child?.preferred_name ||
                                  child?.first_name ||
                                  'Child'}{' '}
                                • {new Date(when).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-bold text-cg-sage">
                              {safeCurrency(red.cost_at_redemption)}
                            </span>
                            <span
                              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${redemptionStatusBadgeClass(red.status)}`}
                            >
                              {redemptionStatusLabel(red.status)}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          )}
        </PageContainer>

        {showCreate && (
          <RewardFormModal
            title="New reward"
            familyFileId={familyFileId}
            onClose={() => setShowCreate(false)}
            onSaved={(r) => {
              setRewards((prev) => [r, ...prev]);
              setShowCreate(false);
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

/* ───────── Reward card with inline edit ───────── */

function RewardCard({
  reward,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaved,
  onToggle,
  onDelete,
  busy,
}: {
  reward: Reward;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaved: (r: Reward) => void;
  onToggle: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  if (isEditing) {
    return (
      <li>
        <RewardFormInline
          reward={reward}
          onCancel={onCancelEdit}
          onSaved={onSaved}
        />
      </li>
    );
  }

  return (
    <li
      className={`rounded-xl border-2 p-4 ${reward.is_active ? 'border-border bg-muted/30' : 'border-dashed border-border bg-muted/10 opacity-70'}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cg-amber to-[#E8941E] flex items-center justify-center text-2xl flex-shrink-0">
          {reward.image_emoji || '🎁'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-foreground">{reward.title}</p>
            {!reward.is_active && (
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                Hidden
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-cg-sage">
            {safeCurrency(reward.cost_amount)}
          </p>
          {reward.description && (
            <p className="text-sm text-foreground/80 mt-1">
              {reward.description}
            </p>
          )}
          {reward.stock_limit !== null && reward.stock_limit !== undefined && (
            <p className="text-xs text-muted-foreground mt-1">
              Stock: {reward.stock_limit}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={onStartEdit}
            disabled={busy}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
            aria-label="Edit reward"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggle}
            disabled={busy}
            className={`p-1.5 rounded-md hover:bg-muted ${reward.is_active ? 'text-cg-sage' : 'text-muted-foreground'}`}
            aria-label={reward.is_active ? 'Hide reward' : 'Show reward'}
            title={reward.is_active ? 'Hide from children' : 'Show to children'}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Power className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            className="p-1.5 rounded-md hover:bg-cg-error-subtle text-cg-error"
            aria-label="Delete reward"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}

/* ───────── Inline edit form ───────── */

function RewardFormInline({
  reward,
  onCancel,
  onSaved,
}: {
  reward: Reward;
  onCancel: () => void;
  onSaved: (r: Reward) => void;
}) {
  const [title, setTitle] = useState(reward.title);
  const [description, setDescription] = useState(reward.description || '');
  const [cost, setCost] = useState(String(reward.cost_amount));
  const [emoji, setEmoji] = useState(reward.image_emoji || '🎁');
  const [stock, setStock] = useState(
    reward.stock_limit !== null && reward.stock_limit !== undefined
      ? String(reward.stock_limit)
      : ''
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) {
      setErr('Title is required.');
      return;
    }
    const costNum = Number(cost);
    if (!Number.isFinite(costNum) || costNum < 0) {
      setErr('Cost must be a number.');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const patch: Parameters<typeof rewardsAPI.updateReward>[1] = {
        title: title.trim(),
        description: description.trim() || undefined,
        image_emoji: emoji || undefined,
        cost_amount: costNum,
      };
      if (stock !== '') {
        const s = Number(stock);
        if (Number.isFinite(s) && s >= 0) patch.stock_limit = s;
      }
      const updated = await rewardsAPI.updateReward(reward.id, patch);
      onSaved(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-cg-sage/30 bg-cg-sage/5 p-4 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {EMOJI_CHOICES.map((e) => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            className={`w-9 h-9 rounded-lg text-xl transition-all ${emoji === e ? 'bg-cg-sage ring-2 ring-cg-sage' : 'bg-white border border-border hover:border-cg-sage/50'}`}
            type="button"
          >
            {e}
          </button>
        ))}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cg-sage/40"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        placeholder="Description (optional)"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cg-sage/40"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          step="0.01"
          min="0"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="Cost"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cg-sage/40"
        />
        <input
          type="number"
          step="1"
          min="0"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          placeholder="Stock (optional)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cg-sage/40"
        />
      </div>
      {err && <p className="text-xs text-cg-error">{err}</p>}
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 bg-cg-sage hover:bg-cg-sage/90 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ───────── Create modal (wraps the same form fields) ───────── */

function RewardFormModal({
  title: modalTitle,
  familyFileId,
  onClose,
  onSaved,
}: {
  title: string;
  familyFileId: string;
  onClose: () => void;
  onSaved: (r: Reward) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [emoji, setEmoji] = useState('🎁');
  const [stock, setStock] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) {
      setErr('Please give the reward a title.');
      return;
    }
    const costNum = Number(cost);
    if (!Number.isFinite(costNum) || costNum <= 0) {
      setErr('Please enter a cost greater than 0.');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const payload: Parameters<typeof rewardsAPI.createReward>[0] = {
        family_file_id: familyFileId,
        title: title.trim(),
        cost_amount: costNum,
      };
      if (description.trim()) payload.description = description.trim();
      if (emoji) payload.image_emoji = emoji;
      if (stock !== '') {
        const s = Number(stock);
        if (Number.isFinite(s) && s >= 0) payload.stock_limit = s;
      }
      const created = await rewardsAPI.createReward(payload);
      onSaved(created);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create reward');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            {modalTitle}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">
              Icon
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-lg text-2xl transition-all ${emoji === e ? 'bg-cg-sage/20 ring-2 ring-cg-sage' : 'bg-muted border border-border hover:border-cg-sage/50'}`}
                  type="button"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Extra screen time"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cg-sage/40"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. 30 extra minutes after homework"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cg-sage/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">
                Cost
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="5.00"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cg-sage/40"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">
                Stock (optional)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="Unlimited"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cg-sage/40"
              />
            </div>
          </div>

          {err && (
            <div className="bg-cg-error-subtle border border-cg-error-subtle text-[#9B2C2C] rounded-lg px-3 py-2 text-sm">
              {err}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={submit}
              disabled={submitting || !title.trim() || !cost}
              className="flex-1 cg-btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create
            </button>
            <button onClick={onClose} className="cg-btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
