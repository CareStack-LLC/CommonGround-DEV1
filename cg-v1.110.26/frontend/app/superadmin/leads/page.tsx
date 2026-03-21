'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  UserPlus, Upload, RefreshCw, Trash2, Plus, X,
  AlertTriangle, ExternalLink, CloudUpload, Search,
  ChevronLeft,
} from 'lucide-react';
import { adminAPI, type LeadList, type Lead } from '@/lib/admin-api';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`} />;
}

export default function LeadsPage() {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create list modal
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState('prospect');
  const [createDesc, setCreateDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Detail view
  const [selectedList, setSelectedList] = useState<(LeadList & { leads: Lead[] }) | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // CSV Import
  const [importListId, setImportListId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Add Lead form
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ email: '', first_name: '', last_name: '', company: '', title: '' });
  const [addingLead, setAddingLead] = useState(false);

  // Syncing
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminAPI.getLeadLists();
      setLists(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load lead lists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLists(); }, [fetchLists]);

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

  const handleImportFile = async (file: File) => {
    if (!importListId) return;
    try {
      setImporting(true);
      setError(null);
      await adminAPI.importLeadsCsv(importListId, file);
      setSuccess('CSV imported successfully');
      setImportListId(null);
      await fetchLists();
      if (selectedList?.id === importListId) await viewList(importListId);
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
    if (!selectedList || !newLead.email) return;
    try {
      setAddingLead(true);
      setError(null);
      await adminAPI.addLead(selectedList.id, newLead);
      setShowAddLead(false);
      setNewLead({ email: '', first_name: '', last_name: '', company: '', title: '' });
      setSuccess('Lead added');
      await viewList(selectedList.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add lead');
    } finally {
      setAddingLead(false);
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

  // Detail view
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
            onClick={() => setShowAddLead(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Lead
          </button>
          <button
            onClick={() => setImportListId(selectedList.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" /> Import CSV
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

        {/* Add Lead Form */}
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

        {/* CSV Import */}
        {importListId === selectedList.id && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver ? 'border-violet-500/50 bg-violet-500/5' : 'border-zinc-800/60'
            }`}
          >
            <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400 mb-2">Drag and drop a CSV file here, or click to browse</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImportFile(e.target.files[0]); }} />
            <button onClick={() => fileRef.current?.click()} disabled={importing} className="px-4 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50">
              {importing ? 'Importing...' : 'Choose File'}
            </button>
            <button onClick={() => setImportListId(null)} className="ml-2 px-4 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 text-sm transition-colors">Cancel</button>
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
                {(!selectedList.leads || selectedList.leads.length === 0) ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-zinc-500">No leads yet. Import a CSV or add manually.</td></tr>
                ) : selectedList.leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-zinc-200">{lead.email}</td>
                    <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">{[lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'}</td>
                    <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell">{lead.company || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-700/50 text-zinc-400">{lead.source}</span>
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

  // Main list view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Lead Generator</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{lists.length} lead lists</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Create List
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
      {loading ? (
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
                        onClick={() => { setImportListId(list.id); viewList(list.id); }}
                        className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-colors"
                        title="Import CSV"
                      >
                        <Upload className="w-4 h-4" />
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
  );
}
