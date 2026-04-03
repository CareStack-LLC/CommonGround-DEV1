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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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

  const handleSelectScenario = (s: Scenario) => {
    setScenario(s);
    setMessages([]);
    setInterventions([]);
    setShowReport(false);
    setPendingIntervention(null);

    // Add an opening hostile message from the AI co-parent
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
      // Get AI co-parent reply
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

      // Track co-parent interventions
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
      // Analyze the user's message first
      try {
        const analysis = await analyzeMessage(inputText);
        if (analysis.is_flagged && analysis.suggestion) {
          setPendingIntervention({ analysis, originalText: inputText });
          return;
        }
      } catch (err) {
        console.error('Analysis failed:', err);
      }
    }

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
  const userMessages = messages.filter(m => m.role === 'user').length;
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1E3A4A] via-[#2D6A8F] to-[#1E3A4A] text-white">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#3DAA8A]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#F5A623]/10 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8">
            <Shield className="w-4 h-4 text-[#3DAA8A]" />
            <span className="text-sm font-medium">AI-Powered Communication Guardian</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ fontFamily: 'var(--font-dm-serif, serif)' }}>
            Meet <span className="text-[#3DAA8A]">ARIA</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto mb-8">
            Your AI co-parenting mediator that catches harmful language before it&apos;s sent
            and suggests calmer alternatives — protecting your children and your court record.
          </p>

          {/* 3-step explanation */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            {[
              { icon: Shield, title: 'Detects', desc: 'Scans every message for hostility, blame, manipulation, and 11 other toxic patterns' },
              { icon: Brain, title: 'Understands', desc: 'AI analyzes context and intent — not just keywords — to catch subtle conflict escalation' },
              { icon: RefreshCw, title: 'Rewrites', desc: 'Suggests a calmer version that preserves your meaning without the emotional charge' },
            ].map((step, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <div className="w-12 h-12 bg-[#3DAA8A]/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-6 h-6 text-[#3DAA8A]" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-white/70 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>

          <button
            onClick={scrollToSimulator}
            className="inline-flex items-center gap-2 bg-[#3DAA8A] hover:bg-[#2D8A70] text-white font-semibold rounded-full px-8 py-4 text-lg transition-all hover:scale-105 shadow-lg"
          >
            Try ARIA Live
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </button>
        </div>
      </section>

      {/* ======================== SIMULATOR SECTION ======================== */}
      <section ref={simulatorRef} className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1E3A4A] mb-4" style={{ fontFamily: 'var(--font-dm-serif, serif)' }}>
            Interactive Demo
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose a scenario and experience a simulated conversation with a difficult co-parent.
            Toggle ARIA on and off to see the difference.
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
                    : 'border-gray-200 bg-white hover:border-[#3DAA8A]/40 hover:shadow-sm'
                  }
                `}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isSelected ? 'bg-[#3DAA8A]/20' : 'bg-gray-100'}`}>
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-[#3DAA8A]' : 'text-gray-500'}`} />
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
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-semibold text-[#1E3A4A] text-sm">Co-Parent (AI Simulation)</p>
                  <p className="text-xs text-gray-500">
                    {SCENARIOS.find(s => s.key === scenario)?.label}
                  </p>
                </div>
              </div>

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

            {/* Messages Area */}
            <div className="h-[460px] overflow-y-auto px-6 py-4 space-y-4 bg-[#fafbfc]">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] space-y-1`}>
                    {/* Show original if rewritten */}
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
                    {/* ARIA badge on rewritten messages */}
                    {msg.original && (
                      <div className={`flex items-center gap-1 text-xs ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        <Shield className="w-3 h-3 text-[#3DAA8A]" />
                        <span className="text-[#3DAA8A] font-medium">Rewritten by ARIA</span>
                      </div>
                    )}
                    {/* ARIA analysis indicator for co-parent messages */}
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
              <div className="border-t-2 border-amber-300 bg-amber-50 px-6 py-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-[#1E3A4A] text-sm mb-1">ARIA detected potential conflict</h4>
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
                      <div className="bg-[#3DAA8A]/5 border border-[#3DAA8A]/20 rounded-xl px-4 py-2.5">
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
                    placeholder={isLoading ? 'Waiting for reply...' : 'Type your message...'}
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

                {/* Tip */}
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

      {/* ======================== REPORT SECTION ======================== */}
      {showReport && (
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Report Header */}
            <div className="bg-gradient-to-r from-[#1E3A4A] to-[#2D6A8F] text-white px-8 py-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-6 h-6" />
                <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-serif, serif)' }}>
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
                        <Tooltip formatter={(value: number) => [`${value}%`, 'Toxicity']} />
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

              {/* CTA */}
              <div className="bg-gradient-to-r from-[#3DAA8A]/10 to-[#2D6A8F]/10 rounded-2xl p-8 text-center">
                <Sparkles className="w-8 h-8 text-[#F5A623] mx-auto mb-3" />
                <h3 className="text-xl font-bold text-[#1E3A4A] mb-2" style={{ fontFamily: 'var(--font-dm-serif, serif)' }}>
                  Ready to communicate better?
                </h3>
                <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                  ARIA works on every message in CommonGround — with deeper AI analysis,
                  court-ready documentation, and personalized coaching based on your custody agreement.
                </p>
                <Link
                  href="/early-access"
                  className="inline-flex items-center gap-2 bg-[#3DAA8A] hover:bg-[#2D8A70] text-white font-semibold rounded-full px-8 py-4 transition-all hover:scale-105 shadow-lg"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
