'use client';

/**
 * Wave 3 C2 — Parent-facing Chores & Tasks management.
 *
 * Single page that lets a parent:
 *   • Create a chore for a specific child (title / description / reward / due date)
 *   • See a queue of chores the child marked done, and approve or reject them
 *   • Edit or cancel pending chores
 *   • Watch the full list with status pills for transparency
 *
 * Uses the main app's light-theme layout (Navigation + PageContainer), same as
 * sibling parent pages under /family-files/[id]/*. Children come from
 * familyFilesAPI.get(id).children — no separate child list endpoint needed.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Clock,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
  XCircle,
  ZoomIn,
} from 'lucide-react';
import {
  choresAPI,
  familyFilesAPI,
  Chore,
  FamilyFileChild,
} from '@/lib/api';
import { safeCurrency } from '@/lib/format-utils';
import { Navigation } from '@/components/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { PageContainer } from '@/components/layout';

function statusLabel(status: Chore['status']) {
  switch (status) {
    case 'pending':
      return 'In progress';
    case 'completed':
      return 'Needs review';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Sent back';
    case 'cancelled':
      return 'Cancelled';
  }
}

function statusBadgeClass(status: Chore['status']) {
  switch (status) {
    case 'pending':
      return 'bg-[#3DAA8A]/10 text-[#2F8569] border border-[#3DAA8A]/30';
    case 'completed':
      return 'bg-[#FEF7ED] text-[#E09520] border border-[#FEF7ED]';
    case 'approved':
      return 'bg-[#E8F4F0] text-[#2D8A70] border border-[#E8F4F0]';
    case 'rejected':
      return 'bg-[#FEF7ED] text-[#E09520] border border-[#FEF7ED]';
    case 'cancelled':
      return 'bg-muted text-muted-foreground border border-border';
  }
}

export default function ParentChoresPage() {
  const params = useParams();
  const router = useRouter();
  const familyFileId = params.id as string;

  const [children, setChildren] = useState<FamilyFileChild[]>([]);
  const [familyTitle, setFamilyTitle] = useState('');
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Chore | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  // Full-screen photo preview for the proof-of-completion thumbnail.
  const [photoModal, setPhotoModal] = useState<{ url: string; title: string } | null>(
    null
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const [family, rows] = await Promise.all([
        familyFilesAPI.get(familyFileId),
        choresAPI.listChores({ family_file_id: familyFileId }),
      ]);
      setFamilyTitle(family.title);
      setChildren(family.children || []);
      setChores(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chores');
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

  const reviewQueue = chores.filter((c) => c.status === 'completed');
  const activeList = chores.filter(
    (c) => c.status === 'pending' || c.status === 'rejected'
  );
  const history = chores.filter(
    (c) =>
      c.status === 'approved' ||
      c.status === 'cancelled' ||
      (c.status === 'completed' && false) // completed already shown above
  );

  const handleApprove = async (chore: Chore) => {
    setActingId(chore.id);
    try {
      const updated = await choresAPI.approveChore(chore.id);
      setChores((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve');
    } finally {
      setActingId(null);
    }
  };

  const submitReject = async (chore: Chore) => {
    setActingId(chore.id);
    try {
      const updated = await choresAPI.rejectChore(
        chore.id,
        rejectReason.trim() || undefined
      );
      setChores((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reject');
    } finally {
      setActingId(null);
    }
  };

  const handleCancel = async (chore: Chore) => {
    if (!window.confirm(`Cancel "${chore.title}"? This cannot be undone.`)) return;
    setActingId(chore.id);
    try {
      await choresAPI.cancelChore(chore.id);
      setChores((prev) => prev.filter((c) => c.id !== chore.id));
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3DAA8A]/10 to-[#2D6A8F]/5 flex items-center justify-center shadow-md">
                  <ClipboardList className="h-6 w-6 text-[#3DAA8A]" />
                </div>
                Chores &amp; Tasks
              </h1>
              <p className="text-muted-foreground font-medium mt-1">
                Assign, approve, and reward chores for {familyTitle || 'your family'}
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
              disabled={children.length === 0}
              className="cg-btn-primary flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Create chore
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-[#FEE2E2] border-2 border-[#FEE2E2] rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-[#C53030]" />
                <p className="text-[#9B2C2C] font-medium">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-[#3DAA8A]" />
            </div>
          ) : children.length === 0 ? (
            <div className="bg-card border-2 border-border rounded-2xl p-8 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-bold mb-1">
                No children added yet
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                Add a child to this family file before creating chores.
              </p>
              <button
                onClick={() => router.push(`/family-files/${familyFileId}/children`)}
                className="cg-btn-secondary"
              >
                Manage children
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Review queue */}
              <section className="bg-card border-2 border-border rounded-2xl shadow-lg p-6">
                <h2
                  className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  <CheckCircle2 className="h-5 w-5 text-[#E09520]" />
                  Needs your review
                  {reviewQueue.length > 0 && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#FEF7ED] text-[#E09520] border border-[#FEF7ED]">
                      {reviewQueue.length}
                    </span>
                  )}
                </h2>
                {reviewQueue.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nothing waiting. You&apos;re all caught up.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {reviewQueue.map((chore) => {
                      const child = childById.get(chore.child_id);
                      const busy = actingId === chore.id;
                      return (
                        <li
                          key={chore.id}
                          className="rounded-xl border-2 border-[#FEF7ED] bg-[#FEF7ED]/50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0">
                              <p className="font-bold text-foreground">
                                {chore.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {child?.preferred_name || child?.first_name || 'Child'}
                                {chore.completed_at &&
                                  ` • marked done ${new Date(chore.completed_at).toLocaleDateString()}`}
                              </p>
                            </div>
                            {chore.reward_amount &&
                              Number(chore.reward_amount) > 0 && (
                                <span className="text-sm font-bold text-[#3DAA8A] flex-shrink-0">
                                  {safeCurrency(chore.reward_amount)}
                                </span>
                              )}
                          </div>
                          {chore.description && (
                            <p className="text-sm text-foreground/80 mb-3">
                              {chore.description}
                            </p>
                          )}

                          {(chore.completion_photo_url || chore.completion_note) && (
                            <div className="mb-3 flex items-start gap-3">
                              {chore.completion_photo_url && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPhotoModal({
                                      url: chore.completion_photo_url as string,
                                      title: chore.title,
                                    })
                                  }
                                  className="relative group rounded-lg overflow-hidden border-2 border-[#FEF7ED] flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/40"
                                  aria-label="View full photo"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={chore.completion_photo_url}
                                    alt={`Proof of completion for ${chore.title}`}
                                    className="h-20 w-20 object-cover"
                                  />
                                  <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center text-white opacity-0 group-hover:opacity-100">
                                    <ZoomIn className="h-5 w-5" />
                                  </span>
                                </button>
                              )}
                              {chore.completion_note && (
                                <p className="text-sm italic text-muted-foreground flex-1">
                                  &ldquo;{chore.completion_note}&rdquo;
                                </p>
                              )}
                            </div>
                          )}

                          {rejectingId === chore.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={2}
                                placeholder="What still needs doing? (optional)"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/40"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => submitReject(chore)}
                                  disabled={busy}
                                  className="flex-1 bg-[#F5A623] hover:bg-[#E09520] text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50"
                                >
                                  {busy ? 'Sending...' : 'Send back'}
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingId(null);
                                    setRejectReason('');
                                  }}
                                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(chore)}
                                disabled={busy}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-[#3DAA8A] hover:bg-[#2D8A70] text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50"
                              >
                                {busy ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingId(chore.id);
                                  setRejectReason('');
                                }}
                                disabled={busy}
                                className="flex-1 flex items-center justify-center gap-1.5 border-2 border-[#F5A623] bg-white hover:bg-[#FEF7ED] text-[#E09520] text-sm font-semibold py-2 rounded-lg disabled:opacity-50"
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Active chores */}
              <section className="bg-card border-2 border-border rounded-2xl shadow-lg p-6">
                <h2
                  className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Active chores
                </h2>
                {activeList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active chores. Create one above.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {activeList.map((chore) => (
                      <ChoreRow
                        key={chore.id}
                        chore={chore}
                        child={childById.get(chore.child_id)}
                        isEditing={editing?.id === chore.id}
                        onStartEdit={() => setEditing(chore)}
                        onCancelEdit={() => setEditing(null)}
                        onSaved={(updated) => {
                          setChores((prev) =>
                            prev.map((c) => (c.id === updated.id ? updated : c))
                          );
                          setEditing(null);
                        }}
                        onCancel={() => handleCancel(chore)}
                        busy={actingId === chore.id}
                      />
                    ))}
                  </ul>
                )}
              </section>

              {/* History */}
              <section className="bg-card border-2 border-border rounded-2xl shadow-lg p-6 lg:col-span-2">
                <h2
                  className="text-lg font-bold text-foreground mb-4"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  History
                </h2>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Approved and cancelled chores will show up here.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {history.map((chore) => {
                      const child = childById.get(chore.child_id);
                      return (
                        <li
                          key={chore.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {chore.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {child?.preferred_name || child?.first_name || 'Child'}
                              {chore.approved_at
                                ? ` • ${new Date(chore.approved_at).toLocaleDateString()}`
                                : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {chore.reward_amount &&
                              Number(chore.reward_amount) > 0 && (
                                <span className="text-xs font-bold text-[#3DAA8A]">
                                  {safeCurrency(chore.reward_amount)}
                                </span>
                              )}
                            <span
                              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${statusBadgeClass(chore.status)}`}
                            >
                              {statusLabel(chore.status)}
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
          <CreateChoreModal
            familyFileId={familyFileId}
            children={children}
            onClose={() => setShowCreate(false)}
            onCreated={(c) => {
              setChores((prev) => [c, ...prev]);
              setShowCreate(false);
            }}
          />
        )}

        {photoModal && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPhotoModal(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`Proof photo for ${photoModal.title}`}
          >
            <button
              onClick={() => setPhotoModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoModal.url}
              alt={`Proof of completion for ${photoModal.title}`}
              className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

/* ───────── Chore row with inline edit ───────── */

function ChoreRow({
  chore,
  child,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaved,
  onCancel,
  busy,
}: {
  chore: Chore;
  child: FamilyFileChild | undefined;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaved: (c: Chore) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState(chore.title);
  const [description, setDescription] = useState(chore.description || '');
  const [reward, setReward] = useState(
    chore.reward_amount ? String(chore.reward_amount) : ''
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      setTitle(chore.title);
      setDescription(chore.description || '');
      setReward(chore.reward_amount ? String(chore.reward_amount) : '');
      setErr(null);
    }
  }, [isEditing, chore]);

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      const patch: Parameters<typeof choresAPI.updateChore>[1] = {
        title,
        description: description || undefined,
      };
      if (reward !== '') {
        const num = Number(reward);
        if (Number.isFinite(num) && num >= 0) {
          patch.reward_amount = num;
        }
      }
      const updated = await choresAPI.updateChore(chore.id, patch);
      onSaved(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <li className="rounded-xl border-2 border-[#3DAA8A]/30 bg-[#3DAA8A]/5 p-4 space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/40"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Description (optional)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/40"
        />
        <input
          type="number"
          step="0.01"
          min="0"
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          placeholder="Reward (optional)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/40"
        />
        {err && <p className="text-xs text-[#C53030]">{err}</p>}
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving || !title.trim()}
            className="flex-1 bg-[#3DAA8A] hover:bg-[#3DAA8A]/90 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onCancelEdit}
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-xl border-2 border-border bg-muted/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-foreground">{chore.title}</p>
            <span
              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${statusBadgeClass(chore.status)}`}
            >
              {statusLabel(chore.status)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {child?.preferred_name || child?.first_name || 'Child'}
            {chore.due_at &&
              ` • due ${new Date(chore.due_at).toLocaleDateString()}`}
          </p>
          {chore.description && (
            <p className="text-sm text-foreground/80 mt-1">{chore.description}</p>
          )}
          {chore.status === 'rejected' && chore.rejection_reason && (
            <p className="mt-1 text-xs text-[#E09520] bg-[#FEF7ED] border border-[#FEF7ED] rounded-md px-2 py-1 inline-block">
              Sent back: {chore.rejection_reason}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {chore.reward_amount && Number(chore.reward_amount) > 0 && (
            <span className="text-sm font-bold text-[#3DAA8A]">
              {safeCurrency(chore.reward_amount)}
            </span>
          )}
          <div className="flex gap-1">
            <button
              onClick={onStartEdit}
              disabled={busy}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
              aria-label="Edit"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onCancel}
              disabled={busy}
              className="p-1.5 rounded-md hover:bg-[#FEE2E2] text-[#C53030]"
              aria-label="Cancel chore"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

/* ───────── Create modal ───────── */

function CreateChoreModal({
  familyFileId,
  children,
  onClose,
  onCreated,
}: {
  familyFileId: string;
  children: FamilyFileChild[];
  onClose: () => void;
  onCreated: (c: Chore) => void;
}) {
  const [childId, setChildId] = useState(children[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!childId || !title.trim()) {
      setErr('Please pick a child and give the chore a name.');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const payload: Parameters<typeof choresAPI.createChore>[0] = {
        family_file_id: familyFileId,
        child_id: childId,
        title: title.trim(),
      };
      if (description.trim()) payload.description = description.trim();
      if (reward !== '') {
        const num = Number(reward);
        if (Number.isFinite(num) && num >= 0) payload.reward_amount = num;
      }
      if (dueAt) payload.due_at = new Date(dueAt).toISOString();
      const created = await choresAPI.createChore(payload);
      onCreated(created);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create chore');
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
            New chore
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
            <label className="text-sm font-semibold text-foreground block mb-1">
              Child
            </label>
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/40"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.preferred_name || c.first_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Take out the trash"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/40"
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
              placeholder="Any details or instructions"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">
                Reward (optional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/40"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">
                Due (optional)
              </label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/40"
              />
            </div>
          </div>

          {err && (
            <div className="bg-[#FEE2E2] border border-[#FEE2E2] text-[#9B2C2C] rounded-lg px-3 py-2 text-sm">
              {err}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={submit}
              disabled={submitting || !title.trim() || !childId}
              className="flex-1 cg-btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create
            </button>
            <button
              onClick={onClose}
              className="cg-btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
