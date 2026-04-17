'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Rocket, Check, Copy, Trash2, ExternalLink, Pencil, Target, Clock,
  ChevronDown, ChevronUp, Plus, Send, MessageCircle, FileText,
  Mail, Globe, Linkedin, Instagram, Hash, Video, Users, Briefcase,
  BarChart3, TrendingUp, CheckCircle2, Circle, ArrowRight, AlertTriangle,
} from 'lucide-react';
import { adminAPI } from '@/lib/admin-api';

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

type Tab = 'dashboard' | 'playbook' | 'studio' | 'outreach' | 'metrics';

type Channel = 'reddit' | 'linkedin' | 'instagram' | 'tiktok' | 'facebook' | 'twitter' | 'email_outreach' | 'blog';

interface Draft {
  id: string;
  channel: Channel;
  title: string;
  body: string;
  status: 'draft' | 'posted';
  createdAt: string;
  postedAt?: string;
}

interface Contact {
  id: string;
  name: string;
  type: 'attorney' | 'mediator' | 'therapist' | 'coach' | 'other';
  email: string;
  status: 'not_contacted' | 'emailed' | 'meeting_scheduled' | 'active_partner';
  lastContact: string;
  notes: string;
}

interface ActivityItem {
  id: string;
  action: string;
  channel: string;
  timestamp: string;
}

// ══════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════

const STORAGE = {
  playbook: 'cg_gtm_playbook',
  drafts: 'cg_gtm_drafts',
  outreach: 'cg_gtm_outreach',
  activity: 'cg_gtm_activity',
};

const CHANNELS: { id: Channel; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'reddit', label: 'Reddit', icon: MessageCircle, color: '#FF4500' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#E1306C' },
  { id: 'tiktok', label: 'TikTok', icon: Video, color: '#00F2EA' },
  { id: 'facebook', label: 'Facebook', icon: Users, color: '#1877F2' },
  { id: 'twitter', label: 'X / Twitter', icon: Hash, color: '#8AACBC' },
  { id: 'email_outreach', label: 'Email Outreach', icon: Mail, color: '#F5A623' },
  { id: 'blog', label: 'Blog Post', icon: FileText, color: '#3DAA8A' },
];

