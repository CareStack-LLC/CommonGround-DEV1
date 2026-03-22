'use client';

import { useState, useEffect } from 'react';
import {
  MessageCircle, Plus, Copy, Check, Trash2, ExternalLink,
  Pencil, Target, Clock, ChevronDown, ChevronUp, Sparkles, Send,
} from 'lucide-react';

type Tab = 'drafts' | 'tracker' | 'playbook';

interface Draft {
  id: string;
  type: 'post' | 'comment';
  subreddit: string;
  title: string;
  body: string;
  status: 'draft' | 'posted';
  createdAt: string;
  postedAt?: string;
}

interface SubredditTarget {
  name: string;
  purpose: string;
  members: string;
  postsThisWeek: number;
}

const STORAGE_KEY = 'cg_reddit_drafts';
const TRACKER_KEY = 'cg_reddit_tracker';

const DEFAULT_SUBREDDITS: SubredditTarget[] = [
  { name: 'coparenting', purpose: 'Primary — people actively co-parenting', members: '75K+', postsThisWeek: 0 },
  { name: 'custody', purpose: 'Legal-focused custody discussions', members: '30K+', postsThisWeek: 0 },
  { name: 'divorce', purpose: 'Massive audience in transition', members: '150K+', postsThisWeek: 0 },
  { name: 'SingleParents', purpose: 'Broader single parent community', members: '90K+', postsThisWeek: 0 },
  { name: 'Mommit', purpose: 'Mom community — occasional co-parenting threads', members: '500K+', postsThisWeek: 0 },
  { name: 'daddit', purpose: 'Dad community — custody & co-parenting threads', members: '400K+', postsThisWeek: 0 },
];

const PLAYBOOK_WEEKS = [
  {
    week: 'Week 1',
    title: 'Build Karma & Trust',
    action: 'Comment helpfully on 3-5 posts/day. Do NOT mention CommonGround.',
    rules: 'Be genuinely helpful. Share personal experience. Build trust. No links.',
    tips: [
      'Sort by "New" to find fresh posts with few replies — your comment will be seen',
      'Answer questions about custody schedules, communication tips, documentation',
      'Share your own co-parenting experience authentically',
      'Upvote other helpful comments — the community notices',
    ],
  },
  {
    week: 'Week 2',
    title: 'Share Your Story',
    action: 'When relevant, mention: "I built a tool for this because I lived it."',
    rules: 'Let people ask for the link. One organic mention per day max. Never spam.',
    tips: [
      'Only mention CommonGround when someone describes a problem it directly solves',
      'Frame it as your personal story: "I went through this too, that\'s why I built..."',
      'If someone asks for the link, share find-commonground.com/for-moms',
      'Thank people who engage — every interaction builds your reputation',
    ],
  },
  {
    week: 'Week 3',
    title: 'AMA Post',
    action: 'Post: "I\'m a father from Compton who built an AI co-parenting app. AMA."',
    rules: 'Be transparent about who you are. Answer every single question.',
    tips: [
      'Post on a Tuesday or Wednesday morning for maximum visibility',
      'Include your personal story in the post body (3-4 paragraphs)',
      'Respond to every comment within 2 hours',
      'Be honest about limitations — "that feature is on the roadmap"',
    ],
  },
  {
    week: 'Ongoing',
    title: 'Community Member',
    action: 'Continue helping 2-3 posts/day. Become a recognized name.',
    rules: 'The community will defend you if you\'ve been genuine.',
    tips: [
      'Set a daily 30-minute Reddit routine',
      'Track which subreddits generate the most engagement',
      'Share updates when you ship features the community asked for',
      'Cross-reference blog posts for detailed answers (link to your blog, not product)',
    ],
  },
];

