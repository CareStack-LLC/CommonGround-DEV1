'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield,
  Send,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  MessageCircle,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react';
import { fallbackAnalyze, fallbackCoparentReply } from './aria-demo-fallback';

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
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

let _apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
if (_apiUrl.endsWith('/')) _apiUrl = _apiUrl.slice(0, -1);
if (!_apiUrl.endsWith('/api/v1')) _apiUrl += '/api/v1';
const API_URL = _apiUrl;

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
  conversationHistory: { role: string; text: string }[],
  userMessage: string,
  ariaEnabled: boolean,
): Promise<{ reply: string; aria_analysis: ARIAAnalysis; rewritten_reply: string | null }> {
  const res = await fetch(`${API_URL}/demo/coparent-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenario: 'schedule',
      conversation_history: conversationHistory,
      user_message: userMessage,
      aria_enabled: ariaEnabled,
    }),
  });
  if (!res.ok) throw new Error('Reply generation failed');
  return res.json();
}

// ---------------------------------------------------------------------------
// Category labels
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  hostility: 'Hostility', blame: 'Blame', passive_aggressive: 'Passive Aggressive',
  manipulation: 'Manipulation', dismissive: 'Dismissive', threatening: 'Threatening',
  profanity: 'Profanity', custody_weaponization: 'Custody Weaponization',
  financial_coercion: 'Financial Coercion', hate_speech: 'Hate Speech',
  sexual_harassment: 'Sexual Harassment', insult: 'Insult', sarcasm: 'Sarcasm',
  all_caps: 'Aggressive Tone',
};

const CATEGORY_COLORS: Record<string, string> = {
  hostility: '#C53030', blame: '#F5A623', passive_aggressive: '#F5A623',
  manipulation: '#4BA8C8', dismissive: '#6b7280', threatening: '#C53030',
  profanity: '#C53030', custody_weaponization: '#9B2C2C', financial_coercion: '#E09520',
  hate_speech: '#7A2222', sexual_harassment: '#9B2C2C', insult: '#E09520',
  sarcasm: '#a3a3a3', all_caps: '#F5A623',
};

const TAUNTS = [
  "Nice try! ARIA caught that.",
  "ARIA saw that coming.",
  "Caught! Try something creative.",
  "ARIA: 1, You: 0.",
  "ARIA's trained on 127K+ messages.",
  "Good effort! Try again.",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HomeARIADemo() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'opener',
      role: 'coparent',
      text: "We need to talk about the schedule. You keep messing it up and honestly the kids are done with it.",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [ariaEnabled, setAriaEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingIntervention, setPendingIntervention] = useState<{
    analysis: ARIAAnalysis;
    originalText: string;
  } | null>(null);
  const [currentTaunt, setCurrentTaunt] = useState('');
  const [offlineMode, setOfflineMode] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // Scroll only the chat container, not the page
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  useEffect(() => {
    if (!pendingIntervention) {
      // Re-focus input without scrolling the page
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [pendingIntervention]);

  const sendMessage = useCallback(async (text: string, isRewrite = false, originalText?: string) => {
    if (!text.trim()) return;

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
        result = await getCoparentReply(history, text, ariaEnabled);
      } catch (err) {
        // Backend unreachable — keep the demo alive with a local simulation.
        console.error('Falling back to offline demo reply:', err);
        result = fallbackCoparentReply('schedule', history, text, ariaEnabled);
        setOfflineMode(true);
      }

      const coparentMsg: ChatMessage = {
        id: crypto.randomUUID(), role: 'coparent',
        text: ariaEnabled && result.rewritten_reply ? result.rewritten_reply : result.reply,
        original: ariaEnabled && result.rewritten_reply ? result.reply : undefined,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, coparentMsg]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [messages, ariaEnabled]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    if (ariaEnabled) {
      // When ARIA is ON, force_rewrite=true means EVERY message gets a civil rewrite
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
        // Auto-send the ARIA suggestion (shows original crossed out + rewrite)
        setCurrentTaunt(TAUNTS[Math.floor(Math.random() * TAUNTS.length)]);
        await sendMessage(analysis.suggestion, true, inputText);
        return;
      }
    }

    await sendMessage(inputText);
  };

  const handleAcceptSuggestion = async () => {
    if (!pendingIntervention) return;
    setPendingIntervention(null);
    await sendMessage(pendingIntervention.analysis.suggestion!, true, pendingIntervention.originalText);
  };

  const handleSendOriginal = async () => {
    if (!pendingIntervention) return;
    const text = pendingIntervention.originalText;
    setPendingIntervention(null);
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
      {/* Left side — copy */}
      <div className="lg:col-span-2">
        <div className="inline-flex items-center gap-2 mb-4">
          <MessageCircle className="h-5 w-5 text-cg-amber" />
          <span className="text-sm font-semibold text-cg-amber uppercase tracking-wide">
            Try ARIA Live
          </span>
        </div>
        <h2
          className="text-3xl sm:text-4xl mb-4"
          style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
        >
          Think you can get past{' '}
          <span className="text-cg-amber">ARIA</span>?
        </h2>
        <p className="text-lg text-white/80 mb-4 leading-relaxed">
          Type something petty, hostile, or passive-aggressive. ARIA catches it in real-time — the same AI protecting real families on CommonGround.
        </p>
        <p className="text-sm text-white/50 mb-4">
          Toggle ARIA off to see messages without protection.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-cg-amber mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-white/80 font-medium mb-1">ARIA is always learning</p>
              <p className="text-xs text-white/50 leading-relaxed">
                Every message you test here helps us improve ARIA for real families. Go ahead — try your worst and help make co-parenting communication safer for everyone.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/aria"
          className="inline-flex items-center gap-2 text-cg-amber font-medium hover:text-cg-amber/80 transition-colors text-sm"
        >
          Learn more about ARIA
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Right side — live chat */}
      <div className="lg:col-span-3">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white/60" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Co-Parent (AI)</p>
                <p className="text-white/40 text-[11px]">Schedule Dispute</p>
              </div>
            </div>

            <button
              onClick={() => setAriaEnabled(!ariaEnabled)}
              className={`
                flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all
                ${ariaEnabled
                  ? 'bg-cg-sage/30 text-[#5BC4A0] border border-cg-sage/40'
                  : 'bg-white/10 text-white/50 border border-white/20'
                }
              `}
            >
              {ariaEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              ARIA {ariaEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Messages */}
          <div ref={chatContainerRef} className="h-[300px] sm:h-[340px] overflow-y-auto px-4 sm:px-5 py-3 space-y-3" style={{ background: 'rgba(11,20,26,0.6)' }}>
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] space-y-1">
                  {msg.original && (
                    <div className={`text-[11px] px-2.5 py-1.5 rounded-lg mb-0.5 bg-[#C53030]/20 text-[#FCA5A5] line-through ${msg.role === 'user' ? 'text-right' : ''}`}>
                      {msg.original}
                    </div>
                  )}
                  <div className={`
                    px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-[#2D8A70] text-white rounded-br-md'
                      : 'bg-white/10 text-white/90 rounded-bl-md border border-white/10'
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
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl rounded-bl-md px-3.5 py-2.5 border border-white/10">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* scroll anchor handled by chatContainerRef */}
          </div>

          {/* Intervention Panel */}
          {pendingIntervention && (
            <div className="border-t border-cg-sage/40 bg-cg-sage/10 px-4 sm:px-5 py-4">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 bg-cg-sage/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="w-4 h-4 text-cg-sage" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold mb-1">{currentTaunt}</p>
                  <p className="text-white/60 text-xs mb-3 line-clamp-2">{pendingIntervention.analysis.explanation}</p>

                  {/* Category badges */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {pendingIntervention.analysis.categories.slice(0, 3).map(cat => (
                      <span
                        key={cat}
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: (CATEGORY_COLORS[cat] || '#6b7280') + '30',
                          color: CATEGORY_COLORS[cat] || '#9ca3af',
                        }}
                      >
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                    ))}
                  </div>

                  {/* Before/After compact */}
                  <div className="space-y-1.5 mb-3">
                    <div className="bg-[#C53030]/15 rounded-lg px-3 py-2 border border-[#C53030]/20">
                      <p className="text-[10px] text-[#E06B6B] font-medium mb-0.5">Your message</p>
                      <p className="text-xs text-[#FCA5A5] line-clamp-2">{pendingIntervention.originalText}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg px-3 py-2 border border-cg-sage/20">
                      <p className="text-[10px] text-cg-sage font-medium mb-0.5">ARIA&apos;s suggestion</p>
                      <p className="text-xs text-white/80 line-clamp-2">{pendingIntervention.analysis.suggestion}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleAcceptSuggestion}
                      className="flex items-center gap-1.5 bg-cg-sage hover:bg-cg-sage-dark text-white text-xs font-medium rounded-full px-4 py-1.5 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Use Suggestion
                    </button>
                    <button
                      onClick={handleSendOriginal}
                      className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/70 text-xs font-medium rounded-full px-4 py-1.5 transition-colors"
                    >
                      Send Original
                    </button>
                    <button onClick={() => setPendingIntervention(null)} className="text-white/30 hover:text-white/50 ml-auto">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          {!pendingIntervention && (
            <div className="border-t border-white/10 px-4 sm:px-5 py-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isLoading ? 'Waiting for reply...' : 'Type something petty...'}
                  disabled={isLoading}
                  // Mobile: text-base (16px) is required so iOS Safari doesn't
                  // auto-zoom into the input on focus — the demo chat window
                  // must stay fully in view so the user can see ARIA's
                  // responses without having to pinch-zoom back out.
                  // Desktop: drops to text-sm to match the visual density
                  // of the rest of the card.
                  className="flex-1 bg-white/10 border border-white/10 rounded-full px-4 py-2.5 text-base sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cg-sage/50 focus:border-cg-sage/50 disabled:opacity-50 transition-all"
                  autoCapitalize="sentences"
                  autoComplete="off"
                  autoCorrect="on"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || isLoading}
                  className="w-10 h-10 bg-cg-sage hover:bg-cg-sage-dark text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {ariaEnabled && (
                <div className="mt-1.5 px-1 space-y-0.5">
                  <p className="text-[11px] text-white/30 flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" /> ARIA is rewriting all messages to be civil and child-focused
                  </p>
                  <p className="text-[10px] text-white/20 italic">
                    The <span className="text-[#E06B6B]/60 line-through">crossed-out text</span> is shown here so you can see what ARIA blocked — in the real app, only the rewritten message is sent.
                  </p>
                </div>
              )}
              {offlineMode && (
                <p className="mt-1.5 px-1 text-[10px] text-white/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-cg-amber" /> Offline preview — showing a simulated ARIA response. The full ARIA runs live inside the app.
                </p>
              )}
            </div>
          )}
        </div>
        <p className="text-center text-xs text-white/30 mt-3 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3 h-3" />
          Your conversations help train ARIA to catch new patterns — keep testing!
        </p>
      </div>
    </div>
  );
}
