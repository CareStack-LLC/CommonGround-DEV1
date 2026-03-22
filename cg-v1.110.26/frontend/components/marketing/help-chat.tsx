'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Send, Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { trackCTAClick } from '@/lib/analytics';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_MESSAGES = 20;
const GREETING =
  "Hi! I'm ARIA. Ask me anything about CommonGround — features, pricing, how to get started, or troubleshooting. I'll point you to the right guide!";

/**
 * Renders message content, converting markdown links and bold text.
 */
function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\[[^\]]+\]\([^)]+\))/g);

  return (
    <>
      {parts.map((part, i) => {
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          return (
            <Link
              key={i}
              href={linkMatch[2]}
              className="text-[#3DAA8A] underline underline-offset-2 hover:text-[#2D8A70] font-medium"
            >
              {linkMatch[1]}
            </Link>
          );
        }
        const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
        return boldParts.map((bp, j) => {
          const boldMatch = bp.match(/^\*\*([^*]+)\*\*$/);
          if (boldMatch) {
            return (
              <strong key={`${i}-${j}`} className="font-semibold">
                {boldMatch[1]}
              </strong>
            );
          }
          return <span key={`${i}-${j}`}>{bp}</span>;
        });
      })}
    </>
  );
}

export function HelpChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
    setIsLoading(false);
    setHasStarted(false);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    if (messages.length >= MAX_MESSAGES) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "We've reached the conversation limit. Please click reset to start a new conversation, or visit our [Contact page](/help/contact) for more help.",
        },
      ]);
      return;
    }

    if (!hasStarted) {
      setHasStarted(true);
      trackCTAClick('help_chat_used', 'help_center');
    }

    const userMessage: Message = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/help-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error || 'Failed to get a response. Please try again.'
        );
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: assistantContent,
          };
          return updated;
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I'm sorry, ${errorMessage} You can also reach us at [Contact Support](/help/contact) or email support@find-commonground.com.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      {/* Input area — always visible */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-[#3DAA8A]" />
          <span className="text-sm font-medium text-[#1E3A4A]">
            Ask ARIA
          </span>
          {hasStarted && (
            <button
              onClick={handleReset}
              className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-[#3DAA8A] transition-colors"
              title="Start new conversation"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="How do I invite my co-parent? What is KidSpace? How do I export for court?"
            disabled={isLoading}
            rows={1}
            className="flex-1 px-4 py-3 bg-white rounded-xl border-2 border-gray-200 text-[15px] text-[#1E3A4A] placeholder:text-gray-400 focus:outline-none focus:border-[#3DAA8A] focus:ring-2 focus:ring-[#3DAA8A]/20 transition-all disabled:opacity-50 resize-none shadow-sm"
            maxLength={2000}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="flex items-center justify-center w-11 h-11 bg-[#3DAA8A] text-white rounded-xl hover:bg-[#34967a] transition-colors disabled:opacity-40 disabled:hover:bg-[#3DAA8A] flex-shrink-0 self-end shadow-sm"
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Conversation — appears after first message */}
      {hasStarted && messages.length > 0 && (
        <div className="mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto px-5 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#3DAA8A] text-white rounded-br-md'
                      : 'bg-[#F4F8F7] text-[#1E3A4A] rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="whitespace-pre-wrap">
                      <MessageContent content={msg.content} />
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {isLoading &&
              messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="bg-[#F4F8F7] text-[#1E3A4A] rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      ARIA is thinking...
                    </div>
                  </div>
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