export default function RedditContentStudio() {
  const [activeTab, setActiveTab] = useState<Tab>('drafts');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [targets, setTargets] = useState<SubredditTarget[]>(DEFAULT_SUBREDDITS);
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<string | null>('Week 1');
  const [copied, setCopied] = useState<string | null>(null);
  const [showNewDraft, setShowNewDraft] = useState(false);
  const [editingDraft, setEditingDraft] = useState<string | null>(null);

  // New draft form
  const [draftType, setDraftType] = useState<'post' | 'comment'>('comment');
  const [draftSub, setDraftSub] = useState('coparenting');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setDrafts(JSON.parse(saved));
      const savedTargets = localStorage.getItem(TRACKER_KEY);
      if (savedTargets) setTargets(JSON.parse(savedTargets));
    } catch {}
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  }, [drafts]);

  useEffect(() => {
    localStorage.setItem(TRACKER_KEY, JSON.stringify(targets));
  }, [targets]);

  const addDraft = () => {
    if (!draftBody.trim()) return;
    const newDraft: Draft = {
      id: Date.now().toString(),
      type: draftType,
      subreddit: draftSub,
      title: draftType === 'post' ? draftTitle : '',
      body: draftBody,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    setDrafts([newDraft, ...drafts]);
    setDraftTitle('');
    setDraftBody('');
    setShowNewDraft(false);
  };

  const updateDraft = (id: string) => {
    setDrafts(drafts.map(d => d.id === id ? { ...d, title: draftTitle, body: draftBody, subreddit: draftSub, type: draftType } : d));
    setEditingDraft(null);
    setDraftTitle('');
    setDraftBody('');
  };

  const markAsPosted = (id: string) => {
    setDrafts(drafts.map(d => d.id === id ? { ...d, status: 'posted', postedAt: new Date().toISOString() } : d));
    // Increment tracker
    const draft = drafts.find(d => d.id === id);
    if (draft) {
      setTargets(targets.map(t => t.name === draft.subreddit ? { ...t, postsThisWeek: t.postsThisWeek + 1 } : t));
    }
  };

  const deleteDraft = (id: string) => {
    setDrafts(drafts.filter(d => d.id !== id));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const startEdit = (draft: Draft) => {
    setEditingDraft(draft.id);
    setDraftType(draft.type);
    setDraftSub(draft.subreddit);
    setDraftTitle(draft.title);
    setDraftBody(draft.body);
  };

  const draftCount = drafts.filter(d => d.status === 'draft').length;
  const postedCount = drafts.filter(d => d.status === 'posted').length;
  const weeklyPosts = targets.reduce((sum, t) => sum + t.postsThisWeek, 0);

  const tabs = [
    { id: 'drafts' as Tab, label: `Drafts (${draftCount})`, icon: Pencil },
    { id: 'tracker' as Tab, label: 'Subreddit Tracker', icon: Target },
    { id: 'playbook' as Tab, label: 'Playbook', icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reddit Content Studio</h1>
          <p className="text-sm text-[#8AACBC] mt-1">
            Draft posts and comments, track subreddit engagement, follow the playbook
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-xs text-[#8AACBC]">
            <span>{draftCount} drafts</span>
            <span>{postedCount} posted</span>
            <span>{weeklyPosts} this week</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Pencil className="w-4 h-4 text-[#3DAA8A]" />
            <span className="text-xs text-[#6B8A9A]">Ready to Post</span>
          </div>
          <div className="text-2xl font-bold text-white">{draftCount}</div>
        </div>
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-[#6B8A9A]">Posted</span>
          </div>
          <div className="text-2xl font-bold text-white">{postedCount}</div>
        </div>
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-[#F5A623]" />
            <span className="text-xs text-[#6B8A9A]">Subreddits</span>
          </div>
          <div className="text-2xl font-bold text-white">{targets.length}</div>
        </div>
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[#2D6A8F]" />
            <span className="text-xs text-[#6B8A9A]">This Week</span>
          </div>
          <div className="text-2xl font-bold text-white">{weeklyPosts}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-[#3DAA8A]/15 text-[#5BC4A0]' : 'text-[#8AACBC] hover:bg-[#2D6A8F]/15'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════ DRAFTS TAB ══════ */}
      {activeTab === 'drafts' && (
        <div className="space-y-4">
          {/* New Draft Button */}
          {!showNewDraft && !editingDraft && (
            <button
              onClick={() => { setShowNewDraft(true); setDraftType('comment'); setDraftBody(''); setDraftTitle(''); }}
              className="flex items-center gap-2 px-4 py-3 w-full rounded-xl border-2 border-dashed border-[#2D6A8F]/30 text-[#8AACBC] hover:border-[#3DAA8A]/50 hover:text-[#5BC4A0] transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Draft
            </button>
          )}

          {/* Draft Composer */}
          {(showNewDraft || editingDraft) && (
            <div className="bg-[#1A3648]/60 border border-[#3DAA8A]/30 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-[#D0E4EC]">{editingDraft ? 'Edit Draft' : 'New Draft'}</h3>
              <div className="flex gap-3">
                <div className="flex gap-1 bg-[#162D3A] rounded-lg p-1">
                  <button onClick={() => setDraftType('comment')} className={`px-3 py-1.5 rounded text-xs font-medium ${draftType === 'comment' ? 'bg-[#3DAA8A]/15 text-[#5BC4A0]' : 'text-[#8AACBC]'}`}>
                    Comment/Reply
                  </button>
                  <button onClick={() => setDraftType('post')} className={`px-3 py-1.5 rounded text-xs font-medium ${draftType === 'post' ? 'bg-[#3DAA8A]/15 text-[#5BC4A0]' : 'text-[#8AACBC]'}`}>
                    New Post
                  </button>
                </div>
                <select
                  value={draftSub}
                  onChange={(e) => setDraftSub(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-[#D0E4EC] text-sm"
                >
                  {targets.map(t => <option key={t.name} value={t.name}>r/{t.name}</option>)}
                </select>
              </div>
              {draftType === 'post' && (
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Post title"
                  maxLength={300}
                  className="w-full px-3 py-2 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-sm text-[#D0E4EC] placeholder-[#6B8A9A] focus:outline-none focus:border-[#3DAA8A]/50"
                />
              )}
              <textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                placeholder={draftType === 'post' ? 'Write your post content (markdown supported)...' : 'Write your comment or reply...'}
                rows={6}
                className="w-full px-3 py-2 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-sm text-[#D0E4EC] placeholder-[#6B8A9A] focus:outline-none focus:border-[#3DAA8A]/50 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowNewDraft(false); setEditingDraft(null); setDraftTitle(''); setDraftBody(''); }} className="px-3 py-1.5 rounded-lg text-xs text-[#8AACBC] hover:bg-[#2D6A8F]/20">
                  Cancel
                </button>
                <button
                  onClick={() => editingDraft ? updateDraft(editingDraft) : addDraft()}
                  disabled={!draftBody.trim()}
                  className="px-4 py-1.5 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-xs font-medium disabled:opacity-50 transition-colors"
                >
                  {editingDraft ? 'Update Draft' : 'Save Draft'}
                </button>
              </div>
            </div>
          )}

          {/* Draft List */}
          {drafts.length === 0 && !showNewDraft ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Pencil className="w-10 h-10 text-[#3A5A6A] mb-3" />
              <p className="text-[#6B8A9A] text-sm">No drafts yet. Start writing!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map(draft => (
                <div key={draft.id} className={`bg-[#1A3648]/60 border rounded-xl overflow-hidden ${draft.status === 'posted' ? 'border-emerald-500/20 opacity-70' : 'border-[#2D6A8F]/20'}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${draft.type === 'post' ? 'bg-[#F5A623]/15 text-[#F5A623]' : 'bg-[#3DAA8A]/15 text-[#5BC4A0]'}`}>
                            {draft.type}
                          </span>
                          <span className="text-xs text-[#6B8A9A]">r/{draft.subreddit}</span>
                          {draft.status === 'posted' && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-medium">
                              <Check className="w-3 h-3" /> Posted
                            </span>
                          )}
                          <span className="text-[10px] text-[#4A6E7F]">
                            {new Date(draft.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {draft.title && <h3 className="text-sm font-medium text-[#D0E4EC] mb-1">{draft.title}</h3>}
                        <p className="text-xs text-[#8AACBC] line-clamp-2">{draft.body}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-3">
                        <button
                          onClick={() => copyToClipboard(draft.title ? `${draft.title}\n\n${draft.body}` : draft.body, draft.id)}
                          className="p-1.5 rounded-lg hover:bg-[#2D6A8F]/20 text-[#6B8A9A] hover:text-[#5BC4A0] transition-colors"
                          title="Copy to clipboard"
                        >
                          {copied === draft.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        {draft.status === 'draft' && (
                          <>
                            <button
                              onClick={() => markAsPosted(draft.id)}
                              className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-[#6B8A9A] hover:text-emerald-400 transition-colors"
                              title="Mark as posted"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => startEdit(draft)}
                              className="p-1.5 rounded-lg hover:bg-[#2D6A8F]/20 text-[#6B8A9A] hover:text-[#8AACBC] transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deleteDraft(draft.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#6B8A9A] hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════ TRACKER TAB ══════ */}
      {activeTab === 'tracker' && (
        <div className="space-y-4">
          <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl overflow-hidden">
            <div className="grid grid-cols-5 gap-0 text-xs font-medium text-[#6B8A9A] uppercase tracking-wider bg-[#162D3A] px-5 py-3">
              <span>Subreddit</span>
              <span>Members</span>
              <span>Purpose</span>
              <span className="text-center">This Week</span>
              <span className="text-right">Link</span>
            </div>
            {targets.map((target, i) => (
              <div key={target.name} className={`grid grid-cols-5 gap-0 items-center px-5 py-3 border-t border-[#2D6A8F]/10 ${i % 2 === 0 ? '' : 'bg-[#162D3A]/30'}`}>
                <span className="text-sm font-medium text-[#D0E4EC]">r/{target.name}</span>
                <span className="text-sm text-[#8AACBC]">{target.members}</span>
                <span className="text-xs text-[#6B8A9A]">{target.purpose}</span>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setTargets(targets.map(t => t.name === target.name ? { ...t, postsThisWeek: Math.max(0, t.postsThisWeek - 1) } : t))}
                    className="w-5 h-5 rounded bg-[#2D6A8F]/20 text-[#8AACBC] hover:bg-[#2D6A8F]/30 text-xs flex items-center justify-center"
                  >-</button>
                  <span className={`text-sm font-medium ${target.postsThisWeek > 0 ? 'text-[#5BC4A0]' : 'text-[#6B8A9A]'}`}>{target.postsThisWeek}</span>
                  <button
                    onClick={() => setTargets(targets.map(t => t.name === target.name ? { ...t, postsThisWeek: t.postsThisWeek + 1 } : t))}
                    className="w-5 h-5 rounded bg-[#2D6A8F]/20 text-[#8AACBC] hover:bg-[#2D6A8F]/30 text-xs flex items-center justify-center"
                  >+</button>
                </div>
                <div className="text-right">
                  <a
                    href={`https://reddit.com/r/${target.name}/new`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#5BC4A0] hover:underline"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setTargets(targets.map(t => ({ ...t, postsThisWeek: 0 })))}
              className="text-xs text-[#6B8A9A] hover:text-[#8AACBC] transition-colors"
            >
              Reset weekly counts
            </button>
          </div>
        </div>
      )}

      {/* ══════ PLAYBOOK TAB ══════ */}
      {activeTab === 'playbook' && (
        <div className="space-y-4">
          <div className="bg-[#1A3648]/60 border border-[#3DAA8A]/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-[#3DAA8A]" />
              <h3 className="text-sm font-semibold text-[#D0E4EC]">Why Reddit?</h3>
            </div>
            <p className="text-sm text-[#8AACBC]">
              r/coparenting (75K+), r/custody (30K+), and r/divorce (150K+) are communities of people actively dealing with exactly the problem CommonGround solves. One authentic post can generate 10+ signups. Build trust first, then share your story.
            </p>
          </div>

          {PLAYBOOK_WEEKS.map(week => (
            <div key={week.week} className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedWeek(expandedWeek === week.week ? null : week.week)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#2D6A8F]/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-[#3DAA8A]/15 text-[#5BC4A0] text-xs font-bold">{week.week}</span>
                  <span className="text-sm font-medium text-[#D0E4EC]">{week.title}</span>
                </div>
                {expandedWeek === week.week ? <ChevronUp className="w-4 h-4 text-[#6B8A9A]" /> : <ChevronDown className="w-4 h-4 text-[#6B8A9A]" />}
              </button>
              {expandedWeek === week.week && (
                <div className="border-t border-[#2D6A8F]/20 px-5 py-4 space-y-3">
                  <div>
                    <span className="text-[10px] text-[#6B8A9A] uppercase tracking-wider">Action</span>
                    <p className="text-sm text-[#D0E4EC] mt-1">{week.action}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#F5A623] uppercase tracking-wider">Rules</span>
                    <p className="text-sm text-[#F5A623]/80 mt-1">{week.rules}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B8A9A] uppercase tracking-wider">Tips</span>
                    <ul className="mt-1 space-y-1.5">
                      {week.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#8AACBC]">
                          <span className="text-[#3DAA8A] mt-0.5 flex-shrink-0">-</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Quick Links */}
          <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#D0E4EC] mb-3">Quick Links — Open in New Tab</h3>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_SUBREDDITS.slice(0, 4).map(s => (
                <a
                  key={s.name}
                  href={`https://reddit.com/r/${s.name}/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2D6A8F]/15 text-[#5BC4A0] text-sm hover:bg-[#2D6A8F]/25 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  r/{s.name}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
