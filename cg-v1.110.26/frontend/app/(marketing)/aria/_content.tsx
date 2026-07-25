'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  Gift,
  Heart,
  Lock,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  X,
  Zap,
  AlertTriangle,
  BarChart3,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { EarlyAdopterForm } from '@/components/marketing/early-adopter-form';
import { BrandIcon, type BrandIconName } from '@/components/brand/brand-icon';
import { fallbackAnalyze, fallbackCoparentReply } from '@/components/marketing/aria-demo-fallback';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ARIAAnalysis {
  toxicity_level: string;
  toxicity_score: number;
  categories: string[];
  triggers: string[];
  explanation: string;
  suggestion: string | null;
  is_flagged: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'coparent';
  text: string;
  original?: string;
  ariaAnalysis?: ARIAAnalysis;
  timestamp: Date;
}

interface Intervention {
  original: string;
  suggestion: string;
  categories: string[];
  accepted: boolean;
  score: number;
}

type Scenario = 'schedule' | 'medical' | 'financial' | 'holiday' | 'communication' | 'new_partner';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

let _apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
if (_apiUrl.endsWith('/')) _apiUrl = _apiUrl.slice(0, -1);
if (!_apiUrl.endsWith('/api/v1')) _apiUrl += '/api/v1';
const API_URL = _apiUrl;

const SCENARIOS: { key: Scenario; label: string; description: string; icon?: React.ElementType; brandIcon?: BrandIconName; opener: string }[] = [
  { key: 'schedule', label: 'Schedule Dispute', description: 'Pickup, drop-off, last-minute changes', brandIcon: 'timebridge', opener: "We need to talk about the schedule. You keep messing it up and honestly the kids are done with it. Get it together." },
  { key: 'medical', label: 'Medical Decisions', description: 'Doctor visits, meds, insurance', icon: Stethoscope, opener: "I took the kids to the doctor today. I'm making the decisions since you clearly can't be bothered to show up." },
  { key: 'financial', label: 'Money & Expenses', description: 'Support, shared costs', brandIcon: 'clearfund', opener: "Where's this month's payment?? You're always late. The kids need things and you can't even handle basic responsibilities." },
  { key: 'holiday', label: 'Holiday Planning', description: 'Who gets the kids, vacations', icon: Gift, opener: "I'm keeping the kids for Thanksgiving. They already told me they'd rather be here. Don't make this into a thing." },
  { key: 'communication', label: 'Boundaries', description: 'Response times, contact rules', brandIcon: 'aria', opener: "Stop texting me every 5 minutes. I'll respond when I feel like it. You're not that important." },
  { key: 'new_partner', label: 'New Partner', description: 'Introducing someone new', icon: Heart, opener: "I heard you have someone new around MY kids. We need to talk about that right now. This is not okay." },
];

const CATEGORY_COLORS: Record<string, string> = {
  hostility: '#ef4444', blame: '#f97316', passive_aggressive: '#f59e0b',
  manipulation: '#8b5cf6', dismissive: '#6b7280', threatening: '#dc2626',
  profanity: '#e11d48', custody_weaponization: '#b91c1c', financial_coercion: '#d97706',
  hate_speech: '#7f1d1d', sexual_harassment: '#9f1239', insult: '#ea580c',
  sarcasm: '#a3a3a3', all_caps: '#fbbf24',
};

const CATEGORY_LABELS: Record<string, string> = {
  hostility: 'Hostility', blame: 'Blame & Gaslighting', passive_aggressive: 'Passive Aggressive',
  manipulation: 'Manipulation', dismissive: 'Dismissive', threatening: 'Threatening',
  profanity: 'Profanity', custody_weaponization: 'Custody Weaponization',
  financial_coercion: 'Financial Coercion', hate_speech: 'Hate Speech',
  sexual_harassment: 'Sexual Harassment', insult: 'Insult', sarcasm: 'Sarcasm', all_caps: 'Aggressive Tone',
};

const ARIA_TAUNTS = [
  "Nice try! ARIA saw that coming.",
  "Caught! ARIA's been training hard.",
  "That was textbook. Try something creative!",
  "ARIA: 1 point. Your move.",
  "Not bad, but ARIA's seen pettier.",
  "ARIA's trained on real co-parenting messages.",
  "Good effort! Try again.",
  "You'll have to do better than that!",
  "ARIA's pattern library says hi.",
  "Predictable. Try a different angle!",
];

const beforeAfter = [
  { before: 'You NEVER follow the schedule. The kids are sick of your crap.', after: 'I noticed the last two pickups were different from what we agreed. Can we find a time that works better?' },
  { before: 'This is ALL your fault. You always do this.', after: 'This situation is frustrating. Let\'s focus on what we can do going forward.' },
  { before: 'I guess you just don\'t care about the kids.', after: 'I want to make sure the kids have what they need. Here\'s what I\'m thinking.' },
  { before: 'My lawyer is going to hear about this. You\'re done.', after: 'I\'d like to document this concern. Can we discuss a solution first?' },
];

