'use client';

/**
 * Parent ↔ Child thread detail page. Wave 1 A1.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Send, Shield, Sparkles } from 'lucide-react';

import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  familyMessagingAPI,
  type ParentChildMessage,
} from '@/lib/api';
import { useRealtimeParentChildMessages } from '@/hooks/use-realtime-parent-child-messages';

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function Bubble({
  message,
  mine,
}: {
  message: ParentChildMessage;
  mine: boolean;
}) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] sm:max-w-[70%] ${mine ? 'items-end' : 'items-start'}`}>
        {!mine && (
          <p className="text-xs text-muted-foreground font-medium mb-1 ml-1">
            {message.sender_name}
          </p>
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl shadow-sm ${
            mine
              ? 'bg-gradient-to-br from-[var(--portal-primary)] to-[#2D6A8F] text-white'
              : 'bg-card text-foreground border-2 border-border'
          }`}
        >
          {message.aria_hidden ? (
            <div className="space-y-1.5">
              <p className="text-sm italic opacity-80 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                {message.content}
              </p>
              {message.original_content && (
                <details
                  className={`text-xs pt-1.5 border-t ${
                    mine ? 'border-white/20' : 'border-border'
                  }`}
                >
                  <summary
                    className={`cursor-pointer font-medium ${
                      mine ? 'text-white/70' : 'text-muted-foreground'
                    }`}
                  >
                    View original (parent only)
                  </summary>
                  <p
                    className={`mt-1 italic ${
                      mine ? 'text-white/60' : 'text-muted-foreground'
                    }`}
                  >
                    "{message.original_content}"
                  </p>
                </details>
              )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
          {message.aria_flagged && (
            <div
              className={`mt-2 pt-2 border-t flex items-center gap-1.5 text-xs ${
                mine
                  ? 'border-white/20 text-white/80'
                  : 'border-amber-200 text-amber-700'
              }`}
            >
              {message.aria_hidden ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              <span className="font-semibold">
                {message.aria_hidden
                  ? 'Flagged by ARIA'
                  : 'Reviewed by ARIA'}
                {message.aria_category ? ` · ${message.aria_category}` : ''}
              </span>
            </div>
          )}
        </div>
        <p
          className={`text-xs text-muted-foreground mt-1 ${
            mine ? 'text-right mr-1' : 'ml-1'
          }`}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

function ThreadDetailContent() {
  const router = useRouter();
  const params = useParams();
  const childId = params?.childId as string;
  const { user } = useAuth();

  const [messages, setMessages] = useState<ParentChildMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      setError(null);
      const data = await familyMessagingAPI.listMessages(childId, { limit: 100 });
      // API returns newest-first; flip for chat UI.
      setMessages([...data.items].reverse());
    } catch (err: any) {
      setError(err?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    if (!childId) return;
    loadMessages();
    // Fire-and-forget mark-read on mount.
    familyMessagingAPI.markThreadRead(childId).catch(() => {});
  }, [childId, loadMessages]);

  // Live updates — new messages from the child appear without a reload.
  useRealtimeParentChildMessages({
    childId: childId || null,
    onNewMessage: (incoming) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
      // If the child just messaged the parent, immediately mark read so the
      // badge on /messages drops to zero.
      if (incoming.sender_type === 'child') {
        familyMessagingAPI.markThreadRead(childId).catch(() => {});
      }
    },
    onMessageUpdated: (updated) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    try {
      setSending(true);
      const created = await familyMessagingAPI.sendParentMessage(childId, text);
      setMessages((prev) => [...prev, created]);
      setDraft('');
    } catch (err: any) {
      setError(err?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const childName =
    messages.find((m) => m.sender_type === 'child')?.sender_name || 'Your child';

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <Navigation />
      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto overflow-hidden pb-[5rem] lg:pb-0">
        <header className="flex items-center gap-3 p-4 bg-card border-b-2 border-border shadow-sm flex-shrink-0">
          <button
            onClick={() => router.push('/messages/child')}
            className="p-2 -ml-2 rounded-xl hover:bg-muted transition-all"
            aria-label="Back to inbox"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1
              className="text-lg font-bold text-foreground truncate"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              {childName}
            </h1>
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> ARIA-protected chat
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-10 h-10 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 border-2 border-red-200 text-sm text-red-700">
              {error}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-full bg-[var(--portal-primary)]/10 flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-[var(--portal-primary)]" />
              </div>
              <h2
                className="text-lg font-semibold text-foreground mb-2"
                style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
              >
                Say hi
              </h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Send your child a message — they'll see it next time they open KidSpace.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <Bubble
                key={msg.id}
                message={msg}
                mine={msg.sender_type === 'parent' && msg.sender_id === user?.id}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t-2 border-border p-3 bg-card flex-shrink-0 shadow-inner">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Message ${childName}...`}
              rows={1}
              className="flex-1 resize-none rounded-xl border-2 border-border bg-background px-4 py-3 text-sm focus:border-[var(--portal-primary)] focus:outline-none transition-all max-h-32"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim() || sending}
              className="p-3 rounded-xl bg-[var(--portal-primary)] text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThreadDetailPage() {
  return (
    <ProtectedRoute>
      <ThreadDetailContent />
    </ProtectedRoute>
  );
}