const PLAYBOOK_WEEKS = [
  {
    id: 'week1',
    title: 'Week 1 — Foundation',
    subtitle: 'Set up presence, create seed content, configure tracking',
    tasks: [
      { id: 'w1_social', channel: 'instagram' as Channel, text: 'Set up Instagram, TikTok, and Facebook business page', tip: 'Use @findcommonground handle. Bio: "AI-powered co-parenting app. Free AI messaging. Built by a co-parent who gets it."' },
      { id: 'w1_blog1', channel: 'blog' as Channel, text: 'Publish founder story blog post', tip: 'Title: "Why I Built CommonGround: A Father\'s Journey" — personal, authentic, shareable' },
      { id: 'w1_reddit', channel: 'reddit' as Channel, text: 'Create Reddit account, start commenting in r/coparenting, r/custody, r/divorce (3-5 posts/day)', tip: 'Be genuinely helpful. Do NOT mention CommonGround yet. Build karma and trust.' },
      { id: 'w1_fb', channel: 'facebook' as Channel, text: 'Join 10 Facebook co-parenting/divorce support groups', tip: 'Search for "co-parenting", "single mom support", "divorce support". Introduce yourself as a co-parent, not a founder.' },
      { id: 'w1_analytics', channel: 'blog' as Channel, text: 'Set up GA4 conversion goals + create UTM tracking spreadsheet', tip: 'Track early_adopter and sign_up events. Create UTM links for every channel.' },
      { id: 'w1_content', channel: 'instagram' as Channel, text: 'Write 10 social media posts ready to schedule', tip: 'Mix: 3 educational, 3 personal story, 2 product highlights, 2 engagement questions' },
    ],
  },
  {
    id: 'week2',
    title: 'Week 2 — Content',
    subtitle: 'Create content, build outreach list, start drip emails',
    tasks: [
      { id: 'w2_tiktok', channel: 'tiktok' as Channel, text: 'Film and post first 5 TikTok videos', tip: 'Ideas: ARIA before/after, founder story series, co-parent relatable humor, free AI pitch' },
      { id: 'w2_blog2', channel: 'blog' as Channel, text: 'Publish documentation guide blog post', tip: '"5 Things Every Co-Parent Should Document (And Why)" — SEO-targeted, actionable' },
      { id: 'w2_list', channel: 'email_outreach' as Channel, text: 'Build list of 50 attorneys/mediators for outreach', tip: 'Sources: Google, Avvo.com, state bar directory, Mediate.com, Psychology Today' },
      { id: 'w2_email', channel: 'email_outreach' as Channel, text: 'Write 2 additional early adopter drip emails', tip: 'Email 2: founder story (Day 2). Email 3: ARIA before/after demo (Day 5).' },
      { id: 'w2_engage', channel: 'facebook' as Channel, text: 'Start engaging meaningfully in Facebook groups', tip: 'Comment on posts, share advice, build relationships. Value first, always.' },
    ],
  },
  {
    id: 'week3',
    title: 'Week 3 — Outreach',
    subtitle: 'Direct outreach to professionals and communities',
    tasks: [
      { id: 'w3_attorney', channel: 'email_outreach' as Channel, text: 'Begin attorney/mediator email outreach (10 per day)', tip: 'Personal email, not blast. Mention their practice specifically. Offer 15-min demo.' },
      { id: 'w3_fb_story', channel: 'facebook' as Channel, text: 'Post founder story in 3 Facebook groups (with admin permission)', tip: 'Ask group admins first. Personal stories get much better reception than ads.' },
      { id: 'w3_ama', channel: 'reddit' as Channel, text: 'Write AMA post for r/coparenting', tip: '"I\'m a father from Compton who built an AI co-parenting app. AMA." — answer every question.' },
      { id: 'w3_ig', channel: 'instagram' as Channel, text: 'Start posting 3x/week on Instagram', tip: 'Reels perform best. Repurpose TikTok content. Use co-parenting hashtags.' },
      { id: 'w3_network', channel: 'facebook' as Channel, text: 'Send personal "know a co-parent?" texts to 20 people in network', tip: 'Template: "Hey, I built a co-parenting app. Know anyone who co-parents? First 50 get 30% off for life."' },
    ],
  },
  {
    id: 'week4',
    title: 'Week 4 — Double Down',
    subtitle: 'Assess what works, scale winning channels',
    tasks: [
      { id: 'w4_continue', channel: 'reddit' as Channel, text: 'Continue all outreach cadences across channels', tip: 'Consistency beats intensity. 2 hours/day, every day.' },
      { id: 'w4_comparison', channel: 'blog' as Channel, text: 'Publish competitor comparison blog post', tip: '"CommonGround vs OurFamilyWizard vs TalkingParents" — SEO gold, drives purchase intent.' },
      { id: 'w4_followup', channel: 'email_outreach' as Channel, text: 'Follow up with all attorney/mediator leads', tip: 'One follow-up at Day 5 if no response. Keep it short: "Just circling back..."' },
      { id: 'w4_assess', channel: 'blog' as Channel, text: 'Assess which channels generated the most signups — double down', tip: 'Check UTM data in GA4. Which source has the best signup rate?' },
      { id: 'w4_transition', channel: 'email_outreach' as Channel, text: 'If approaching 50 early adopters: plan transition to direct registration', tip: 'Update landing page CTA, adjust email sequences, celebrate the milestone!' },
    ],
  },
];

const ALL_TASKS = PLAYBOOK_WEEKS.flatMap(w => w.tasks);

const CONTACT_STATUSES = [
  { value: 'not_contacted', label: 'Not Contacted', color: 'text-[#6B8A9A] bg-[#6B8A9A]/10' },
  { value: 'emailed', label: 'Emailed', color: 'text-[#F5A623] bg-[#F5A623]/10' },
  { value: 'meeting_scheduled', label: 'Meeting', color: 'text-[#3DAA8A] bg-[#3DAA8A]/10' },
  { value: 'active_partner', label: 'Active Partner', color: 'text-emerald-400 bg-emerald-400/10' },
];

const ATTORNEY_TEMPLATE = `Subject: Free tool for your co-parenting clients (no cost to your practice)

Hi [Name],

I'm Thomas, a co-parent who built CommonGround — an AI-powered platform that helps separated parents communicate calmly, automate scheduling, and generate court-ready documentation with SHA-256 tamper verification.

It's free for your clients (and your practice). The professional portal gives you compliance dashboards and evidence exports at no cost.

Can I show you in 15 minutes?

Best,
Thomas Wilform
Founder, CommonGround
find-commonground.com/professionals`;

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

