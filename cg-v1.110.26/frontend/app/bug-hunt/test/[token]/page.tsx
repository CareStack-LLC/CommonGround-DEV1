'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  FlaskConical, ClipboardList, Bug, Star, StickyNote, Check, Copy,
  ChevronDown, ChevronRight, Plus, Loader2, AlertCircle, Camera, X, Image,
} from 'lucide-react';

let _apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
if (_apiUrl.endsWith('/')) _apiUrl = _apiUrl.slice(0, -1);
if (!_apiUrl.endsWith('/api/v1')) _apiUrl += '/api/v1';
const API_URL = _apiUrl;

interface TesterDashboard {
  tester: { id: string; tester_name: string; tester_email: string; status: string };
  cohort: { id: string; name: string; description: string | null; target_feature: string; status: string; test_instructions: string | null };
  family: { id: string; parent_a_email: string; parent_a_password: string; parent_b_email: string; parent_b_password: string; parent_a_name: string; parent_b_name: string; children_names: string[]; agreement_version?: string | null; subscription_tier?: string | null };
  checklist: { id: string; title: string; description: string | null; display_order: number; is_completed: boolean; completed_at: string | null }[];
  bug_reports: { id: string; title: string; description: string; severity: string; status: string; steps_to_reproduce: string | null; created_at: string }[];
  feedback: { id: string; rating: number | null; category: string; content: string; feature_area: string | null; created_at: string }[];
  notes: { id: string; content: string; note_type: string; created_at: string }[];
}

type Tab = 'checklist' | 'bugs' | 'feedback' | 'notes';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border border-red-200',
  high: 'bg-orange-100 text-orange-700 border border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  low: 'bg-gray-100 text-gray-600',
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* non-HTTPS or clipboard unavailable */ }
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded hover:bg-gray-100 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
    </button>
  );
}

