'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Globe, Plus, Loader2, Trash2, Eye, EyeOff, Sparkles, X,
  RefreshCw, CheckCircle, AlertTriangle, ExternalLink, Copy,
  ArrowLeft, ChevronDown, Image as ImageIcon,
  Facebook, Instagram, Linkedin, Twitter, Mail, Video,
  FileText, Search, Hash, Link2, MessageSquare,
} from 'lucide-react';
import { adminAPI } from '@/lib/admin-api';

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-700/50 text-zinc-400',
  published: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
};

const PLATFORM_META: Record<string, { label: string; icon: any; color: string }> = {
  twitter: { label: 'Twitter / X', icon: Twitter, color: 'text-sky-400' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-blue-400' },
  facebook: { label: 'Facebook', icon: Facebook, color: 'text-blue-500' },
  instagram: { label: 'Instagram', icon: Instagram, color: 'text-pink-400' },
};

type PageTab = 'list' | 'detail';

function copyText(text: string) {
  navigator.clipboard.writeText(text);
}

export default function LandingPagesPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<PageTab>('list');
  const [selected, setSelected] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Generate state
  const [showGenerate, setShowGenerate] = useState(false);
  const [genAudience, setGenAudience] = useState('');
  const [genMessage, setGenMessage] = useState('');
  const [genTone, setGenTone] = useState('professional');
  const [genCta, setGenCta] = useState('https://www.find-commonground.com/register');
  const [generating, setGenerating] = useState(false);

  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    try { setLoading(true); setError(null); const r = await adminAPI.getLandingPages(); setPages(Array.isArray(r) ? r : []); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const handleGenerate = async () => {
    if (!genAudience.trim() || !genMessage.trim()) return;
    try {
      setGenerating(true); setError(null);
      const result = await adminAPI.generateLandingPage({
        target_audience: genAudience, key_message: genMessage, tone: genTone, cta_destination: genCta,
      });
      setSuccess('Landing page generated!');
      setShowGenerate(false);
      setGenAudience(''); setGenMessage('');
      await fetchPages();
      // Open detail view of new page
      if (result?.id) {
        setSelected(result);
        setTab('detail');
      }
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const handlePublish = async (id: string) => {
    try {
      setPublishingId(id);
      await adminAPI.publishLandingPage(id);
      setSuccess('Published!');
      await fetchPages();
      if (selected?.id === id) setSelected({ ...selected, status: 'published' });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Publish failed'); }
    finally { setPublishingId(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this landing page?')) return;
    try {
      setDeletingId(id);
      await adminAPI.deleteLandingPage(id);
      setSuccess('Deleted');
      if (selected?.id === id) { setSelected(null); setTab('list'); }
      await fetchPages();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Delete failed'); }
    finally { setDeletingId(null); }
  };

  const openDetail = (page: any) => { setSelected(page); setTab('detail'); };
  const backToList = () => { setTab('list'); setSelected(null); };

  const handleCopy = (text: string, field: string) => {
    copyText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Try sections_json first, then parse body_html as fallback
  let sections = selected?.sections_json;
  if (!sections && selected?.body_html) {
    try {
      const parsed = typeof selected.body_html === 'string' && selected.body_html.trim().startsWith('{')
        ? JSON.parse(selected.body_html)
        : null;
      if (parsed?.format_version === 2) sections = parsed;
    } catch { /* legacy HTML */ }
  }
  const socialPosts: any[] = sections?.social_posts || [];
  const pageUrl = selected ? `https://www.find-commonground.com/lp/${selected.slug}` : '';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {tab === 'detail' && (
            <button onClick={backToList} className="p-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">
              {tab === 'detail' && selected ? selected.title : 'Landing Pages'}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {tab === 'detail' && selected
                ? `/lp/${selected.slug}`
                : `${pages.length} pages • AI-generated marketing pages`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'list' && (
            <>
              <button onClick={fetchPages} disabled={loading} className="p-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setShowGenerate(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
                <Sparkles className="w-4 h-4" /> AI Generate
              </button>
            </>
          )}
          {tab === 'detail' && selected && (
            <>
              {selected.status === 'draft' && (
                <button onClick={() => handlePublish(selected.id)} disabled={publishingId === selected.id} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                  {publishingId === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  Publish
                </button>
              )}
              {selected.status === 'published' && (
                <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">
                  <ExternalLink className="w-4 h-4" /> View Live
                </a>
              )}
              <button onClick={() => handleDelete(selected.id)} className="p-2 rounded-lg bg-zinc-800/60 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <p className="text-sm text-emerald-300">{success}</p>
        </div>
      )}

      {/* ============ GENERATE MODAL ============ */}
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
              <input value={genAudience} onChange={e => setGenAudience(e.target.value)} placeholder="e.g. Military families, Single moms" className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50" />
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
            <textarea value={genMessage} onChange={e => setGenMessage(e.target.value)} rows={3} placeholder="What should this page communicate?" className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 resize-none" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium block mb-1">CTA Destination URL</label>
            <input value={genCta} onChange={e => setGenCta(e.target.value)} className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50" />
          </div>
          <div className="flex justify-end">
            <button onClick={handleGenerate} disabled={generating || !genAudience.trim() || !genMessage.trim()} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Generating (30-60s)...' : 'Generate Page'}
            </button>
          </div>
          <p className="text-[11px] text-zinc-600">AI generates headline, copy, hero image (DALL-E), SEO tags, UTM params, and social media posts.</p>
        </div>
      )}

      {/* ============ LIST VIEW ============ */}
      {tab === 'list' && (
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse bg-zinc-800/60 rounded-lg h-20" />)}</div>
          ) : pages.length === 0 ? (
            <div className="py-16 text-center">
              <Globe className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No landing pages yet</p>
              <p className="text-xs text-zinc-600 mt-1">Click AI Generate to create your first page</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/40">
              {pages.map(page => {
                const s = page.sections_json;
                return (
                  <button
                    key={page.id}
                    onClick={() => openDetail(page)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/20 transition-colors text-left"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-12 rounded-lg bg-zinc-800/60 overflow-hidden flex-shrink-0">
                      {page.hero_image_url ? (
                        <img src={page.hero_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Globe className="w-5 h-5 text-zinc-600" /></div>
                      )}
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
                        <span className="text-xs text-zinc-600">{page.target_audience}</span>
                        <span className="text-xs text-zinc-600">{page.view_count || 0} views</span>
                        {s?.social_posts?.length > 0 && (
                          <span className="text-xs text-violet-500">{s.social_posts.length} social posts</span>
                        )}
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-zinc-600 -rotate-90" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ DETAIL VIEW ============ */}
      {tab === 'detail' && selected && (
        <div className="space-y-5">
          {/* Status + URL Bar */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 flex items-center gap-3">
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selected.status] || STATUS_COLORS.draft}`}>
              {selected.status}
            </span>
            <div className="flex-1 flex items-center gap-2 bg-zinc-800/40 rounded-lg px-3 py-1.5">
              <Link2 className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-sm text-zinc-300 font-mono truncate">{pageUrl}</span>
            </div>
            <button onClick={() => handleCopy(pageUrl, 'url')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              {copiedField === 'url' ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedField === 'url' ? 'Copied!' : 'Copy URL'}
            </button>
          </div>

          {/* Hero Image */}
          {selected.hero_image_url && (
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-medium text-zinc-300">Hero Image</span>
                <span className="text-[11px] text-zinc-600 ml-auto">AI-generated with DALL-E</span>
              </div>
              <img src={selected.hero_image_url} alt={selected.headline || ''} className="w-full h-auto max-h-64 object-cover" />
            </div>
          )}

          {/* Page Copy Preview */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-semibold text-zinc-300">Page Copy</span>
            </div>

            {sections ? (
              <div className="space-y-4">
                {/* Headline */}
                <div className="bg-zinc-800/30 rounded-lg p-4">
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-1">Headline</div>
                  <div className="text-lg font-bold text-white">{sections.headline || selected.headline}</div>
                  {sections.headline_accent && <div className="text-xs text-emerald-400 mt-1">Accent: &ldquo;{sections.headline_accent}&rdquo;</div>}
                </div>

                {/* Hero Label + Subheadline */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-800/30 rounded-lg p-3">
                    <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-1">Hero Label</div>
                    <div className="text-sm text-zinc-300">{sections.hero_label || '—'}</div>
                  </div>
                  <div className="bg-zinc-800/30 rounded-lg p-3">
                    <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-1">CTA Button</div>
                    <div className="text-sm text-zinc-300">{sections.cta_text || selected.cta_text}</div>
                  </div>
                </div>

                <div className="bg-zinc-800/30 rounded-lg p-4">
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-1">Subheadline</div>
                  <div className="text-sm text-zinc-300">{sections.subheadline || selected.subheadline}</div>
                </div>

                {/* Pain Points */}
                {sections.pain_points?.length > 0 && (
                  <div className="bg-zinc-800/30 rounded-lg p-4">
                    <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-3">Pain Points ({sections.pain_points.length})</div>
                    <div className="space-y-2">
                      {sections.pain_points.map((pp: any, i: number) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <span className="text-red-400/60 line-through flex-1">{pp.old}</span>
                          <span className="text-emerald-400 flex-1">{pp.cg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Features */}
                {sections.features?.length > 0 && (
                  <div className="bg-zinc-800/30 rounded-lg p-4">
                    <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-3">Features ({sections.features.length})</div>
                    <div className="grid gap-2">
                      {sections.features.map((f: any, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-xs font-bold uppercase tracking-widest mt-0.5" style={{ color: f.accent }}>{f.name}</span>
                          <span className="text-sm text-zinc-400">{f.tagline} — {f.description?.slice(0, 80)}...</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Testimonial */}
                {sections.testimonial && (
                  <div className="bg-zinc-800/30 rounded-lg p-4">
                    <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-2">Testimonial</div>
                    <div className="text-sm text-zinc-300 italic">&ldquo;{sections.testimonial.quote}&rdquo;</div>
                    <div className="text-xs text-zinc-500 mt-1">— {sections.testimonial.name}, {sections.testimonial.title}</div>
                  </div>
                )}

                {/* FAQs */}
                {sections.faqs?.length > 0 && (
                  <div className="bg-zinc-800/30 rounded-lg p-4">
                    <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-3">FAQs ({sections.faqs.length})</div>
                    <div className="space-y-2">
                      {sections.faqs.map((faq: any, i: number) => (
                        <details key={i} className="group">
                          <summary className="cursor-pointer text-sm text-zinc-300 font-medium flex items-center gap-2">
                            <ChevronDown className="w-3 h-3 text-zinc-500 transition-transform group-open:rotate-180" />
                            {faq.q}
                          </summary>
                          <p className="text-xs text-zinc-500 mt-1 ml-5">{faq.a}</p>
                        </details>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No structured content available (legacy format)</p>
            )}
          </div>

          {/* SEO Preview */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-semibold text-zinc-300">SEO Preview</span>
            </div>
            <div className="bg-zinc-800/30 rounded-lg p-4 space-y-1">
              <div className="text-blue-400 text-sm font-medium truncate">{selected.seo_title || selected.title}</div>
              <div className="text-emerald-500 text-xs truncate">{pageUrl}</div>
              <div className="text-xs text-zinc-400">{selected.seo_description || 'No description'}</div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="bg-zinc-800/30 rounded-lg p-3">
                <div className="text-[11px] text-zinc-500 uppercase mb-1">UTM Source</div>
                <div className="text-xs text-zinc-300">{selected.utm_source || '—'}</div>
              </div>
              <div className="bg-zinc-800/30 rounded-lg p-3">
                <div className="text-[11px] text-zinc-500 uppercase mb-1">UTM Medium</div>
                <div className="text-xs text-zinc-300">{selected.utm_medium || '—'}</div>
              </div>
              <div className="bg-zinc-800/30 rounded-lg p-3">
                <div className="text-[11px] text-zinc-500 uppercase mb-1">UTM Campaign</div>
                <div className="text-xs text-zinc-300">{selected.utm_campaign || '—'}</div>
              </div>
            </div>
          </div>

          {/* Social Media Posts */}
          {socialPosts.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-semibold text-zinc-300">Social Media Posts</span>
                <span className="text-[11px] text-zinc-600 ml-auto">{socialPosts.length} platforms</span>
              </div>
              <div className="space-y-3">
                {socialPosts.map((post: any, i: number) => {
                  const meta = PLATFORM_META[post.platform] || { label: post.platform, icon: Globe, color: 'text-zinc-400' };
                  const PIcon = meta.icon;
                  const fullPost = `${post.body}\n\n${(post.hashtags || []).map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ')}\n\n${post.cta_url || pageUrl}`;

                  return (
                    <div key={i} className="bg-zinc-800/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <PIcon className={`w-4 h-4 ${meta.color}`} />
                        <span className="text-sm font-medium text-zinc-300">{meta.label}</span>
                        <button
                          onClick={() => handleCopy(fullPost, `social-${post.platform}`)}
                          className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-700/50 hover:bg-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          {copiedField === `social-${post.platform}` ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedField === `social-${post.platform}` ? 'Copied!' : 'Copy All'}
                        </button>
                      </div>
                      {post.headline && <div className="text-sm font-medium text-zinc-200 mb-1">{post.headline}</div>}
                      <div className="text-xs text-zinc-400 whitespace-pre-line leading-relaxed">{post.body}</div>
                      {post.hashtags?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {post.hashtags.slice(0, 10).map((h: string, j: number) => (
                            <span key={j} className="text-[11px] text-violet-400/80">
                              {h.startsWith('#') ? h : `#${h}`}
                            </span>
                          ))}
                          {post.hashtags.length > 10 && <span className="text-[11px] text-zinc-600">+{post.hashtags.length - 10} more</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Page Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{selected.view_count || 0}</div>
              <div className="text-[11px] text-zinc-500">Page Views</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{selected.target_audience || '—'}</div>
              <div className="text-[11px] text-zinc-500">Target Audience</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{selected.created_at ? new Date(selected.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</div>
              <div className="text-[11px] text-zinc-500">Created</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
