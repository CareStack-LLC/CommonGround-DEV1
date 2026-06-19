'use client';

import { useEffect, useState, useCallback } from 'react';
import { SlidersHorizontal, Megaphone, Plus, RefreshCw } from 'lucide-react';
import { adminAPI, type FeatureFlag, type Announcement } from '@/lib/admin-api';

export default function PlatformControlsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New announcement form
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [level, setLevel] = useState('info');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [f, a] = await Promise.all([adminAPI.listFeatureFlags(), adminAPI.listAnnouncements()]);
      setFlags(f.flags);
      setAnnouncements(a.announcements);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFlag = async (flag: FeatureFlag) => {
    setBusyKey(flag.key);
    try {
      await adminAPI.setFeatureFlag(flag.key, !flag.value);
      setFlags((prev) => prev.map((f) => (f.key === flag.key ? { ...f, value: !f.value, is_set: true } : f)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update flag');
    } finally {
      setBusyKey(null);
    }
  };

  const createAnnouncement = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      await adminAPI.createAnnouncement({ title, body, level });
      setTitle('');
      setBody('');
      setLevel('info');
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const toggleAnnouncement = async (a: Announcement) => {
    try {
      await adminAPI.updateAnnouncement(a.id, {
        title: a.title,
        body: a.body,
        level: a.level,
        audience: a.audience,
        is_active: !a.is_active,
      });
      setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, is_active: !x.is_active } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="h-7 w-7 text-slate-700" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Platform Controls</h1>
            <p className="text-sm text-slate-500">Feature kill-switches and platform announcements.</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {/* Feature flags */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900 mb-1">Feature flags</h2>
        <p className="text-xs text-slate-500 mb-3">Toggles take effect immediately across the platform.</p>
        <div className="divide-y divide-slate-100">
          {flags.map((f) => (
            <div key={f.key} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{f.key}</p>
                <p className="text-xs text-slate-500">{f.description}</p>
              </div>
              <button
                onClick={() => toggleFlag(f)}
                disabled={busyKey === f.key}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                  f.value ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
                aria-label={`Toggle ${f.key}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${f.value ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
          {!loading && flags.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No flags.</p>}
        </div>
      </div>

      {/* Announcements */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2"><Megaphone className="h-5 w-5" /> Announcements</h2>
          <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            <Plus className="h-4 w-4" /> New
          </button>
        </div>

        {showForm && (
          <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" rows={3} className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
            <div className="flex items-center gap-2">
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
              <button onClick={createAnnouncement} disabled={saving || !title.trim() || !body.trim()} className="rounded-md bg-slate-900 px-4 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
                {saving ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {announcements.map((a) => (
            <div key={a.id} className="flex items-start justify-between rounded-md border border-slate-200 p-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${a.level === 'critical' ? 'bg-red-100 text-red-800' : a.level === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{a.level}</span>
                  <p className="text-sm font-medium text-slate-900">{a.title}</p>
                  {!a.is_active && <span className="text-xs text-slate-400">(inactive)</span>}
                </div>
                <p className="mt-1 text-sm text-slate-600">{a.body}</p>
              </div>
              <button onClick={() => toggleAnnouncement(a)} className="ml-3 shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
                {a.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
          {!loading && announcements.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No announcements.</p>}
        </div>
      </div>
    </div>
  );
}