export default function TesterPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<TesterDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('checklist');
  const [showCredentials, setShowCredentials] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Form states
  const [showBugForm, setShowBugForm] = useState(false);
  const [bugForm, setBugForm] = useState({ title: '', description: '', severity: 'medium', steps_to_reproduce: '' });
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ content: '', category: 'other', rating: 0 });
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState({ content: '', note_type: 'observation' });
  const [submitting, setSubmitting] = useState(false);

  const apiBase = `${API_URL}/bug-hunt/test/${token}`;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(apiBase);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Invalid or expired link' }));
        throw new Error(err.detail || 'Failed to load');
      }
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const [actionError, setActionError] = useState<string | null>(null);

  const postAction = async (path: string, body?: Record<string, any>) => {
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`${apiBase}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Action failed' }));
        throw new Error(err.detail || `Error ${res.status}`);
      }
      await fetchData();
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500">{error || 'This testing link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  const { tester, cohort, family, checklist, bug_reports, feedback: feedbackList, notes } = data;

  const TABS: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'checklist', label: 'Checklist', icon: ClipboardList, count: checklist.length },
    { key: 'bugs', label: 'Bugs', icon: Bug, count: bug_reports.length },
    { key: 'feedback', label: 'Feedback', icon: Star, count: feedbackList.length },
    { key: 'notes', label: 'Notes', icon: StickyNote, count: notes.length },
  ];

  const checklistDone = checklist.filter(c => c.is_completed).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-gray-900 truncate">{cohort.name}</h1>
              <p className="text-xs text-gray-500">Testing as <span className="font-medium text-teal-600">{tester.tester_name}</span></p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Credentials Card */}
        <button onClick={() => setShowCredentials(!showCredentials)}
          className="w-full bg-white rounded-xl border border-gray-100 p-4 text-left shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">Test Credentials</span>
            {showCredentials ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
          {showCredentials && (
            <div className="mt-3 space-y-3" onClick={e => e.stopPropagation()}>
              <div className="bg-teal-50 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-teal-600 font-semibold mb-1">Parent A — {family.parent_a_name}</div>
                <div className="flex items-center gap-1"><span className="text-xs text-gray-700 font-mono">{family.parent_a_email}</span><CopyBtn text={family.parent_a_email} /></div>
                <div className="flex items-center gap-1 mt-0.5"><span className="text-xs text-gray-500 font-mono">{family.parent_a_password}</span><CopyBtn text={family.parent_a_password} /></div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-teal-600 font-semibold mb-1">Parent B — {family.parent_b_name}</div>
                <div className="flex items-center gap-1"><span className="text-xs text-gray-700 font-mono">{family.parent_b_email}</span><CopyBtn text={family.parent_b_email} /></div>
                <div className="flex items-center gap-1 mt-0.5"><span className="text-xs text-gray-500 font-mono">{family.parent_b_password}</span><CopyBtn text={family.parent_b_password} /></div>
              </div>
              {family.children_names.length > 0 && (
                <div className="text-xs text-gray-500"><span className="font-medium">Children:</span> {family.children_names.join(', ')}</div>
              )}
              {(family.agreement_version || family.subscription_tier) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {family.agreement_version && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      family.agreement_version === 'good_faith' ? 'bg-emerald-50 text-emerald-700' :
                      family.agreement_version === 'co-operative' ? 'bg-blue-50 text-blue-700' :
                      family.agreement_version === 'comprehensive' ? 'bg-purple-50 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {family.agreement_version.replace(/_/g, ' ')}
                    </span>
                  )}
                  {family.subscription_tier && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      family.subscription_tier === 'web_starter' ? 'bg-gray-100 text-gray-600' :
                      family.subscription_tier === 'plus' ? 'bg-amber-50 text-amber-700' :
                      family.subscription_tier === 'complete' ? 'bg-rose-50 text-rose-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {family.subscription_tier.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </button>

        {/* Instructions Card */}
        {cohort.test_instructions && (
          <button onClick={() => setShowInstructions(!showInstructions)}
            className="w-full bg-white rounded-xl border border-gray-100 p-4 text-left shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Test Instructions</span>
              {showInstructions ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </div>
            {showInstructions && (
              <pre className="mt-3 text-xs text-gray-600 whitespace-pre-wrap font-mono" onClick={e => e.stopPropagation()}>
                {cohort.test_instructions}
              </pre>
            )}
          </button>
        )}

        {/* Tab Bar */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                tab === t.key ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.count > 0 && <span className="text-[10px] bg-gray-100 px-1 rounded">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-red-600">{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-xs text-red-400 underline">dismiss</button>
          </div>
        )}

        {/* ═══ CHECKLIST ═══ */}
        {tab === 'checklist' && (
          <div className="space-y-2">
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Progress</span>
                <span>{checklistDone}/{checklist.length}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${checklist.length > 0 ? (checklistDone / checklist.length) * 100 : 0}%` }} />
              </div>
            </div>
            {checklist.map(item => (
              <button key={item.id} onClick={() => postAction(`/checklist/${item.id}`)} disabled={submitting}
                className="w-full flex items-start gap-3 bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-left disabled:opacity-60">
                <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  item.is_completed ? 'bg-teal-500 border-teal-500 text-white' : 'border-gray-300'
                }`}>
                  {item.is_completed && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <div className={`text-sm ${item.is_completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.title}</div>
                  {item.description && <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ═══ BUGS ═══ */}
        {tab === 'bugs' && (
          <div className="space-y-3">
            <button onClick={() => setShowBugForm(!showBugForm)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white rounded-xl border border-dashed border-gray-200 text-sm text-teal-600 font-medium hover:bg-teal-50 transition-colors">
              <Plus className="w-4 h-4" /> Report Bug
            </button>
            {showBugForm && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
                <input type="text" placeholder="Bug title" value={bugForm.title} onChange={e => setBugForm({...bugForm, title: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400" />
                <textarea placeholder="Description" value={bugForm.description} onChange={e => setBugForm({...bugForm, description: e.target.value})} rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 resize-none" />
                <select value={bugForm.severity} onChange={e => setBugForm({...bugForm, severity: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <textarea placeholder="Steps to reproduce (optional)" value={bugForm.steps_to_reproduce} onChange={e => setBugForm({...bugForm, steps_to_reproduce: e.target.value})} rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 resize-none font-mono" />
                {/* Screenshot upload */}
                <div>
                  <label className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <Camera className="w-3.5 h-3.5" /> Screenshots (optional, max 3)
                  </label>
                  {screenshots.length < 3 && (
                    <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition-colors">
                      <Image className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">Click to add screenshot</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) { setActionError('Screenshot must be under 5MB'); return; }
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              setScreenshots(prev => [...prev.slice(0, 2), reader.result as string]);
                            }
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                  {screenshots.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {screenshots.map((src, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                          <img src={src} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => setScreenshots(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button disabled={submitting || !bugForm.title || !bugForm.description}
                    onClick={async () => {
                      const payload = { ...bugForm, screenshot_urls: screenshots.length > 0 ? screenshots : undefined };
                      const ok = await postAction('/bugs', payload);
                      if (ok) { setBugForm({ title: '', description: '', severity: 'medium', steps_to_reproduce: '' }); setScreenshots([]); setShowBugForm(false); }
                    }}
                    className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 min-h-[44px]">Submit</button>
                  <button onClick={() => setShowBugForm(false)} className="px-4 py-2.5 text-gray-500 text-sm min-h-[44px]">Cancel</button>
                </div>
              </div>
            )}
            {bug_reports.map(bug => (
              <div key={bug.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${SEVERITY_COLORS[bug.severity]}`}>{bug.severity}</span>
                  <span className="text-xs text-gray-400">{new Date(bug.created_at).toLocaleDateString()}</span>
                </div>
                <h4 className="text-sm font-medium text-gray-900">{bug.title}</h4>
                <p className="text-xs text-gray-600 mt-1">{bug.description}</p>
                {bug.steps_to_reproduce && <pre className="text-xs text-gray-500 mt-2 font-mono whitespace-pre-wrap">{bug.steps_to_reproduce}</pre>}
              </div>
            ))}
            {bug_reports.length === 0 && !showBugForm && <p className="text-center text-sm text-gray-400 py-8">No bugs reported yet</p>}
          </div>
        )}

        {/* ═══ FEEDBACK ═══ */}
        {tab === 'feedback' && (
          <div className="space-y-3">
            <button onClick={() => setShowFeedbackForm(!showFeedbackForm)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white rounded-xl border border-dashed border-gray-200 text-sm text-teal-600 font-medium hover:bg-teal-50 transition-colors">
              <Plus className="w-4 h-4" /> Add Feedback
            </button>
            {showFeedbackForm && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Rating:</span>
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setFeedbackForm({...feedbackForm, rating: feedbackForm.rating === s ? 0 : s})}>
                      <Star className={`w-6 h-6 ${s <= feedbackForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
                <select value={feedbackForm.category} onChange={e => setFeedbackForm({...feedbackForm, category: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                  <option value="ux">UX</option>
                  <option value="performance">Performance</option>
                  <option value="functionality">Functionality</option>
                  <option value="documentation">Documentation</option>
                  <option value="other">Other</option>
                </select>
                <textarea placeholder="Your feedback..." value={feedbackForm.content} onChange={e => setFeedbackForm({...feedbackForm, content: e.target.value})} rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 resize-none" />
                <div className="flex gap-2">
                  <button disabled={submitting || !feedbackForm.content}
                    onClick={async () => { const ok = await postAction('/feedback', { ...feedbackForm, rating: feedbackForm.rating || undefined }); if (ok) { setFeedbackForm({ content: '', category: 'other', rating: 0 }); setShowFeedbackForm(false); } }}
                    className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 min-h-[44px]">Submit</button>
                  <button onClick={() => setShowFeedbackForm(false)} className="px-4 py-2.5 text-gray-500 text-sm min-h-[44px]">Cancel</button>
                </div>
              </div>
            )}
            {feedbackList.map(fb => (
              <div key={fb.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{fb.category}</span>
                  {fb.rating && <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= fb.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />)}</div>}
                  <span className="text-xs text-gray-400 ml-auto">{new Date(fb.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-700">{fb.content}</p>
              </div>
            ))}
            {feedbackList.length === 0 && !showFeedbackForm && <p className="text-center text-sm text-gray-400 py-8">No feedback yet</p>}
          </div>
        )}

        {/* ═══ NOTES ═══ */}
        {tab === 'notes' && (
          <div className="space-y-3">
            <button onClick={() => setShowNoteForm(!showNoteForm)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white rounded-xl border border-dashed border-gray-200 text-sm text-teal-600 font-medium hover:bg-teal-50 transition-colors">
              <Plus className="w-4 h-4" /> Add Note
            </button>
            {showNoteForm && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
                <select value={noteForm.note_type} onChange={e => setNoteForm({...noteForm, note_type: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                  <option value="observation">Observation</option>
                  <option value="blocker">Blocker</option>
                  <option value="question">Question</option>
                  <option value="resolution">Resolution</option>
                </select>
                <textarea placeholder="Your note..." value={noteForm.content} onChange={e => setNoteForm({...noteForm, content: e.target.value})} rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 resize-none" />
                <div className="flex gap-2">
                  <button disabled={submitting || !noteForm.content}
                    onClick={async () => { const ok = await postAction('/notes', noteForm); if (ok) { setNoteForm({ content: '', note_type: 'observation' }); setShowNoteForm(false); } }}
                    className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 min-h-[44px]">Add Note</button>
                  <button onClick={() => setShowNoteForm(false)} className="px-4 py-2.5 text-gray-500 text-sm min-h-[44px]">Cancel</button>
                </div>
              </div>
            )}
            {notes.map(note => (
              <div key={note.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    note.note_type === 'blocker' ? 'bg-red-50 text-red-600' :
                    note.note_type === 'question' ? 'bg-yellow-50 text-yellow-600' :
                    note.note_type === 'resolution' ? 'bg-green-50 text-green-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>{note.note_type}</span>
                  <span className="text-xs text-gray-400 ml-auto">{new Date(note.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-700">{note.content}</p>
              </div>
            ))}
            {notes.length === 0 && !showNoteForm && <p className="text-center text-sm text-gray-400 py-8">No notes yet</p>}
          </div>
        )}
      </div>
    </div>
  );
}
