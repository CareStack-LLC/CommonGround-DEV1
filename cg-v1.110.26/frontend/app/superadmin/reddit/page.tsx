'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle, RefreshCw, Search, Send, Plus, Settings, ChevronDown,
  ChevronUp, ExternalLink, ArrowUp, MessageSquare, Clock, Check, AlertCircle, Copy,
} from 'lucide-react';
import { adminAPI } from '@/lib/admin-api';

type Tab = 'feed' | 'create' | 'settings';

interface RedditPost {
  id: string;
  fullname: string;
  title: string;
  author: string;
  selftext: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
  flair: string | null;
  subreddit: string;
}

interface RedditComment {
  id: string;
  fullname: string;
  author: string;
  body: string;
  score: number;
  created_utc: number;
  is_submitter: boolean;
  depth: number;
}

export default function RedditPage() {
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [redditUser, setRedditUser] = useState<string>('');
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [selectedSub, setSelectedSub] = useState('coparenting');
  const [sortBy, setSortBy] = useState('hot');
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<RedditComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create post state
  const [newPostSub, setNewPostSub] = useState('coparenting');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostBody, setNewPostBody] = useState('');

  // Settings state
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newSub, setNewSub] = useState('');
  const [saving, setSaving] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const status = await adminAPI.getRedditStatus();
      setConnected(status.connected);
      if (status.username) setRedditUser(status.username);
    } catch {
      setConnected(false);
    }
  }, []);

  const loadSubreddits = useCallback(async () => {
    try {
      const data = await adminAPI.getTrackedSubreddits();
      setSubreddits(data.subreddits || ['coparenting', 'custody', 'divorce', 'SingleParents']);
      if (data.subreddits?.length > 0) setSelectedSub(data.subreddits[0]);
    } catch {
      setSubreddits(['coparenting', 'custody', 'divorce', 'SingleParents']);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    if (!connected) return;
    try {
      setLoading(true);
      setError(null);
      const data = searchQuery
        ? await adminAPI.searchReddit(selectedSub, searchQuery)
        : await adminAPI.getRedditPosts(selectedSub, sortBy);
      setPosts(data.posts || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [connected, selectedSub, sortBy, searchQuery]);

  useEffect(() => { checkStatus(); loadSubreddits(); }, [checkStatus, loadSubreddits]);
  useEffect(() => { if (connected) fetchPosts(); }, [connected, selectedSub, sortBy, fetchPosts]);

  const loadComments = async (postId: string, subreddit: string) => {
    if (expandedPost === postId) { setExpandedPost(null); return; }
    setExpandedPost(postId);
    setLoadingComments(true);
    setComments([]);
    try {
      const data = await adminAPI.getRedditComments(postId, subreddit);
      setComments(data.comments || []);
    } catch { setComments([]); }
    finally { setLoadingComments(false); }
  };

  const handleReply = async (parentFullname: string) => {
    if (!replyText.trim()) return;
    setPosting(true);
    try {
      await adminAPI.postRedditComment(parentFullname, replyText.trim());
      setReplyText('');
      setReplyTarget(null);
      setSuccess('Comment posted!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to post comment');
    } finally { setPosting(false); }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim()) return;
    setPosting(true);
    try {
      const result = await adminAPI.createRedditPost(newPostSub, newPostTitle.trim(), newPostBody.trim());
      setSuccess(`Post created! ${result.url || ''}`);
      setNewPostTitle('');
      setNewPostBody('');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
    } finally { setPosting(false); }
  };

  const handleSaveConfig = async () => {
    if (!clientId.trim() || !clientSecret.trim() || !username.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }
    setSaving(true);
    try {
      const result = await adminAPI.saveRedditConfig({
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        username: username.trim(),
        password: password.trim(),
      });
      if (result.connected) {
        setConnected(true);
        setRedditUser(result.username);
        setSuccess('Connected to Reddit!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save config');
    } finally { setSaving(false); }
  };

  const handleAddSub = async () => {
    if (!newSub.trim()) return;
    const cleaned = newSub.trim().toLowerCase().replace(/^r\//, '');
    if (subreddits.includes(cleaned)) return;
    const updated = [...subreddits, cleaned];
    setSubreddits(updated);
    setNewSub('');
    await adminAPI.updateTrackedSubreddits(updated);
  };

  const handleRemoveSub = async (sub: string) => {
    const updated = subreddits.filter(s => s !== sub);
    setSubreddits(updated);
    await adminAPI.updateTrackedSubreddits(updated);
  };

  const timeAgo = (utc: number) => {
    const diff = Math.floor(Date.now() / 1000 - utc);
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const tabs = [
    { id: 'feed' as Tab, label: 'Feed', icon: MessageCircle },
    { id: 'create' as Tab, label: 'Create Post', icon: Plus },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reddit</h1>
          <p className="text-sm text-[#8AACBC] mt-1">
            Browse, comment, and post in co-parenting subreddits
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            connected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {connected ? `u/${redditUser}` : 'Disconnected'}
          </span>
          {connected && (
            <button onClick={fetchPosts} className="p-2 rounded-lg bg-[#2D6A8F]/20 hover:bg-[#2D6A8F]/30 text-[#8AACBC] transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">&times;</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[#3DAA8A]/15 text-[#5BC4A0]'
                : 'text-[#8AACBC] hover:bg-[#2D6A8F]/15'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════ FEED TAB ══════ */}
      {activeTab === 'feed' && (
        <>
          {!connected ? (
            <div className="flex flex-col items-center justify-center py-20">
              <MessageCircle className="w-12 h-12 text-[#3A5A6A] mb-4" />
              <p className="text-[#6B8A9A] text-sm mb-3">Connect your Reddit account to browse posts</p>
              <button onClick={() => setActiveTab('settings')} className="px-4 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium transition-colors">
                Go to Settings
              </button>
            </div>
          ) : (
            <>
              {/* Controls */}
              <div className="flex flex-wrap gap-3">
                <select
                  value={selectedSub}
                  onChange={(e) => setSelectedSub(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#1A3648]/60 border border-[#2D6A8F]/20 text-[#D0E4EC] text-sm focus:outline-none focus:border-[#3DAA8A]/50"
                >
                  {subreddits.map(sub => (
                    <option key={sub} value={sub}>r/{sub}</option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#1A3648]/60 border border-[#2D6A8F]/20 text-[#D0E4EC] text-sm focus:outline-none focus:border-[#3DAA8A]/50"
                >
                  <option value="hot">Hot</option>
                  <option value="new">New</option>
                  <option value="top">Top</option>
                  <option value="rising">Rising</option>
                </select>
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B8A9A]" />
                  <input
                    type="text"
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchPosts()}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#1A3648]/60 border border-[#2D6A8F]/20 text-[#D0E4EC] text-sm placeholder-[#6B8A9A] focus:outline-none focus:border-[#3DAA8A]/50"
                  />
                </div>
              </div>

              {/* Posts */}
              {loading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="w-6 h-6 text-[#3DAA8A] animate-spin" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 text-[#6B8A9A] text-sm">No posts found</div>
              ) : (
                <div className="space-y-3">
                  {posts.map(post => (
                    <div key={post.id} className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl overflow-hidden">
                      {/* Post card */}
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Score */}
                          <div className="flex flex-col items-center gap-0.5 text-[#6B8A9A] min-w-[40px]">
                            <ArrowUp className="w-4 h-4" />
                            <span className="text-sm font-medium text-[#D0E4EC]">{post.score}</span>
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {post.flair && (
                                <span className="px-2 py-0.5 rounded-full bg-[#3DAA8A]/15 text-[#5BC4A0] text-[10px] font-medium">
                                  {post.flair}
                                </span>
                              )}
                              <span className="text-[11px] text-[#6B8A9A]">r/{post.subreddit}</span>
                              <span className="text-[11px] text-[#4A6E7F]">by u/{post.author}</span>
                              <span className="text-[11px] text-[#4A6E7F]">{timeAgo(post.created_utc)}</span>
                            </div>
                            <h3 className="text-sm font-medium text-[#D0E4EC] mb-1">{post.title}</h3>
                            {post.selftext && (
                              <p className="text-xs text-[#8AACBC] line-clamp-2">{post.selftext}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                              <button
                                onClick={() => loadComments(post.id, post.subreddit)}
                                className="flex items-center gap-1 text-xs text-[#6B8A9A] hover:text-[#5BC4A0] transition-colors"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                {post.num_comments} comments
                                {expandedPost === post.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                              <button
                                onClick={() => { setReplyTarget(post.fullname); setExpandedPost(post.id); }}
                                className="flex items-center gap-1 text-xs text-[#6B8A9A] hover:text-[#5BC4A0] transition-colors"
                              >
                                <Send className="w-3.5 h-3.5" />
                                Reply
                              </button>
                              <a
                                href={post.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-[#6B8A9A] hover:text-[#5BC4A0] transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Open
                              </a>
                              <button
                                onClick={() => { navigator.clipboard.writeText(post.permalink); setSuccess('Link copied!'); setTimeout(() => setSuccess(null), 2000); }}
                                className="flex items-center gap-1 text-xs text-[#6B8A9A] hover:text-[#5BC4A0] transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copy Link
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded: Comments + Reply */}
                      {expandedPost === post.id && (
                        <div className="border-t border-[#2D6A8F]/20 bg-[#162D3A]/50 px-4 py-3">
                          {/* Reply composer */}
                          {replyTarget && (
                            <div className="mb-3 p-3 bg-[#1A3648]/80 rounded-lg border border-[#3DAA8A]/20">
                              <p className="text-xs text-[#6B8A9A] mb-2">Replying as u/{redditUser}</p>
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write your reply..."
                                rows={3}
                                className="w-full px-3 py-2 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-sm text-[#D0E4EC] placeholder-[#6B8A9A] focus:outline-none focus:border-[#3DAA8A]/50 resize-none"
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button
                                  onClick={() => { setReplyTarget(null); setReplyText(''); }}
                                  className="px-3 py-1.5 rounded-lg text-xs text-[#8AACBC] hover:bg-[#2D6A8F]/20"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleReply(replyTarget)}
                                  disabled={posting || !replyText.trim()}
                                  className="px-3 py-1.5 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-xs font-medium disabled:opacity-50 transition-colors"
                                >
                                  {posting ? 'Posting...' : 'Post Reply'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Comments */}
                          {loadingComments ? (
                            <div className="flex justify-center py-4">
                              <RefreshCw className="w-4 h-4 text-[#3DAA8A] animate-spin" />
                            </div>
                          ) : comments.length === 0 ? (
                            <p className="text-xs text-[#6B8A9A] text-center py-4">No comments yet</p>
                          ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                              {comments.map(c => (
                                <div
                                  key={c.id}
                                  className="p-2.5 rounded-lg bg-[#1A3648]/40"
                                  style={{ marginLeft: c.depth * 16 }}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-medium ${c.is_submitter ? 'text-[#3DAA8A]' : 'text-[#8AACBC]'}`}>
                                      u/{c.author} {c.is_submitter && '(OP)'}
                                    </span>
                                    <span className="text-[10px] text-[#4A6E7F]">{timeAgo(c.created_utc)}</span>
                                    <span className="text-[10px] text-[#6B8A9A]">{c.score} pts</span>
                                  </div>
                                  <p className="text-xs text-[#D0E4EC] whitespace-pre-wrap">{c.body}</p>
                                  <button
                                    onClick={() => { setReplyTarget(c.fullname); setReplyText(''); }}
                                    className="mt-1 text-[10px] text-[#6B8A9A] hover:text-[#5BC4A0] transition-colors"
                                  >
                                    Reply
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ══════ CREATE POST TAB ══════ */}
      {activeTab === 'create' && (
        <div className="space-y-4">
          {!connected ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Plus className="w-12 h-12 text-[#3A5A6A] mb-4" />
              <p className="text-[#6B8A9A] text-sm mb-3">Connect your Reddit account first</p>
              <button onClick={() => setActiveTab('settings')} className="px-4 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium transition-colors">
                Go to Settings
              </button>
            </div>
          ) : (
            <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[#D0E4EC]">Create a New Post</h2>

              <div>
                <label className="block text-xs text-[#6B8A9A] mb-1">Subreddit</label>
                <select
                  value={newPostSub}
                  onChange={(e) => setNewPostSub(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-sm text-[#D0E4EC] focus:outline-none focus:border-[#3DAA8A]/50"
                >
                  {subreddits.map(sub => (
                    <option key={sub} value={sub}>r/{sub}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#6B8A9A] mb-1">Title</label>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="Post title (max 300 characters)"
                  maxLength={300}
                  className="w-full px-3 py-2 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-sm text-[#D0E4EC] placeholder-[#6B8A9A] focus:outline-none focus:border-[#3DAA8A]/50"
                />
                <span className="text-[10px] text-[#4A6E7F] mt-1">{newPostTitle.length}/300</span>
              </div>

              <div>
                <label className="block text-xs text-[#6B8A9A] mb-1">Body (Markdown supported)</label>
                <textarea
                  value={newPostBody}
                  onChange={(e) => setNewPostBody(e.target.value)}
                  placeholder="Write your post content here..."
                  rows={10}
                  className="w-full px-3 py-2 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-sm text-[#D0E4EC] placeholder-[#6B8A9A] focus:outline-none focus:border-[#3DAA8A]/50 resize-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setNewPostTitle(''); setNewPostBody(''); }}
                  className="px-4 py-2 rounded-lg text-sm text-[#8AACBC] hover:bg-[#2D6A8F]/20 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleCreatePost}
                  disabled={posting || !newPostTitle.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {posting ? 'Posting...' : 'Post to Reddit'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════ SETTINGS TAB ══════ */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Connection Setup */}
          <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#D0E4EC]">Reddit API Connection</h2>
            <div className="p-3 bg-[#2D6A8F]/10 rounded-lg">
              <p className="text-xs text-[#8AACBC]">
                1. Go to{' '}
                <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="text-[#5BC4A0] underline">
                  reddit.com/prefs/apps
                </a>
                {' '}and create an app (type: script)
              </p>
              <p className="text-xs text-[#8AACBC] mt-1">2. Copy the client ID (under the app name) and secret below</p>
              <p className="text-xs text-[#8AACBC] mt-1">3. Enter your Reddit username and password</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#6B8A9A] mb-1">Client ID</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="From reddit.com/prefs/apps"
                  className="w-full px-3 py-2 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-sm text-[#D0E4EC] placeholder-[#6B8A9A] focus:outline-none focus:border-[#3DAA8A]/50"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6B8A9A] mb-1">Client Secret</label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Secret from your Reddit app"
                  className="w-full px-3 py-2 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-sm text-[#D0E4EC] placeholder-[#6B8A9A] focus:outline-none focus:border-[#3DAA8A]/50"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6B8A9A] mb-1">Reddit Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your Reddit username"
                  className="w-full px-3 py-2 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-sm text-[#D0E4EC] placeholder-[#6B8A9A] focus:outline-none focus:border-[#3DAA8A]/50"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6B8A9A] mb-1">Reddit Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your Reddit password"
                  className="w-full px-3 py-2 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-sm text-[#D0E4EC] placeholder-[#6B8A9A] focus:outline-none focus:border-[#3DAA8A]/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className={`text-xs ${connected ? 'text-emerald-400' : 'text-[#6B8A9A]'}`}>
                {connected ? `Connected as u/${redditUser}` : 'Not connected'}
              </span>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {saving ? 'Connecting...' : 'Save & Connect'}
              </button>
            </div>
          </div>

          {/* Tracked Subreddits */}
          <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#D0E4EC]">Monitored Subreddits</h2>
            <div className="flex flex-wrap gap-2">
              {subreddits.map(sub => (
                <span key={sub} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3DAA8A]/15 text-[#5BC4A0] text-sm">
                  r/{sub}
                  <button onClick={() => handleRemoveSub(sub)} className="text-[#5BC4A0]/50 hover:text-red-400 transition-colors">&times;</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSub()}
                placeholder="Add subreddit (e.g. coparenting)"
                className="flex-1 px-3 py-2 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-sm text-[#D0E4EC] placeholder-[#6B8A9A] focus:outline-none focus:border-[#3DAA8A]/50"
              />
              <button onClick={handleAddSub} className="px-3 py-2 rounded-lg bg-[#2D6A8F]/20 hover:bg-[#2D6A8F]/30 text-[#8AACBC] text-sm transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-[#4A6E7F]">Suggested: coparenting, custody, divorce, SingleParents, Mommit, daddit</p>
          </div>
        </div>
      )}
    </div>
  );
}
