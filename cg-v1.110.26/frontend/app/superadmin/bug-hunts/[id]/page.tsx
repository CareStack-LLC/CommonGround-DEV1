'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  FlaskConical, ArrowLeft, RefreshCw, Loader2, CheckCircle2, Copy, Check,
  Plus, Bug, MessageSquare, StickyNote, Users, ClipboardList, Star,
  AlertTriangle, ChevronDown, ChevronRight, Trash2, ExternalLink,
} from 'lucide-react';
import {
  adminAPI,
  type BugHuntDashboard,
  type BugHuntFamily,
  type BugHuntChecklistItem,
  type BugHuntBugReport,
  type BugHuntFeedback,
  type BugHuntNote,
  type BugHuntTester,
} from '@/lib/admin-api';
import { UserPlus, Mail, XCircle } from 'lucide-react';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400 border border-red-500/20',
  high: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  medium: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  low: 'bg-zinc-700/50 text-[#8AACBC]',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-700/50 text-[#8AACBC]',
  seeding: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  active: 'bg-[#3DAA8A]/15 text-[#3DAA8A] border border-[#3DAA8A]/20',
  completed: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  open: 'bg-orange-500/15 text-orange-400',
  confirmed: 'bg-red-500/15 text-red-400',
  fixed: 'bg-[#3DAA8A]/15 text-[#3DAA8A]',
  wont_fix: 'bg-zinc-700/50 text-zinc-500',
  pending: 'bg-zinc-700/50 text-[#8AACBC]',
  in_progress: 'bg-blue-500/15 text-blue-400',
  blocked: 'bg-red-500/15 text-red-400',
};

const NOTE_TYPE_COLORS: Record<string, string> = {
  observation: 'bg-blue-500/15 text-blue-400',
  blocker: 'bg-red-500/15 text-red-400',
  question: 'bg-yellow-500/15 text-yellow-400',
  resolution: 'bg-[#3DAA8A]/15 text-[#3DAA8A]',
};

const FEATURE_LABELS: Record<string, string> = {
  exchange: 'Exchange System', messaging: 'Messaging', agreement: 'Agreements',
  custody_tracking: 'Custody Tracking', clearfund: 'ClearFund', general: 'General',
};

type Tab = 'overview' | 'accounts' | 'checklist' | 'bugs' | 'feedback' | 'notes';

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="bg-[#1E3A4A]/50 border border-[#2D6A8F]/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-[#3DAA8A]" />
        <span className="text-xs text-[#6B8A9A] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-[#2D6A8F]/20 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-[#3DAA8A]" /> : <Copy className="w-3 h-3 text-[#6B8A9A]" />}
    </button>
  );
}

