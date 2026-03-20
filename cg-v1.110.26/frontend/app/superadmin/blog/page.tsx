'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  PenTool, Plus, Loader2, Trash2, Edit3, Eye, EyeOff,
  Sparkles, X, RefreshCw, CheckCircle, AlertTriangle,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const CATEGORIES = [
  'Co-Parenting Tips',
  'Legal Insights',
  'Platform Updates',
  'ARIA & Technology',
  'Family Wellness',
  'KidSpace',
];

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  status: 'draft' | 'published';
  seo_title: string;
  seo_description: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
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

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');

  // AI generation state
  const [aiTopic, setAiTopic] = useState('');
  const [aiKeywords, setAiKeywords] = useState('');
  const [generating, setGenerating] = useState(false);

  const getToken = () => localStorage.getItem('access_token') || '';

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/blog/admin/posts`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : data.posts || []);
    } catch (err) {
      console.error('Failed to load blog posts:', err);
      setError('Failed to load blog posts');
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
        body: JSON.stringify({ topic: aiTopic, keywords: aiKeywords || undefined }),
      });
      if (!res.ok) throw new Error('AI generation failed');
      const data = await res.json();
      setTitle(data.title || '');
      setContent(data.content || '');
      setExcerpt(data.excerpt || '');
      setSeoTitle(data.seo_title || '');
      setSeoDescription(data.seo_description || '');
      if (data.featured_image_url) {
        setFeaturedImageUrl(data.featured_image_url);
      }
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
      const body = { title, content, excerpt, category, seo_title: seoTitle, seo_description: seoDescription, featured_image_url: featuredImageUrl || undefined, status: publish ? 'published' : 'draft' };

      if (editingPost) {
        const res = await fetch(`${API_BASE}/api/v1/blog/admin/posts/${editingPost.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to update post');
      } else {
        const res = await fetch(`${API_BASE}/api/v1/blog/admin/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to create post');
      }

      setShowModal(false);
      resetForm();
      setSuccessMessage(editingPost ? 'Post updated successfully' : 'Post created successfully');
      setTimeout(() => setSuccessMessage(''), 4000);
      await fetchPosts();
    } catch (err: any) {
      console.error('[Blog] Save failed:', err);
      setError(err.message || 'Failed to save post. Please try again.');
      setTimeout(() => setError(''), 5000);
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
          <p className="text-sm text-zinc-500 mt-0.5">Create and manage blog posts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPosts}
            disabled={loading}
            className="p-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-sm text-emerald-300">{successMessage}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => { setShowModal(false); resetForm(); }} />
          <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800/60 rounded-xl p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {editingPost ? 'Edit Post' : 'Create New Post'}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Generation Section */}
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
                <Sparkles className="w-4 h-4" />
                Generate with AI
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Enter a topic..."
                  className="flex-1 px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
                />
                <input
                  type="text"
                  value={aiKeywords}
                  onChange={(e) => setAiKeywords(e.target.value)}
                  placeholder="Keywords (optional)"
                  className="flex-1 px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
                />
                <button
                  onClick={handleAIGenerate}
                  disabled={generating || !aiTopic.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium block mb-1.5">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Post title..."
                  className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium block mb-1.5">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your blog post content..."
                  rows={10}
                  className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 resize-y"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium block mb-1.5">Excerpt</label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Short excerpt or summary..."
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 resize-y"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium block mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium block mb-1.5">SEO Title</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="SEO title..."
                    className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium block mb-1.5">SEO Description</label>
                  <input
                    type="text"
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="SEO description..."
                    className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Featured Image */}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium block mb-1.5">Featured Image</label>
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
                className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
              />
              {!featuredImageUrl && (
                <p className="text-xs text-zinc-600 mt-1">An image will be auto-generated when you use AI generation</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/60">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
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

      {/* Blog Posts Table */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-zinc-800/60 rounded-lg h-14" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center">
            <PenTool className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No blog posts yet</p>
            <p className="text-xs text-zinc-600 mt-1">Create your first post to get started</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/60">
                <th className="text-left px-5 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Title</th>
                <th className="text-left px-5 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-medium hidden sm:table-cell">Category</th>
                <th className="text-left px-5 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Status</th>
                <th className="text-left px-5 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-medium hidden md:table-cell">Published</th>
                <th className="text-right px-5 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-medium text-zinc-200 line-clamp-1">{post.title}</span>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className="text-xs text-zinc-400">{post.category}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      post.status === 'published'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-zinc-500/15 text-zinc-400'
                    }`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="text-xs text-zinc-500">{formatDate(post.published_at)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleTogglePublish(post)}
                        disabled={toggling === post.id}
                        className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
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
                      <button
                        onClick={() => openEdit(post)}
                        className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={deleting === post.id}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === post.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
