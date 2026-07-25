'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAccessToken } from '@/lib/api';
import {
  PenTool, Plus, Loader2, Trash2, Edit3, Eye, EyeOff,
  Sparkles, X, RefreshCw, CheckCircle, AlertTriangle,
  ChevronDown, ChevronRight, Copy, Facebook, Instagram, Linkedin, Mail, Video,
} from 'lucide-react';

// Use the same base URL as admin-api — strip /api/v1 suffix if present
const _raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_BASE = _raw.replace(/\/api\/v1\/?$/, '');

const CATEGORIES = [
  'Co-Parenting Tips',
  'Legal Insights',
  'Platform Updates',
  'ARIA & Technology',
  'Family Wellness',
  'KidSpace',
];

const PLATFORM_META: Record<string, { label: string; icon: any; color: string }> = {
  facebook: { label: 'Facebook', icon: Facebook, color: 'text-blue-400' },
  instagram: { label: 'Instagram', icon: Instagram, color: 'text-pink-400' },
  tiktok: { label: 'TikTok', icon: Video, color: 'text-cyan-400' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-sky-400' },
  newsletter: { label: 'Newsletter', icon: Mail, color: 'text-amber-400' },
};

interface MarketingContent {
  id: string;
  platform: string;
  headline: string;
  body: string;
  hashtags: string[];
  cta_text: string;
  cta_url: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  featured_image_url: string | null;
  status: 'draft' | 'published';
  seo_title: string;
  seo_description: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  marketing_content?: MarketingContent[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-cg-slate/20 hover:bg-zinc-700 text-[#8AACBC] hover:text-white transition-colors"
    >
      {copied ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {label || (copied ? 'Copied!' : 'Copy')}
    </button>
  );
}

function MarketingTabs({ content, imageUrl }: { content: MarketingContent[]; imageUrl?: string | null }) {
  const [activeTab, setActiveTab] = useState(content[0]?.platform || 'facebook');
  const active = content.find((c) => c.platform === activeTab);

  if (!content.length) {
    return (
      <div className="px-5 py-4 text-sm text-[#4A6E7F] italic">
        No marketing content generated yet. Edit the post and use AI Generate to create marketing content.
      </div>
    );
  }

  return (
    <div className="border-t border-cg-slate/15">
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-cg-slate/15 overflow-x-auto">
        {content.map((mc) => {
          const meta = PLATFORM_META[mc.platform];
          if (!meta) return null;
          const Icon = meta.icon;
          return (
            <button
              key={mc.platform}
              onClick={() => setActiveTab(mc.platform)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap border-b-2 ${
                activeTab === mc.platform
                  ? `${meta.color} border-current`
                  : 'text-muted-foreground border-transparent hover:text-[#D0E4EC]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {active && (
        <div className="p-5 space-y-4">
          {/* Headline */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Headline</span>
              <CopyButton text={active.headline} />
            </div>
            <p className="text-sm text-white font-medium">{active.headline}</p>
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Post Copy</span>
              <CopyButton text={active.body} />
            </div>
            <div className="bg-cg-slate/15 rounded-lg p-3 text-sm text-[#D0E4EC] whitespace-pre-wrap max-h-48 overflow-y-auto">
              {active.body}
            </div>
          </div>

          {/* Hashtags */}
          {active.hashtags.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Hashtags</span>
                <CopyButton text={active.hashtags.join(' ')} label="Copy All" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {active.hashtags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full bg-cg-slate/20 text-xs text-[#8AACBC]"
                  >
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">CTA:</span>
            <span className="text-sm text-cg-sage font-medium">{active.cta_text}</span>
            <CopyButton text={active.cta_url} label="Copy Link" />
          </div>

          {/* Full Copy-All */}
          <div className="pt-2 border-t border-cg-slate/15">
            <CopyButton
              text={`${active.headline}\n\n${active.body}\n\n${active.hashtags.join(' ')}\n\n${active.cta_url}`}
              label="Copy Full Post"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [marketingContent, setMarketingContent] = useState<any[]>([]);

  // AI generation state
  const [aiTopic, setAiTopic] = useState('');
  const [aiKeywords, setAiKeywords] = useState('');
  const [generating, setGenerating] = useState(false);

  const getToken = () => getAccessToken() || '';

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/blog/admin/posts`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 503) {
        setError('Blog service is temporarily unavailable. Please try again in a few minutes.');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : data.posts || []);
    } catch (err) {
      console.error('[Blog] Load failed:', err);
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Unable to reach the blog service. This may be a temporary connectivity issue — please retry.');
      } else {
        setError('Failed to load blog posts');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setExcerpt('');
    setCategory(CATEGORIES[0]);
    setSeoTitle('');
    setSeoDescription('');
    setFeaturedImageUrl('');
    setMarketingContent([]);
    setAiTopic('');
    setAiKeywords('');
    setEditingPost(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setTitle(post.title);
    setContent(post.content);
    setExcerpt(post.excerpt || '');
    setCategory(post.category || CATEGORIES[0]);
    setSeoTitle(post.seo_title || '');
    setSeoDescription(post.seo_description || '');
    setFeaturedImageUrl(post.featured_image_url || '');
    setMarketingContent(post.marketing_content || []);
    setShowModal(true);
  };

  const handleAIGenerate = async () => {
    if (!aiTopic.trim()) return;
    try {
      setGenerating(true);
      const res = await fetch(`${API_BASE}/api/v1/blog/admin/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ topic: aiTopic, keywords: aiKeywords ? aiKeywords.split(',').map(k => k.trim()) : undefined }),
      });
      if (!res.ok) throw new Error('AI generation failed');
      const data = await res.json();
      setTitle(data.title || '');
      setContent(data.content || '');
      setExcerpt(data.excerpt || '');
      setSeoTitle(data.seo_title || '');
      setSeoDescription(data.seo_description || '');
      if (data.suggested_category) setCategory(data.suggested_category);
      if (data.featured_image_url) setFeaturedImageUrl(data.featured_image_url);
      if (data.marketing_content) setMarketingContent(data.marketing_content);
    } catch (err: any) {
      console.error('[Blog] AI generation failed:', err);
      setError(err.message || 'AI generation failed. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (publish: boolean) => {
    try {
      setSaving(true);
      const body: any = {
        title, content, excerpt, category,
        seo_title: seoTitle,
        seo_description: seoDescription,
        featured_image_url: featuredImageUrl || undefined,
      };

      // Include marketing content on create
      if (!editingPost && marketingContent.length > 0) {
        body.marketing_content = marketingContent;
      }

      if (editingPost) {
        const res = await fetch(`${API_BASE}/api/v1/blog/admin/posts/${editingPost.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to update post');

        // If publishing, do it in a separate call
        if (publish && editingPost.status !== 'published') {
          await fetch(`${API_BASE}/api/v1/blog/admin/posts/${editingPost.id}/publish`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
          });
        }
      } else {
        const res = await fetch(`${API_BASE}/api/v1/blog/admin/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to create post');

        if (publish) {
          const created = await res.json();
          await fetch(`${API_BASE}/api/v1/blog/admin/posts/${created.id}/publish`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
          });
        }
      }

      setShowModal(false);
      resetForm();
      setSuccessMessage(editingPost ? 'Post updated successfully' : 'Post created with marketing content');
      setTimeout(() => setSuccessMessage(''), 4000);
      await fetchPosts();
    } catch (err: any) {
      console.error('[Blog] Save failed:', err);
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Unable to reach the blog service. Your changes were not saved — please retry when the service is back.');
      } else {
        setError(err.message || 'Failed to save post. Please try again.');
      }
      setTimeout(() => setError(''), 8000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      setDeleting(id);
      const res = await fetch(`${API_BASE}/api/v1/blog/admin/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to delete post');
      setSuccessMessage('Post deleted');
      setTimeout(() => setSuccessMessage(''), 4000);
      await fetchPosts();
    } catch (err: any) {
      console.error('[Blog] Delete failed:', err);
      setError(err.message || 'Failed to delete post.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    try {
      setToggling(post.id);
      const endpoint = post.status === 'published' ? 'unpublish' : 'publish';
      const res = await fetch(`${API_BASE}/api/v1/blog/admin/posts/${post.id}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to toggle publish status');
      await fetchPosts();
    } catch (err) {
      console.error('Toggle publish failed:', err);
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Blog Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create blog posts with auto-generated social media marketing</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPosts}
            disabled={loading}
            className="p-2 rounded-lg bg-cg-slate/20 hover:bg-cg-slate/30 text-[#8AACBC] hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cg-sage hover:bg-cg-sage-light text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-cg-sage/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-sm text-emerald-300">{successMessage}</span>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => { setShowModal(false); resetForm(); }} />
          <div className="relative w-full max-w-3xl bg-zinc-900 border border-cg-slate/20 rounded-xl p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {editingPost ? 'Edit Post' : 'Create New Post'}
              </h2>
              <button aria-label="Close" onClick={() => { setShowModal(false); resetForm(); }} className="text-muted-foreground hover:text-[#D0E4EC] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Generation Section */}
            <div className="bg-violet-500/5 border border-cg-sage/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-cg-sage-light">
                <Sparkles className="w-4 h-4" />
                Generate Blog + Marketing with AI
              </div>
              <p className="text-xs text-muted-foreground">Generates blog post, featured image, and marketing content for Facebook, Instagram, TikTok, LinkedIn, and Newsletter.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Enter a topic..."
                  className="flex-1 px-3 py-2 bg-cg-slate/20 border border-zinc-700/60 rounded-lg text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-violet-500/50"
                />
                <input
                  type="text"
                  value={aiKeywords}
                  onChange={(e) => setAiKeywords(e.target.value)}
                  placeholder="Keywords (comma-separated)"
                  className="flex-1 px-3 py-2 bg-cg-slate/20 border border-zinc-700/60 rounded-lg text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-violet-500/50"
                />
                <button
                  onClick={handleAIGenerate}
                  disabled={generating || !aiTopic.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cg-sage hover:bg-cg-sage-light text-white text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Post title..."
                  className="w-full px-3 py-2 bg-cg-slate/20 border border-zinc-700/60 rounded-lg text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your blog post content..."
                  rows={10}
                  className="w-full px-3 py-2 bg-cg-slate/20 border border-zinc-700/60 rounded-lg text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-violet-500/50 resize-y"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">Excerpt</label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Short excerpt or summary..."
                  rows={2}
                  className="w-full px-3 py-2 bg-cg-slate/20 border border-zinc-700/60 rounded-lg text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-violet-500/50 resize-y"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-cg-slate/20 border border-zinc-700/60 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">SEO Title</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="SEO title..."
                    className="w-full px-3 py-2 bg-cg-slate/20 border border-zinc-700/60 rounded-lg text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">SEO Description</label>
                  <input
                    type="text"
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="SEO description..."
                    className="w-full px-3 py-2 bg-cg-slate/20 border border-zinc-700/60 rounded-lg text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Featured Image */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">Featured Image</label>
              {featuredImageUrl && (
                <div className="mb-2 rounded-lg overflow-hidden border border-zinc-700/60">
                  <img
                    src={featuredImageUrl}
                    alt="Featured image preview"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
              <input
                type="text"
                value={featuredImageUrl}
                onChange={(e) => setFeaturedImageUrl(e.target.value)}
                placeholder="Image URL (auto-generated with AI, or paste your own)..."
                className="w-full px-3 py-2 bg-cg-slate/20 border border-zinc-700/60 rounded-lg text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-violet-500/50"
              />
              {!featuredImageUrl && (
                <p className="text-xs text-[#4A6E7F] mt-1">An image will be auto-generated when you use AI generation</p>
              )}
            </div>

            {/* Marketing Content Preview (in modal after AI generation) */}
            {marketingContent.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-2">
                  Generated Marketing Content ({marketingContent.length} platforms)
                </label>
                <div className="bg-cg-slate/10 rounded-lg border border-zinc-700/40 overflow-hidden">
                  <MarketingTabs content={marketingContent} imageUrl={featuredImageUrl} />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-cg-slate/20">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-4 py-2 rounded-lg text-sm text-[#8AACBC] hover:text-white hover:bg-cg-slate/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={saving || !title.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                Save as Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving || !title.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blog Posts List */}
      <div className="bg-[#1A3648]/60 border border-cg-slate/20 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-cg-slate/20 rounded-lg h-14" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center">
            <PenTool className="w-10 h-10 text-[#3A5A6A] mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No blog posts yet</p>
            <p className="text-xs text-[#4A6E7F] mt-1">Create your first post to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {posts.map((post) => {
              const isExpanded = expandedPost === post.id;
              const hasMarketing = (post.marketing_content?.length || 0) > 0;

              return (
                <div key={post.id}>
                  {/* Post row */}
                  <div
                    className={`flex items-center px-5 py-3.5 hover:bg-cg-slate/10 transition-colors ${hasMarketing ? 'cursor-pointer' : ''}`}
                    onClick={() => hasMarketing && setExpandedPost(isExpanded ? null : post.id)}
                  >
                    {/* Expand icon */}
                    <div className="w-6 flex-shrink-0">
                      {hasMarketing ? (
                        isExpanded
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <span className="w-4 h-4" />
                      )}
                    </div>

                    {/* Title */}
                    <div className="flex-1 min-w-0 mr-4">
                      <span className="text-sm font-medium text-white line-clamp-1">{post.title}</span>
                      {hasMarketing && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {post.marketing_content!.map((mc) => {
                            const meta = PLATFORM_META[mc.platform];
                            if (!meta) return null;
                            const Icon = meta.icon;
                            return <Icon key={mc.platform} className={`w-3 h-3 ${meta.color} opacity-60`} />;
                          })}
                          <span className="text-[10px] text-[#4A6E7F]">{post.marketing_content!.length} platforms</span>
                        </div>
                      )}
                    </div>

                    {/* Category */}
                    <div className="hidden sm:block w-32 flex-shrink-0">
                      <span className="text-xs text-[#8AACBC]">{post.category}</span>
                    </div>

                    {/* Status */}
                    <div className="w-24 flex-shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        post.status === 'published'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-zinc-500/15 text-[#8AACBC]'
                      }`}>
                        {post.status}
                      </span>
                    </div>

                    {/* Published date */}
                    <div className="hidden md:block w-28 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">{formatDate(post.published_at)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button aria-label="Show"
                        onClick={() => handleTogglePublish(post)}
                        disabled={toggling === post.id}
                        className="p-1.5 rounded-lg hover:bg-cg-slate/20 text-muted-foreground hover:text-[#D0E4EC] transition-colors disabled:opacity-50"
                        title={post.status === 'published' ? 'Unpublish' : 'Publish'}
                      >
                        {toggling === post.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : post.status === 'published' ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button aria-label="Edit"
                        onClick={() => openEdit(post)}
                        className="p-1.5 rounded-lg hover:bg-cg-slate/20 text-muted-foreground hover:text-[#D0E4EC] transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button aria-label="Delete"
                        onClick={() => handleDelete(post.id)}
                        disabled={deleting === post.id}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === post.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded marketing content */}
                  {isExpanded && hasMarketing && (
                    <div className="bg-zinc-900/80 border-t border-cg-slate/10">
                      <MarketingTabs content={post.marketing_content!} imageUrl={post.featured_image_url} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