export default function GTMCommandCenter() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [expandedWeek, setExpandedWeek] = useState<string>('week1');
  const [copied, setCopied] = useState<string | null>(null);

  // Draft form
  const [showDraftForm, setShowDraftForm] = useState(false);
  const [editDraftId, setEditDraftId] = useState<string | null>(null);
  const [draftChannel, setDraftChannel] = useState<Channel>('reddit');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftFilter, setDraftFilter] = useState<Channel | 'all'>('all');

  // Contact form
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactType, setContactType] = useState<Contact['type']>('attorney');
  const [contactEmail, setContactEmail] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  // Metrics
  const [campaignCount, setCampaignCount] = useState(0);
  const [lpCount, setLpCount] = useState(0);

  // Integration status (Wave 5 + SuperAdmin reliability fix). Without this
  // the page used to show "0 campaigns / 0 landing pages" when the Reddit
  // table was never migrated — no setup guidance, just misleading zeros.
  type RedditStatus = {
    table_ready?: boolean;
    configured?: boolean;
    connected?: boolean;
    reason?: string;
    message?: string;
  };
  const [redditStatus, setRedditStatus] = useState<RedditStatus | null>(null);
  const [redditStatusLoaded, setRedditStatusLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await adminAPI.getRedditStatus();
        if (!cancelled) setRedditStatus(s as RedditStatus);
      } catch {
        if (!cancelled) setRedditStatus({ table_ready: false, reason: 'unknown' });
      } finally {
        if (!cancelled) setRedditStatusLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Load / Save ──
  useEffect(() => {
    try {
      const p = localStorage.getItem(STORAGE.playbook);
      if (p) { const parsed = JSON.parse(p); setCheckedTasks(parsed.checked || {}); setTaskNotes(parsed.notes || {}); }
      const d = localStorage.getItem(STORAGE.drafts);
      if (d) setDrafts(JSON.parse(d));
      const o = localStorage.getItem(STORAGE.outreach);
      if (o) setContacts(JSON.parse(o));
      const a = localStorage.getItem(STORAGE.activity);
      if (a) setActivity(JSON.parse(a));
    } catch {}
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE.playbook, JSON.stringify({ checked: checkedTasks, notes: taskNotes })); }, [checkedTasks, taskNotes]);
  useEffect(() => { localStorage.setItem(STORAGE.drafts, JSON.stringify(drafts)); }, [drafts]);
  useEffect(() => { localStorage.setItem(STORAGE.outreach, JSON.stringify(contacts)); }, [contacts]);
  useEffect(() => { localStorage.setItem(STORAGE.activity, JSON.stringify(activity)); }, [activity]);

  // Fetch API metrics
  useEffect(() => {
    (async () => {
      try {
        const campaigns = await adminAPI.getCampaigns();
        if (Array.isArray(campaigns)) setCampaignCount(campaigns.length);
      } catch {}
      try {
        const lps = await adminAPI.getLandingPages();
        if (Array.isArray(lps)) setLpCount(lps.length);
      } catch {}
    })();
  }, []);

  const logActivity = (action: string, channel: string) => {
    const item: ActivityItem = { id: Date.now().toString(), action, channel, timestamp: new Date().toISOString() };
    setActivity(prev => [item, ...prev].slice(0, 50));
  };

  // ── Playbook ──
  const toggleTask = (taskId: string) => {
    const newState = !checkedTasks[taskId];
    setCheckedTasks(prev => ({ ...prev, [taskId]: newState }));
    if (newState) logActivity('Completed task', taskId);
  };

  const completedCount = ALL_TASKS.filter(t => checkedTasks[t.id]).length;
  const totalTasks = ALL_TASKS.length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // ── Drafts ──
  const saveDraft = () => {
    if (!draftBody.trim()) return;
    if (editDraftId) {
      setDrafts(prev => prev.map(d => d.id === editDraftId ? { ...d, channel: draftChannel, title: draftTitle, body: draftBody } : d));
      logActivity(`Edited ${draftChannel} draft`, draftChannel);
    } else {
      const newDraft: Draft = { id: Date.now().toString(), channel: draftChannel, title: draftTitle, body: draftBody, status: 'draft', createdAt: new Date().toISOString() };
      setDrafts(prev => [newDraft, ...prev]);
      logActivity(`Created ${draftChannel} draft`, draftChannel);
    }
    setDraftTitle(''); setDraftBody(''); setShowDraftForm(false); setEditDraftId(null);
  };

  const markPosted = (id: string) => {
    const draft = drafts.find(d => d.id === id);
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: 'posted', postedAt: new Date().toISOString() } : d));
    if (draft) logActivity(`Posted ${draft.channel} content`, draft.channel);
  };

  const filteredDrafts = draftFilter === 'all' ? drafts : drafts.filter(d => d.channel === draftFilter);
  const draftCounts = CHANNELS.reduce((acc, c) => { acc[c.id] = drafts.filter(d => d.channel === c.id).length; return acc; }, {} as Record<string, number>);
  const postedCounts = CHANNELS.reduce((acc, c) => { acc[c.id] = drafts.filter(d => d.channel === c.id && d.status === 'posted').length; return acc; }, {} as Record<string, number>);

  // ── Contacts ──
  const addContact = () => {
    if (!contactName.trim() || !contactEmail.trim()) return;
    const c: Contact = { id: Date.now().toString(), name: contactName, type: contactType, email: contactEmail, status: 'not_contacted', lastContact: '', notes: contactNotes };
    setContacts(prev => [c, ...prev]);
    logActivity(`Added ${contactType}: ${contactName}`, 'outreach');
    setContactName(''); setContactEmail(''); setContactNotes(''); setShowContactForm(false);
  };

  const updateContactStatus = (id: string, status: Contact['status']) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, status, lastContact: new Date().toISOString() } : c));
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getChannelInfo = (id: Channel | string) => CHANNELS.find(c => c.id === id) || CHANNELS[0];
  const timeAgo = (iso: string) => {
    if (!iso) return '';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: BarChart3 },
    { id: 'playbook' as Tab, label: 'Playbook', icon: Target },
    { id: 'studio' as Tab, label: 'Content Studio', icon: Pencil },
    { id: 'outreach' as Tab, label: 'Outreach', icon: Briefcase },
    { id: 'metrics' as Tab, label: 'Metrics', icon: TrendingUp },
  ];

  const tableMissing = redditStatusLoaded && redditStatus?.table_ready === false;
  const credsMissing =
    redditStatusLoaded && redditStatus?.table_ready && !redditStatus?.configured;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Rocket className="w-6 h-6 text-[#3DAA8A]" />
            GTM Command Center
          </h1>
          <p className="text-sm text-[#8AACBC] mt-1">Plan, create, track — all your go-to-market activities in one place</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#3DAA8A]/15 text-[#5BC4A0] text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" />
          {completedCount}/{totalTasks} tasks ({progressPct}%)
        </div>
      </div>

      {/* Reddit integration status banner. Playbook / drafts / outreach work
          offline (localStorage) regardless — the banner only warns that the
          Reddit-powered widgets and the API-driven metrics won't populate
          until the migration + credentials are in place. */}
      {tableMissing && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-100 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
          <div className="flex-1">
            <p className="font-semibold">Reddit integration not set up.</p>
            <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
              The <code>reddit_config</code> table isn&apos;t migrated on this environment, so the
              Reddit browsing, commenting, and tracked-subreddit widgets won&apos;t load.
              Run the reddit_config migration against the database to enable them. The
              playbook, drafts, and outreach tabs below keep working offline (localStorage).
            </p>
          </div>
        </div>
      )}
      {credsMissing && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-[#3DAA8A]/30 bg-[#3DAA8A]/5 text-[#D0E4EC] text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-[#3DAA8A]" />
          <div className="flex-1">
            <p className="font-semibold">Reddit credentials missing.</p>
            <p className="text-xs text-[#8AACBC] mt-1 leading-relaxed">
              The table is ready but no client_id / client_secret / username / password
              stored yet. Open the Reddit settings form to add credentials — until then,
              subreddit browsing is disabled.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-[#3DAA8A]/15 text-[#5BC4A0]' : 'text-[#8AACBC] hover:bg-[#2D6A8F]/15'}`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════ DASHBOARD TAB ══════ */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Progress */}
          <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#D0E4EC]">GTM Playbook Progress</span>
              <span className="text-xs text-[#6B8A9A]">{completedCount} of {totalTasks} tasks</span>
            </div>
            <div className="h-3 bg-[#162D3A] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#3DAA8A] to-[#5BC4A0] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex gap-4 mt-3">
              {PLAYBOOK_WEEKS.map(w => {
                const wDone = w.tasks.filter(t => checkedTasks[t.id]).length;
                return (
                  <div key={w.id} className="flex-1 text-center">
                    <div className="text-xs text-[#6B8A9A]">{w.title.split(' — ')[0]}</div>
                    <div className={`text-sm font-medium ${wDone === w.tasks.length ? 'text-emerald-400' : 'text-[#D0E4EC]'}`}>{wDone}/{w.tasks.length}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Channel Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Reddit', icon: MessageCircle, color: '#FF4500', stat: `${draftCounts.reddit || 0} drafts, ${postedCounts.reddit || 0} posted`, link: 'studio' },
              { label: 'Blog', icon: FileText, color: '#3DAA8A', stat: 'View posts', link: '/superadmin/blog' },
              { label: 'Email Campaigns', icon: Mail, color: '#F5A623', stat: `${campaignCount} campaigns`, link: '/superadmin/leads/campaigns' },
              { label: 'Landing Pages', icon: Globe, color: '#2D6A8F', stat: `${lpCount} pages`, link: '/superadmin/leads/landing-pages' },
              { label: 'LinkedIn', icon: Linkedin, color: '#0A66C2', stat: `${draftCounts.linkedin || 0} drafts, ${postedCounts.linkedin || 0} posted`, link: 'studio' },
              { label: 'Outreach', icon: Briefcase, color: '#8AACBC', stat: `${contacts.length} contacts, ${contacts.filter(c => c.status === 'active_partner').length} partners`, link: 'outreach' },
            ].map(card => (
              <button
                key={card.label}
                onClick={() => {
                  if (card.link === 'studio') setActiveTab('studio');
                  else if (card.link === 'outreach') setActiveTab('outreach');
                  else window.location.href = card.link;
                }}
                className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-4 text-left hover:border-[#3DAA8A]/30 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className="w-5 h-5" style={{ color: card.color }} />
                  <span className="text-sm font-medium text-[#D0E4EC]">{card.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#4A6E7F] ml-auto group-hover:text-[#5BC4A0] transition-colors" />
                </div>
                <p className="text-xs text-[#6B8A9A]">{card.stat}</p>
              </button>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#D0E4EC] mb-3">Recent Activity</h3>
            {activity.length === 0 ? (
              <p className="text-xs text-[#6B8A9A]">No activity yet. Start by checking off playbook tasks!</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {activity.slice(0, 10).map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3DAA8A]" />
                    <span className="text-[#D0E4EC]">{a.action}</span>
                    <span className="text-[#4A6E7F] ml-auto">{timeAgo(a.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ PLAYBOOK TAB ══════ */}
      {activeTab === 'playbook' && (
        <div className="space-y-4">
          {PLAYBOOK_WEEKS.map(week => {
            const wDone = week.tasks.filter(t => checkedTasks[t.id]).length;
            const isExpanded = expandedWeek === week.id;
            return (
              <div key={week.id} className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl overflow-hidden">
                <button onClick={() => setExpandedWeek(isExpanded ? '' : week.id)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#2D6A8F]/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${wDone === week.tasks.length ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#3DAA8A]/15 text-[#5BC4A0]'}`}>
                      {wDone}/{week.tasks.length}
                    </span>
                    <div className="text-left">
                      <span className="text-sm font-medium text-[#D0E4EC]">{week.title}</span>
                      <p className="text-xs text-[#6B8A9A]">{week.subtitle}</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-[#6B8A9A]" /> : <ChevronDown className="w-4 h-4 text-[#6B8A9A]" />}
                </button>
                {isExpanded && (
                  <div className="border-t border-[#2D6A8F]/20 px-5 py-4 space-y-3">
                    {week.tasks.map(task => {
                      const ch = getChannelInfo(task.channel);
                      const done = !!checkedTasks[task.id];
                      return (
                        <div key={task.id} className={`rounded-lg p-3 transition-colors ${done ? 'bg-emerald-500/5' : 'bg-[#2D6A8F]/10'}`}>
                          <div className="flex items-start gap-3">
                            <button onClick={() => toggleTask(task.id)} className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${done ? 'bg-emerald-500 border-emerald-500' : 'border-[#4A6E7F] hover:border-[#3DAA8A]'}`}>
                              {done && <Check className="w-3 h-3 text-white" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <ch.icon className="w-3.5 h-3.5" style={{ color: ch.color }} />
                                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: ch.color }}>{ch.label}</span>
                              </div>
                              <p className={`text-sm ${done ? 'text-[#6B8A9A] line-through' : 'text-[#D0E4EC]'}`}>{task.text}</p>
                              {task.tip && (
                                <p className="text-xs text-[#4A6E7F] mt-1 italic">{task.tip}</p>
                              )}
                              {/* Note input */}
                              <input
                                type="text"
                                placeholder="Add a note..."
                                value={taskNotes[task.id] || ''}
                                onChange={(e) => setTaskNotes(prev => ({ ...prev, [task.id]: e.target.value }))}
                                className="mt-2 w-full px-2.5 py-1 rounded bg-[#162D3A]/60 border border-[#2D6A8F]/20 text-xs text-[#8AACBC] placeholder-[#4A6E7F] focus:outline-none focus:border-[#3DAA8A]/40"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════ CONTENT STUDIO TAB ══════ */}
      {activeTab === 'studio' && (
        <div className="space-y-4">
          {/* Channel filter */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setDraftFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${draftFilter === 'all' ? 'bg-[#3DAA8A]/15 text-[#5BC4A0]' : 'text-[#8AACBC] hover:bg-[#2D6A8F]/15'}`}>
              All ({drafts.length})
            </button>
            {CHANNELS.map(ch => {
              const count = draftCounts[ch.id] || 0;
              if (count === 0 && draftFilter !== ch.id) return null;
              return (
                <button key={ch.id} onClick={() => setDraftFilter(ch.id)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${draftFilter === ch.id ? 'bg-[#3DAA8A]/15 text-[#5BC4A0]' : 'text-[#8AACBC] hover:bg-[#2D6A8F]/15'}`}>
                  <ch.icon className="w-3 h-3" />
                  {ch.label} ({count})
                </button>
              );
            })}
          </div>

          {/* New draft button */}
          {!showDraftForm && !editDraftId && (
            <button onClick={() => { setShowDraftForm(true); setDraftBody(''); setDraftTitle(''); }} className="flex items-center gap-2 px-4 py-3 w-full rounded-xl border-2 border-dashed border-[#2D6A8F]/30 text-[#8AACBC] hover:border-[#3DAA8A]/50 hover:text-[#5BC4A0] transition-colors">
              <Plus className="w-5 h-5" />
              New Draft
            </button>
          )}

          {/* Draft form */}
          {(showDraftForm || editDraftId) && (
            <div className="bg-[#1A3648]/60 border border-[#3DAA8A]/30 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-[#D0E4EC]">{editDraftId ? 'Edit Draft' : 'New Draft'}</h3>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map(ch => (
                  <button key={ch.id} onClick={() => setDraftChannel(ch.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${draftChannel === ch.id ? 'ring-2 ring-[#3DAA8A]/50 bg-[#3DAA8A]/10 text-[#5BC4A0]' : 'bg-[#2D6A8F]/15 text-[#8AACBC] hover:bg-[#2D6A8F]/25'}`}>
                    <ch.icon className="w-3.5 h-3.5" style={{ color: draftChannel === ch.id ? ch.color : undefined }} />
                    {ch.label}
                  </button>
                ))}
              </div>
              {['blog', 'reddit', 'linkedin'].includes(draftChannel) && (
                <input type="text" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Title (optional)" className="w-full px-3 py-2 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-sm text-[#D0E4EC] placeholder-[#6B8A9A] focus:outline-none focus:border-[#3DAA8A]/50" />
              )}
              <textarea value={draftBody} onChange={(e) => setDraftBody(e.target.value)} placeholder="Write your content..." rows={6} className="w-full px-3 py-2 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-sm text-[#D0E4EC] placeholder-[#6B8A9A] focus:outline-none focus:border-[#3DAA8A]/50 resize-none" />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowDraftForm(false); setEditDraftId(null); setDraftTitle(''); setDraftBody(''); }} className="px-3 py-1.5 rounded-lg text-xs text-[#8AACBC] hover:bg-[#2D6A8F]/20">Cancel</button>
                <button onClick={saveDraft} disabled={!draftBody.trim()} className="px-4 py-1.5 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-xs font-medium disabled:opacity-50 transition-colors">
                  {editDraftId ? 'Update' : 'Save Draft'}
                </button>
              </div>
            </div>
          )}

          {/* Draft list */}
          {filteredDrafts.length === 0 && !showDraftForm ? (
            <div className="flex flex-col items-center py-16">
              <Pencil className="w-10 h-10 text-[#3A5A6A] mb-3" />
              <p className="text-[#6B8A9A] text-sm">No drafts yet. Create content for any channel!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDrafts.map(draft => {
                const ch = getChannelInfo(draft.channel);
                return (
                  <div key={draft.id} className={`bg-[#1A3648]/60 border rounded-xl p-4 ${draft.status === 'posted' ? 'border-emerald-500/20 opacity-70' : 'border-[#2D6A8F]/20'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <ch.icon className="w-3.5 h-3.5" style={{ color: ch.color }} />
                          <span className="text-[10px] font-medium uppercase" style={{ color: ch.color }}>{ch.label}</span>
                          {draft.status === 'posted' && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px]"><Check className="w-3 h-3" /> Posted</span>}
                          <span className="text-[10px] text-[#4A6E7F]">{timeAgo(draft.createdAt)}</span>
                        </div>
                        {draft.title && <h3 className="text-sm font-medium text-[#D0E4EC] mb-1">{draft.title}</h3>}
                        <p className="text-xs text-[#8AACBC] line-clamp-3 whitespace-pre-wrap">{draft.body}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-3">
                        <button onClick={() => copyText(draft.title ? `${draft.title}\n\n${draft.body}` : draft.body, draft.id)} className="p-1.5 rounded-lg hover:bg-[#2D6A8F]/20 text-[#6B8A9A] hover:text-[#5BC4A0]" title="Copy">
                          {copied === draft.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        {draft.status === 'draft' && (
                          <>
                            <button onClick={() => markPosted(draft.id)} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-[#6B8A9A] hover:text-emerald-400" title="Mark posted">
                              <Send className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setEditDraftId(draft.id); setDraftChannel(draft.channel); setDraftTitle(draft.title); setDraftBody(draft.body); }} className="p-1.5 rounded-lg hover:bg-[#2D6A8F]/20 text-[#6B8A9A] hover:text-[#8AACBC]" title="Edit">
                              <Pencil className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => setDrafts(prev => prev.filter(d => d.id !== draft.id))} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#6B8A9A] hover:text-red-400" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════ OUTREACH TAB ══════ */}
      {activeTab === 'outreach' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Contacts', value: contacts.length, icon: Users, color: '#8AACBC' },
              { label: 'Emailed', value: contacts.filter(c => c.status !== 'not_contacted').length, icon: Mail, color: '#F5A623' },
              { label: 'Meetings', value: contacts.filter(c => c.status === 'meeting_scheduled').length, icon: Clock, color: '#3DAA8A' },
              { label: 'Partners', value: contacts.filter(c => c.status === 'active_partner').length, icon: CheckCircle2, color: '#5BC4A0' },
            ].map(card => (
              <div key={card.label} className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className="w-4 h-4" style={{ color: card.color }} />
                  <span className="text-xs text-[#6B8A9A]">{card.label}</span>
                </div>
                <div className="text-2xl font-bold text-white">{card.value}</div>
              </div>
            ))}
          </div>

          {/* Email template */}
          <div className="bg-[#1A3648]/60 border border-[#F5A623]/20 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[#D0E4EC]">Attorney Outreach Template</h3>
              <button onClick={() => copyText(ATTORNEY_TEMPLATE, 'template')} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5A623]/10 text-[#F5A623] text-xs hover:bg-[#F5A623]/20">
                {copied === 'template' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied === 'template' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-xs text-[#8AACBC] whitespace-pre-wrap font-sans">{ATTORNEY_TEMPLATE}</pre>
          </div>

          {/* Add contact */}
          {!showContactForm ? (
            <button onClick={() => setShowContactForm(true)} className="flex items-center gap-2 px-4 py-3 w-full rounded-xl border-2 border-dashed border-[#2D6A8F]/30 text-[#8AACBC] hover:border-[#3DAA8A]/50 hover:text-[#5BC4A0] transition-colors">
              <Plus className="w-5 h-5" />
              Add Contact
            </button>
          ) : (
            <div className="bg-[#1A3648]/60 border border-[#3DAA8A]/30 rounded-xl p-5 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Name" className="px-3 py-2 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-sm text-[#D0E4EC] placeholder-[#6B8A9A] focus:outline-none focus:border-[#3DAA8A]/50" />
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email" className="px-3 py-2 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-sm text-[#D0E4EC] placeholder-[#6B8A9A] focus:outline-none focus:border-[#3DAA8A]/50" />
                <select value={contactType} onChange={(e) => setContactType(e.target.value as Contact['type'])} className="px-3 py-2 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-sm text-[#D0E4EC]">
                  <option value="attorney">Attorney</option>
                  <option value="mediator">Mediator</option>
                  <option value="therapist">Therapist</option>
                  <option value="coach">Coach</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <input type="text" value={contactNotes} onChange={(e) => setContactNotes(e.target.value)} placeholder="Notes (optional)" className="w-full px-3 py-2 rounded-lg bg-[#162D3A] border border-[#2D6A8F]/30 text-sm text-[#D0E4EC] placeholder-[#6B8A9A] focus:outline-none focus:border-[#3DAA8A]/50" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowContactForm(false)} className="px-3 py-1.5 rounded-lg text-xs text-[#8AACBC]">Cancel</button>
                <button onClick={addContact} disabled={!contactName.trim() || !contactEmail.trim()} className="px-4 py-1.5 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-xs font-medium disabled:opacity-50">Add Contact</button>
              </div>
            </div>
          )}

          {/* Contact list */}
          {contacts.length > 0 && (
            <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl overflow-hidden">
              <div className="grid grid-cols-6 gap-0 text-[10px] font-medium text-[#6B8A9A] uppercase tracking-wider bg-[#162D3A] px-5 py-3">
                <span>Name</span><span>Type</span><span>Email</span><span>Status</span><span>Last Contact</span><span>Notes</span>
              </div>
              {contacts.map((c, i) => {
                const statusInfo = CONTACT_STATUSES.find(s => s.value === c.status)!;
                return (
                  <div key={c.id} className={`grid grid-cols-6 gap-0 items-center px-5 py-3 border-t border-[#2D6A8F]/10 ${i % 2 ? 'bg-[#162D3A]/30' : ''}`}>
                    <span className="text-sm text-[#D0E4EC]">{c.name}</span>
                    <span className="text-xs text-[#8AACBC] capitalize">{c.type}</span>
                    <span className="text-xs text-[#6B8A9A] truncate">{c.email}</span>
                    <div>
                      <select value={c.status} onChange={(e) => updateContactStatus(c.id, e.target.value as Contact['status'])} className={`px-2 py-0.5 rounded-full text-[10px] font-medium border-0 ${statusInfo.color}`}>
                        {CONTACT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <span className="text-xs text-[#4A6E7F]">{c.lastContact ? timeAgo(c.lastContact) : '—'}</span>
                    <span className="text-xs text-[#6B8A9A] truncate">{c.notes || '—'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════ METRICS TAB ══════ */}
      {activeTab === 'metrics' && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Playbook Progress', value: `${progressPct}%`, sub: `${completedCount}/${totalTasks} tasks`, icon: Target, color: '#3DAA8A' },
              { label: 'Content Created', value: drafts.length.toString(), sub: `${drafts.filter(d => d.status === 'posted').length} posted`, icon: Pencil, color: '#F5A623' },
              { label: 'Campaigns', value: campaignCount.toString(), sub: 'total', icon: Mail, color: '#5BC4A0' },
              { label: 'Contacts', value: contacts.length.toString(), sub: `${contacts.filter(c => c.status === 'active_partner').length} partners`, icon: Briefcase, color: '#2D6A8F' },
            ].map(card => (
              <div key={card.label} className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className="w-4 h-4" style={{ color: card.color }} />
                  <span className="text-xs text-[#6B8A9A]">{card.label}</span>
                </div>
                <div className="text-2xl font-bold text-white">{card.value}</div>
                <div className="text-xs text-[#4A6E7F]">{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Channel performance */}
          <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl overflow-hidden">
            <h3 className="text-sm font-semibold text-[#D0E4EC] px-5 pt-4 pb-2">Channel Performance</h3>
            <div className="grid grid-cols-4 gap-0 text-[10px] font-medium text-[#6B8A9A] uppercase tracking-wider bg-[#162D3A] px-5 py-2">
              <span>Channel</span><span className="text-center">Drafted</span><span className="text-center">Posted</span><span className="text-center">Status</span>
            </div>
            {CHANNELS.map((ch, i) => {
              const drafted = draftCounts[ch.id] || 0;
              const posted = postedCounts[ch.id] || 0;
              return (
                <div key={ch.id} className={`grid grid-cols-4 gap-0 items-center px-5 py-2.5 border-t border-[#2D6A8F]/10 ${i % 2 ? 'bg-[#162D3A]/30' : ''}`}>
                  <div className="flex items-center gap-2">
                    <ch.icon className="w-4 h-4" style={{ color: ch.color }} />
                    <span className="text-sm text-[#D0E4EC]">{ch.label}</span>
                  </div>
                  <span className="text-sm text-center text-[#8AACBC]">{drafted}</span>
                  <span className="text-sm text-center text-[#8AACBC]">{posted}</span>
                  <div className="flex justify-center">
                    {posted > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px]">Active</span>
                    ) : drafted > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#F5A623]/15 text-[#F5A623] text-[10px]">In Progress</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-[#6B8A9A]/15 text-[#6B8A9A] text-[10px]">Not Started</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'View Growth Dashboard', href: '/superadmin/growth', icon: TrendingUp },
              { label: 'View Leads Pipeline', href: '/superadmin/leads', icon: Users },
              { label: 'View Blog Posts', href: '/superadmin/blog', icon: FileText },
            ].map(link => (
              <a key={link.label} href={link.href} className="flex items-center gap-2 px-4 py-3 bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl text-[#8AACBC] hover:text-[#5BC4A0] hover:border-[#3DAA8A]/30 transition-colors text-sm">
                <link.icon className="w-4 h-4" />
                {link.label}
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
