'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Send, Plus, X, Wand2, Eye, AlertTriangle, Copy, Check,
  RefreshCw, Mail, BarChart3, Trash2, Clock, Users,
  ChevronDown, ChevronUp, Pencil, CheckCircle2, XCircle,
  TrendingUp, Inbox, MousePointerClick,
} from 'lucide-react';
import { adminAPI, type EmailCampaign, type LeadList } from '@/lib/admin-api';

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#2D6A8F]/20 rounded-lg ${className}`} />;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Mail; bg: string }> = {
  draft: { label: 'Draft', color: 'text-[#8AACBC]', icon: Pencil, bg: 'bg-[#8AACBC]/10 border border-[#8AACBC]/20' },
  scheduled: { label: 'Scheduled', color: 'text-blue-400', icon: Clock, bg: 'bg-blue-500/10 border border-blue-500/20' },
  sent: { label: 'Sent', color: 'text-emerald-400', icon: CheckCircle2, bg: 'bg-emerald-500/10 border border-emerald-500/20' },
  failed: { label: 'Failed', color: 'text-red-400', icon: XCircle, bg: 'bg-red-500/10 border border-red-500/20' },
};

const formatDate = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const timeAgo = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(iso) || '';
};

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'scheduled' | 'failed'>('all');

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

  // Expanded card
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sending
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState<string | null>(null);

  // Misc
  const [copied, setCopied] = useState<string | null>(null);

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
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); } }, [success]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(null), 6000); return () => clearTimeout(t); } }, [error]);

  const createCampaign = async () => {
    if (!createName.trim() || !createSubject.trim() || !createListId) return;
    try {
      setCreating(true);
      setError(null);
      const campaign = await adminAPI.createCampaign({
        name: createName, lead_list_id: createListId, subject: createSubject,
      });
      setShowCreate(false);
      setCreateName(''); setCreateSubject(''); setCreateListId('');
      setSuccess('Campaign created! Generate AI content to get started.');
      setAiCampaignId(campaign.id);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const duplicateCampaign = async (c: EmailCampaign) => {
    try {
      setError(null);
      await adminAPI.createCampaign({
        name: `${c.name} (copy)`, lead_list_id: c.lead_list_id || '', subject: c.subject, html_content: c.html_content || undefined,
      });
      setSuccess('Campaign duplicated');
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate');
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
      setAiCampaignId(null);
      setSuccess('Content generated! Review the preview below.');
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
      setSuccess('Campaign sent successfully!');
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send campaign');
    } finally {
      setSendingId(null);
    }
  };

  const getListName = (listId: string | null) => {
    if (!listId) return 'No list';
    const list = lists.find(l => l.id === listId);
    return list?.name || listId.slice(0, 8);
  };

  const getListCount = (listId: string | null) => {
    if (!listId) return 0;
    const list = lists.find(l => l.id === listId);
    return list?.lead_count || 0;
  };

  const copyHtml = (html: string, id: string) => {
    navigator.clipboard.writeText(html);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Stats
  const totalCampaigns = campaigns.length;
  const draftCount = campaigns.filter(c => c.status === 'draft').length;
  const sentCount = campaigns.filter(c => c.status === 'sent').length;
  const totalRecipients = campaigns.filter(c => c.status === 'sent').reduce((sum, c) => sum + getListCount(c.lead_list_id), 0);
  const avgOpenRate = (() => {
    const withRates = campaigns.filter(c => c.stats_json?.open_rate);
    if (withRates.length === 0) return null;
    return withRates.reduce((sum, c) => sum + (c.stats_json?.open_rate || 0), 0) / withRates.length;
  })();

  const filtered = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-[#3DAA8A]" />
            Campaign Manager
          </h1>
          <p className="text-sm text-[#6B8A9A] mt-1">Create, generate, and send email campaigns to your leads</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={loading} className="p-2 rounded-lg bg-[#1A3648]/60 border border-[#2D6A8F]/20 hover:border-[#3DAA8A]/30 text-[#8AACBC] hover:text-[#5BC4A0] transition-colors disabled:opacity-50" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium transition-colors shadow-sm shadow-[#3DAA8A]/20">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Campaigns', value: totalCampaigns, icon: Mail, color: '#3DAA8A', tooltip: 'All campaigns created' },
          { label: 'Ready to Send', value: draftCount, icon: Pencil, color: '#F5A623', tooltip: 'Campaigns in draft status' },
          { label: 'Emails Sent', value: sentCount > 0 ? `${sentCount} (${totalRecipients} recipients)` : '0', icon: Send, color: '#5BC4A0', tooltip: 'Campaigns sent and total recipients reached' },
          { label: 'Avg Open Rate', value: avgOpenRate ? `${(avgOpenRate * 100).toFixed(1)}%` : 'No data', icon: MousePointerClick, color: '#2D6A8F', tooltip: 'Average open rate across sent campaigns' },
        ].map(card => (
          <div key={card.label} className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-4 group relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
                <card.icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
              <span className="text-xs text-[#6B8A9A]">{card.label}</span>
            </div>
            <div className="text-xl font-bold text-white">{card.value}</div>
            {/* Tooltip */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0D1F2B] border border-[#2D6A8F]/30 text-[#8AACBC] text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              {card.tooltip}
            </div>
          </div>
        ))}
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-300 flex-1">{success}</p>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Create Campaign Modal ── */}
      {showCreate && (
        <div className="bg-[#1A3648]/60 border border-[#3DAA8A]/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-[#D0E4EC] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#3DAA8A]" /> Create New Campaign
            </h3>
            <button onClick={() => setShowCreate(false)} className="text-[#6B8A9A] hover:text-[#D0E4EC]"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#8AACBC] mb-1.5 block">Campaign Name</label>
              <input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="e.g. Early Adopter Welcome Series" className="w-full px-3 py-2.5 bg-[#162D3A] border border-[#2D6A8F]/30 rounded-lg text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]/50 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#8AACBC] mb-1.5 block">Email Subject Line</label>
              <input value={createSubject} onChange={e => setCreateSubject(e.target.value)} placeholder="e.g. Welcome to CommonGround - Your co-parenting journey starts here" className="w-full px-3 py-2.5 bg-[#162D3A] border border-[#2D6A8F]/30 rounded-lg text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]/50 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#8AACBC] mb-1.5 block">Target Lead List</label>
              <select value={createListId} onChange={e => setCreateListId(e.target.value)} className="w-full px-3 py-2.5 bg-[#162D3A] border border-[#2D6A8F]/30 rounded-lg text-sm text-[#D0E4EC] focus:outline-none focus:border-[#3DAA8A]/50 appearance-none cursor-pointer">
                <option value="">Select a list...</option>
                {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.lead_count} leads)</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-[#8AACBC] hover:text-white transition-colors">Cancel</button>
              <button onClick={createCampaign} disabled={creating || !createName.trim() || !createSubject.trim() || !createListId} className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium transition-colors disabled:opacity-50 shadow-sm shadow-[#3DAA8A]/20">
                {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? 'Creating...' : 'Create & Generate Content'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Content Generator ── */}
      {aiCampaignId && (
        <div className="bg-[#1A3648]/60 border border-[#3DAA8A]/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-[#5BC4A0] flex items-center gap-2">
              <Wand2 className="w-5 h-5" /> AI Content Generator
            </h3>
            <button onClick={() => setAiCampaignId(null)} className="text-[#6B8A9A] hover:text-[#D0E4EC]"><X className="w-5 h-5" /></button>
          </div>
          <p className="text-xs text-[#6B8A9A] mb-4">Configure the AI to generate a professionally designed HTML email tailored to your audience.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-[#8AACBC] mb-1.5 block">Target Audience</label>
              <select value={aiAudience} onChange={e => setAiAudience(e.target.value)} className="w-full px-3 py-2.5 bg-[#162D3A] border border-[#2D6A8F]/30 rounded-lg text-sm text-[#D0E4EC] focus:outline-none focus:border-[#3DAA8A]/50 appearance-none cursor-pointer">
                <option value="co-parents">Co-Parents</option>
                <option value="family-lawyers">Family Lawyers</option>
                <option value="mediators">Mediators</option>
                <option value="therapists">Therapists</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#8AACBC] mb-1.5 block">Product Focus</label>
              <select value={aiProductFocus} onChange={e => setAiProductFocus(e.target.value)} className="w-full px-3 py-2.5 bg-[#162D3A] border border-[#2D6A8F]/30 rounded-lg text-sm text-[#D0E4EC] focus:outline-none focus:border-[#3DAA8A]/50 appearance-none cursor-pointer">
                <option value="platform">Full Platform</option>
                <option value="aria">ARIA AI Messaging</option>
                <option value="kidcoms">KidComs</option>
                <option value="agreements">Agreement Builder</option>
                <option value="clearfund">ClearFund Expenses</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#8AACBC] mb-1.5 block">Tone</label>
              <select value={aiTone} onChange={e => setAiTone(e.target.value)} className="w-full px-3 py-2.5 bg-[#162D3A] border border-[#2D6A8F]/30 rounded-lg text-sm text-[#D0E4EC] focus:outline-none focus:border-[#3DAA8A]/50 appearance-none cursor-pointer">
                <option value="professional">Professional</option>
                <option value="friendly">Friendly & Warm</option>
                <option value="empathetic">Empathetic</option>
                <option value="urgent">Urgent / Limited Time</option>
              </select>
            </div>
          </div>
          <button onClick={generateContent} disabled={generating} className="mt-4 flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#3DAA8A] to-[#5BC4A0] hover:from-[#5BC4A0] hover:to-[#3DAA8A] text-white text-sm font-medium transition-all disabled:opacity-50 shadow-sm shadow-[#3DAA8A]/20">
            <Wand2 className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating email content...' : 'Generate Email Content'}
          </button>
        </div>
      )}

      {/* ── Email Preview ── */}
      {previewHtml && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#2D6A8F]/20">
            <h3 className="text-sm font-semibold text-[#D0E4EC] flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#3DAA8A]" /> Email Preview
            </h3>
            <div className="flex items-center gap-2">
              {previewCampaignId && (
                <>
                  <button onClick={() => { setAiCampaignId(previewCampaignId); setPreviewHtml(null); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2D6A8F]/20 hover:bg-[#2D6A8F]/30 text-[#8AACBC] text-xs font-medium transition-colors">
                    <Wand2 className="w-3 h-3" /> Regenerate
                  </button>
                  <button onClick={() => copyHtml(previewHtml, 'preview')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2D6A8F]/20 hover:bg-[#2D6A8F]/30 text-[#8AACBC] text-xs font-medium transition-colors">
                    {copied === 'preview' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied === 'preview' ? 'Copied!' : 'Copy HTML'}
                  </button>
                </>
              )}
              <button onClick={() => { setPreviewHtml(null); setPreviewCampaignId(null); }} className="text-[#6B8A9A] hover:text-[#D0E4EC]"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="bg-white rounded-b-xl p-6 max-h-[500px] overflow-y-auto">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      )}

      {/* ── Send Confirmation ── */}
      {confirmSend && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-amber-200 font-medium">Ready to send?</p>
            <p className="text-xs text-amber-300/70 mt-0.5">
              This will send the email to {getListCount(campaigns.find(c => c.id === confirmSend)?.lead_list_id || null)} recipients in &ldquo;{getListName(campaigns.find(c => c.id === confirmSend)?.lead_list_id || null)}&rdquo;. This cannot be undone.
            </p>
          </div>
          <button onClick={() => sendCampaign(confirmSend)} disabled={sendingId === confirmSend} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {sendingId === confirmSend ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sendingId === confirmSend ? 'Sending...' : 'Confirm Send'}
          </button>
          <button onClick={() => setConfirmSend(null)} className="px-3 py-2 rounded-lg text-[#8AACBC] hover:text-white text-sm transition-colors">
            Cancel
          </button>
        </div>
      )}

      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-1 bg-[#1A3648]/40 border border-[#2D6A8F]/15 rounded-xl p-1">
        {(['all', 'draft', 'sent', 'scheduled', 'failed'] as const).map(f => {
          const count = f === 'all' ? campaigns.length : campaigns.filter(c => c.status === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-[#3DAA8A]/15 text-[#5BC4A0]' : 'text-[#6B8A9A] hover:text-[#8AACBC] hover:bg-[#2D6A8F]/10'}`}>
              <span className="capitalize">{f}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filter === f ? 'bg-[#3DAA8A]/20' : 'bg-[#2D6A8F]/20'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Campaign Cards ── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#1A3648]/30 border border-[#2D6A8F]/15 rounded-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#3DAA8A]/10 flex items-center justify-center mb-4">
            <Inbox className="w-7 h-7 text-[#3DAA8A]/50" />
          </div>
          <p className="text-[#6B8A9A] text-sm mb-1">
            {filter === 'all' ? 'No campaigns yet' : `No ${filter} campaigns`}
          </p>
          <p className="text-[#4A6E7F] text-xs">
            {filter === 'all' ? 'Create your first campaign to start reaching leads.' : 'Try a different filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
            const StatusIcon = status.icon;
            const isExpanded = expandedId === c.id;
            const listCount = getListCount(c.lead_list_id);

            return (
              <div key={c.id} className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl overflow-hidden hover:border-[#2D6A8F]/40 transition-colors">
                {/* Main row */}
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                  {/* Status icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${status.bg}`}>
                    <StatusIcon className={`w-4 h-4 ${status.color}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-white truncate">{c.name}</h3>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${status.bg} ${status.color}`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-[#6B8A9A] truncate max-w-xs">Subject: {c.subject}</span>
                      <span className="text-[10px] text-[#4A6E7F]">{timeAgo(c.created_at)}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-xs text-[#6B8A9A]">Recipients</div>
                      <div className="text-sm font-medium text-[#D0E4EC]">{listCount}</div>
                    </div>
                    {c.stats_json?.open_rate && (
                      <div className="text-center">
                        <div className="text-xs text-[#6B8A9A]">Open Rate</div>
                        <div className="text-sm font-medium text-emerald-400">{(c.stats_json.open_rate * 100).toFixed(1)}%</div>
                      </div>
                    )}
                    {c.sent_at && (
                      <div className="text-center">
                        <div className="text-xs text-[#6B8A9A]">Sent</div>
                        <div className="text-xs font-medium text-[#8AACBC]">{formatDate(c.sent_at)}</div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {c.html_content && (
                      <button onClick={() => { setPreviewHtml(c.html_content!); setPreviewCampaignId(c.id); }} className="p-2 rounded-lg hover:bg-[#2D6A8F]/20 text-[#6B8A9A] hover:text-[#D0E4EC] transition-colors" title="Preview email">
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => setAiCampaignId(c.id)} className="p-2 rounded-lg hover:bg-[#3DAA8A]/10 text-[#6B8A9A] hover:text-[#3DAA8A] transition-colors" title="Generate content">
                      <Wand2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => duplicateCampaign(c)} className="p-2 rounded-lg hover:bg-[#2D6A8F]/20 text-[#6B8A9A] hover:text-[#8AACBC] transition-colors" title="Duplicate">
                      <Copy className="w-4 h-4" />
                    </button>
                    {c.status === 'draft' && c.html_content && (
                      <button onClick={() => setConfirmSend(c.id)} disabled={sendingId === c.id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-xs font-medium transition-colors disabled:opacity-50 ml-1">
                        <Send className="w-3.5 h-3.5" /> Send
                      </button>
                    )}
                  </div>

                  {/* Expand toggle */}
                  <div className="text-[#4A6E7F]">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-[#2D6A8F]/20 px-5 py-4 bg-[#162D3A]/30 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[10px] font-medium text-[#6B8A9A] uppercase tracking-wider">Lead List</span>
                        <p className="text-sm text-[#D0E4EC] mt-0.5 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-[#3DAA8A]" />
                          {getListName(c.lead_list_id)} ({listCount})
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-[#6B8A9A] uppercase tracking-wider">Created</span>
                        <p className="text-sm text-[#D0E4EC] mt-0.5">{formatDate(c.created_at)} {formatTime(c.created_at)}</p>
                      </div>
                      {c.sent_at && (
                        <div>
                          <span className="text-[10px] font-medium text-[#6B8A9A] uppercase tracking-wider">Sent At</span>
                          <p className="text-sm text-[#D0E4EC] mt-0.5">{formatDate(c.sent_at)} {formatTime(c.sent_at)}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-medium text-[#6B8A9A] uppercase tracking-wider">Has Content</span>
                        <p className="text-sm mt-0.5">
                          {c.html_content ? (
                            <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Yes</span>
                          ) : (
                            <span className="text-[#6B8A9A] flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> No — generate content first</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {c.stats_json && Object.keys(c.stats_json).length > 0 && (
                      <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/15 rounded-lg p-3">
                        <h4 className="text-[10px] font-medium text-[#6B8A9A] uppercase tracking-wider mb-2 flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" /> Campaign Stats
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          {c.stats_json.open_rate != null && (
                            <div>
                              <span className="text-xs text-[#6B8A9A]">Open Rate</span>
                              <p className="text-lg font-bold text-emerald-400">{(c.stats_json.open_rate * 100).toFixed(1)}%</p>
                            </div>
                          )}
                          {c.stats_json.click_rate != null && (
                            <div>
                              <span className="text-xs text-[#6B8A9A]">Click Rate</span>
                              <p className="text-lg font-bold text-[#3DAA8A]">{(c.stats_json.click_rate * 100).toFixed(1)}%</p>
                            </div>
                          )}
                          {c.stats_json.bounce_rate != null && (
                            <div>
                              <span className="text-xs text-[#6B8A9A]">Bounce Rate</span>
                              <p className="text-lg font-bold text-amber-400">{(c.stats_json.bounce_rate * 100).toFixed(1)}%</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Quick actions in expanded view */}
                    <div className="flex items-center gap-2 pt-1">
                      {!c.html_content && (
                        <button onClick={() => setAiCampaignId(c.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3DAA8A]/15 text-[#5BC4A0] text-xs font-medium hover:bg-[#3DAA8A]/25 transition-colors">
                          <Wand2 className="w-3.5 h-3.5" /> Generate Content
                        </button>
                      )}
                      {c.html_content && (
                        <button onClick={() => { setPreviewHtml(c.html_content!); setPreviewCampaignId(c.id); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2D6A8F]/15 text-[#8AACBC] text-xs font-medium hover:bg-[#2D6A8F]/25 transition-colors">
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </button>
                      )}
                      <button onClick={() => duplicateCampaign(c)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2D6A8F]/15 text-[#8AACBC] text-xs font-medium hover:bg-[#2D6A8F]/25 transition-colors">
                        <Copy className="w-3.5 h-3.5" /> Duplicate
                      </button>
                      {c.status === 'draft' && c.html_content && (
                        <button onClick={() => setConfirmSend(c.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3DAA8A] text-white text-xs font-medium hover:bg-[#5BC4A0] transition-colors ml-auto">
                          <Send className="w-3.5 h-3.5" /> Send Campaign
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
