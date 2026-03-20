'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Send, Plus, X, Wand2, Eye, AlertTriangle,
  RefreshCw, Mail, BarChart3,
} from 'lucide-react';
import { adminAPI, type EmailCampaign, type LeadList } from '@/lib/admin-api';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`} />;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-700/50 text-zinc-400',
  scheduled: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  sent: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  failed: 'bg-red-500/15 text-red-400 border border-red-500/20',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSubject, setCreateSubject] = useState('');
  const [createListId, setCreateListId] = useState('');
  const [creating, setCreating] = useState(false);

  // AI Content
  const [aiCampaignId, setAiCampaignId] = useState<string | null>(null);
  const [aiAudience, setAiAudience] = useState('co-parents');
  const [aiProductFocus, setAiProductFocus] = useState('platform');
  const [aiTone, setAiTone] = useState('professional');
  const [generating, setGenerating] = useState(false);

  // Preview
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewCampaignId, setPreviewCampaignId] = useState<string | null>(null);

  // Sending
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [c, l] = await Promise.all([
        adminAPI.getCampaigns(),
        adminAPI.getLeadLists(),
      ]);
      setCampaigns(c);
      setLists(l);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createCampaign = async () => {
    if (!createName.trim() || !createSubject.trim() || !createListId) return;
    try {
      setCreating(true);
      setError(null);
      const campaign = await adminAPI.createCampaign({
        name: createName, lead_list_id: createListId, subject: createSubject,
      });
      setShowCreate(false);
      setCreateName('');
      setCreateSubject('');
      setCreateListId('');
      setSuccess('Campaign created');
      setAiCampaignId(campaign.id);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const generateContent = async () => {
    if (!aiCampaignId) return;
    try {
      setGenerating(true);
      setError(null);
      const result = await adminAPI.generateCampaignContent(aiCampaignId, {
        audience: aiAudience, product_focus: aiProductFocus, tone: aiTone,
      });
      setPreviewHtml(result.html_content);
      setPreviewCampaignId(aiCampaignId);
      setSuccess('Content generated');
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  const sendCampaign = async (id: string) => {
    try {
      setSendingId(id);
      setConfirmSend(null);
      setError(null);
      await adminAPI.sendCampaign(id);
      setSuccess('Campaign sent successfully');
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send campaign');
    } finally {
      setSendingId(null);
    }
  };

  const getListName = (listId: string | null) => {
    if (!listId) return '—';
    const list = lists.find(l => l.id === listId);
    return list?.name || listId.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Campaign Manager</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{campaigns.length} campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>
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

      {/* Create Campaign Form */}
      {showCreate && (
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-300">Create Campaign</h3>
            <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3">
            <input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Campaign name *" className="w-full px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50" />
            <input value={createSubject} onChange={e => setCreateSubject(e.target.value)} placeholder="Email subject *" className="w-full px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50" />
            <select value={createListId} onChange={e => setCreateListId(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer">
              <option value="">Select lead list *</option>
              {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.lead_count} leads)</option>)}
            </select>
            <button onClick={createCampaign} disabled={creating || !createName.trim() || !createSubject.trim() || !createListId} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {creating ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </div>
      )}

      {/* AI Content Generator */}
      {aiCampaignId && (
        <div className="bg-zinc-900/50 border border-violet-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-violet-300 flex items-center gap-2">
              <Wand2 className="w-4 h-4" /> AI Content Generator
            </h3>
            <button onClick={() => setAiCampaignId(null)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Audience</label>
              <select value={aiAudience} onChange={e => setAiAudience(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer">
                <option value="co-parents">Co-Parents</option>
                <option value="family-lawyers">Family Lawyers</option>
                <option value="mediators">Mediators</option>
                <option value="therapists">Therapists</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Product Focus</label>
              <select value={aiProductFocus} onChange={e => setAiProductFocus(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer">
                <option value="platform">Full Platform</option>
                <option value="aria">ARIA AI</option>
                <option value="kidcoms">KidComs</option>
                <option value="agreements">Agreement Builder</option>
                <option value="clearfund">ClearFund</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Tone</label>
              <select value={aiTone} onChange={e => setAiTone(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer">
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="empathetic">Empathetic</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <button onClick={generateContent} disabled={generating} className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
            <Wand2 className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate Content'}
          </button>
        </div>
      )}

      {/* Email Preview */}
      {previewHtml && (
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Eye className="w-4 h-4" /> Email Preview
            </h3>
            <button onClick={() => { setPreviewHtml(null); setPreviewCampaignId(null); }} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
          </div>
          <div className="bg-white rounded-lg p-4 max-h-96 overflow-y-auto">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
          {previewCampaignId && (
            <div className="mt-3 flex gap-2">
              <button onClick={() => setAiCampaignId(previewCampaignId)} className="px-3 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors">
                Regenerate
              </button>
            </div>
          )}
        </div>
      )}

      {/* Send Confirmation */}
      {confirmSend && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 flex items-center gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-amber-200 font-medium">Confirm Send</p>
            <p className="text-xs text-amber-300/70">This will send the campaign to all leads in the list. This action cannot be undone.</p>
          </div>
          <button onClick={() => sendCampaign(confirmSend)} disabled={sendingId === confirmSend} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {sendingId === confirmSend ? 'Sending...' : 'Confirm Send'}
          </button>
          <button onClick={() => setConfirmSend(null)} className="px-3 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 text-sm transition-colors">
            Cancel
          </button>
        </div>
      )}

      {/* Campaign Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Mail className="w-12 h-12 text-zinc-700 mb-4" />
          <p className="text-zinc-500 text-sm">No campaigns yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Campaign</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">List</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Sent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Open Rate</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider w-48">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {campaigns.map(c => (
                <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-zinc-200 font-medium">{c.name}</div>
                    <div className="text-xs text-zinc-600 truncate">{c.subject}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs hidden md:table-cell">{getListName(c.lead_list_id)}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs hidden lg:table-cell">
                    {c.sent_at ? new Date(c.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs hidden lg:table-cell">
                    {c.stats_json?.open_rate ? `${(c.stats_json.open_rate * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {c.html_content && (
                        <button onClick={() => { setPreviewHtml(c.html_content!); setPreviewCampaignId(c.id); }} className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-colors" title="Preview">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => setAiCampaignId(c.id)} className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-violet-400 transition-colors" title="Generate content">
                        <Wand2 className="w-4 h-4" />
                      </button>
                      {c.stats_json && (
                        <button className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-colors" title="Stats">
                          <BarChart3 className="w-4 h-4" />
                        </button>
                      )}
                      {c.status === 'draft' && c.html_content && (
                        <button onClick={() => setConfirmSend(c.id)} disabled={sendingId === c.id} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors disabled:opacity-50">
                          <Send className="w-3.5 h-3.5" /> Send
                        </button>
                      )}
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
