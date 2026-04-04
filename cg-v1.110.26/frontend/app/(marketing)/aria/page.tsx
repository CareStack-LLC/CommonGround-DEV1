'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  FileText,
  Gift,
  Heart,
  Calendar,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Scale,
  Send,
  Shield,
  Sparkles,
  Stethoscope,
  Target,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  X,
  Zap,
  AlertTriangle,
  BarChart3,
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

const SCENARIOS: { key: Scenario; label: string; description: string; icon: React.ElementType }[] = [
  { key: 'schedule', label: 'Schedule Disputes', description: 'Pickup times, weekend swaps, last-minute changes', icon: Calendar },
  { key: 'medical', label: 'Medical Decisions', description: 'Doctor visits, medications, health insurance', icon: Stethoscope },
  { key: 'financial', label: 'Financial Issues', description: 'Child support, shared expenses, costs', icon: DollarSign },
  { key: 'holiday', label: 'Holiday Planning', description: 'Who gets the kids, vacation scheduling', icon: Gift },
  { key: 'communication', label: 'Communication', description: 'Response times, boundaries, contact methods', icon: MessageCircle },
  { key: 'new_partner', label: 'New Partner', description: 'Introducing a new partner to the children', icon: Heart },
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
  "That was textbook. Try something more creative!",
  "ARIA: 1 point. Your move.",
  "Not bad, but ARIA's seen pettier.",
  "Close, but ARIA's trained on 127K+ messages.",
  "Good effort! ARIA catches these in her sleep.",
  "You'll have to do better than that!",
  "ARIA's pattern library says hi.",
  "Predictable. Try a different angle!",
];

const capabilities = [
  {
    icon: Shield,
    title: 'Catches tension before you send',
    description: 'ARIA reads every message and gently flags language that could escalate conflict or hurt your case. You always have the final say.',
  },
  {
    icon: RefreshCw,
    title: 'Suggests a calmer way to say it',
    description: 'Not rewriting your words — offering an alternative that keeps your meaning without the edge.',
  },
  {
    icon: Brain,
    title: 'Knows your custody agreement',
    description: 'ARIA references your parenting plan, schedule, and court orders. When you\'re unsure what you agreed to, she can remind you.',
  },
  {
    icon: TrendingUp,
    title: 'Builds your court record',
    description: 'Every accepted suggestion builds documented evidence of good-faith communication — timestamped, SHA-256 verified, court-ready.',
  },
  {
    icon: Zap,
    title: 'Shields incoming hostility',
    description: 'ARIA reviews messages you receive too. She can summarize hostile texts so you get the info without the emotional impact.',
  },
  {
    icon: FileText,
    title: 'Helps draft agreements',
    description: 'Need to propose a schedule change? ARIA helps you compose clear, neutral language focused on your kids.',
  },
];

const beforeAfter = [
  { before: '"You NEVER follow the schedule. The kids are sick of your crap."', after: '"I noticed the last two pickups were different from what we agreed. Can we find a time that works better?"' },
  { before: '"This is ALL your fault. You always do this."', after: '"This situation is frustrating. Let\'s focus on what we can do going forward."' },
  { before: '"I guess you just don\'t care about the kids."', after: '"I want to make sure the kids have what they need. Here\'s what I\'m thinking."' },
  { before: '"My lawyer is going to hear about this. You\'re done."', after: '"I\'d like to document this concern. Can we discuss a solution first?"' },
];

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

