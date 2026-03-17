'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send, Shield, Loader2, AlertTriangle } from 'lucide-react';
import { circleMessagesAPI, CircleMessageData } from '@/lib/api';
import { useRealtimeCircleMessages } from '@/hooks/use-realtime-circle-messages';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { cn } from '@/lib/utils';

export default function ChildChatPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.contactId as string;

  const [messages, setMessages] = useState<CircleMessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [contactName, setContactName] = useState('');
  const [childId, setChildId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Realtime updates
  useRealtimeCircleMessages({
    childId: childId || null,
    participantId: contactId,
    onNewMessage: (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      scrollToBottom();

      // Mark incoming messages as read
      if (message.sender_id === contactId) {
        circleMessagesAPI.markReadAsChild(message.id).catch(console.error);
      }
    },
  });

  useEffect(() => {
    loadChat();
  }, [contactId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function loadChat() {
    try {
      setIsLoading(true);

      // Get child data
      const userStr = localStorage.getItem('child_user');
      if (!userStr) {
        router.push('/my-circle/child');
        return;
      }
      const user = JSON.parse(userStr);
      setChildId(user.childId);

      // Load conversations to find contact name
      try {
        const conversations = await circleMessagesAPI.getConversationsAsChild();
        const conv = conversations.items.find((c) => c.partner_id === contactId);
        if (conv) {
          setContactName(conv.partner_name);
        }
      } catch {
        // Conversations might be empty for first-time chat
      }

      // Load messages
      const result = await circleMessagesAPI.getConversationAsChild(user.childId, contactId);
      setMessages(result.items.reverse());

      // Mark unread as read
      for (const msg of result.items) {
        if (!msg.is_read && msg.sender_id === contactId) {
          circleMessagesAPI.markReadAsChild(msg.id).catch(console.error);
        }
      }
    } catch (err) {
      console.error('Error loading chat:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || isSending || !childId) return;

    const content = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      const sent = await circleMessagesAPI.sendAsChild({
        child_id: childId,
        recipient_id: contactId,
        recipient_type: 'circle_contact',
        content,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
      scrollToBottom();
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      setNewMessage(content);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
        <button
          onClick={() => router.push('/my-circle/child/my-circle-page')}
          className="p-2 rounded-xl hover:bg-slate-800 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-sm">
            <span className="text-lg">💜</span>
          </div>
          <div className="min-w-0">
            <h1
              className="font-bold text-white truncate"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {contactName || 'Chat'}
            </h1>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Shield className="w-3 h-3 text-teal-400" />
              <span style={{ fontFamily: 'Inter, sans-serif' }}>Protected by ARIA</span>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <Send className="w-8 h-8 text-teal-400" />
            </div>
            <p
              className="text-white font-semibold mb-1"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Say hi! 👋
            </p>
            <p className="text-sm text-slate-400" style={{ fontFamily: 'Inter, sans-serif' }}>
              Send a message to {contactName || 'your contact'}.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChildMessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.sender_id === childId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-red-950/50 border-t border-red-800 text-sm text-red-400 text-center">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Compose Area */}
      <div className="px-4 py-3 bg-slate-900/90 backdrop-blur-sm border-t border-slate-800 mb-16">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            maxLength={2000}
            className="flex-1 px-4 py-3 bg-slate-800 rounded-xl border border-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors text-white placeholder:text-slate-500"
            style={{ fontFamily: 'Inter, sans-serif' }}
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className={cn(
              'p-3 rounded-xl transition-all duration-200',
              newMessage.trim()
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/30 hover:scale-105 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed',
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

      {/* Bottom Nav */}
      <KidBottomNav />
    </div>
  );
}

function ChildMessageBubble({
  message,
  isMine,
}: {
  message: CircleMessageData;
  isMine: boolean;
}) {
  const time = new Date(message.sent_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (message.is_hidden) {
    return (
      <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
        <div className="max-w-[75%] px-4 py-2.5 rounded-2xl bg-slate-800/50 border border-slate-700">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            <p className="text-sm text-slate-400 italic" style={{ fontFamily: 'Inter, sans-serif' }}>
              ARIA filtered this message for your safety
            </p>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">{time}</span>
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
            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white'
            : 'bg-slate-800 text-white',
        )}
      >
        {!isMine && (
          <p
            className="text-xs font-semibold mb-0.5 text-teal-300"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {message.sender_name}
          </p>
        )}

        <p className="text-sm leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
          {message.content}
        </p>

        <div className="flex items-center justify-end gap-1 mt-1">
          {message.aria_flagged && !message.is_hidden && (
            <AlertTriangle className="w-3 h-3 text-amber-300" />
          )}
          <span
            className={cn(
              'text-[10px]',
              isMine ? 'text-white/70' : 'text-slate-500',
            )}
          >
            {time}
          </span>
        </div>
      </div>
    </div>
  );
}
