'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Globe, Plus, Loader2, Trash2, Eye, EyeOff, Sparkles, X,
  RefreshCw, CheckCircle, AlertTriangle, ExternalLink, Copy,
} from 'lucide-react';
import { adminAPI } from '@/lib/admin-api';

/* eslint-disable @typescript-eslint/no-explicit-any */

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`} />;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-700/50 text-zinc-400',
  published: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
};

export default function LandingPagesPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Generate modal
  const [showGenerate, setShowGenerate] = useState(false);
  const [genAudience, setGenAudience] = useState('');
  const [genMessage, setGenMessage] = useState('');
  const [genTone, setGenTone] = useState('professional');
  const [genCta, setGenCta] = useState('https://www.find-commonground.com/register');
  const [generating, setGenerating] = useState(false);

  // Publishing
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.getLandingPages();
      setPages(Array.isArray(result) ? result : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load landing pages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const handleGenerate = async () => {
    if (!genAudience.trim() || !genMessage.trim()) return;
    try {
      setGenerating(true);
      setError(null);
      await adminAPI.generateLandingPage({
        target_audience: genAudience,
        key_message: genMessage,
        tone: genTone,
        cta_destination: genCta,
      });
      setSuccess('Landing page generated as draft');
      setShowGenerate(false);
      setGenAudience('');
      setGenMessage('');
      await fetchPages();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      setPublishingId(id);
      await adminAPI.publishLandingPage(id);
      setSuccess('Landing page published');
      await fetchPages();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this landing page?')) return;
    try {
      setDeletingId(id);
      await adminAPI.deleteLandingPage(id);
      setSuccess('Landing page deleted');
      await fetchPages();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const copyUrl = (slug: string) => {
    const url = `https://www.find-commonground.com/lp/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(slug);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Landing Pages</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{pages.length} pages created</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchPages} disabled={loading} className="p-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowGenerate(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
            <Sparkles className="w-4 h-4" /> AI Generate
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <p className="text-sm text-emerald-300">{success}</p>
        </div>
      )}

      {/* Generate Modal */}
      {showGenerate && (
        <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" /> AI Generate Landing Page
            </h2>
            <button onClick={() => setShowGenerate(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium block mb-1">Target Audience *</label>
              <input value={genAudience} onChange={e => setGenAudience(e.target.value)} placeholder="e.g. Single moms, Family lawyers" className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50" />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium block mb-1">Tone</label>
              <select value={genTone} onChange={e => setGenTone(e.target.value)} className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50">
                <option value="professional">Professional</option>
                <option value="empathetic">Empathetic</option>
                <option value="friendly">Friendly</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium block mb-1">Key Message *</label>
            <textarea value={genMessage} onChange={e => setGenMessage(e.target.value)} rows={3} placeholder="What should this page communicate? e.g. CommonGround helps single moms manage custody without conflict..." className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 resize-none" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium block mb-1">CTA Destination URL</label>
            <input value={genCta} onChange={e => setGenCta(e.target.value)} className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50" />
          </div>
          <div className="flex justify-end">
            <button onClick={handleGenerate} disabled={generating || !genAudience.trim() || !genMessage.trim()} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Generating...' : 'Generate Page'}
            </button>
          </div>
          <p className="text-[11px] text-zinc-600">AI will generate headline, body, SEO tags, and UTM parameters. Page is saved as draft for review.</p>
        </div>
      )}

      {/* Pages List */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : pages.length === 0 ? (
          <div className="py-16 text-center">
            <Globe className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No landing pages yet</p>
            <p className="text-xs text-zinc-600 mt-1">Click AI Generate to create your first page</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {pages.map(page => (
              <div key={page.id} className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/20 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200 truncate">{page.title}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[page.status] || STATUS_COLORS.draft}`}>
                      {page.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-zinc-500">/lp/{page.slug}</span>
                    <span className="text-xs text-zinc-600">Audience: {page.target_audience}</span>
                    <span className="text-xs text-zinc-600">{page.view_count || 0} views</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {page.status === 'published' && (
                    <button onClick={() => copyUrl(page.slug)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                      {copiedId === page.slug ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedId === page.slug ? 'Copied!' : 'URL'}
                    </button>
                  )}
                  {page.status === 'published' && (
                    <a href={`https://www.find-commonground.com/lp/${page.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                      <ExternalLink className="w-3 h-3" /> View
                    </a>
                  )}
                  {page.status === 'draft' && (
                    <button onClick={() => handlePublish(page.id)} disabled={publishingId === page.id} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-xs text-white transition-colors disabled:opacity-50">
                      {publishingId === page.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                      Publish
                    </button>
                  )}
                  <button onClick={() => handleDelete(page.id)} disabled={deletingId === page.id} className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50">
                    {deletingId === page.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