// ---------------------------------------------------------------------------
// Animated counter hook
// ---------------------------------------------------------------------------
function useCountUp(target: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(!startOnView);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [startOnView]);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(id); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [started, target, duration]);

  return { count, ref };
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function analyzeMessage(content: string, conversationHistory?: { role: string; text: string }[], forceRewrite = false): Promise<ARIAAnalysis> {
  const res = await fetch(`${API_URL}/demo/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, conversation_history: conversationHistory || [], force_rewrite: forceRewrite }),
  });
  if (!res.ok) throw new Error('Analysis failed');
  return res.json();
}

async function getCoparentReply(
  scenario: string,
  conversationHistory: { role: string; text: string }[],
  userMessage: string,
  ariaEnabled: boolean,
): Promise<{ reply: string; aria_analysis: ARIAAnalysis; rewritten_reply: string | null }> {
  const res = await fetch(`${API_URL}/demo/coparent-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario, conversation_history: conversationHistory, user_message: userMessage, aria_enabled: ariaEnabled }),
  });
  if (!res.ok) throw new Error('Reply generation failed');
  return res.json();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ARIAContent() {
  // State
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [ariaEnabled, setAriaEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [pendingIntervention, setPendingIntervention] = useState<{
    analysis: ARIAAnalysis;
    originalText: string;
  } | null>(null);
  const [ariaScore, setAriaScore] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [currentTaunt, setCurrentTaunt] = useState('');
  const [hoveredBA, setHoveredBA] = useState<number | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const challengeRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Animated counters
  const patterns = useCountUp(1800, 2000);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  useEffect(() => {
    if (!pendingIntervention && scenario) inputRef.current?.focus({ preventScroll: true });
  }, [pendingIntervention, scenario]);

  const scrollToChallenge = () => challengeRef.current?.scrollIntoView({ behavior: 'smooth' });
  const getRandomTaunt = () => ARIA_TAUNTS[Math.floor(Math.random() * ARIA_TAUNTS.length)];

  const handleSelectScenario = (s: Scenario) => {
    const sc = SCENARIOS.find(x => x.key === s)!;
    setScenario(s);
    setMessages([]);
    setInterventions([]);
    setShowReport(false);
    setPendingIntervention(null);
    setAriaScore(0);
    setUserScore(0);
    setCurrentTaunt('');
    setMessages([{ id: crypto.randomUUID(), role: 'coparent', text: sc.opener, timestamp: new Date() }]);
    setTimeout(() => challengeRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendMessage = useCallback(async (text: string, isRewrite: boolean = false, originalText?: string) => {
    if (!scenario || !text.trim()) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(), role: 'user', text,
      original: isRewrite ? originalText : undefined,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
    setInputText('');
    setIsLoading(true);

    try {
      const history = [...messages, msg].map(m => ({ role: m.role, text: m.text }));
      let result;
      try {
        result = await getCoparentReply(scenario, history, text, ariaEnabled);
      } catch (err) {
        // Backend unreachable — keep the demo alive with a local simulation.
        console.error('Falling back to offline demo reply:', err);
        result = fallbackCoparentReply(scenario, history, text, ariaEnabled);
        setOfflineMode(true);
      }

      const coparentMsg: ChatMessage = {
        id: crypto.randomUUID(), role: 'coparent',
        text: ariaEnabled && result.rewritten_reply ? result.rewritten_reply : result.reply,
        original: ariaEnabled && result.rewritten_reply ? result.reply : undefined,
        ariaAnalysis: result.aria_analysis,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, coparentMsg]);

      if (result.aria_analysis.is_flagged && result.rewritten_reply) {
        setInterventions(prev => [...prev, {
          original: result.reply, suggestion: result.rewritten_reply!,
          categories: result.aria_analysis.categories, accepted: ariaEnabled,
          score: result.aria_analysis.toxicity_score,
        }]);
      }
    } finally {
      setIsLoading(false);
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [scenario, messages, ariaEnabled]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    if (ariaEnabled) {
      const history = messages.slice(-6).map(m => ({ role: m.role, text: m.text }));
      let analysis;
      try {
        analysis = await analyzeMessage(inputText, history, true);
      } catch (err) {
        // Backend unreachable — analyze locally so ARIA still catches it.
        console.error('Falling back to offline demo analysis:', err);
        analysis = fallbackAnalyze(inputText, true);
        setOfflineMode(true);
      }
      if (analysis.suggestion) {
        setAriaScore(prev => prev + 1);
        setCurrentTaunt(getRandomTaunt());
        await sendMessage(analysis.suggestion, true, inputText);
        return;
      }
    }

    setUserScore(prev => prev + 1);
    await sendMessage(inputText);
  };

  const handleAcceptSuggestion = async () => {
    if (!pendingIntervention) return;
    const { analysis, originalText } = pendingIntervention;
    setInterventions(prev => [...prev, {
      original: originalText, suggestion: analysis.suggestion!,
      categories: analysis.categories, accepted: true, score: analysis.toxicity_score,
    }]);
    setPendingIntervention(null);
    await sendMessage(analysis.suggestion!, true, originalText);
  };

  const handleSendOriginal = async () => {
    if (!pendingIntervention) return;
    const { analysis, originalText } = pendingIntervention;
    setInterventions(prev => [...prev, {
      original: originalText, suggestion: analysis.suggestion!,
      categories: analysis.categories, accepted: false, score: analysis.toxicity_score,
    }]);
    setPendingIntervention(null);
    await sendMessage(originalText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Report data
  const totalMessages = messages.length;
  const totalInterventions = interventions.length;
  const acceptedInterventions = interventions.filter(i => i.accepted).length;
  const acceptanceRate = totalInterventions > 0 ? Math.round((acceptedInterventions / totalInterventions) * 100) : 0;

  const categoryBreakdown = interventions.reduce<Record<string, number>>((acc, i) => {
    i.categories.forEach(c => { acc[c] = (acc[c] || 0) + 1; });
    return acc;
  }, {});

  const chartData = Object.entries(categoryBreakdown)
    .map(([category, count]) => ({
      category: CATEGORY_LABELS[category] || category, count,
      fill: CATEGORY_COLORS[category] || '#6b7280',
    }))
    .sort((a, b) => b.count - a.count);

  const scoreTimeline = messages
    .filter(m => m.ariaAnalysis)
    .map((m, i) => ({ message: i + 1, score: Math.round((m.ariaAnalysis!.toxicity_score) * 100) }));

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="min-h-screen bg-background">

      {/* ================================================================= */}
      {/* HERO                                                               */}
      {/* ================================================================= */}
      <section className="relative pt-20 pb-24 lg:pt-28 lg:pb-32 overflow-hidden">
        {/* Mesh-style gradient background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-[500px] h-[500px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, var(--cg-sage) 0%, transparent 70%)' }} />
          <div className="absolute top-1/2 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, var(--cg-amber) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-32 left-1/3 w-[400px] h-[400px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, var(--cg-slate) 0%, transparent 70%)' }} />
          {/* Subtle grid texture */}
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, var(--foreground) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          {/* Floating badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white rounded-full shadow-sm border border-border mb-8">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-cg-sage opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cg-sage" />
            </span>
            <span className="text-sm font-medium text-foreground">AI-Powered Communication Coach</span>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-sm text-cg-sage font-medium">Always Learning</span>
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl text-foreground mb-6 leading-[1.08] tracking-tight"
            style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
          >
            Meet <span className="relative inline-block">
              ARIA
              <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 100 8" preserveAspectRatio="none">
                <path d="M0 7 Q25 0, 50 4 Q75 8, 100 2" stroke="var(--cg-amber)" strokeWidth="2.5" fill="none" opacity="0.5" />
              </svg>
            </span> — your calm in
            <br className="hidden sm:block" />
            the co-parenting storm
          </h1>

          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-5" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
            She catches the tone that escalates, suggests the words that de-escalate, and builds a court-ready record of good faith — all before you hit send.
          </p>

          <p className="text-base text-gray-400 max-w-lg mx-auto mb-10 italic" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
            Think of her as the calm voice that stops you from sending the text you&apos;d regret tomorrow.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={scrollToChallenge}
              className="group inline-flex items-center justify-center gap-2.5 bg-foreground text-white font-semibold px-8 py-4 rounded-full text-lg transition-all duration-300 hover:bg-cg-slate hover:shadow-xl hover:-translate-y-0.5 hover:shadow-foreground/20"
            >
              <Zap className="w-5 h-5 text-cg-amber" />
              Try the ARIA Challenge
              <ChevronDown className="w-4 h-4 opacity-60 group-hover:translate-y-0.5 transition-transform" />
            </button>
            <Link
              href="/early-access"
              className="inline-flex items-center justify-center gap-2 bg-white text-foreground font-medium px-8 py-4 rounded-full text-lg transition-all duration-200 border border-border hover:border-cg-sage hover:shadow-md"
            >
              Start free &mdash; no card needed
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="mt-5 text-sm text-gray-400" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
            Free forever &middot; No credit card &middot; You always choose what sends
          </p>
        </div>
      </section>

      {/* ================================================================= */}
      {/* HOW IT WORKS — 3-step visual flow                                  */}
      {/* ================================================================= */}
      <section className="py-16 lg:py-24 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
            >
              How ARIA works
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">Three steps. One calmer conversation.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-0">
            {[
              {
                step: '01',
                title: 'You type what you feel',
                desc: 'Write exactly what you\'re thinking — no filter needed. ARIA works in the background.',
                icon: MessageCircle,
                color: 'var(--cg-error)',
              },
              {
                step: '02',
                title: 'ARIA catches the edge',
                desc: 'Before you send, ARIA flags language that could hurt your case or escalate conflict.',
                icon: Shield,
                color: 'var(--cg-amber)',
              },
              {
                step: '03',
                title: 'You choose what to send',
                desc: 'Accept the suggestion, edit it, or send your original. You always have the final say.',
                icon: CheckCircle2,
                color: 'var(--cg-sage)',
              },
            ].map((item, i) => (
              <div key={item.step} className="relative px-8 py-10 text-center group">
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent -translate-y-8 z-0" />
                )}
                <div className="relative z-10">
                  <div className="text-xs font-bold tracking-[0.2em] uppercase mb-4" style={{ color: item.color, fontFamily: "var(--font-space-grotesk), sans-serif" }}>
                    Step {item.step}
                  </div>
                  <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg" style={{ backgroundColor: item.color + '10', boxShadow: `0 0 0 1px ${item.color}15` }}>
                    <item.icon className="w-7 h-7" style={{ color: item.color }} />
                  </div>
                  <h3
                    className="text-lg text-foreground mb-2"
                    style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-[260px] mx-auto">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* BEFORE & AFTER — dramatic contrast                                 */}
      {/* ================================================================= */}
      <section className="py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-3"
              style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
            >
              Same frustration. <span className="text-cg-sage">Different outcome.</span>
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">Hover to see what ARIA would suggest instead.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {beforeAfter.map((item, index) => (
              <div
                key={index}
                className="group relative rounded-2xl overflow-hidden cursor-default transition-all duration-500 border-2"
                style={{ borderColor: hoveredBA === index ? 'var(--cg-sage)' : '#e5e7eb' }}
                onMouseEnter={() => setHoveredBA(index)}
                onMouseLeave={() => setHoveredBA(null)}
              >
                {/* Without ARIA — visible by default */}
                <div className={`p-6 transition-all duration-500 ${hoveredBA === index ? 'opacity-0 scale-95 absolute inset-0' : 'opacity-100'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-cg-error-subtle flex items-center justify-center">
                      <EyeOff className="w-3 h-3 text-cg-error" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-cg-error">Without ARIA</span>
                  </div>
                  <p className="text-foreground font-medium leading-relaxed">&ldquo;{item.before}&rdquo;</p>
                  <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Hover to see ARIA&apos;s version
                  </p>
                </div>

                {/* With ARIA — appears on hover */}
                <div className={`p-6 transition-all duration-500 ${hoveredBA === index ? 'opacity-100 scale-100' : 'opacity-0 scale-105 absolute inset-0'}`} style={{ background: 'linear-gradient(135deg, #3DAA8A08, #3DAA8A03)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-cg-sage/10 flex items-center justify-center">
                      <Shield className="w-3 h-3 text-cg-sage" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-cg-sage">With ARIA</span>
                  </div>
                  <p className="text-foreground font-medium leading-relaxed">&ldquo;{item.after}&rdquo;</p>
                  <p className="text-xs text-cg-sage mt-3 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Same intent, safer delivery
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* THE CHALLENGE — interactive demo (the centerpiece)                 */}
      {/* ================================================================= */}
      <section ref={challengeRef} className="py-20 lg:py-28 bg-gradient-to-b from-foreground via-foreground to-cg-slate text-white relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-cg-sage/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-cg-amber/5 blur-[100px]" />

        <div className="relative max-w-6xl mx-auto px-6">
          {/* Section header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10 mb-6">
              <Zap className="w-4 h-4 text-cg-amber" />
              <span className="text-sm font-medium text-white/90">Live Interactive Demo</span>
            </div>

            <h2
              className="text-3xl sm:text-4xl lg:text-5xl mb-5"
              style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
            >
              Think you can get past <span className="text-cg-amber">ARIA</span>?
            </h2>

            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-6" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
              Pick a scenario. Chat with a hostile AI co-parent. Try your pettiest, most creative messages.
              This is the <span className="font-semibold text-white">exact same system</span> protecting real families.
            </p>

            {/* Always improving pill */}
            <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-5 py-3">
              <div className="flex -space-x-1">
                <div className="w-2 h-2 rounded-full bg-cg-sage animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-cg-amber animate-pulse" style={{ animationDelay: '0.5s' }} />
                <div className="w-2 h-2 rounded-full bg-cg-sage animate-pulse" style={{ animationDelay: '1s' }} />
              </div>
              <p className="text-sm text-white/80">
                <span className="font-semibold text-cg-amber">ARIA is always improving</span>
                <span className="hidden sm:inline"> — every message you test helps us catch new patterns and protect more families</span>
              </p>
            </div>
          </div>

          {/* Scenario Picker — horizontal scroll on mobile */}
          <div className="mb-8">
            <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-4 text-center">Choose a scenario to begin</p>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 lg:grid-cols-6 md:overflow-visible scrollbar-hide">
              {SCENARIOS.map(s => {
                const Icon = s.icon;
                const isSelected = scenario === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => handleSelectScenario(s.key)}
                    className={`
                      snap-start flex-shrink-0 w-[140px] md:w-auto rounded-xl p-4 text-left transition-all duration-300 border
                      ${isSelected
                        ? 'bg-white/15 border-cg-amber/50 shadow-lg shadow-cg-amber/10'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    {s.brandIcon ? (
                      <BrandIcon name={s.brandIcon} size={20} className={`mb-2 ${isSelected ? '' : 'opacity-40'}`} />
                    ) : Icon ? (
                      <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-cg-amber' : 'text-white/40'}`} />
                    ) : null}
                    <h3 className={`font-semibold text-xs mb-0.5 ${isSelected ? 'text-white' : 'text-white/70'}`}>
                      {s.label}
                    </h3>
                    <p className="text-[10px] text-white/40 leading-snug">{s.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat Interface */}
          {scenario ? (
            <div className="bg-[#0b141a] rounded-2xl lg:rounded-3xl shadow-2xl border border-white/10 overflow-hidden max-w-3xl mx-auto">
              {/* Chat Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-white/60" />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">Co-Parent (AI Simulation)</p>
                    <p className="text-[11px] text-white/40">{SCENARIOS.find(s => s.key === scenario)?.label}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {(ariaScore > 0 || userScore > 0) && (
                    <div className="hidden sm:flex items-center gap-2 text-[11px] font-medium bg-white/5 rounded-full px-3 py-1.5">
                      <span className="text-cg-sage">ARIA {ariaScore}</span>
                      <span className="text-white/20">:</span>
                      <span className="text-cg-amber">You {userScore}</span>
                    </div>
                  )}

                  <button
                    onClick={() => setAriaEnabled(!ariaEnabled)}
                    className={`
                      flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-300
                      ${ariaEnabled
                        ? 'bg-cg-sage/20 text-[#7DDFB8] border border-cg-sage/40 shadow-[0_0_12px_rgba(61,170,138,0.15)]'
                        : 'bg-white/10 text-white/50 border border-white/10'
                      }
                    `}
                  >
                    {ariaEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    ARIA {ariaEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div ref={chatContainerRef} className="h-[380px] sm:h-[440px] overflow-y-auto px-5 py-4 space-y-3" style={{ background: 'linear-gradient(180deg, rgba(11,20,26,0.95) 0%, rgba(11,20,26,1) 100%)' }}>
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%] space-y-1">
                      {msg.original && (
                        <div className={`text-[11px] px-3 py-1.5 rounded-lg mb-0.5 bg-cg-error/15 text-cg-error/80 line-through ${msg.role === 'user' ? 'text-right' : ''}`}>
                          {msg.original}
                        </div>
                      )}
                      <div className={`
                        px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                        ${msg.role === 'user'
                          ? 'bg-[#005c4b] text-white rounded-br-md'
                          : 'bg-white/[0.07] text-white/90 rounded-bl-md border border-white/[0.06]'
                        }
                      `}>
                        {msg.text}
                      </div>
                      {msg.original && (
                        <div className={`flex items-center gap-1 text-[11px] ${msg.role === 'user' ? 'justify-end' : ''}`}>
                          <Shield className="w-2.5 h-2.5 text-cg-sage" />
                          <span className="text-cg-sage">Rewritten by ARIA</span>
                        </div>
                      )}
                      {msg.role === 'coparent' && msg.ariaAnalysis?.is_flagged && !msg.original && !ariaEnabled && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-500/70" />
                          <span className="text-amber-500/60">{msg.ariaAnalysis.categories.map(c => CATEGORY_LABELS[c] || c).slice(0, 2).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/[0.07] rounded-2xl rounded-bl-md px-4 py-2.5 border border-white/[0.06]">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                {offlineMode && !isLoading && (
                  <div className="flex justify-center">
                    <div className="max-w-[90%] text-center text-[11px] text-white/40 flex items-center gap-1.5 px-3 py-1.5">
                      <Sparkles className="w-3 h-3 text-cg-amber" />
                      Offline preview — showing a simulated ARIA response. The full ARIA runs live inside the app.
                    </div>
                  </div>
                )}
              </div>

              {/* ARIA Intervention Panel */}
              {pendingIntervention && (
                <div className="border-t border-cg-sage/30 bg-cg-sage/[0.08] px-5 py-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 bg-cg-sage/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-cg-sage" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white text-sm mb-1">{currentTaunt || "ARIA caught this one!"}</h4>
                      <p className="text-xs text-white/50 mb-3">{pendingIntervention.analysis.explanation}</p>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {pendingIntervention.analysis.categories.slice(0, 3).map(cat => (
                          <span
                            key={cat}
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: (CATEGORY_COLORS[cat] || '#6b7280') + '25', color: CATEGORY_COLORS[cat] || '#9ca3af' }}
                          >
                            {CATEGORY_LABELS[cat] || cat}
                          </span>
                        ))}
                      </div>

                      <div className="space-y-1.5 mb-3">
                        <div className="bg-cg-error/10 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-cg-error font-medium mb-0.5">Your message</p>
                          <p className="text-xs text-cg-error/70">{pendingIntervention.originalText}</p>
                        </div>
                        <div className="bg-white/[0.06] rounded-lg px-3 py-2 border border-cg-sage/20">
                          <p className="text-[10px] text-cg-sage font-medium mb-0.5">ARIA&apos;s suggestion</p>
                          <p className="text-xs text-white/80">{pendingIntervention.analysis.suggestion}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={handleAcceptSuggestion} className="flex items-center gap-1.5 bg-cg-sage hover:bg-cg-sage-dark text-white text-xs font-medium rounded-full px-4 py-2 transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Use Suggestion
                        </button>
                        <button onClick={handleSendOriginal} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white/70 text-xs font-medium rounded-full px-4 py-2 transition-colors">
                          Send Original
                        </button>
                        <button aria-label="Close" onClick={() => setPendingIntervention(null)} className="ml-auto text-white/30 hover:text-white/60 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Input Area */}
              {!pendingIntervention && (
                <div className="border-t border-white/[0.06] px-5 py-3.5" style={{ background: 'rgba(11,20,26,0.8)' }}>
                  <div className="flex items-center gap-2.5">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={isLoading ? 'Waiting for reply...' : 'Type something petty, hostile, or creative...'}
                      disabled={isLoading}
                      className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-full px-5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-cg-sage/40 focus:border-cg-sage/30 disabled:opacity-40 transition-all"
                    />
                    <button aria-label="Send message"
                      onClick={handleSend}
                      disabled={!inputText.trim() || isLoading}
                      className="w-10 h-10 bg-cg-sage hover:bg-cg-sage-dark text-white rounded-full flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  {ariaEnabled && (
                    <div className="mt-2 px-1 space-y-0.5">
                      <p className="text-[11px] text-white/30 flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" /> ARIA is rewriting all messages to be civil and child-focused
                      </p>
                      <p className="text-[10px] text-white/20 italic">
                        The <span className="text-cg-error/50 line-through">crossed-out text</span> is for this demo only — in the real app, only the rewritten message is sent.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Empty state — invite to pick a scenario */
            <div className="max-w-md mx-auto text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
                <ChevronDown className="w-7 h-7 text-white/30 animate-bounce" />
              </div>
              <p className="text-white/40 text-sm">Pick a scenario above to start chatting</p>
            </div>
          )}

          {/* Nudge + Report button */}
          {scenario && (
            <div className="max-w-3xl mx-auto mt-6 space-y-4">
              <p className="text-center text-xs text-white/30 flex items-center justify-center gap-1.5">
                <RefreshCw className="w-3 h-3" />
                Keep going — the more you test, the smarter ARIA gets. Try switching scenarios!
              </p>
              {messages.length >= 4 && !showReport && (
                <div className="text-center">
                  <button
                    onClick={() => setShowReport(true)}
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium rounded-full px-6 py-3 transition-all border border-white/10 hover:border-white/20 text-sm"
                  >
                    <BarChart3 className="w-4 h-4 text-cg-amber" /> View Communication Report
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ================================================================= */}
      {/* REPORT                                                             */}
      {/* ================================================================= */}
      {showReport && (
        <section className="max-w-4xl mx-auto px-6 -mt-8 pb-16 relative z-10">
          <div className="bg-white rounded-2xl shadow-xl border border-border overflow-hidden">
            <div className="bg-gradient-to-r from-foreground to-cg-slate text-white px-8 py-6">
              <div className="flex items-center gap-3 mb-1">
                <BarChart3 className="w-5 h-5" />
                <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}>Communication Report</h2>
              </div>
              <p className="text-white/60 text-sm">{SCENARIOS.find(s => s.key === scenario)?.label} — Demo Session</p>
            </div>

            <div className="p-8">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {[
                  { label: 'Messages', value: totalMessages, color: 'var(--cg-slate)' },
                  { label: 'Interventions', value: totalInterventions, color: 'var(--cg-amber)' },
                  { label: 'Accepted', value: acceptedInterventions, color: 'var(--cg-sage)' },
                  { label: 'Accept Rate', value: `${acceptanceRate}%`, color: acceptanceRate >= 50 ? 'var(--cg-sage)' : 'var(--cg-error)' },
                ].map((stat, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold mb-0.5" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-[11px] text-gray-500 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Challenge Score */}
              {(ariaScore > 0 || userScore > 0) && (
                <div className="bg-foreground/5 rounded-xl p-6 mb-10 text-center">
                  <h3 className="font-semibold text-foreground text-sm mb-3">Challenge Score</h3>
                  <div className="flex items-center justify-center gap-8">
                    <div>
                      <p className="text-2xl font-bold text-cg-sage">{ariaScore}</p>
                      <p className="text-[11px] text-gray-500">ARIA caught</p>
                    </div>
                    <div className="text-lg text-gray-300 font-light">vs</div>
                    <div>
                      <p className="text-2xl font-bold text-cg-amber">{userScore}</p>
                      <p className="text-[11px] text-gray-500">Got through</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    {ariaScore > userScore
                      ? "ARIA wins this round! Your family would be protected."
                      : ariaScore === userScore
                        ? "A tie! ARIA is tough, but you found gaps. We're on it."
                        : "You found some gaps! We'll use your creativity to improve ARIA."}
                  </p>
                </div>
              )}

              {/* Category Chart */}
              {chartData.length > 0 && (
                <div className="mb-10">
                  <h3 className="font-semibold text-foreground text-sm mb-4">Categories Detected</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: '#374151' }} width={110} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                          {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Toxicity Timeline */}
              {scoreTimeline.length > 1 && (
                <div className="mb-10">
                  <h3 className="font-semibold text-foreground text-sm mb-4">Toxicity Over Time</h3>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={scoreTimeline}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="message" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Toxicity']} />
                        <Line type="monotone" dataKey="score" stroke="var(--cg-error)" strokeWidth={2} dot={{ fill: 'var(--cg-error)', r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Sample Interventions */}
              {interventions.length > 0 && (
                <div className="mb-10">
                  <h3 className="font-semibold text-foreground text-sm mb-4">Sample Interventions</h3>
                  <div className="space-y-3">
                    {interventions.slice(0, 3).map((intervention, i) => (
                      <div key={i} className="grid md:grid-cols-2 gap-3">
                        <div className="bg-cg-error-subtle border border-cg-error/20 rounded-xl px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <X className="w-3 h-3 text-cg-error" />
                            <span className="text-[11px] text-cg-error font-medium">Original</span>
                          </div>
                          <p className="text-sm text-cg-error">{intervention.original}</p>
                        </div>
                        <div className="bg-cg-sage/5 border border-cg-sage/20 rounded-xl px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <CheckCircle2 className="w-3 h-3 text-cg-sage" />
                            <span className="text-[11px] text-cg-sage font-medium">{intervention.accepted ? 'Accepted' : 'Suggested'}</span>
                          </div>
                          <p className="text-sm text-foreground">{intervention.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA inside report */}
              <div className="bg-gradient-to-b from-cg-amber/5 to-transparent rounded-xl border border-cg-amber/20 p-6">
                <div className="text-center mb-5">
                  <h3 className="text-lg text-foreground mb-1" style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}>
                    Protect your family with ARIA
                  </h3>
                  <p className="text-sm text-gray-500">Join the first 50 early adopters — 30% off for 3 years.</p>
                </div>
                <div className="max-w-sm mx-auto">
                  <EarlyAdopterForm source="aria_demo_report" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* ALWAYS IMPROVING — the learning engine                             */}
      {/* ================================================================= */}
      <section className="py-20 lg:py-28 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cg-sage/5 rounded-full border border-cg-sage/15 mb-6">
              <RefreshCw className="w-4 h-4 text-cg-sage" />
              <span className="text-sm font-medium text-cg-sage">Continuously Learning</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-4"
              style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
            >
              ARIA never stops getting <span className="text-cg-sage">smarter</span>
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
              Every message, every creative workaround, every new pattern of manipulation — ARIA learns from it all.
              Our team continuously trains her on real co-parenting conflict so she catches what other tools miss.
            </p>
          </div>

          {/* Stats with animated counters */}
          <div className="grid grid-cols-3 gap-6 mb-16" ref={patterns.ref}>
            {[
              { value: '3-tier', label: 'Detection', sublabel: 'Regex + AI, layered', color: 'var(--cg-sage)' },
              { value: 'Real-time', label: 'Tone coaching', sublabel: 'Before you hit send', color: 'var(--cg-amber)' },
              { value: 'Court-ready', label: 'Good-faith record', sublabel: 'Every suggestion timestamped', color: 'var(--cg-slate)' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-1" style={{ color: stat.color, fontFamily: "var(--font-space-grotesk), sans-serif" }}>
                  {stat.value}
                </p>
                <p className="text-sm font-semibold text-foreground mb-0.5">{stat.label}</p>
                <p className="text-xs text-gray-400">{stat.sublabel}</p>
              </div>
            ))}
          </div>

          {/* 3-tier architecture */}
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: Shield,
                tier: 'Tier 1',
                title: 'Pattern Detection',
                desc: 'Regex patterns catch known hostile phrases instantly — profanity, threats, manipulation, and more.',
                color: 'var(--cg-sage)',
                speed: '< 50ms',
              },
              {
                icon: Brain,
                tier: 'Tier 2',
                title: 'AI Deep Analysis',
                desc: 'For nuanced messages, AI examines context, tone, and intent — catching passive aggression humans might miss.',
                color: 'var(--cg-amber)',
                speed: '< 2s',
              },
              {
                icon: Zap,
                tier: 'Tier 3',
                title: 'Fallback Reliability',
                desc: 'A redundant AI backup ensures ARIA never goes offline. Your family is protected 24/7, no matter what.',
                color: 'var(--cg-slate)',
                speed: '99.9% uptime',
              },
            ].map((tier) => (
              <div key={tier.title} className="group rounded-2xl p-6 border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300" style={{ backgroundColor: tier.color + '10' }}>
                    <tier.icon className="w-5 h-5" style={{ color: tier.color }} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: tier.color }}>{tier.tier}</span>
                    <h4 className="font-semibold text-foreground text-sm">{tier.title}</h4>
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">{tier.desc}</p>
                <span className="inline-flex items-center text-[10px] font-medium px-2 py-1 rounded-full" style={{ backgroundColor: tier.color + '08', color: tier.color }}>
                  {tier.speed}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* CAPABILITIES — compact feature grid                                */}
      {/* ================================================================= */}
      <section className="py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl text-foreground mb-3"
              style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
            >
              More than a <span className="text-cg-sage">filter</span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              ARIA doesn&apos;t just check grammar — she understands what&apos;s at stake.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Shield, title: 'Catches tension before you send', desc: 'Flags language that could escalate conflict or hurt your case. You always have the final say.', color: 'var(--cg-sage)' },
              { icon: RefreshCw, title: 'Suggests calmer alternatives', desc: 'Offers a rewrite that keeps your meaning without the edge. Not replacing your words — improving them.', color: 'var(--cg-amber)' },
              { icon: Brain, title: 'Knows your custody agreement', desc: 'References your parenting plan, schedule, and court orders. When unsure, she can remind you.', color: 'var(--cg-slate)' },
              { icon: TrendingUp, title: 'Builds your court record', desc: 'Every accepted suggestion builds documented evidence of good-faith communication — SHA-256 verified.', color: 'var(--cg-sage)' },
              { icon: Eye, title: 'Shields incoming hostility', desc: 'Reviews messages you receive too. Summarizes hostile texts so you get the info without the emotional hit.', color: 'var(--cg-amber)' },
              { icon: FileText, title: 'Helps draft agreements', desc: 'Need to propose a schedule change? ARIA helps compose clear, neutral language focused on your kids.', color: 'var(--cg-slate)' },
            ].map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="group rounded-2xl p-6 border border-gray-100 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300" style={{ backgroundColor: cap.color + '10' }}>
                    <Icon className="w-5 h-5" style={{ color: cap.color }} />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-1.5">{cap.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{cap.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* KIDSPACE + TRUST — side by side                                    */}
      {/* ================================================================= */}
      <section className="py-16 lg:py-24 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* KidSpace */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cg-amber/10 rounded-full mb-5">
                <Heart className="w-3.5 h-3.5 text-cg-amber" />
                <span className="text-xs font-semibold text-cg-amber uppercase tracking-wider">Child-First</span>
              </div>
              <h3
                className="text-2xl text-foreground mb-4"
                style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
              >
                ARIA keeps kids out of the middle
              </h3>
              <p className="text-gray-600 mb-5 leading-relaxed">
                In KidSpace, ARIA provides gentle, age-appropriate guardrails so kids can just be kids.
              </p>
              <ul className="space-y-3">
                {[
                  'Filters inappropriate content before it reaches children',
                  'Alerts parents to concerning language patterns',
                  'Creates a safe space for parent-child connection',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-cg-amber mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Trust & Privacy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cg-sage/5 rounded-full mb-5">
                <Lock className="w-3.5 h-3.5 text-cg-sage" />
                <span className="text-xs font-semibold text-cg-sage uppercase tracking-wider">Privacy First</span>
              </div>
              <h3
                className="text-2xl text-foreground mb-4"
                style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
              >
                Built on trust, not surveillance
              </h3>
              <p className="text-gray-600 mb-5 leading-relaxed">
                ARIA is a coach, not a spy. Here&apos;s what that means:
              </p>
              <div className="space-y-3">
                {[
                  { title: 'You\'re always in control', desc: 'ARIA suggests — you decide. She never sends anything without your approval.' },
                  { title: 'Private by default', desc: 'Your drafts and suggestions are never shared with your co-parent.' },
                  { title: 'Court-admissible records', desc: 'SHA-256 verified, timestamped, accepted in all 50 states.' },
                  { title: 'No data selling', desc: 'Your family\'s communication is never used for advertising or sold.' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <ShieldCheck className="w-4 h-4 text-cg-sage mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* BOTTOM CTA                                                         */}
      {/* ================================================================= */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-foreground to-cg-slate text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Heart className="w-8 h-8 mb-5 text-cg-amber" />
              <h2
                className="text-3xl sm:text-4xl lg:text-5xl mb-5"
                style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}
              >
                Every calm message is a better day for your kids
              </h2>
              <p className="text-lg text-white/70 mb-8 leading-relaxed">
                ARIA comes free with CommonGround &mdash; messaging, schedules, expenses, and court-ready records, built with family-law professionals. Start free, no card needed.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  'ARIA-powered messaging',
                  'Automated custody calendar',
                  'Expense auto-splitting',
                  'Court-ready documentation',
                  'KidSpace video calls',
                  'No credit card required',
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-cg-sage flex-shrink-0" />
                    <span className="text-white/70 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <EarlyAdopterForm source="aria_page_bottom" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
