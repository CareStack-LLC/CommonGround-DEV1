'use client';

/**
 * Parent ↔ Circle-Contact chat.
 *
 * Dedicated coordination thread ("can I take Mia to a movie Saturday?")
 * that does NOT route through the child. Backed by
 * /api/v1/circle-parent-messages.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Send,
  Shield,
  Loader2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import {
  circleParentMessagesAPI,
  CircleParentMessage,
} from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ParentCircleChatPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.contactId as string;

  const [messages, setMessages] = useState<CircleParentMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadBadge, setUnreadBadge] = useState(0);
  const [contactName, setContactName] = useState('Contact');
  const [isClosed, setIsClosed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadThread = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await circleParentMessagesAPI.getThread(contactId, {
        limit: 100,
      });
      // Backend returns newest-first; UI wants oldest-first.
      setMessages([...res.items].reverse());
      setUnreadBadge(res.unread_count);

      // Mark read on entry.
      if (res.unread_count > 0) {
        try {
          await circleParentMessagesAPI.markThreadReadAsParent(contactId);
          setUnreadBadge(0);
        } catch {
          // Non-fatal.
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load messages';
      setError(msg);
      if (msg.toLowerCase().includes('no longer active')) {
        setIsClosed(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    // Resolve the contact name from the thread list for the header.
    circleParentMessagesAPI
      .listThreads()
      .then((list) => {
        const match = list.items.find((t) => t.circle_contact_id === contactId);
        if (match) {
          setContactName(match.contact_name);
          if (!match.is_active) setIsClosed(true);
        }
      })
      .catch(() => undefined);
  }, [contactId]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSend() {
    const content = newMessage.trim();
    if (!content || isSending) return;

    setIsSending(true);
    setError(null);
    try {
      const saved = await circleParentMessagesAPI.sendAsParent(
        contactId,
        content
      );
      setMessages((prev) => [...prev, saved]);
      setNewMessage('');
      inputRef.current?.focus();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send';
      setError(msg);
      if (msg.toLowerCase().includes('no longer active')) {
        setIsClosed(true);
      }
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-lg hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1
            className="text-base font-semibold text-foreground truncate"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {contactName}
          </h1>
          <p
            className="text-xs text-muted-foreground flex items-center gap-1"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <Shield className="w-3 h-3" />
            Parent ↔ contact — ARIA monitored
          </p>
        </div>
        {unreadBadge > 0 && (
          <span className="ml-2 min-w-[20px] h-5 px-1.5 rounded-full bg-purple-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadBadge}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground mt-16">
            <p className="mb-1 font-medium text-foreground">No messages yet</p>
            <p>
              Use this thread to coordinate directly with {contactName} — pickups,
              plans, scheduling, anything that shouldn&apos;t route through
              your child.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <Bubble key={msg.id} message={msg} isMine={msg.sender_type === 'parent'} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950/30 border-t border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400 text-center">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Closed banner */}
      {isClosed && (
        <div className="px-4 py-3 bg-muted/70 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="w-4 h-4" />
          This contact is no longer active. Messaging is disabled.
        </div>
      )}

      {/* Compose */}
      <div className="px-4 py-3 border-t border-border bg-card">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isClosed ? 'Thread closed' : `Message ${contactName}...`
            }
            maxLength={2000}
            disabled={isSending || isClosed}
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!newMessage.trim() || isSending || isClosed}
            className={cn(
              'p-3 rounded-xl transition-all',
              newMessage.trim() && !isClosed && !isSending
                ? 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  message,
  isMine,
}: {
  message: CircleParentMessage;
  isMine: boolean;
}) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isHidden =
    message.aria_flagged &&
    message.original_content !== null &&
    message.original_content !== undefined;

  if (isHidden) {
    return (
      <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
        <div className="max-w-[75%] px-4 py-2.5 rounded-2xl bg-muted border border-border">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-sm italic text-muted-foreground">
              ARIA filtered this message
            </p>
          </div>
          <span className="text-[10px] mt-1 block text-muted-foreground/70">
            {time}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] px-4 py-2.5 rounded-2xl',
          isMine
            ? 'bg-purple-600 text-white'
            : 'bg-muted text-foreground border border-border'
        )}
      >
        {!isMine && (
          <p
            className="text-xs font-semibold mb-0.5 text-purple-600 dark:text-purple-400"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {message.sender_name}
          </p>
        )}
        <p
          className="text-sm leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {message.content}
        </p>
        <div className="flex items-center justify-end gap-1 mt-1">
          {message.aria_flagged && (
            <AlertTriangle
              className={cn(
                'w-3 h-3',
                isMine ? 'text-amber-200' : 'text-amber-500'
              )}
            />
          )}
          <span
            className={cn(
              'text-[10px]',
              isMine ? 'text-white/70' : 'text-muted-foreground'
            )}
          >
            {time}
          </span>
        </div>
      </div>
    </div>
  );
}
