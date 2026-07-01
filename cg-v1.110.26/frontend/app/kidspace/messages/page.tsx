'use client';

/**
 * KidSpace child messages page — persistent parent ↔ child thread.
 * Wave 1 A1. The child has exactly one thread (with their parents on the family file).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Sparkles } from 'lucide-react';

import {
  familyMessagingAPI,
  type ParentChildMessage,
} from '@/lib/api';
import { useRealtimeParentChildMessages } from '@/hooks/use-realtime-parent-child-messages';

interface ChildUserData {
  userId: string;
  childId: string;
  childName: string;
  avatarId?: string;
  familyFileId: string;
}

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
      <div className={`max-w-[85%] ${mine ? 'items-end' : 'items-start'}`}>
        {!mine && (
          <p className="text-sm text-slate-700 font-bold mb-1 ml-2">
            {message.sender_name}
          </p>
        )}
        <div
          className={`px-5 py-3 rounded-3xl shadow-md ${
            mine
              ? 'bg-gradient-to-br from-[#4BA8C8] to-[#2D6A8F] text-white'
              : 'bg-white text-slate-900 border-4 border-[#FEF7ED]'
          }`}
        >
          {message.aria_hidden ? (
            <div className="space-y-1.5">
              <p className="text-base italic opacity-80 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                {/* Generic placeholder — never surface the raw flagged text */}
                This message is being reviewed
              </p>
              <p className="text-xs opacity-70 font-medium">
                A grown-up will check it soon.
              </p>
            </div>
          ) : (
            <p className="text-lg leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
        </div>
        <p
          className={`text-xs text-slate-500 mt-1 font-medium ${
            mine ? 'text-right mr-2' : 'ml-2'
          }`}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

export default function KidSpaceMessagesPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [messages, setMessages] = useState<ParentChildMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('child_token');
    const userStr = localStorage.getItem('child_user');
    if (!token || !userStr) {
      router.push('/my-circle/child');
      return;
    }
    try {
      const parsed = JSON.parse(userStr) as ChildUserData;
      setUserData(parsed);
    } catch {
      router.push('/my-circle/child');
    }
  }, [router]);

  const loadMessages = useCallback(async (childId: string) => {
    try {
      setError(null);
      const data = await familyMessagingAPI.listMessagesAsChild(childId, {
        limit: 100,
      });
      setMessages([...data.items].reverse());
    } catch (err: any) {
      setError(err?.message || "Couldn't load messages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userData) return;
    loadMessages(userData.childId);
    familyMessagingAPI.markThreadReadAsChild(userData.childId).catch(() => {});
  }, [userData, loadMessages]);

  // Live updates — new messages from a parent appear without refocusing the tab.
  //
  // The kid's Supabase client is anon-only (they auth via the CommonGround
  // JWT, not Supabase Auth), so the RLS SELECT policy on
  // `parent_child_messages` never matches → no postgres_changes payloads
  // reach this hook. We rely instead on the backend's broadcast poke,
  // which is RLS-free and just says "a new message landed — re-fetch".
  useRealtimeParentChildMessages({
    childId: userData?.childId ?? null,
    onNewMessage: (incoming) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
      if (userData && incoming.sender_type === 'parent') {
        familyMessagingAPI
          .markThreadReadAsChild(userData.childId)
          .catch(() => {});
      }
    },
    onMessageUpdated: (updated) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
    },
    onBroadcastPoke: () => {
      if (!userData) return;
      // Re-pull through the ARIA-gated API — never take content from the
      // broadcast payload, it only signals "something changed."
      loadMessages(userData.childId);
      familyMessagingAPI
        .markThreadReadAsChild(userData.childId)
        .catch(() => {});
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!userData) return;
    const text = draft.trim();
    if (!text || sending) return;
    try {
      setSending(true);
      const created = await familyMessagingAPI.sendChildMessage(
        userData.childId,
        text,
      );
      setMessages((prev) => [...prev, created]);
      setDraft('');
    } catch (err: any) {
      setError(err?.message || "Couldn't send your message");
    } finally {
      setSending(false);
    }
  };

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E0EFF8] via-[#FEF7ED] to-[#E8F4F0] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#4BA8C8]/30 border-t-[#4BA8C8] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-[#E0EFF8] via-[#FEF7ED] to-[#E8F4F0] flex flex-col overflow-hidden">
      <header className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur-sm border-b-4 border-[#FEF7ED] shadow-md flex-shrink-0">
        <button
          onClick={() => router.push('/my-circle/child/dashboard')}
          className="p-2 rounded-2xl bg-gradient-to-br from-[#4BA8C8] to-[#2D6A8F] text-white shadow-md hover:shadow-lg transition-all"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex-1">
          <h1
            className="text-2xl font-bold text-slate-800"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Messages
          </h1>
          <p className="text-sm text-slate-600 font-semibold">
            Chat with your grown-ups 💬
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 border-4 border-[#4BA8C8]/30 border-t-[#4BA8C8] rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-[#FEE2E2] border-4 border-[#FEE2E2] text-base text-[#9B2C2C] font-semibold">
            {error}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-6xl mb-4">👋</div>
            <h2
              className="text-2xl font-bold text-slate-800 mb-2"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Say hi!
            </h2>
            <p className="text-base text-slate-600 max-w-md font-medium">
              Send your mom or dad a message. They'll see it right away.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <Bubble
              key={msg.id}
              message={msg}
              mine={msg.sender_type === 'child'}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t-4 border-[#FEF7ED] p-3 bg-white/80 backdrop-blur-sm flex-shrink-0 shadow-inner">
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
            placeholder="Type a message..."
            rows={1}
            maxLength={2000}
            className="flex-1 resize-none rounded-2xl border-4 border-[#FEF7ED] bg-white px-4 py-3 text-lg focus:border-[#4BA8C8] focus:outline-none transition-all max-h-32 font-medium"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="p-4 rounded-2xl bg-gradient-to-br from-[#4BA8C8] to-[#2D6A8F] text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Send message"
          >
            <Send className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