export default function BugHuntDetailPage() {
  const router = useRouter();
  const params = useParams();
  const cohortId = params.id as string;

  const [data, setData] = useState<BugHuntDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [generating, setGenerating] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Form states
  const [newCheckItem, setNewCheckItem] = useState('');
  const [showBugForm, setShowBugForm] = useState(false);
  const [bugForm, setBugForm] = useState({ title: '', description: '', severity: 'medium', steps_to_reproduce: '', family_id: '' });
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ content: '', category: 'other', rating: 0, feature_area: '' });
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState({ content: '', note_type: 'observation', family_id: '' });
  const [expandedBugs, setExpandedBugs] = useState<Set<string>>(new Set());
  const [assigningFamily, setAssigningFamily] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({ tester_name: '', tester_email: '' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await adminAPI.getBugHunt(cohortId);
      setData(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [cohortId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await adminAPI.generateBugHuntData(cohortId);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleComplete = async () => {
    try {
      setCompleting(true);
      await adminAPI.completeBugHunt(cohortId);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete');
    } finally {
      setCompleting(false);
    }
  };

  const handleToggleChecklist = async (itemId: string) => {
    await adminAPI.toggleBugHuntChecklistItem(cohortId, itemId);
    await fetchData();
  };

  const handleAddCheckItem = async () => {
    if (!newCheckItem.trim()) return;
    await adminAPI.addBugHuntChecklistItem(cohortId, { title: newCheckItem.trim() });
    setNewCheckItem('');
    await fetchData();
  };

  const handleDeleteCheckItem = async (itemId: string) => {
    await adminAPI.deleteBugHuntChecklistItem(cohortId, itemId);
    await fetchData();
  };

  const handleSubmitBug = async () => {
    if (!bugForm.title.trim() || !bugForm.description.trim()) return;
    await adminAPI.addBugHuntBug(cohortId, {
      title: bugForm.title, description: bugForm.description,
      severity: bugForm.severity, steps_to_reproduce: bugForm.steps_to_reproduce || undefined,
      family_id: bugForm.family_id || undefined,
    });
    setBugForm({ title: '', description: '', severity: 'medium', steps_to_reproduce: '', family_id: '' });
    setShowBugForm(false);
    await fetchData();
  };

  const handleUpdateBugStatus = async (bugId: string, newStatus: string) => {
    await adminAPI.updateBugHuntBug(cohortId, bugId, { status: newStatus });
    await fetchData();
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackForm.content.trim()) return;
    await adminAPI.addBugHuntFeedback(cohortId, {
      content: feedbackForm.content, category: feedbackForm.category,
      rating: feedbackForm.rating > 0 ? feedbackForm.rating : undefined,
      feature_area: feedbackForm.feature_area || undefined,
    });
    setFeedbackForm({ content: '', category: 'other', rating: 0, feature_area: '' });
    setShowFeedbackForm(false);
    await fetchData();
  };

  const handleSubmitNote = async () => {
    if (!noteForm.content.trim()) return;
    await adminAPI.addBugHuntNote(cohortId, {
      content: noteForm.content, note_type: noteForm.note_type,
      family_id: noteForm.family_id || undefined,
    });
    setNoteForm({ content: '', note_type: 'observation', family_id: '' });
    setShowNoteForm(false);
    await fetchData();
  };

  const handleFamilyStatus = async (familyId: string, newStatus: string) => {
    await adminAPI.updateBugHuntFamilyStatus(cohortId, familyId, { test_status: newStatus });
    await fetchData();
  };

  const handleAssignTester = async (familyId: string) => {
    if (!assignForm.tester_name.trim() || !assignForm.tester_email.trim()) return;
    try {
      await adminAPI.assignBugHuntTester(cohortId, familyId, assignForm);
      setAssigningFamily(null);
      setAssignForm({ tester_name: '', tester_email: '' });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign tester');
    }
  };

  const handleRevokeTester = async (testerId: string) => {
    await adminAPI.revokeBugHuntTester(cohortId, testerId);
    await fetchData();
  };

  const handleResendTester = async (testerId: string) => {
    await adminAPI.resendBugHuntTesterInvite(cohortId, testerId);
    await fetchData();
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#3DAA8A] animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-[#6B8A9A]">
        {error || 'Bug hunt not found'}
      </div>
    );
  }

  const { cohort, families, checklist, bug_reports, feedback, notes, stats } = data;
  const checklistProgress = stats.checklist_total > 0
    ? Math.round((stats.checklist_completed / stats.checklist_total) * 100)
    : 0;

  const TABS: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: FlaskConical },
    { key: 'accounts', label: 'Test Accounts', icon: Users, count: families.length },
    { key: 'checklist', label: 'Checklist', icon: ClipboardList, count: stats.checklist_total },
    { key: 'bugs', label: 'Bug Reports', icon: Bug, count: stats.bugs_total },
    { key: 'feedback', label: 'Feedback', icon: Star, count: stats.feedback_total },
    { key: 'notes', label: 'Notes', icon: StickyNote, count: notes.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/superadmin/bug-hunts')}
            className="p-2 rounded-lg hover:bg-[#2D6A8F]/20 transition-colors text-[#8AACBC]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{cohort.name}</h1>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[cohort.status]}`}>
                {cohort.status}
              </span>
            </div>
            <p className="text-sm text-[#6B8A9A] mt-0.5">
              {FEATURE_LABELS[cohort.target_feature] || cohort.target_feature}
              {cohort.started_at && ` \u2022 Started ${new Date(cohort.started_at).toLocaleDateString()}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchData()}
          className="p-2 rounded-lg hover:bg-[#2D6A8F]/20 transition-colors text-[#8AACBC]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1E3A4A]/50 rounded-lg p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.key ? 'bg-[#2D6A8F]/40 text-white' : 'text-[#6B8A9A] hover:text-[#8AACBC]'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="text-[10px] bg-[#2D6A8F]/30 px-1.5 py-0.5 rounded-full">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Families" value={stats.families_total} icon={Users} />
            <MetricCard label="Bugs Found" value={stats.bugs_total} icon={Bug} />
            <MetricCard label="Checklist" value={`${checklistProgress}%`} icon={CheckCircle2} />
            <MetricCard label="Feedback" value={stats.feedback_total} icon={MessageSquare} />
          </div>

          {/* Actions */}
          {cohort.status === 'draft' && (
            <div className="bg-[#1E3A4A]/50 border border-[#2D6A8F]/20 rounded-xl p-6 text-center">
              <FlaskConical className="w-10 h-10 text-[#3DAA8A] mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white mb-2">Ready to generate test data?</h3>
              <p className="text-sm text-[#6B8A9A] mb-4">
                This will create {cohort.family_count} test families with accounts and seed data for {FEATURE_LABELS[cohort.target_feature]?.toLowerCase() || 'general'} testing.
              </p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-6 py-2.5 bg-[#3DAA8A] text-white rounded-lg hover:bg-[#3DAA8A]/80 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {generating ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Generating...</span>
                ) : (
                  'Generate Test Data'
                )}
              </button>
            </div>
          )}

          {cohort.status === 'active' && (
            <div className="flex justify-end">
              <button
                onClick={handleComplete}
                disabled={completing}
                className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {completing ? 'Completing...' : 'Complete Bug Hunt'}
              </button>
            </div>
          )}

          {/* Summary (when completed) */}
          {cohort.status === 'completed' && cohort.summary_json && (
            <div className="bg-[#1E3A4A]/50 border border-purple-500/20 rounded-xl p-5">
              <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider mb-3">Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-[#6B8A9A]">Families Tested:</span> <span className="text-white ml-1">{cohort.summary_json.families_completed}/{cohort.summary_json.families_tested}</span></div>
                <div><span className="text-[#6B8A9A]">Checklist:</span> <span className="text-white ml-1">{cohort.summary_json.checklist_completed}</span></div>
                <div><span className="text-[#6B8A9A]">Bugs Found:</span> <span className="text-white ml-1">{cohort.summary_json.bugs_found}</span></div>
                <div><span className="text-[#6B8A9A]">Duration:</span> <span className="text-white ml-1">{cohort.summary_json.duration_hours ? `${cohort.summary_json.duration_hours}h` : 'N/A'}</span></div>
              </div>
            </div>
          )}

          {/* Test Instructions */}
          {cohort.test_instructions && (
            <div className="bg-[#1E3A4A]/50 border border-[#2D6A8F]/20 rounded-xl p-5">
              <h3 className="text-sm font-medium text-[#8AACBC] uppercase tracking-wider mb-3">Test Instructions</h3>
              <pre className="text-sm text-[#D0E4EC] whitespace-pre-wrap font-mono">{cohort.test_instructions}</pre>
            </div>
          )}
        </div>
      )}

      {/* ═══ TEST ACCOUNTS TAB ═══ */}
      {tab === 'accounts' && (
        <div className="space-y-4">
          {families.length === 0 ? (
            <div className="text-center py-12 text-[#6B8A9A]">
              No test accounts generated yet. Generate test data from the Overview tab.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2D6A8F]/20">
                    <th className="text-left py-3 px-3 text-[#6B8A9A] font-medium text-xs uppercase">Family</th>
                    <th className="text-left py-3 px-3 text-[#6B8A9A] font-medium text-xs uppercase">Parent A</th>
                    <th className="text-left py-3 px-3 text-[#6B8A9A] font-medium text-xs uppercase">Parent B</th>
                    <th className="text-left py-3 px-3 text-[#6B8A9A] font-medium text-xs uppercase">Tester</th>
                    <th className="text-left py-3 px-3 text-[#6B8A9A] font-medium text-xs uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {families.map(f => (
                    <tr key={f.id} className="border-b border-[#2D6A8F]/10 hover:bg-[#1E3A4A]/30">
                      <td className="py-3 px-3">
                        <div className="text-white font-medium">{f.parent_a_name.split(' ')[1]} & {f.parent_b_name.split(' ')[1]}</div>
                        <div className="text-[10px] text-[#6B8A9A] mt-0.5">{(f.children_names || []).join(', ')}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[#D0E4EC] font-mono text-xs">{f.parent_a_email}</span>
                          <CopyButton text={f.parent_a_email} />
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[#6B8A9A] font-mono text-xs">{f.parent_a_password}</span>
                          <CopyButton text={f.parent_a_password} />
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[#D0E4EC] font-mono text-xs">{f.parent_b_email}</span>
                          <CopyButton text={f.parent_b_email} />
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[#6B8A9A] font-mono text-xs">{f.parent_b_password}</span>
                          <CopyButton text={f.parent_b_password} />
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {f.tester ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white text-xs font-medium">{f.tester.tester_name}</span>
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                                f.tester.status === 'active' ? 'bg-[#3DAA8A]/15 text-[#3DAA8A]' :
                                f.tester.status === 'invited' ? 'bg-yellow-500/15 text-yellow-400' :
                                f.tester.status === 'revoked' ? 'bg-red-500/15 text-red-400' :
                                'bg-purple-500/15 text-purple-400'
                              }`}>{f.tester.status}</span>
                            </div>
                            <div className="text-[10px] text-[#6B8A9A] mt-0.5">{f.tester.tester_email}</div>
                            <div className="flex gap-1 mt-1">
                              <button onClick={() => handleResendTester(f.tester!.id)} className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"><Mail className="w-3 h-3" />Resend</button>
                              {f.tester.status !== 'revoked' && (
                                <button onClick={() => handleRevokeTester(f.tester!.id)} className="text-[10px] text-red-400 hover:underline flex items-center gap-0.5 ml-2"><XCircle className="w-3 h-3" />Revoke</button>
                              )}
                            </div>
                          </div>
                        ) : assigningFamily === f.id ? (
                          <div className="space-y-1">
                            <input type="text" placeholder="Name" value={assignForm.tester_name} onChange={e => setAssignForm({...assignForm, tester_name: e.target.value})}
                              className="w-full px-2 py-1 bg-[#162D3A] border border-[#2D6A8F]/30 rounded text-xs text-white placeholder-[#4A6E7F]" />
                            <input type="email" placeholder="Email" value={assignForm.tester_email} onChange={e => setAssignForm({...assignForm, tester_email: e.target.value})}
                              className="w-full px-2 py-1 bg-[#162D3A] border border-[#2D6A8F]/30 rounded text-xs text-white placeholder-[#4A6E7F]" />
                            <div className="flex gap-1">
                              <button onClick={() => handleAssignTester(f.id)} className="px-2 py-0.5 bg-[#3DAA8A] text-white rounded text-[10px]">Assign</button>
                              <button onClick={() => { setAssigningFamily(null); setAssignForm({ tester_name: '', tester_email: '' }); }} className="px-2 py-0.5 text-[#6B8A9A] text-[10px]">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setAssigningFamily(f.id)} className="flex items-center gap-1 text-xs text-[#3DAA8A] hover:text-[#5BC4A0]">
                            <UserPlus className="w-3.5 h-3.5" />Assign
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={f.test_status}
                          onChange={e => handleFamilyStatus(f.id, e.target.value)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border-0 cursor-pointer bg-transparent ${STATUS_COLORS[f.test_status] || ''}`}
                          style={{ appearance: 'auto' }}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="blocked">Blocked</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ CHECKLIST TAB ═══ */}
      {tab === 'checklist' && (
        <div className="space-y-4">
          {/* Progress bar */}
          {stats.checklist_total > 0 && (
            <div className="bg-[#1E3A4A]/50 border border-[#2D6A8F]/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#8AACBC]">Progress</span>
                <span className="text-sm text-white font-medium">{stats.checklist_completed}/{stats.checklist_total} ({checklistProgress}%)</span>
              </div>
              <div className="w-full h-2 bg-[#2D6A8F]/20 rounded-full overflow-hidden">
                <div className="h-full bg-[#3DAA8A] rounded-full transition-all" style={{ width: `${checklistProgress}%` }} />
              </div>
            </div>
          )}

          {/* Items */}
          <div className="space-y-1">
            {checklist.map(item => (
              <div key={item.id} className="flex items-start gap-3 bg-[#1E3A4A]/30 hover:bg-[#1E3A4A]/50 rounded-lg p-3 group transition-colors">
                <button
                  onClick={() => handleToggleChecklist(item.id)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    item.is_completed
                      ? 'bg-[#3DAA8A] border-[#3DAA8A] text-white'
                      : 'border-[#4A6E7F] hover:border-[#3DAA8A]'
                  }`}
                >
                  {item.is_completed && <Check className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${item.is_completed ? 'text-[#6B8A9A] line-through' : 'text-white'}`}>
                    {item.title}
                  </div>
                  {item.description && (
                    <div className="text-xs text-[#6B8A9A] mt-0.5">{item.description}</div>
                  )}
                  {item.completed_at && (
                    <div className="text-[10px] text-[#4A6E7F] mt-1">
                      Completed {new Date(item.completed_at).toLocaleString()}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteCheckItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-[#4A6E7F] hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add item */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCheckItem}
              onChange={e => setNewCheckItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCheckItem()}
              placeholder="Add checklist item..."
              className="flex-1 px-3 py-2 bg-[#1E3A4A] border border-[#2D6A8F]/30 rounded-lg text-white placeholder-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]/50 text-sm"
            />
            <button
              onClick={handleAddCheckItem}
              disabled={!newCheckItem.trim()}
              className="px-3 py-2 bg-[#3DAA8A]/20 text-[#3DAA8A] rounded-lg hover:bg-[#3DAA8A]/30 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ BUG REPORTS TAB ═══ */}
      {tab === 'bugs' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowBugForm(!showBugForm)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#3DAA8A]/20 text-[#3DAA8A] rounded-lg hover:bg-[#3DAA8A]/30 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Report Bug
            </button>
          </div>

          {/* Bug form */}
          {showBugForm && (
            <div className="bg-[#1E3A4A]/50 border border-[#2D6A8F]/20 rounded-xl p-4 space-y-3">
              <input
                type="text"
                value={bugForm.title}
                onChange={e => setBugForm({ ...bugForm, title: e.target.value })}
                placeholder="Bug title"
                className="w-full px-3 py-2 bg-[#162D3A] border border-[#2D6A8F]/30 rounded-lg text-white placeholder-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]/50 text-sm"
              />
              <textarea
                value={bugForm.description}
                onChange={e => setBugForm({ ...bugForm, description: e.target.value })}
                placeholder="Description"
                rows={3}
                className="w-full px-3 py-2 bg-[#162D3A] border border-[#2D6A8F]/30 rounded-lg text-white placeholder-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]/50 text-sm resize-none"
              />
              <div className="flex gap-3">
                <select
                  value={bugForm.severity}
                  onChange={e => setBugForm({ ...bugForm, severity: e.target.value })}
                  className="px-3 py-2 bg-[#162D3A] border border-[#2D6A8F]/30 rounded-lg text-white text-sm"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                {families.length > 0 && (
                  <select
                    value={bugForm.family_id}
                    onChange={e => setBugForm({ ...bugForm, family_id: e.target.value })}
                    className="px-3 py-2 bg-[#162D3A] border border-[#2D6A8F]/30 rounded-lg text-white text-sm"
                  >
                    <option value="">No family</option>
                    {families.map(f => (
                      <option key={f.id} value={f.id}>{f.parent_a_name} & {f.parent_b_name}</option>
                    ))}
                  </select>
                )}
              </div>
              <textarea
                value={bugForm.steps_to_reproduce}
                onChange={e => setBugForm({ ...bugForm, steps_to_reproduce: e.target.value })}
                placeholder="Steps to reproduce (optional)"
                rows={2}
                className="w-full px-3 py-2 bg-[#162D3A] border border-[#2D6A8F]/30 rounded-lg text-white placeholder-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]/50 text-sm resize-none font-mono"
              />
              <div className="flex gap-2">
                <button onClick={handleSubmitBug} className="px-4 py-2 bg-[#3DAA8A] text-white rounded-lg hover:bg-[#3DAA8A]/80 text-sm font-medium">Submit Bug</button>
                <button onClick={() => setShowBugForm(false)} className="px-4 py-2 text-[#8AACBC] hover:text-white text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Bug list */}
          {bug_reports.length === 0 ? (
            <div className="text-center py-12 text-[#6B8A9A]">No bugs reported yet.</div>
          ) : (
            <div className="space-y-2">
              {bug_reports.map(bug => (
                <div key={bug.id} className="bg-[#1E3A4A]/30 border border-[#2D6A8F]/10 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedBugs(prev => {
                      const next = new Set(prev);
                      next.has(bug.id) ? next.delete(bug.id) : next.add(bug.id);
                      return next;
                    })}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-[#1E3A4A]/50 transition-colors"
                  >
                    {expandedBugs.has(bug.id) ? <ChevronDown className="w-4 h-4 text-[#6B8A9A]" /> : <ChevronRight className="w-4 h-4 text-[#6B8A9A]" />}
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${SEVERITY_COLORS[bug.severity]}`}>{bug.severity}</span>
                    <span className="text-sm text-white flex-1 truncate">{bug.title}</span>
                    {bug.tester_name && <span className="text-[10px] text-[#3DAA8A] bg-[#3DAA8A]/10 px-1.5 py-0.5 rounded">by {bug.tester_name}</span>}
                    <select
                      value={bug.status}
                      onChange={e => { e.stopPropagation(); handleUpdateBugStatus(bug.id, e.target.value); }}
                      onClick={e => e.stopPropagation()}
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border-0 cursor-pointer bg-transparent ${STATUS_COLORS[bug.status] || ''}`}
                    >
                      <option value="open">Open</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="fixed">Fixed</option>
                      <option value="wont_fix">Won't Fix</option>
                    </select>
                    <span className="text-xs text-[#6B8A9A]">{new Date(bug.created_at).toLocaleDateString()}</span>
                  </button>
                  {expandedBugs.has(bug.id) && (
                    <div className="px-11 pb-3 space-y-2">
                      <p className="text-sm text-[#D0E4EC]">{bug.description}</p>
                      {bug.steps_to_reproduce && (
                        <div>
                          <span className="text-xs text-[#6B8A9A] font-medium">Steps to Reproduce:</span>
                          <pre className="text-xs text-[#8AACBC] mt-1 whitespace-pre-wrap font-mono">{bug.steps_to_reproduce}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ FEEDBACK TAB ═══ */}
      {tab === 'feedback' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {stats.avg_rating !== null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#6B8A9A]">Average Rating:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-4 h-4 ${s <= (stats.avg_rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-[#4A6E7F]'}`} />
                  ))}
                  <span className="text-white font-medium ml-1">{stats.avg_rating}</span>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowFeedbackForm(!showFeedbackForm)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#3DAA8A]/20 text-[#3DAA8A] rounded-lg hover:bg-[#3DAA8A]/30 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Feedback
            </button>
          </div>

          {showFeedbackForm && (
            <div className="bg-[#1E3A4A]/50 border border-[#2D6A8F]/20 rounded-xl p-4 space-y-3">
              <div className="flex gap-3">
                <select
                  value={feedbackForm.category}
                  onChange={e => setFeedbackForm({ ...feedbackForm, category: e.target.value })}
                  className="px-3 py-2 bg-[#162D3A] border border-[#2D6A8F]/30 rounded-lg text-white text-sm"
                >
                  <option value="ux">UX</option>
                  <option value="performance">Performance</option>
                  <option value="functionality">Functionality</option>
                  <option value="documentation">Documentation</option>
                  <option value="other">Other</option>
                </select>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      onClick={() => setFeedbackForm({ ...feedbackForm, rating: feedbackForm.rating === s ? 0 : s })}
                      className="p-0.5"
                    >
                      <Star className={`w-5 h-5 ${s <= feedbackForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-[#4A6E7F]'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={feedbackForm.content}
                onChange={e => setFeedbackForm({ ...feedbackForm, content: e.target.value })}
                placeholder="Feedback details..."
                rows={3}
                className="w-full px-3 py-2 bg-[#162D3A] border border-[#2D6A8F]/30 rounded-lg text-white placeholder-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]/50 text-sm resize-none"
              />
              <div className="flex gap-2">
                <button onClick={handleSubmitFeedback} className="px-4 py-2 bg-[#3DAA8A] text-white rounded-lg hover:bg-[#3DAA8A]/80 text-sm font-medium">Submit</button>
                <button onClick={() => setShowFeedbackForm(false)} className="px-4 py-2 text-[#8AACBC] hover:text-white text-sm">Cancel</button>
              </div>
            </div>
          )}

          {feedback.length === 0 ? (
            <div className="text-center py-12 text-[#6B8A9A]">No feedback yet.</div>
          ) : (
            <div className="space-y-3">
              {feedback.map(fb => (
                <div key={fb.id} className="bg-[#1E3A4A]/30 border border-[#2D6A8F]/10 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">{fb.category}</span>
                    {fb.rating && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3 h-3 ${s <= fb.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-[#4A6E7F]'}`} />
                        ))}
                      </div>
                    )}
                    <span className="text-xs text-[#6B8A9A] ml-auto">{new Date(fb.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-[#D0E4EC]">{fb.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ NOTES TAB ═══ */}
      {tab === 'notes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowNoteForm(!showNoteForm)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#3DAA8A]/20 text-[#3DAA8A] rounded-lg hover:bg-[#3DAA8A]/30 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Note
            </button>
          </div>

          {showNoteForm && (
            <div className="bg-[#1E3A4A]/50 border border-[#2D6A8F]/20 rounded-xl p-4 space-y-3">
              <div className="flex gap-3">
                <select
                  value={noteForm.note_type}
                  onChange={e => setNoteForm({ ...noteForm, note_type: e.target.value })}
                  className="px-3 py-2 bg-[#162D3A] border border-[#2D6A8F]/30 rounded-lg text-white text-sm"
                >
                  <option value="observation">Observation</option>
                  <option value="blocker">Blocker</option>
                  <option value="question">Question</option>
                  <option value="resolution">Resolution</option>
                </select>
                {families.length > 0 && (
                  <select
                    value={noteForm.family_id}
                    onChange={e => setNoteForm({ ...noteForm, family_id: e.target.value })}
                    className="px-3 py-2 bg-[#162D3A] border border-[#2D6A8F]/30 rounded-lg text-white text-sm"
                  >
                    <option value="">Cohort-level</option>
                    {families.map(f => (
                      <option key={f.id} value={f.id}>{f.parent_a_name} & {f.parent_b_name}</option>
                    ))}
                  </select>
                )}
              </div>
              <textarea
                value={noteForm.content}
                onChange={e => setNoteForm({ ...noteForm, content: e.target.value })}
                placeholder="Your observation or note..."
                rows={3}
                className="w-full px-3 py-2 bg-[#162D3A] border border-[#2D6A8F]/30 rounded-lg text-white placeholder-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]/50 text-sm resize-none"
              />
              <div className="flex gap-2">
                <button onClick={handleSubmitNote} className="px-4 py-2 bg-[#3DAA8A] text-white rounded-lg hover:bg-[#3DAA8A]/80 text-sm font-medium">Add Note</button>
                <button onClick={() => setShowNoteForm(false)} className="px-4 py-2 text-[#8AACBC] hover:text-white text-sm">Cancel</button>
              </div>
            </div>
          )}

          {notes.length === 0 ? (
            <div className="text-center py-12 text-[#6B8A9A]">No notes yet.</div>
          ) : (
            <div className="space-y-2">
              {notes.map(note => (
                <div key={note.id} className="bg-[#1E3A4A]/30 border border-[#2D6A8F]/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${NOTE_TYPE_COLORS[note.note_type] || NOTE_TYPE_COLORS.observation}`}>
                      {note.note_type}
                    </span>
                    <span className="text-xs text-[#6B8A9A]">{new Date(note.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-[#D0E4EC]">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
