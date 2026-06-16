'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Send, Loader2, RotateCcw } from 'lucide-react';
import { trackCTAClick } from '@/lib/analytics';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_MESSAGES = 20;

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
              className="text-cg-sage underline underline-offset-2 hover:text-cg-sage-dark font-medium"
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
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll within the chat container, not the page
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
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
      {/* Chat container — conversation on top, input on bottom */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-foreground rounded-t-2xl">
          <Image
            src="/images/Aria.png"
            alt="ARIA"
            width={32}
            height={32}
            className="rounded-full object-cover"
          />
          <span className="text-sm font-semibold text-white">
            Ask ARIA
          </span>
          {hasStarted && (
            <button
              onClick={handleReset}
              className="ml-auto flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors"
              title="Start new conversation"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Messages area — fixed height, scrollable */}
        <div
          ref={chatContainerRef}
          className="h-[360px] overflow-y-auto px-5 py-4 space-y-4"
        >
          {/* Welcome message always visible */}
          {!hasStarted && (
            <div className="flex items-start gap-3 justify-start">
              <Image
                src="/images/Aria.png"
                alt="ARIA"
                width={28}
                height={28}
                className="rounded-full object-cover flex-shrink-0 mt-1"
              />
              <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed bg-cg-sand text-foreground">
                Hi! I&apos;m ARIA. Ask me anything about CommonGround &mdash; features, pricing, how to get started, or troubleshooting. I&apos;ll point you to the right guide!
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <Image
                  src="/images/Aria.png"
                  alt="ARIA"
                  width={28}
                  height={28}
                  className="rounded-full object-cover flex-shrink-0 mt-1"
                />
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cg-sage text-white rounded-br-md'
                    : 'bg-cg-sand text-foreground rounded-bl-md'
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
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          ))}

          {isLoading &&
            messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-start gap-3 justify-start">
                <Image
                  src="/images/Aria.png"
                  alt="ARIA"
                  width={28}
                  height={28}
                  className="rounded-full object-cover flex-shrink-0 mt-1"
                />
                <div className="bg-cg-sand text-foreground rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    ARIA is thinking...
                  </div>
                </div>
              </div>
            )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area — pinned at bottom */}
        <div className="border-t border-gray-100 px-4 py-3 bg-white">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask ARIA a question..."
              disabled={isLoading}
              rows={1}
              className="flex-1 px-4 py-3 bg-cg-sand rounded-xl border border-gray-200 text-[15px] text-foreground placeholder:text-gray-400 focus:outline-none focus:border-cg-sage focus:ring-2 focus:ring-cg-sage/20 transition-all disabled:opacity-50 resize-none"
              maxLength={2000}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="flex items-center justify-center w-11 h-11 bg-cg-sage text-white rounded-xl hover:bg-cg-sage-dark transition-colors disabled:opacity-40 disabled:hover:bg-cg-sage flex-shrink-0 self-end shadow-sm"
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
      </div>
    </div>
  );
}
