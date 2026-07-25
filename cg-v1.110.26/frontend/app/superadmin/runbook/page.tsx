'use client';

/**
 * Ops runbook index + detail.
 *
 * Layout: sidebar with runbook list (filter by category), detail pane on
 * the right showing selected runbook (summary + ordered steps + notes).
 * Create / edit / delete via inline modal.
 *
 * Deep-link via ?id=<uuid> so alert notifications can link directly to
 * the relevant runbook.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  BookOpen, Plus, Edit3, Trash2, X, Loader2, CheckCircle2,
  RefreshCw, Filter, GripVertical, ChevronRight,
} from 'lucide-react';
import { adminAPI } from '@/lib/admin-api';
import { PageHeader, ErrorState, SkeletonCards } from '@/components/superadmin';

interface RunbookStep {
  title: string;
  body: string;
  expected_outcome?: string | null;
}

interface Runbook {
  id: string;
  title: string;
  category: string;
  summary: string | null;
  steps: RunbookStep[];
  notes: string | null;
  tags: string[];
  enabled: boolean;
  owner_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'incident', label: 'Incident' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'escalation', label: 'Escalation' },
  { value: 'postmortem', label: 'Postmortem' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_COLORS: Record<string, string> = {
  incident: 'bg-red-500/15 text-red-300 border-red-500/30',
  maintenance: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  escalation: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  postmortem: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  other: 'bg-zinc-500/15 text-[#D0E4EC] border-zinc-500/30',
};

export default function RunbookPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const deepLinkId = searchParams.get('id');

  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(deepLinkId);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Runbook | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.listRunbooks(categoryFilter || undefined);
      setRunbooks(result);
      // Keep deep-link selection if the id is in the returned list
      if (deepLinkId && result.some((r) => r.id === deepLinkId)) {
        setSelectedId(deepLinkId);
      } else if (!selectedId && result.length > 0) {
        setSelectedId(result[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load runbooks');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, deepLinkId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selected = useMemo(
    () => runbooks.find((r) => r.id === selectedId) || null,
    [runbooks, selectedId],
  );

  const handleSelect = (id: string) => {
    setSelectedId(id);
    // Update the query string for shareable URLs
    router.replace(`/superadmin/runbook?id=${id}`);
  };

  const handleDelete = async (rb: Runbook) => {
    if (!confirm(`Delete runbook "${rb.title}"?`)) return;
    try {
      await adminAPI.deleteRunbook(rb.id);
      if (selectedId === rb.id) setSelectedId(null);
      await fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ops Runbooks"
        subtitle="Playbooks for on-call response. Link from alert rules so notifications include the steps."
        onRefresh={fetchData}
        loading={loading}
        actions={
          <button
            onClick={() => { setCreating(true); setEditing(null); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Runbook
          </button>
        }
      />

      {error && <ErrorState message={error} onRetry={fetchData} />}

      {!error && (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Sidebar */}
          <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-3 space-y-2 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#6B8A9A]" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 bg-[#0F2533]/60 border border-[#2D6A8F]/30 rounded px-2 py-1.5 text-xs text-[#D0E4EC] focus:outline-none focus:border-[#3DAA8A]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="space-y-2 pt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 bg-[#2D6A8F]/15 animate-pulse rounded" />
                ))}
              </div>
            ) : runbooks.length === 0 ? (
              <div className="text-xs text-[#6B8A9A] text-center py-8">
                No runbooks yet. Click "New Runbook" to create one.
              </div>
            ) : (
              <div className="space-y-1">
                {runbooks.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelect(r.id)}
                    className={`w-full text-left p-2.5 rounded transition-colors ${
                      selectedId === r.id
                        ? 'bg-[#3DAA8A]/15 border border-[#3DAA8A]/30'
                        : 'hover:bg-[#2D6A8F]/15 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${CATEGORY_COLORS[r.category] || CATEGORY_COLORS.other}`}>
                        {r.category}
                      </span>
                      {!r.enabled && <span className="text-[10px] text-[#6B8A9A]">disabled</span>}
                    </div>
                    <div className="text-sm font-medium text-white">{r.title}</div>
                    {r.summary && (
                      <div className="text-[11px] text-[#6B8A9A] mt-0.5 line-clamp-2">
                        {r.summary}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detail pane */}
          <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-6">
            {!selected ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#6B8A9A]">
                <BookOpen className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">Select a runbook to view its steps</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${CATEGORY_COLORS[selected.category] || CATEGORY_COLORS.other}`}>
                        {selected.category}
                      </span>
                      {selected.tags.map((t) => (
                        <span key={t} className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#2D6A8F]/20 text-[#8AACBC]">
                          {t}
                        </span>
                      ))}
                    </div>
                    <h2 className="text-xl font-semibold text-white">{selected.title}</h2>
                    {selected.summary && (
                      <p className="text-sm text-[#8AACBC] mt-2 leading-relaxed">{selected.summary}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button aria-label="Edit"
                      onClick={() => { setEditing(selected); setCreating(false); }}
                      title="Edit"
                      className="p-2 rounded text-[#8AACBC] hover:bg-[#2D6A8F]/30 hover:text-white transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button aria-label="Delete"
                      onClick={() => handleDelete(selected)}
                      title="Delete"
                      className="p-2 rounded text-red-300 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-[#6B8A9A] uppercase tracking-wider">Steps</h3>
                  {selected.steps.length === 0 ? (
                    <p className="text-sm text-[#6B8A9A] italic">No steps yet. Click Edit to add them.</p>
                  ) : (
                    selected.steps.map((step, i) => (
                      <div
                        key={i}
                        className="bg-[#0F2533]/60 border border-[#2D6A8F]/20 rounded-lg p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#3DAA8A]/20 text-[#3DAA8A] text-xs font-semibold shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-white">{step.title}</h4>
                            {step.body && (
                              <p className="text-sm text-[#D0E4EC] mt-1 whitespace-pre-wrap leading-relaxed">
                                {step.body}
                              </p>
                            )}
                            {step.expected_outcome && (
                              <div className="mt-2 pt-2 border-t border-[#2D6A8F]/15">
                                <span className="text-[11px] text-[#6B8A9A] uppercase tracking-wider">Expected: </span>
                                <span className="text-xs text-emerald-300">{step.expected_outcome}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Notes */}
                {selected.notes && (
                  <div className="mt-6 pt-4 border-t border-[#2D6A8F]/15">
                    <h3 className="text-xs font-semibold text-[#6B8A9A] uppercase tracking-wider mb-2">Notes</h3>
                    <p className="text-sm text-[#D0E4EC] whitespace-pre-wrap leading-relaxed">{selected.notes}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {(creating || editing) && (
        <RunbookModal
          runbook={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={(saved) => {
            setCreating(false);
            setEditing(null);
            setSelectedId(saved.id);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function RunbookModal({
  runbook,
  onClose,
  onSaved,
}: {
  runbook: Runbook | null;
  onClose: () => void;
  onSaved: (saved: Runbook) => void;
}) {
  const [title, setTitle] = useState(runbook?.title || '');
  const [category, setCategory] = useState(runbook?.category || 'incident');
  const [summary, setSummary] = useState(runbook?.summary || '');
  const [notes, setNotes] = useState(runbook?.notes || '');
  const [tagsText, setTagsText] = useState((runbook?.tags || []).join(', '));
  const [steps, setSteps] = useState<RunbookStep[]>(runbook?.steps || [{ title: '', body: '', expected_outcome: '' }]);
  const [enabled, setEnabled] = useState(runbook?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const updateStep = (i: number, patch: Partial<RunbookStep>) => {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const addStep = () => setSteps((prev) => [...prev, { title: '', body: '', expected_outcome: '' }]);
  const removeStep = (i: number) => setSteps((prev) => prev.filter((_, idx) => idx !== i));
  const moveStep = (i: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      const tags = tagsText.split(',').map((s) => s.trim()).filter(Boolean);
      const cleanedSteps = steps
        .filter((s) => s.title.trim() || s.body.trim())
        .map((s) => ({
          title: s.title.trim(),
          body: s.body,
          expected_outcome: s.expected_outcome?.trim() || undefined,
        }));

      const payload = {
        title: title.trim(),
        category,
        summary: summary.trim() || undefined,
        notes: notes.trim() || undefined,
        tags,
        steps: cleanedSteps,
        enabled,
      };

      const saved = runbook
        ? await adminAPI.updateRunbook(runbook.id, payload)
        : await adminAPI.createRunbook(payload);
      onSaved(saved);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-[#0F2533] border border-[#2D6A8F]/30 rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-base font-semibold text-white">
            {runbook ? 'Edit Runbook' : 'New Runbook'}
          </h3>
          <button aria-label="Close" onClick={onClose} className="p-1 text-[#8AACBC] hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <div>
              <label className="block text-xs font-medium text-[#8AACBC] mb-1">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Stripe webhook 5xx spike"
                className="w-full bg-[#1A3648]/80 border border-[#2D6A8F]/30 rounded px-3 py-2 text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8AACBC] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#1A3648]/80 border border-[#2D6A8F]/30 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3DAA8A]"
              >
                {CATEGORIES.slice(1).map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8AACBC] mb-1">Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="When should an admin use this runbook?"
              className="w-full bg-[#1A3648]/80 border border-[#2D6A8F]/30 rounded px-3 py-2 text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8AACBC] mb-1">Tags (comma-separated)</label>
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="stripe, webhook, billing"
              className="w-full bg-[#1A3648]/80 border border-[#2D6A8F]/30 rounded px-3 py-2 text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]"
            />
          </div>

          {/* Steps editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-[#8AACBC]">Steps</label>
              <button
                onClick={addStep}
                className="text-xs text-[#3DAA8A] hover:text-[#5BC4A0] inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add step
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="bg-[#1A3648]/40 border border-[#2D6A8F]/20 rounded p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#6B8A9A] font-medium">Step {i + 1}</span>
                    <div className="flex-1" />
                    <button
                      onClick={() => moveStep(i, -1)}
                      disabled={i === 0}
                      className="text-[11px] text-[#8AACBC] hover:text-white disabled:opacity-30 transition-colors"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveStep(i, 1)}
                      disabled={i === steps.length - 1}
                      className="text-[11px] text-[#8AACBC] hover:text-white disabled:opacity-30 transition-colors"
                    >
                      ↓
                    </button>
                    <button aria-label="Delete"
                      onClick={() => removeStep(i)}
                      className="text-[11px] text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    value={step.title}
                    onChange={(e) => updateStep(i, { title: e.target.value })}
                    placeholder="Step title"
                    className="w-full bg-[#0F2533]/60 border border-[#2D6A8F]/20 rounded px-2 py-1.5 text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]"
                  />
                  <textarea
                    value={step.body}
                    onChange={(e) => updateStep(i, { body: e.target.value })}
                    rows={3}
                    placeholder="What to do (markdown supported). Use SQL snippets / CLI commands as needed."
                    className="w-full bg-[#0F2533]/60 border border-[#2D6A8F]/20 rounded px-2 py-1.5 text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A] resize-none font-mono"
                  />
                  <input
                    value={step.expected_outcome || ''}
                    onChange={(e) => updateStep(i, { expected_outcome: e.target.value })}
                    placeholder="Expected outcome (optional)"
                    className="w-full bg-[#0F2533]/60 border border-[#2D6A8F]/20 rounded px-2 py-1.5 text-xs text-emerald-200 placeholder:text-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8AACBC] mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="SLAs, escalation contacts, related dashboards, etc."
              className="w-full bg-[#1A3648]/80 border border-[#2D6A8F]/30 rounded px-3 py-2 text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A] resize-none"
            />
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-[#2D6A8F]/40 bg-zinc-900/80 text-[#3DAA8A] focus:ring-[#3DAA8A]/30"
            />
            <span className="text-sm text-[#D0E4EC]">Enabled (show in the list)</span>
          </label>

          {err && (
            <div className="px-3 py-2 rounded text-xs bg-red-500/10 border border-red-500/30 text-red-300">
              {err}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded text-sm font-medium text-[#8AACBC] hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-4 py-2 rounded bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {runbook ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
