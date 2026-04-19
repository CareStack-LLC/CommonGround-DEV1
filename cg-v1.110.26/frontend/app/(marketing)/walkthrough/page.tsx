'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield,
  Brain,
  RefreshCw,
  Send,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  MessageSquare,
  Calendar,
  Stethoscope,
  DollarSign,
  Gift,
  MessageCircle,
  Heart,
  ArrowRight,
  Sparkles,
  X,
  ChevronDown,
  Scale,
  Check,
  Zap,
  Target,
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
  hostility: '#ef4444',
  blame: '#f97316',
  passive_aggressive: '#f59e0b',
  manipulation: '#8b5cf6',
  dismissive: '#6b7280',
  threatening: '#dc2626',
  profanity: '#e11d48',
  custody_weaponization: '#b91c1c',
  financial_coercion: '#d97706',
  hate_speech: '#7f1d1d',
  sexual_harassment: '#9f1239',
  insult: '#ea580c',
  sarcasm: '#a3a3a3',
  all_caps: '#fbbf24',
};

const CATEGORY_LABELS: Record<string, string> = {
  hostility: 'Hostility',
  blame: 'Blame & Gaslighting',
  passive_aggressive: 'Passive Aggressive',
  manipulation: 'Manipulation',
  dismissive: 'Dismissive',
  threatening: 'Threatening',
  profanity: 'Profanity',
  custody_weaponization: 'Custody Weaponization',
  financial_coercion: 'Financial Coercion',
  hate_speech: 'Hate Speech',
  sexual_harassment: 'Sexual Harassment',
  insult: 'Insult',
  sarcasm: 'Sarcasm',
  all_caps: 'Aggressive Tone',
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

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function analyzeMessage(content: string): Promise<ARIAAnalysis> {
  const res = await fetch(`${API_URL}/demo/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
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
    body: JSON.stringify({
      scenario,
      conversation_history: conversationHistory,
      user_message: userMessage,
      aria_enabled: ariaEnabled,
    }),
  });
  if (!res.ok) throw new Error('Reply generation failed');
  return res.json();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ARIADemoPage() {
  // State
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [ariaEnabled, setAriaEnabled] = useState(true);
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

  const chatEndRef = useRef<HTMLDivElement>(null);
  const simulatorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input after intervention dismissed
  useEffect(() => {
    if (!pendingIntervention && scenario) {
      inputRef.current?.focus();
    }
  }, [pendingIntervention, scenario]);

  const scrollToSimulator = () => {
    simulatorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getRandomTaunt = () => {
    return ARIA_TAUNTS[Math.floor(Math.random() * ARIA_TAUNTS.length)];
  };

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
      schedule: "We need to talk about the schedule. You keep messing it up and the kids are confused.",
      medical: "I took the kids to the doctor today. Don't bother asking, I made the decision.",
      financial: "Where's this month's payment? You're always late. The kids need things and you can't even handle that.",
      holiday: "I'm keeping the kids for Thanksgiving. They already know. Don't make this into a thing.",
      communication: "Stop texting me every 5 minutes. I'll respond when I feel like it.",
      new_partner: "I heard you have someone new around my kids. We need to talk about that right now.",
    };

    const opener = openers[s];
    const openerMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'coparent',
      text: opener,
      timestamp: new Date(),
    };
    setMessages([openerMsg]);

    setTimeout(() => simulatorRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendMessage = useCallback(async (text: string, isRewrite: boolean = false, originalText?: string) => {
    if (!scenario || !text.trim()) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
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
        id: crypto.randomUUID(),
        role: 'coparent',
        text: ariaEnabled && result.rewritten_reply ? result.rewritten_reply : result.reply,
        original: ariaEnabled && result.rewritten_reply ? result.reply : undefined,
        ariaAnalysis: result.aria_analysis,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, coparentMsg]);

      if (result.aria_analysis.is_flagged && result.rewritten_reply) {
        setInterventions(prev => [
          ...prev,
          {
            original: result.reply,
            suggestion: result.rewritten_reply!,
            categories: result.aria_analysis.categories,
            accepted: ariaEnabled,
            score: result.aria_analysis.toxicity_score,
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to get reply:', err);
    } finally {
      setIsLoading(false);
    }
  }, [scenario, messages, ariaEnabled]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    if (ariaEnabled) {
      try {
        const analysis = await analyzeMessage(inputText);
        if (analysis.is_flagged && analysis.suggestion) {
          setAriaScore(prev => prev + 1);
          setCurrentTaunt(getRandomTaunt());
          setPendingIntervention({ analysis, originalText: inputText });
          return;
        }
      } catch (err) {
        console.error('Analysis failed:', err);
      }
    }

    // Message got through clean
    setUserScore(prev => prev + 1);
    await sendMessage(inputText);
  };

  const handleAcceptSuggestion = async () => {
    if (!pendingIntervention) return;
    const { analysis, originalText } = pendingIntervention;

    setInterventions(prev => [
      ...prev,
      {
        original: originalText,
        suggestion: analysis.suggestion!,
        categories: analysis.categories,
        accepted: true,
        score: analysis.toxicity_score,
      },
    ]);
    setPendingIntervention(null);
    await sendMessage(analysis.suggestion!, true, originalText);
  };

  const handleSendOriginal = async () => {
    if (!pendingIntervention) return;
    const { analysis, originalText } = pendingIntervention;

    setInterventions(prev => [
      ...prev,
      {
        original: originalText,
        suggestion: analysis.suggestion!,
        categories: analysis.categories,
        accepted: false,
        score: analysis.toxicity_score,
      },
    ]);
    setPendingIntervention(null);
    await sendMessage(originalText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
      category: CATEGORY_LABELS[category] || category,
      count,
      fill: CATEGORY_COLORS[category] || '#6b7280',
    }))
    .sort((a, b) => b.count - a.count);

  const scoreTimeline = messages
    .filter(m => m.ariaAnalysis)
    .map((m, i) => ({
      message: i + 1,
      score: Math.round((m.ariaAnalysis!.toxicity_score) * 100),
    }));

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#F4F8F7]">
      {/* ======================== HERO SECTION ======================== */}
      <section className="pt-16 pb-12 lg:pt-24 lg:pb-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-[#F5A623] font-medium mb-5 tracking-widest uppercase text-xs flex items-center justify-center gap-3">
            <span className="w-8 h-px bg-[#F5A623]/40" />
            The ARIA Challenge
            <span className="w-8 h-px bg-[#F5A623]/40" />
          </p>

          <h1
            className="text-4xl sm:text-5xl lg:text-[3.5rem] text-[#1E3A4A] mb-6 leading-[1.15]"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Think you can get past{' '}
            <span className="text-[#3DAA8A]">ARIA</span>?
          </h1>

          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-4">
            Try to send the pettiest, most passive-aggressive co-parenting message you can think of.
            ARIA catches it all — the same AI that protects real families on CommonGround.
          </p>

          <p className="text-sm text-gray-400 mb-10">
            Powered by 1,500+ detection patterns and 3-tier AI analysis — and always improving
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-10">
            {[
              { value: '14', label: 'Toxicity Categories', icon: Target },
              { value: '3-Tier', label: 'AI Analysis', icon: Brain },
              { value: '127K+', label: 'Messages Trained', icon: Zap },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#D6ECE8] p-4">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-8 h-8 bg-[#3DAA8A]/10 rounded-lg flex items-center justify-center">
                    <stat.icon className="w-4 h-4 text-[#3DAA8A]" />
                  </div>
                </div>
                <p className="text-xl font-bold text-[#1E3A4A]">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <button
            onClick={scrollToSimulator}
            className="inline-flex items-center gap-2 bg-[#3DAA8A] hover:bg-[#2D8A70] text-white font-semibold rounded-full px-8 py-4 text-lg transition-all hover:scale-105 shadow-lg"
          >
            Take the Challenge
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </button>
        </div>
      </section>

      {/* ======================== SIMULATOR SECTION ======================== */}
      <section ref={simulatorRef} className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2
            className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Choose Your <span className="text-[#3DAA8A]">Battle</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Pick a co-parenting scenario and try to outsmart ARIA. Go ahead — be difficult.
          </p>
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
                {isSelected && (
                  <div className="absolute top-3 right-3 w-3 h-3 bg-[#3DAA8A] rounded-full" />
                )}
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
                  <p className="text-xs text-gray-500">
                    {SCENARIOS.find(s => s.key === scenario)?.label}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Petty Score */}
                {(ariaScore > 0 || userScore > 0) && (
                  <div className="hidden sm:flex items-center gap-2 bg-[#1E3A4A]/5 rounded-full px-3 py-1.5 text-xs font-medium">
                    <span className="text-[#3DAA8A]">ARIA: {ariaScore}</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-[#F5A623]">You: {userScore}</span>
                  </div>
                )}

                {/* ARIA Toggle */}
                <button
                  onClick={() => setAriaEnabled(!ariaEnabled)}
                  className={`
                    flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all
                    ${ariaEnabled
                      ? 'bg-[#3DAA8A]/10 text-[#3DAA8A] border border-[#3DAA8A]/30'
                      : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }
                  `}
                >
                  {ariaEnabled ? (
                    <ToggleRight className="w-5 h-5" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                  ARIA {ariaEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="h-[460px] overflow-y-auto px-6 py-4 space-y-4 bg-[#fafbfc]">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] space-y-1`}>
                    {msg.original && (
                      <div className={`
                        text-xs px-3 py-2 rounded-xl mb-1
                        ${msg.role === 'user'
                          ? 'bg-red-50 text-red-400 line-through text-right'
                          : 'bg-red-50 text-red-400 line-through'
                        }
                      `}>
                        {msg.original}
                      </div>
                    )}
                    <div className={`
                      px-4 py-3 rounded-2xl text-sm leading-relaxed
                      ${msg.role === 'user'
                        ? 'bg-[#3DAA8A] text-white rounded-br-md'
                        : 'bg-white text-[#1E3A4A] border border-gray-200 rounded-bl-md shadow-sm'
                      }
                    `}>
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
                        <span className="text-amber-600">
                          {msg.ariaAnalysis.categories.map(c => CATEGORY_LABELS[c] || c).join(', ')}
                        </span>
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

              <div ref={chatEndRef} />
            </div>

            {/* ARIA Intervention Panel */}
            {pendingIntervention && (
              <div className="border-t-2 border-[#3DAA8A] bg-[#3DAA8A]/5 px-6 py-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#3DAA8A]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-[#3DAA8A]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-[#1E3A4A] text-sm mb-1">
                      {currentTaunt || "ARIA caught this one!"}
                    </h4>
                    <p className="text-xs text-gray-600 mb-3">{pendingIntervention.analysis.explanation}</p>

                    {/* Categories */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {pendingIntervention.analysis.categories.map(cat => (
                        <span
                          key={cat}
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: (CATEGORY_COLORS[cat] || '#6b7280') + '20',
                            color: CATEGORY_COLORS[cat] || '#6b7280',
                          }}
                        >
                          {CATEGORY_LABELS[cat] || cat}
                        </span>
                      ))}
                    </div>

                    {/* Before / After */}
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

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleAcceptSuggestion}
                        className="flex items-center gap-2 bg-[#3DAA8A] hover:bg-[#2D8A70] text-white text-sm font-medium rounded-full px-5 py-2 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Use Suggestion
                      </button>
                      <button
                        onClick={handleSendOriginal}
                        className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-full px-5 py-2 border border-gray-200 transition-colors"
                      >
                        Send Original
                      </button>
                      <button
                        onClick={() => setPendingIntervention(null)}
                        className="flex items-center gap-2 text-gray-400 hover:text-gray-600 text-sm transition-colors ml-auto"
                      >
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
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    ARIA is active — your messages will be analyzed before sending
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Generate Report Button */}
        {messages.length >= 4 && !showReport && (
          <div className="text-center mt-8">
            <button
              onClick={() => setShowReport(true)}
              className="inline-flex items-center gap-2 bg-[#2D6A8F] hover:bg-[#1E3A4A] text-white font-semibold rounded-full px-8 py-4 transition-all hover:scale-105 shadow-lg"
            >
              <BarChart3 className="w-5 h-5" />
              Generate Communication Report
            </button>
          </div>
        )}
      </section>

      {/* ======================== TRUST BRIDGE SECTION ======================== */}
      <section className="pb-16 lg:pb-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2
              className="text-3xl sm:text-4xl text-[#1E3A4A] mb-4"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              This is the <span className="text-[#3DAA8A]">real ARIA</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Everything you just experienced runs on the exact same detection engine that protects
              real families on CommonGround. When you try to get past ARIA here, you&apos;re actually
              helping us improve it for everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: 'Same Detection Engine',
                desc: '1,500+ regex patterns + Claude AI analysis. No watered-down demo version — this is the real thing.',
              },
              {
                icon: RefreshCw,
                title: 'Always Improving',
                desc: 'Every creative message helps us find new patterns. You\'re literally making ARIA smarter for real families.',
              },
              {
                icon: Scale,
                title: 'Court-Ready',
                desc: 'In the real platform, ARIA logs every intervention — creating court-ready documentation automatically.',
              },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#D6ECE8] p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-[#3DAA8A]/10 rounded-xl flex items-center justify-center mb-4">
                  <card.icon className="w-6 h-6 text-[#3DAA8A]" />
                </div>
                <h3 className="font-semibold text-[#1E3A4A] mb-2">{card.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== REPORT SECTION ======================== */}
      {showReport && (
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="bg-white rounded-3xl shadow-xl border border-[#D6ECE8] overflow-hidden">
            {/* Report Header */}
            <div className="bg-gradient-to-r from-[#1E3A4A] to-[#2D6A8F] text-white px-8 py-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-6 h-6" />
                <h2
                  className="text-2xl font-bold"
                  style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                >
                  Communication Report
                </h2>
              </div>
              <p className="text-white/70 text-sm">
                ARIA analysis of your demo conversation — {SCENARIOS.find(s => s.key === scenario)?.label}
              </p>
            </div>

            <div className="p-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {[
                  { label: 'Total Messages', value: totalMessages, color: '#2D6A8F' },
                  { label: 'ARIA Interventions', value: totalInterventions, color: '#F5A623' },
                  { label: 'Suggestions Accepted', value: acceptedInterventions, color: '#3DAA8A' },
                  { label: 'Acceptance Rate', value: `${acceptanceRate}%`, color: acceptanceRate >= 50 ? '#3DAA8A' : '#ef4444' },
                ].map((stat, i) => (
                  <div key={i} className="bg-gray-50 rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold mb-1" style={{ color: stat.color }}>
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Petty Score Summary */}
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
                        : "You found some gaps! We'll use your creativity to make ARIA even better."
                    }
                  </p>
                </div>
              )}

              {/* Category Breakdown Chart */}
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
                          {chartData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
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

              {/* Sample Before/After */}
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
                            <span className="text-xs text-[#3DAA8A] font-medium">
                              {intervention.accepted ? 'Accepted' : 'Suggested'}
                            </span>
                          </div>
                          <p className="text-sm text-[#1E3A4A]">{intervention.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA with Early Adopter Form */}
              <div className="bg-gradient-to-b from-[#F5A623]/5 to-transparent rounded-2xl border border-[#F5A623]/20 p-8">
                <div className="text-center mb-6">
                  <Sparkles className="w-8 h-8 text-[#F5A623] mx-auto mb-3" />
                  <h3
                    className="text-xl sm:text-2xl text-[#1E3A4A] mb-2"
                    style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                  >
                    Ready to protect your <span className="text-[#3DAA8A]">family</span>?
                  </h3>
                  <p className="text-gray-600 max-w-lg mx-auto">
                    Join the first 50 early adopters and get 30% off for life. ARIA is waiting.
                  </p>
                </div>
                <div className="max-w-md mx-auto">
                  <EarlyAdopterForm source="aria_demo" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ======================== BOTTOM CTA SECTION ======================== */}
      <section className="pb-16 lg:pb-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left: Benefits */}
            <div>
              <h2
                className="text-2xl sm:text-3xl text-[#1E3A4A] mb-4"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                Join families who communicate{' '}
                <span className="text-[#3DAA8A]">better</span>
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                ARIA is just one part of CommonGround — the complete co-parenting platform
                built with family law professionals.
              </p>

              <div className="space-y-4">
                {[
                  'ARIA-powered messaging',
                  'Automated custody calendar',
                  'Expense tracking with auto-splitting',
                  'Court-ready documentation',
                  'KidSpace video calls for children',
                  'No credit card required',
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-[#3DAA8A]" />
                    </div>
                    <span className="text-sm text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Early Adopter Form */}
            <div className="lg:sticky lg:top-24">
              <EarlyAdopterForm source="aria_demo_bottom" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
