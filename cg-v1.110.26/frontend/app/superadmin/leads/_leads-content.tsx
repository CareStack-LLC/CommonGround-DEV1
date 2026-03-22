'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  UserPlus, Upload, RefreshCw, Trash2, Plus, X,
  AlertTriangle, ExternalLink, CloudUpload, Search,
  ChevronLeft, ChevronRight, TrendingUp, Users,
  FileSpreadsheet, BarChart3, ArrowRight, Zap,
  Mail, Globe, Calendar, Megaphone, Share2, Gift, Hash,
  ListFilter,
} from 'lucide-react';
import { adminAPI, type LeadList, type Lead } from '@/lib/admin-api';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`} />;
}

type Tab = 'pipeline' | 'lists' | 'import';

const SOURCE_OPTIONS = [
  'newsletter', 'blog', 'contact_form', 'event', 'social', 'paid', 'referral', 'other',
] as const;

const SOURCE_COLORS: Record<string, string> = {
  newsletter: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  blog: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  contact_form: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  event: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  social: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  paid: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  referral: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  other: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
};

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  newsletter: <Mail className="w-4 h-4" />,
  blog: <FileSpreadsheet className="w-4 h-4" />,
  contact_form: <Globe className="w-4 h-4" />,
  event: <Calendar className="w-4 h-4" />,
  social: <Share2 className="w-4 h-4" />,
  paid: <Megaphone className="w-4 h-4" />,
  referral: <Gift className="w-4 h-4" />,
  other: <Hash className="w-4 h-4" />,
};

interface PipelineData {
  funnel: { total: number; contacted: number; responded: number; converted: number };
  by_source: Record<string, number>;
  conversion_rate: number;
  recent_conversions: { email: string; source: string; converted_at: string | null; list_id?: string }[];
  top_lists: { id: string; name: string; lead_count: number; converted: number }[];
}

export default function LeadsContent() {
  const [activeTab, setActiveTab] = useState<Tab>('pipeline');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // --- Pipeline state ---
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<{ matched: number; total_unmatched: number } | null>(null);

  // --- Lists state ---
  const [lists, setLists] = useState<LeadList[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState('prospect');
  const [createDesc, setCreateDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedList, setSelectedList] = useState<(LeadList & { leads: Lead[] }) | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  // --- Import state ---
  const [importListId, setImportListId] = useState<string>('');
  const [importSource, setImportSource] = useState<string>('newsletter');
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ email: '', first_name: '', last_name: '', company: '', title: '', source: 'newsletter' });
  const [addingLead, setAddingLead] = useState(false);

  // Auto-dismiss success
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // --- Pipeline fetch ---
  const fetchPipeline = useCallback(async () => {
    try {
      setPipelineLoading(true);
      setError(null);
      const data = await adminAPI.getLeadPipeline();
      setPipeline(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline data');
    } finally {
      setPipelineLoading(false);
    }
  }, []);

  // --- Lists fetch ---
  const fetchLists = useCallback(async () => {
    try {
      setListsLoading(true);
      setError(null);
      const data = await adminAPI.getLeadLists();
      setLists(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load lead lists');
    } finally {
      setListsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
    fetchLists();
  }, [fetchPipeline, fetchLists]);

  // --- Pipeline actions ---
  const handleMatchUsers = async () => {
    try {
      setMatching(true);
      setError(null);
      const result = await adminAPI.matchLeadUsers();
      setMatchResult(result);
      setSuccess(`Matched ${result.matched} leads to users. ${result.total_unmatched} remain unmatched.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to match users');
    } finally {
      setMatching(false);
    }
  };

  // --- List actions ---
  const createList = async () => {
    if (!createName.trim()) return;
    try {
      setCreating(true);
      setError(null);
      await adminAPI.createLeadList({ name: createName, lead_type: createType, description: createDesc || undefined });
      setShowCreate(false);
      setCreateName('');
      setCreateDesc('');
      setSuccess('List created successfully');
      await fetchLists();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create list');
    } finally {
      setCreating(false);
    }
  };

  const deleteList = async (id: string) => {
    if (!confirm('Are you sure you want to delete this list?')) return;
    try {
      setError(null);
      await adminAPI.deleteLeadList(id);
      setSuccess('List deleted');
      if (selectedList?.id === id) setSelectedList(null);
      await fetchLists();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete list');
    }
  };

  const viewList = async (id: string) => {
    try {
      setLoadingDetail(true);
      setError(null);
      const data = await adminAPI.getLeadListDetail(id);
      setSelectedList(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load list detail');
    } finally {
      setLoadingDetail(false);
    }
  };

  const syncToSendGrid = async (listId: string) => {
    try {
      setSyncing(listId);
      setError(null);
      await adminAPI.syncLeadsToSendGrid(listId);
      setSuccess('Synced to SendGrid');
      await fetchLists();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sync to SendGrid');
    } finally {
      setSyncing(null);
    }
  };

  // --- Import actions ---
  const handleImportFile = async (file: File) => {
    if (!importListId) {
      setError('Please select a list first');
      return;
    }
    try {
      setImporting(true);
      setError(null);
      await adminAPI.importLeadsCsv(importListId, file, importSource);
      setSuccess('CSV imported successfully');
      await fetchLists();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to import CSV');
    } finally {
      setImporting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) handleImportFile(file);
    else setError('Please upload a CSV file');
  };

  const addLead = async () => {
    if (!importListId || !newLead.email) {
      setError(!importListId ? 'Please select a list first' : 'Email is required');
      return;
    }
    try {
      setAddingLead(true);
      setError(null);
      await adminAPI.addLead(importListId, { ...newLead, source: newLead.source });
      setNewLead({ email: '', first_name: '', last_name: '', company: '', title: '', source: 'newsletter' });
      setSuccess('Lead added successfully');
      setShowAddLead(false);
      await fetchLists();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add lead');
    } finally {
      setAddingLead(false);
    }
  };

  // --- Detail sub-view (lists tab) ---
  if (selectedList) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedList(null)} className="p-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors">
            <ChevronLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{selectedList.name}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{selectedList.lead_count} leads | {selectedList.lead_type}</p>
          </div>
          <button
            onClick={() => { setImportListId(selectedList.id); setShowAddLead(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Lead
          </button>
          <button
            onClick={() => syncToSendGrid(selectedList.id)}
            disabled={syncing === selectedList.id}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <CloudUpload className={`w-4 h-4 ${syncing === selectedList.id ? 'animate-pulse' : ''}`} /> Sync SendGrid
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm text-emerald-300">{success}</p>
          </div>
        )}

        {/* Inline Add Lead Form */}
        {showAddLead && (
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-300">Add Lead</h3>
              <button onClick={() => setShowAddLead(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} placeholder="Email *" className="col-span-2 px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50" />
              <input value={newLead.first_name} onChange={e => setNewLead({ ...newLead, first_name: e.target.value })} placeholder="First name" className="px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50" />
              <input value={newLead.last_name} onChange={e => setNewLead({ ...newLead, last_name: e.target.value })} placeholder="Last name" className="px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50" />
              <input value={newLead.company} onChange={e => setNewLead({ ...newLead, company: e.target.value })} placeholder="Company" className="px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50" />
              <input value={newLead.title} onChange={e => setNewLead({ ...newLead, title: e.target.value })} placeholder="Title" className="px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50" />
            </div>
            <button onClick={addLead} disabled={addingLead || !newLead.email} className="mt-3 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {addingLead ? 'Adding...' : 'Add Lead'}
            </button>
          </div>
        )}

        {/* Leads Table */}
        {loadingDetail ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {(!selectedList?.leads || selectedList.leads.length === 0) ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-zinc-500">No leads yet. Import a CSV or add manually.</td></tr>
                ) : selectedList.leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-zinc-200">{lead.email}</td>
                    <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">{[lead.first_name, lead.last_name].filter(Boolean).join(' ') || '\u2014'}</td>
                    <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell">{lead.company || '\u2014'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${SOURCE_COLORS[lead.source] || SOURCE_COLORS.other}`}>
                        {lead.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        lead.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
                        lead.status === 'bounced' ? 'bg-red-500/15 text-red-400' :
                        'bg-zinc-700/50 text-zinc-400'
                      }`}>{lead.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // --- Main tabbed view ---
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'pipeline', label: 'Pipeline', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'lists', label: 'Lead Lists', icon: <ListFilter className="w-4 h-4" /> },
    { key: 'import', label: 'Import', icon: <Upload className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Lead Generator</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{lists.length} lead lists</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-0.5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-violet-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-emerald-300">{success}</p>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ===================== TAB 1: PIPELINE ===================== */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {pipelineLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          ) : (
            <>
              {/* Funnel Visualization */}
              <div>
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Conversion Funnel</h2>
                <div className="flex items-center gap-2">
                  {[
                    { label: 'Total', value: pipeline?.funnel?.total ?? 0, color: 'from-violet-500/20 to-violet-600/10 border-violet-500/30' },
                    { label: 'Contacted', value: pipeline?.funnel?.contacted ?? 0, color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30' },
                    { label: 'Responded', value: pipeline?.funnel?.responded ?? 0, color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30' },
                    { label: 'Converted', value: pipeline?.funnel?.converted ?? 0, color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30' },
                  ].map((step, idx, arr) => (
                    <div key={step.label} className="flex items-center gap-2 flex-1">
                      <div className={`flex-1 bg-gradient-to-br ${step.color} border rounded-xl p-4 text-center`}>
                        <div className="text-2xl font-bold text-white">{step.value.toLocaleString()}</div>
                        <div className="text-xs font-medium text-zinc-400 mt-1">{step.label}</div>
                      </div>
                      {idx < arr.length - 1 && (
                        <ArrowRight className="w-5 h-5 text-zinc-600 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
                {pipeline?.conversion_rate != null && (
                  <div className="mt-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-zinc-400">Conversion rate:</span>
                    <span className="text-sm font-semibold text-emerald-400">{pipeline.conversion_rate.toFixed(1)}%</span>
                  </div>
                )}
              </div>

              {/* Source Breakdown */}
              <div>
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">By Source</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Object.entries(pipeline?.by_source ?? {}).map(([source, count]) => (
                    <div
                      key={source}
                      className={`rounded-xl border p-4 flex items-center gap-3 ${SOURCE_COLORS[source] || SOURCE_COLORS.other}`}
                    >
                      <div className="flex-shrink-0">
                        {SOURCE_ICONS[source] || SOURCE_ICONS.other}
                      </div>
                      <div>
                        <div className="text-lg font-bold">{(count as number).toLocaleString()}</div>
                        <div className="text-xs capitalize opacity-80">{source.replace('_', ' ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Match Users */}
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-300">Match Leads to Users</h2>
                    <p className="text-xs text-zinc-500 mt-1">Link lead records with existing platform users by email</p>
                  </div>
                  <button
                    onClick={handleMatchUsers}
                    disabled={matching}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Zap className={`w-4 h-4 ${matching ? 'animate-pulse' : ''}`} />
                    {matching ? 'Matching...' : 'Match Users'}
                  </button>
                </div>
                {matchResult && (
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className="text-emerald-400 font-medium">{matchResult.matched} matched</span>
                    <span className="text-zinc-500">|</span>
                    <span className="text-zinc-400">{matchResult.total_unmatched} unmatched</span>
                  </div>
                )}
              </div>

              {/* Recent Conversions */}
              {(pipeline?.recent_conversions?.length ?? 0) > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Recent Conversions</h2>
                  <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800/80">
                          <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Email</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Source</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {pipeline?.recent_conversions?.map((c, i) => (
                          <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-4 py-3 text-zinc-200">{c.email}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${SOURCE_COLORS[c.source] || SOURCE_COLORS.other}`}>
                                {c.source}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-500 text-xs">
                              {c.converted_at ? new Date(c.converted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Top Lists */}
              {(pipeline?.top_lists?.length ?? 0) > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Top Lists</h2>
                  <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800/80">
                          <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Leads</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Converted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {pipeline?.top_lists?.map(list => (
                          <tr key={list.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-4 py-3 text-zinc-200 font-medium">{list.name}</td>
                            <td className="px-4 py-3 text-right text-zinc-300">{list.lead_count}</td>
                            <td className="px-4 py-3 text-right text-emerald-400 font-medium">{list.converted}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===================== TAB 2: LEAD LISTS ===================== */}
      {activeTab === 'lists' && (
        <div className="space-y-6">
          <div className="flex items-center justify-end">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Create List
            </button>
          </div>

          {/* Create List Modal */}
          {showCreate && (
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-300">Create Lead List</h3>
                <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="List name *" className="w-full px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50" />
                <select value={createType} onChange={e => setCreateType(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer">
                  <option value="prospect">Prospect</option>
                  <option value="customer">Customer</option>
                  <option value="partner">Partner</option>
                  <option value="other">Other</option>
                </select>
                <input value={createDesc} onChange={e => setCreateDesc(e.target.value)} placeholder="Description (optional)" className="w-full px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50" />
                <button onClick={createList} disabled={creating || !createName.trim()} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create List'}
                </button>
              </div>
            </div>
          )}

          {/* Lists Table */}
          {listsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : lists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <UserPlus className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-sm">No lead lists yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800/80">
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Type</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Leads</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">SendGrid</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Created</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider w-40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {lists.map(list => (
                    <tr key={list.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => viewList(list.id)} className="text-zinc-200 font-medium hover:text-violet-300 transition-colors flex items-center gap-1.5">
                          {list.name} <ExternalLink className="w-3 h-3 text-zinc-600" />
                        </button>
                        {list.description && <div className="text-xs text-zinc-600 truncate max-w-xs">{list.description}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-700/50 text-zinc-400 capitalize">{list.lead_type}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-300 font-medium">{list.lead_count}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          list.sendgrid_list_id ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700/50 text-zinc-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${list.sendgrid_list_id ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                          {list.sendgrid_list_id ? 'Synced' : 'Not synced'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-zinc-500 text-xs">
                        {new Date(list.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => viewList(list.id)}
                            className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-colors"
                            title="View leads"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => syncToSendGrid(list.id)}
                            disabled={syncing === list.id}
                            className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
                            title="Sync to SendGrid"
                          >
                            <CloudUpload className={`w-4 h-4 ${syncing === list.id ? 'animate-pulse' : ''}`} />
                          </button>
                          <button
                            onClick={() => deleteList(list.id)}
                            className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-red-400 transition-colors"
                            title="Delete list"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 3: IMPORT ===================== */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* List Selection */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Target List</h2>
            <p className="text-xs text-zinc-500 mb-3">Select a list before importing leads via CSV or manual entry.</p>
            {listsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : lists.length === 0 ? (
              <div className="text-sm text-zinc-500">
                No lists available.{' '}
                <button onClick={() => setActiveTab('lists')} className="text-violet-400 hover:text-violet-300 underline">
                  Create one first
                </button>
              </div>
            ) : (
              <select
                value={importListId}
                onChange={e => setImportListId(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
              >
                <option value="">Select a list...</option>
                {lists.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.lead_count} leads)</option>
                ))}
              </select>
            )}
          </div>

          {/* Source Selection */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Source</h2>
            <select
              value={importSource}
              onChange={e => setImportSource(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
            >
              {SOURCE_OPTIONS.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          {/* CSV Upload */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">CSV Import</h2>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragOver ? 'border-violet-500/50 bg-violet-500/5' : 'border-zinc-800/60'
              } ${!importListId ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400 mb-2">
                {importListId
                  ? 'Drag and drop a CSV file here, or click to browse'
                  : 'Select a list above before uploading'}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleImportFile(e.target.files[0]); }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={importing || !importListId}
                className="px-4 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Choose File'}
              </button>
            </div>
          </div>

          {/* Manual Add */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-300">Manual Add</h2>
                <p className="text-xs text-zinc-500 mt-1">Add a single lead manually</p>
              </div>
              {!showAddLead && (
                <button
                  onClick={() => setShowAddLead(true)}
                  disabled={!importListId}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Add Lead
                </button>
              )}
            </div>

            {showAddLead && (
              <div className="space-y-3">
                {!importListId && (
                  <p className="text-xs text-amber-400">Select a target list above first.</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={newLead.email}
                    onChange={e => setNewLead({ ...newLead, email: e.target.value })}
                    placeholder="Email *"
                    className="col-span-2 px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
                  />
                  <input
                    value={newLead.first_name}
                    onChange={e => setNewLead({ ...newLead, first_name: e.target.value })}
                    placeholder="First name"
                    className="px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
                  />
                  <input
                    value={newLead.last_name}
                    onChange={e => setNewLead({ ...newLead, last_name: e.target.value })}
                    placeholder="Last name"
                    className="px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
                  />
                  <input
                    value={newLead.company}
                    onChange={e => setNewLead({ ...newLead, company: e.target.value })}
                    placeholder="Company"
                    className="px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
                  />
                  <input
                    value={newLead.title}
                    onChange={e => setNewLead({ ...newLead, title: e.target.value })}
                    placeholder="Title"
                    className="px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
                  />
                  <select
                    value={newLead.source}
                    onChange={e => setNewLead({ ...newLead, source: e.target.value })}
                    className="col-span-2 px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
                  >
                    {SOURCE_OPTIONS.map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={addLead}
                    disabled={addingLead || !newLead.email || !importListId}
                    className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {addingLead ? 'Adding...' : 'Add Lead'}
                  </button>
                  <button
                    onClick={() => setShowAddLead(false)}
                    className="px-4 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
