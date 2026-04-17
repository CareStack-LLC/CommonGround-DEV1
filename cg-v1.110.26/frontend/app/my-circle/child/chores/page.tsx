'use client';

/**
 * Wave 3 C2 — Child's chores page.
 *
 * Lists chores assigned to the logged-in child, lets them mark one complete
 * (which flips status to "completed" → parent reviews → approve pays the
 * wallet). Shows rejection feedback from a parent when a chore was sent back.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Star,
  X,
} from 'lucide-react';
import { choresAPI, Chore } from '@/lib/api';
import { safeCurrency } from '@/lib/format-utils';

// Client-side photo constraints. Kept in sync with the backend's
// CHORE_PROOF_* constants so we reject before wasting an upload.
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_PHOTO_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
];

/**
 * Shrink an oversized image to fit within MAX_PHOTO_BYTES using a plain
 * canvas (no new deps). Re-encodes as JPEG at decreasing quality until it
 * fits or we give up. HEIC can't be decoded by most browsers into a canvas,
 * so we bail out and let the backend decide.
 */
async function compressIfNeeded(file: File): Promise<File> {
  if (file.size <= MAX_PHOTO_BYTES) return file;
  if (file.type === 'image/heic') return file; // can't decode; send as-is

  const img = document.createElement('img');
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not read image'));
      img.src = url;
    });

    // Start from the original dimensions and step down until the re-encoded
    // blob is under the cap. Most phone photos land on the first pass.
    let width = img.naturalWidth;
    let height = img.naturalHeight;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    for (let attempt = 0; attempt < 5; attempt++) {
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const quality = 0.85 - attempt * 0.1;
      const blob: Blob | null = await new Promise((r) =>
        canvas.toBlob(r, 'image/jpeg', Math.max(quality, 0.45))
      );
      if (blob && blob.size <= MAX_PHOTO_BYTES) {
        return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
          type: 'image/jpeg',
        });
      }
      // Shrink dimensions ~20% each retry.
      width = Math.round(width * 0.8);
      height = Math.round(height * 0.8);
    }
    return file; // fall through; server will reject if still too big
  } finally {
    URL.revokeObjectURL(url);
  }
}

type StatusFilter = 'active' | 'done' | 'all';

function statusGroup(status: Chore['status']): 'active' | 'done' {
  if (status === 'approved' || status === 'cancelled') return 'done';
  return 'active';
}

function statusLabel(status: Chore['status']) {
  switch (status) {
    case 'pending':
      return 'To do';
    case 'completed':
      return 'Waiting on parent';
    case 'approved':
      return 'Done';
    case 'rejected':
      return 'Try again';
    case 'cancelled':
      return 'Cancelled';
  }
}