export default function ARIAPage() {
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

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const challengeRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Scroll only the chat container, not the page
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
    setScenario(s);
    setMessages([]);
    setInterventions([]);
    setShowReport(false);
    setPendingIntervention(null);
    setAriaScore(0);
    setUserScore(0);
    setCurrentTaunt('');

    const openers: Record<Scenario, string> = {
      schedule: "We need to talk about the schedule. You keep messing it up and honestly the kids are done with it. Get it together.",
      medical: "I took the kids to the doctor today. I'm making the decisions since you clearly can't be bothered to show up.",
      financial: "Where's this month's payment?? You're always late. The kids need things and you can't even handle basic responsibilities.",
      holiday: "I'm keeping the kids for Thanksgiving. They already told me they'd rather be here. Don't make this into a thing.",
      communication: "Stop texting me every 5 minutes. I'll respond when I feel like it. You're not that important.",
      new_partner: "I heard you have someone new around MY kids. We need to talk about that right now. This is not okay.",
    };

    setMessages([{
      id: crypto.randomUUID(),
      role: 'coparent',
      text: openers[s],
      timestamp: new Date(),
    }]);

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
      const result = await getCoparentReply(scenario, history, text, ariaEnabled);

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
    } catch (err) {
      console.error('Failed to get reply:', err);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [scenario, messages, ariaEnabled]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    if (ariaEnabled) {
      try {
        // When ARIA is ON, force_rewrite=true means EVERY message gets a civil rewrite
        const history = messages.slice(-6).map(m => ({ role: m.role, text: m.text }));
        const analysis = await analyzeMessage(inputText, history, true);
        if (analysis.suggestion) {
          setAriaScore(prev => prev + 1);
          setCurrentTaunt(getRandomTaunt());
          // Auto-send the ARIA suggestion (no intervention panel)
          await sendMessage(analysis.suggestion, true, inputText);
          return;
        }
      } catch (err) {
        console.error('Analysis failed:', err);
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
    <div className="min-h-screen bg-[#F4F8F7]">

      {/* ================================================================= */}
      {/* HERO                                                               */}
      {/* ================================================================= */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-28 overflow-hidden">
        {/* decorative blurs */}
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-[#3DAA8A]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-[#F5A623]/6 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F5A623]/10 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-[#F5A623]" />
            <span className="text-sm font-medium text-[#F5A623]">AI-Powered Communication Coach</span>
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-[3.5rem] text-[#1E3A4A] mb-6 leading-[1.1]"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Meet ARIA — your calm in the{' '}
            <span className="text-[#3DAA8A]">co-parenting storm</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-4">
            ARIA catches the tone that escalates, suggests the words that de-escalate, and builds a court-ready record of good faith — all before you hit send.
          </p>

          <p className="text-base text-gray-500 max-w-xl mx-auto mb-10">
            Think of her as the calm voice in your head that stops you from sending the text you&apos;d regret tomorrow.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={scrollToChallenge}
              className="inline-flex items-center justify-center gap-2 bg-[#3DAA8A] text-white font-semibold px-8 py-4 rounded-full text-lg transition-all duration-200 hover:bg-[#34967a] hover:shadow-xl hover:-translate-y-0.5"
            >
              Try the ARIA Challenge
              <ChevronDown className="w-5 h-5 animate-bounce" />
            </button>
            <Link
              href="/early-access"
              className="inline-flex items-center justify-center gap-2 border-2 border-[#3DAA8A] text-[#3DAA8A] font-medium px-8 py-4 rounded-full text-lg transition-all duration-200 hover:bg-[#3DAA8A] hover:text-white"
            >
              Get Early Access
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* HOW ARIA WORKS — interactive mockup                                */}
      {/* ================================================================= */}
      <section id="how-it-works" className="py-16 lg:py-24 bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] text-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2
                className="text-3xl sm:text-4xl mb-6"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                See ARIA in action
              </h2>
              <p className="text-lg text-white/80 mb-6 leading-relaxed">
                You type what you&apos;re feeling. ARIA catches what could go wrong. You decide whether to adjust — or send as-is. She never blocks you. She just makes sure you&apos;re choosing, not reacting.
              </p>

              <div className="space-y-4 mt-8">
                {[
                  'Works in real-time as you type',
                  'You always have the final say',
                  'Every suggestion is optional',
                  'Gets smarter with every message',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-white/80">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat demo mockup */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 border border-white/20">
              <div className="bg-[#0b141a] rounded-2xl p-5 shadow-2xl">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="max-w-[85%]">
                      <div className="bg-[#005c4b] text-white px-4 py-3 rounded-2xl rounded-br-md shadow-lg">
                        <p className="text-[15px] leading-relaxed">You&apos;re always late. This is ridiculous. I&apos;m done dealing with this.</p>
                        <p className="text-[11px] text-white/40 text-right mt-1.5">Draft</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="bg-[#F5A623] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      ARIA suggestion
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#F5A623]/25 to-[#F5A623]/10 rounded-2xl p-4 border border-[#F5A623]/30 mx-1">
                    <p className="text-[#F5A623] font-semibold text-sm mb-2">A calmer approach</p>
                    <p className="text-white/80 text-sm leading-relaxed mb-1">
                      Words like &ldquo;always&rdquo; and &ldquo;done dealing with this&rdquo; can escalate quickly. Try focusing on the specific issue:
                    </p>
                    <p className="text-white text-sm leading-relaxed italic mt-2 bg-white/10 rounded-lg px-3 py-2">
                      &ldquo;The last two pickups were 20+ minutes late. Can we find a time that works better for both of us?&rdquo;
                    </p>
                    <div className="flex gap-2 mt-3">
                      <span className="bg-white/20 text-white text-xs font-medium px-4 py-2 rounded-full">Use suggestion</span>
                      <span className="bg-white/10 text-white/60 text-xs font-medium px-4 py-2 rounded-full">Edit myself</span>
                      <span className="bg-white/5 text-white/40 text-xs font-medium px-4 py-2 rounded-full">Send as-is</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* BEFORE & AFTER — the ARIA difference                               */}
      {/* ================================================================= */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              The ARIA <span className="text-[#F5A623]">difference</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Same intent. Same frustration. Completely different outcome.
            </p>
          </div>

          <div className="space-y-4">
            {beforeAfter.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-0">
                <div className="flex-1 bg-red-50 rounded-xl sm:rounded-r-none px-6 py-5 border-l-4 border-red-300">
                  <p className="text-red-400 text-xs font-semibold uppercase tracking-wide mb-1.5">Without ARIA</p>
                  <p className="text-red-700 font-medium">{item.before}</p>
                </div>
                <div className="flex items-center justify-center sm:px-3 text-[#3DAA8A]">
                  <ArrowRight className="w-5 h-5 rotate-90 sm:rotate-0" />
                </div>
                <div className="flex-1 bg-[#3DAA8A]/5 rounded-xl sm:rounded-l-none px-6 py-5 border-l-4 border-[#3DAA8A]">
                  <p className="text-[#3DAA8A] text-xs font-semibold uppercase tracking-wide mb-1.5">With ARIA</p>
                  <p className="text-[#1E3A4A] font-medium">{item.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* CAPABILITIES — 6 feature cards                                     */}
      {/* ================================================================= */}
      <section className="py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              More than a <span className="text-[#3DAA8A]">messaging tool</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              ARIA doesn&apos;t just check your grammar — she understands what&apos;s at stake.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="group bg-white rounded-2xl p-7 border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#3DAA8A]/10 flex items-center justify-center mb-5 group-hover:bg-[#3DAA8A] transition-all duration-300">
                    <Icon className="w-6 h-6 text-[#3DAA8A] group-hover:text-white transition-colors" />
                  </div>
                  <h3
                    className="text-lg text-[#1E3A4A] mb-2"
                    style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                  >
                    {cap.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{cap.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* ALWAYS IMPROVING — the learning engine                             */}
      {/* ================================================================= */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F5A623]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F5A623]/20 rounded-full mb-6">
                <RefreshCw className="w-4 h-4 text-[#F5A623]" />
                <span className="text-sm font-medium text-[#F5A623]">Always Learning</span>
              </div>

              <h2
                className="text-3xl sm:text-4xl mb-6"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                ARIA never stops getting smarter
              </h2>
              <p className="text-lg text-white/80 leading-relaxed mb-8">
                Every message, every creative workaround, every new pattern — ARIA learns from it all. Our team continuously trains her on real co-parenting conflict so she catches what other tools miss.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: '1,800+', label: 'Detection patterns' },
                  { value: '127K+', label: 'Training messages' },
                  { value: '14', label: 'Toxicity categories' },
                  { value: '3-Tier', label: 'AI analysis pipeline' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                    <p className="text-2xl font-bold text-[#F5A623]">{stat.value}</p>
                    <p className="text-sm text-white/60">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  icon: Shield,
                  title: 'Pattern Detection (Tier 1)',
                  desc: '1,800+ regex patterns catch known hostile phrases instantly — profanity, threats, manipulation, gaslighting, and more.',
                },
                {
                  icon: Brain,
                  title: 'AI Deep Analysis (Tier 2)',
                  desc: 'For nuanced messages, AI examines context, tone, and intent — catching passive aggression and subtle manipulation humans might miss.',
                },
                {
                  icon: Zap,
                  title: 'Fallback Reliability (Tier 3)',
                  desc: 'A redundant AI backup ensures ARIA never goes offline. Your family is protected 24/7, no matter what.',
                },
              ].map((tier) => (
                <div key={tier.title} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <tier.icon className="w-5 h-5 text-[#F5A623]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">{tier.title}</h4>
                    <p className="text-sm text-white/60 leading-relaxed">{tier.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* THE CHALLENGE — interactive demo                                   */}
      {/* ================================================================= */}
      <section ref={challengeRef} className="py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-6">
          {/* Challenge header */}
          <div className="text-center mb-12">
            <p className="text-[#F5A623] font-medium mb-4 tracking-widest uppercase text-xs flex items-center justify-center gap-3">
              <span className="w-8 h-px bg-[#F5A623]/40" />
              The ARIA Challenge
              <span className="w-8 h-px bg-[#F5A623]/40" />
            </p>
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Think you can get past <span className="text-[#3DAA8A]">ARIA</span>?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-5">
              Pick a co-parenting scenario, chat with a hostile AI co-parent, and try to outsmart ARIA.
              This is the <span className="font-semibold text-[#1E3A4A]">exact same system</span> that protects real families. Go ahead — be difficult.
            </p>
            <div className="inline-flex items-center gap-2.5 bg-[#3DAA8A]/5 border border-[#3DAA8A]/20 rounded-full px-5 py-2.5">
              <Sparkles className="w-4 h-4 text-[#F5A623]" />
              <p className="text-sm text-[#1E3A4A]">
                <span className="font-semibold">ARIA is always improving.</span>{' '}
                Every message you test helps us catch new patterns — your creativity makes co-parenting safer for real families.
              </p>
            </div>
          </div>

          {/* Scenario Picker */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            {SCENARIOS.map(s => {
              const Icon = s.icon;
              const isSelected = scenario === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => handleSelectScenario(s.key)}
                  className={`
                    relative rounded-2xl p-5 text-left transition-all border-2
                    ${isSelected
                      ? 'border-[#3DAA8A] bg-[#3DAA8A]/5 shadow-md'
                      : 'border-[#D6ECE8] bg-white hover:border-[#3DAA8A]/40 hover:shadow-sm'
                    }
                  `}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isSelected ? 'bg-[#3DAA8A]/20' : 'bg-[#3DAA8A]/5'}`}>
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-[#3DAA8A]' : 'text-[#3DAA8A]/60'}`} />
                  </div>
                  <h3 className={`font-semibold text-sm mb-1 ${isSelected ? 'text-[#3DAA8A]' : 'text-[#1E3A4A]'}`}>
                    {s.label}
                  </h3>
                  <p className="text-xs text-gray-500">{s.description}</p>
                  {isSelected && <div className="absolute top-3 right-3 w-3 h-3 bg-[#3DAA8A] rounded-full" />}
                </button>
              );
            })}
          </div>

          {/* Chat Interface */}
          {scenario && (
            <div className="bg-white rounded-3xl shadow-xl border border-[#D6ECE8] overflow-hidden">
              {/* Chat Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#2D6A8F]/10 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-[#2D6A8F]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1E3A4A] text-sm">Co-Parent (AI Simulation)</p>
                    <p className="text-xs text-gray-500">{SCENARIOS.find(s => s.key === scenario)?.label}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {(ariaScore > 0 || userScore > 0) && (
                    <div className="hidden sm:flex items-center gap-2 bg-[#1E3A4A]/5 rounded-full px-3 py-1.5 text-xs font-medium">
                      <span className="text-[#3DAA8A]">ARIA: {ariaScore}</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-[#F5A623]">You: {userScore}</span>
                    </div>
                  )}

                  <button
                    onClick={() => setAriaEnabled(!ariaEnabled)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${ariaEnabled ? 'bg-[#3DAA8A]/10 text-[#3DAA8A] border border-[#3DAA8A]/30' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}
                  >
                    {ariaEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    ARIA {ariaEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div ref={chatContainerRef} className="h-[460px] overflow-y-auto px-6 py-4 space-y-4 bg-[#fafbfc]">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%] space-y-1">
                      {msg.original && (
                        <div className={`text-xs px-3 py-2 rounded-xl mb-1 ${msg.role === 'user' ? 'bg-red-50 text-red-400 line-through text-right' : 'bg-red-50 text-red-400 line-through'}`}>
                          {msg.original}
                        </div>
                      )}
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#3DAA8A] text-white rounded-br-md' : 'bg-white text-[#1E3A4A] border border-gray-200 rounded-bl-md shadow-sm'}`}>
                        {msg.text}
                      </div>
                      {msg.original && (
                        <div className={`flex items-center gap-1 text-xs ${msg.role === 'user' ? 'justify-end' : ''}`}>
                          <Shield className="w-3 h-3 text-[#3DAA8A]" />
                          <span className="text-[#3DAA8A] font-medium">Rewritten by ARIA</span>
                        </div>
                      )}
                      {msg.role === 'coparent' && msg.ariaAnalysis?.is_flagged && !msg.original && !ariaEnabled && (
                        <div className="flex items-center gap-1 text-xs">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span className="text-amber-600">{msg.ariaAnalysis.categories.map(c => CATEGORY_LABELS[c] || c).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* scroll handled by chatContainerRef */}
              </div>

              {/* ARIA Intervention Panel */}
              {pendingIntervention && (
                <div className="border-t-2 border-[#3DAA8A] bg-[#3DAA8A]/5 px-6 py-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#3DAA8A]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-[#3DAA8A]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#1E3A4A] text-sm mb-1">{currentTaunt || "ARIA caught this one!"}</h4>
                      <p className="text-xs text-gray-600 mb-3">{pendingIntervention.analysis.explanation}</p>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {pendingIntervention.analysis.categories.map(cat => (
                          <span
                            key={cat}
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: (CATEGORY_COLORS[cat] || '#6b7280') + '20', color: CATEGORY_COLORS[cat] || '#6b7280' }}
                          >
                            {CATEGORY_LABELS[cat] || cat}
                          </span>
                        ))}
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                          <p className="text-xs text-red-500 font-medium mb-1">Your message</p>
                          <p className="text-sm text-red-700">{pendingIntervention.originalText}</p>
                        </div>
                        <div className="bg-white border border-[#3DAA8A]/20 rounded-xl px-4 py-2.5">
                          <p className="text-xs text-[#3DAA8A] font-medium mb-1">ARIA&apos;s suggestion</p>
                          <p className="text-sm text-[#1E3A4A]">{pendingIntervention.analysis.suggestion}</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button onClick={handleAcceptSuggestion} className="flex items-center gap-2 bg-[#3DAA8A] hover:bg-[#2D8A70] text-white text-sm font-medium rounded-full px-5 py-2 transition-colors">
                          <CheckCircle2 className="w-4 h-4" /> Use Suggestion
                        </button>
                        <button onClick={handleSendOriginal} className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-full px-5 py-2 border border-gray-200 transition-colors">
                          Send Original
                        </button>
                        <button onClick={() => setPendingIntervention(null)} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 text-sm transition-colors ml-auto">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Input Area */}
              {!pendingIntervention && (
                <div className="border-t border-gray-100 px-6 py-4 bg-white">
                  <div className="flex items-center gap-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={isLoading ? 'Waiting for reply...' : 'Try your pettiest message...'}
                      disabled={isLoading}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-5 py-3 text-sm text-[#1E3A4A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/30 focus:border-[#3DAA8A] disabled:opacity-50 transition-all"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!inputText.trim() || isLoading}
                      className="w-11 h-11 bg-[#3DAA8A] hover:bg-[#2D8A70] text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  {ariaEnabled && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> ARIA is rewriting all messages to be civil and child-focused
                      </p>
                      <p className="text-[11px] text-gray-400/70 italic pl-4">
                        The <span className="text-red-400 line-through">crossed-out text</span> is shown here so you can see what ARIA blocked — in the real app, only the rewritten message is sent.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Encouraging nudge below chat */}
          {scenario && (
            <div className="flex items-center justify-center gap-2 mt-5 text-sm text-gray-500">
              <RefreshCw className="w-3.5 h-3.5 text-[#3DAA8A]" />
              <span>
                Keep going! The more you test, the smarter ARIA gets. Try switching scenarios to challenge different detection patterns.
              </span>
            </div>
          )}

          {/* Generate Report Button */}
          {messages.length >= 4 && !showReport && (
            <div className="text-center mt-8">
              <button
                onClick={() => setShowReport(true)}
                className="inline-flex items-center gap-2 bg-[#2D6A8F] hover:bg-[#1E3A4A] text-white font-semibold rounded-full px-8 py-4 transition-all hover:scale-105 shadow-lg"
              >
                <BarChart3 className="w-5 h-5" /> Generate Communication Report
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ================================================================= */}
      {/* REPORT                                                             */}
      {/* ================================================================= */}
      {showReport && (
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="bg-white rounded-3xl shadow-xl border border-[#D6ECE8] overflow-hidden">
            <div className="bg-gradient-to-r from-[#1E3A4A] to-[#2D6A8F] text-white px-8 py-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-6 h-6" />
                <h2 className="text-2xl font-bold" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>Communication Report</h2>
              </div>
              <p className="text-white/70 text-sm">ARIA analysis of your demo conversation — {SCENARIOS.find(s => s.key === scenario)?.label}</p>
            </div>

            <div className="p-8">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {[
                  { label: 'Total Messages', value: totalMessages, color: '#2D6A8F' },
                  { label: 'ARIA Interventions', value: totalInterventions, color: '#F5A623' },
                  { label: 'Suggestions Accepted', value: acceptedInterventions, color: '#3DAA8A' },
                  { label: 'Acceptance Rate', value: `${acceptanceRate}%`, color: acceptanceRate >= 50 ? '#3DAA8A' : '#ef4444' },
                ].map((stat, i) => (
                  <div key={i} className="bg-gray-50 rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold mb-1" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Challenge Score */}
              {(ariaScore > 0 || userScore > 0) && (
                <div className="bg-[#1E3A4A]/5 rounded-2xl p-6 mb-10 text-center">
                  <h3 className="font-semibold text-[#1E3A4A] mb-3">Challenge Score</h3>
                  <div className="flex items-center justify-center gap-8">
                    <div>
                      <p className="text-3xl font-bold text-[#3DAA8A]">{ariaScore}</p>
                      <p className="text-xs text-gray-500 font-medium">ARIA caught</p>
                    </div>
                    <div className="text-2xl text-gray-300 font-light">vs</div>
                    <div>
                      <p className="text-3xl font-bold text-[#F5A623]">{userScore}</p>
                      <p className="text-xs text-gray-500 font-medium">Got through</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    {ariaScore > userScore
                      ? "ARIA wins this round! But hey, that means your family would be protected."
                      : ariaScore === userScore
                        ? "A tie! ARIA is tough, but you found some gaps. We're on it."
                        : "You found some gaps! We'll use your creativity to make ARIA even better."}
                  </p>
                </div>
              )}

              {/* Category Chart */}
              {chartData.length > 0 && (
                <div className="mb-10">
                  <h3 className="font-semibold text-[#1E3A4A] mb-4">Intervention Categories</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                        <YAxis type="category" dataKey="category" tick={{ fontSize: 12, fill: '#374151' }} width={110} />
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
                  <h3 className="font-semibold text-[#1E3A4A] mb-4">Co-Parent Toxicity Over Time</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={scoreTimeline}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="message" tick={{ fontSize: 12 }} label={{ value: 'Message #', position: 'bottom', fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} label={{ value: 'Toxicity %', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Toxicity']} />
                        <Line type="monotone" dataKey="score" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Sample Interventions */}
              {interventions.length > 0 && (
                <div className="mb-10">
                  <h3 className="font-semibold text-[#1E3A4A] mb-4">Sample Interventions</h3>
                  <div className="space-y-4">
                    {interventions.slice(0, 3).map((intervention, i) => (
                      <div key={i} className="grid md:grid-cols-2 gap-3">
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <X className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-xs text-red-500 font-medium">Original</span>
                          </div>
                          <p className="text-sm text-red-700">{intervention.original}</p>
                        </div>
                        <div className="bg-[#3DAA8A]/5 border border-[#3DAA8A]/20 rounded-xl px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#3DAA8A]" />
                            <span className="text-xs text-[#3DAA8A] font-medium">{intervention.accepted ? 'Accepted' : 'Suggested'}</span>
                          </div>
                          <p className="text-sm text-[#1E3A4A]">{intervention.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="bg-gradient-to-b from-[#F5A623]/5 to-transparent rounded-2xl border border-[#F5A623]/20 p-8">
                <div className="text-center mb-6">
                  <Sparkles className="w-8 h-8 text-[#F5A623] mx-auto mb-3" />
                  <h3 className="text-xl sm:text-2xl text-[#1E3A4A] mb-2" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                    Ready to protect your <span className="text-[#3DAA8A]">family</span>?
                  </h3>
                  <p className="text-gray-600 max-w-lg mx-auto">Join the first 50 early adopters and get 30% off for life. ARIA is waiting.</p>
                </div>
                <div className="max-w-md mx-auto">
                  <EarlyAdopterForm source="aria_demo" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* KIDSPACE — ARIA for children                                       */}
      {/* ================================================================= */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F5A623]/10 rounded-full mb-6">
                <Heart className="w-4 h-4 text-[#F5A623]" />
                <span className="text-sm font-medium text-[#F5A623]">Child-First Design</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl text-[#1E3A4A] mb-6"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                ARIA keeps kids <span className="text-[#F5A623]">out of the middle</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                When children use KidSpace to talk with their other parent, ARIA provides gentle, age-appropriate guardrails so kids can just be kids.
              </p>
              <ul className="space-y-4">
                {[
                  'Filters inappropriate content before it reaches children',
                  'Alerts parents to concerning language patterns',
                  'Provides age-appropriate conversation guidance',
                  'Creates a safe, monitored space for parent-child connection',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-[#F5A623]/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-[#F5A623]" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#F5A623]/15 to-[#3DAA8A]/15 rounded-full blur-3xl scale-110" />
                <div className="relative bg-gradient-to-br from-[#F4F8F7] to-white rounded-3xl p-10 shadow-xl border border-gray-100">
                  <div className="w-48 h-48 mx-auto relative">
                    <Image src="/images/Aria.png" alt="ARIA - AI Relationship Intelligence Assistant" fill className="object-contain" />
                  </div>
                  <p className="text-center text-[#1E3A4A] text-xl mt-5" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                    Hi! I&apos;m ARIA
                  </p>
                  <p className="text-center text-gray-500 text-sm mt-1">I help families communicate with calm and clarity</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* TRUST & PRIVACY                                                    */}
      {/* ================================================================= */}
      <section className="py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[#F4F8F7] to-white rounded-2xl p-8 lg:p-12 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl text-[#1E3A4A] mb-3" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                Built on trust, <span className="text-[#3DAA8A]">not surveillance</span>
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">ARIA is a coach, not a spy. Here&apos;s what that means:</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { title: 'You\'re always in control', desc: 'ARIA suggests — you decide. Every message is your choice. She never sends anything without your approval.' },
                { title: 'Private by default', desc: 'Your drafts and ARIA\'s suggestions are never shared with your co-parent. Only what you choose to send is visible.' },
                { title: 'Court-admissible records', desc: 'Sent messages are SHA-256 verified and timestamped. Accepted in courts across all 50 states.' },
                { title: 'No data selling, ever', desc: 'Your family\'s communication is never used for advertising, training, or sold to third parties.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="mt-1 w-8 h-8 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-[#3DAA8A]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1E3A4A] mb-1">{item.title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* BOTTOM CTA — Early Adopter                                         */}
      {/* ================================================================= */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F5A623]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Heart className="w-10 h-10 mb-6 text-[#F5A623]" />
              <h2
                className="text-3xl sm:text-4xl lg:text-5xl mb-6"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                Every calm message is a better day for your kids
              </h2>
              <p className="text-xl text-white/75 mb-8 leading-relaxed">
                ARIA is just one part of CommonGround — the complete co-parenting platform built with family law professionals.
              </p>

              <div className="space-y-3">
                {[
                  'ARIA-powered messaging',
                  'Automated custody calendar',
                  'Expense tracking with auto-splitting',
                  'Court-ready documentation',
                  'KidSpace video calls for children',
                  'No credit card required',
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white/80 text-sm">{feature}</span>
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