export default function ChildChoresPage() {
  const router = useRouter();
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('active');
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  // The chore currently being completed in the proof sheet. Null = sheet closed.
  const [proofChore, setProofChore] = useState<Chore | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await choresAPI.listMyChoresAsChild();
      setChores(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load chores');
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

  const submitComplete = async (
    chore: Chore,
    opts: { photo?: File; note?: string }
  ) => {
    setCompletingId(chore.id);
    try {
      const updated = await choresAPI.markChoreCompleteAsChild(chore.id, opts);
      setChores((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setProofChore(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work — try again");
    } finally {
      setCompletingId(null);
    }
  };

  const visible =
    filter === 'all'
      ? chores
      : chores.filter((c) => statusGroup(c.status) === filter);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D1B24] via-[#1E3A4A] to-[#0D1B24] text-white">
      <header className="sticky top-0 z-10 bg-[#0D1B24]/80 backdrop-blur-md border-b border-[#3DAA8A]/10">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push('/my-circle/child/dashboard')}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="text-white font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            My Chores
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
          {(['active', 'done', 'all'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
                filter === f
                  ? 'bg-[#3DAA8A] text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {f === 'active' ? 'To do' : f === 'done' ? 'Done' : 'All'}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-3">
        {error && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#3DAA8A]" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-[#3DAA8A]/15 bg-[#1E3A4A]/40 px-4 py-10 text-center">
            <Star className="h-8 w-8 text-white/40 mx-auto mb-2" />
            <p className="text-white/70 text-sm">
              {filter === 'active'
                ? 'No chores right now — nice!'
                : 'Nothing to show yet.'}
            </p>
          </div>
        ) : (
          visible.map((chore) => {
            const isCompleting = completingId === chore.id;
            const canComplete = chore.status === 'pending' || chore.status === 'rejected';
            return (
              <div
                key={chore.id}
                className="rounded-2xl border border-[#3DAA8A]/15 bg-[#1E3A4A]/60 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className="text-white font-bold"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {chore.title}
                      </h3>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                          chore.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : chore.status === 'rejected'
                              ? 'bg-amber-500/20 text-amber-300'
                              : chore.status === 'completed'
                                ? 'bg-[#2D6A8F]/30 text-[#4BA8C8]'
                                : chore.status === 'cancelled'
                                  ? 'bg-white/10 text-white/50'
                                  : 'bg-[#3DAA8A]/20 text-[#3DAA8A]'
                        }`}
                      >
                        {statusLabel(chore.status)}
                      </span>
                    </div>
                    {chore.description && (
                      <p className="text-white/70 text-sm mt-1">{chore.description}</p>
                    )}
                    {chore.due_at && (
                      <p className="text-white/50 text-xs mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Due {new Date(chore.due_at).toLocaleDateString()}
                      </p>
                    )}
                    {chore.status === 'rejected' && chore.rejection_reason && (
                      <p className="mt-2 text-amber-200 text-sm bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                        <span className="font-semibold">Feedback:</span> {chore.rejection_reason}
                      </p>
                    )}
                  </div>
                  {chore.reward_amount && Number(chore.reward_amount) > 0 && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-white/50">Reward</p>
                      <p className="text-[#3DAA8A] font-bold">
                        {safeCurrency(chore.reward_amount)}
                      </p>
                    </div>
                  )}
                </div>

                {canComplete && (
                  <button
                    onClick={() => setProofChore(chore)}
                    disabled={isCompleting}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-[#3DAA8A] hover:bg-[#3DAA8A]/90 disabled:opacity-60 disabled:cursor-wait text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
                  >
                    {isCompleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    I did it!
                  </button>
                )}

                {(chore.completion_photo_url || chore.completion_note) &&
                  (chore.status === 'completed' ||
                    chore.status === 'approved' ||
                    chore.status === 'rejected') && (
                    <div className="mt-3 flex items-start gap-3">
                      {chore.completion_photo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={chore.completion_photo_url}
                          alt="What you sent"
                          className="h-14 w-14 rounded-lg object-cover border border-white/15"
                        />
                      )}
                      {chore.completion_note && (
                        <p className="text-xs text-white/60 italic flex-1">
                          &ldquo;{chore.completion_note}&rdquo;
                        </p>
                      )}
                    </div>
                  )}

                {chore.status === 'completed' && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-[#CBD8E0]/80">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4BA8C8]" />
                    A parent will check it soon.
                  </div>
                )}

                {chore.status === 'approved' && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approved — nice work!
                  </div>
                )}

                {chore.status === 'cancelled' && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
                    <X className="h-3.5 w-3.5" />
                    Cancelled by a parent.
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {proofChore && (
        <ProofSheet
          chore={proofChore}
          submitting={completingId === proofChore.id}
          onClose={() => setProofChore(null)}
          onSubmit={(opts) => submitComplete(proofChore, opts)}
        />
      )}
    </div>
  );
}

/* ────────────── Proof-of-completion sheet (photo + note) ────────────── */

function ProofSheet({
  chore,
  submitting,
  onClose,
  onSubmit,
}: {
  chore: Chore;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (opts: { photo?: File; note?: string }) => void;
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Revoke object URL when the preview changes or the sheet closes, so we
  // don't leak blob URLs into the tab's memory.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = async (f: File | null) => {
    setLocalError(null);
    if (!f) {
      setPhoto(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }
    if (!ALLOWED_PHOTO_TYPES.includes(f.type)) {
      setLocalError('Please pick a JPG, PNG, WebP, or HEIC image.');
      return;
    }
    setPreparing(true);
    try {
      const prepared = await compressIfNeeded(f);
      if (prepared.size > MAX_PHOTO_BYTES) {
        setLocalError('That photo is too big — try taking a new one.');
        return;
      }
      setPhoto(prepared);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(prepared));
    } catch {
      setLocalError('Could not read that photo. Try another one.');
    } finally {
      setPreparing(false);
    }
  };

  const submit = () => {
    if (submitting || preparing) return;
    onSubmit({
      photo: photo ?? undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#1E3A4A] border-t sm:border border-[#3DAA8A]/20 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-lg font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Mark it done
            </p>
            <p className="text-sm text-white/60 truncate">{chore.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-white/60">
          A photo is optional — it just helps your parent check it off faster.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />

        {previewUrl ? (
          <div className="relative rounded-2xl overflow-hidden border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full max-h-64 object-cover"
            />
            <button
              onClick={() => handleFile(null)}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-full p-1.5"
              aria-label="Remove photo"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={preparing}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-white/20 hover:border-[#3DAA8A]/60 hover:bg-[#3DAA8A]/5 rounded-2xl py-6 text-white/70 hover:text-white transition-colors"
          >
            {preparing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Camera className="h-5 w-5" />
                <span className="text-sm font-semibold">Add a photo</span>
              </>
            )}
          </button>
        )}

        {!previewUrl && !preparing && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 text-xs text-white/50 hover:text-white/80 py-1"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            or pick from your photos
          </button>
        )}

        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1">
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            rows={2}
            placeholder="e.g. did dishes AND floor"
            className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/40"
          />
        </div>

        {localError && (
          <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            {localError}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={submit}
            disabled={submitting || preparing}
            className="flex-1 flex items-center justify-center gap-2 bg-[#3DAA8A] hover:bg-[#3DAA8A]/90 disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {photo ? 'Send with photo' : 'Mark done'}
          </button>
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-3 text-sm font-medium text-white/70 hover:text-white disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
