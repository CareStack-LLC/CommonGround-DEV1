'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send, Shield, Loader2, AlertTriangle } from 'lucide-react';
import { circleMessagesAPI, CircleMessageData } from '@/lib/api';
import { useRealtimeCircleMessages } from '@/hooks/use-realtime-circle-messages';
import { cn } from '@/lib/utils';

export default function ContactChatPage() {
  const router = useRouter();
  const params = useParams();
  const childId = params.childId as string;

  const [messages, setMessages] = useState<CircleMessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [childName, setChildName] = useState('');
  const [contactId, setContactId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Realtime updates
  useRealtimeCircleMessages({
    childId,
    participantId: contactId || null,
    onNewMessage: (message) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      scrollToBottom();

      // Mark incoming messages as read
      if (message.recipient_id === contactId) {
        circleMessagesAPI.markReadAsContact(message.id).catch(console.error);
      }
    },
  });

  useEffect(() => {
    loadChat();
  }, [childId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function loadChat() {
    try {
      setIsLoading(true);

      // Get user data
      const userStr = localStorage.getItem('circle_user');
      if (!userStr) {
        router.push('/my-circle/contact');
        return;
      }
      const user = JSON.parse(userStr);
      setContactId(user.contactId);

      // Load conversations to get child name
      const conversations = await circleMessagesAPI.getConversationsAsContact();
      const conv = conversations.items.find((c) => c.child_id === childId);
      if (conv) {
        setChildName(conv.partner_name);
      }

      // Load messages
      const result = await circleMessagesAPI.getConversationAsContact(childId);
      // Reverse to show oldest first
      setMessages(result.items.reverse());

      // Mark unread messages as read
      for (const msg of result.items) {
        if (!msg.is_read && msg.recipient_id === user.contactId) {
          circleMessagesAPI.markReadAsContact(msg.id).catch(console.error);
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
    if (!newMessage.trim() || isSending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      const sent = await circleMessagesAPI.sendAsContact({
        child_id: childId,
        recipient_id: childId,
        recipient_type: 'child',
        content,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
      scrollToBottom();
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      setNewMessage(content); // Restore message
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
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <button
          onClick={() => router.push('/my-circle/contact/dashboard')}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 flex items-center justify-center shadow-sm">
            <span className="text-lg">🧒</span>
          </div>
          <div className="min-w-0">
            <h1
              className="font-bold text-foreground truncate"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {childName || 'Chat'}
            </h1>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="w-3 h-3 text-teal-500" />
              <span style={{ fontFamily: 'Inter, sans-serif' }}>ARIA monitored</span>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mb-4">
              <Send className="w-8 h-8 text-teal-500" />
            </div>
            <p
              className="text-foreground font-semibold mb-1"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Start a conversation
            </p>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
              Send a message to {childName || 'this child'}. All messages are monitored by ARIA for safety.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.sender_id === contactId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950/50 border-t border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 text-center">
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
      <div className="px-4 py-3 bg-card/80 backdrop-blur-sm border-t border-border">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            maxLength={2000}
            className="flex-1 px-4 py-3 bg-muted rounded-xl border border-border focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors text-foreground placeholder:text-muted-foreground"
            style={{ fontFamily: 'Inter, sans-serif' }}
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className={cn(
              'p-3 rounded-xl transition-all duration-200',
              newMessage.trim()
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
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

        {/* ARIA Shield */}
        <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-muted-foreground">
          <Shield className="w-3 h-3 text-teal-500" />
          <span style={{ fontFamily: 'Inter, sans-serif' }}>Messages monitored by ARIA for child safety</span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
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

  // Hidden message (severe ARIA flag)
  if (message.is_hidden) {
    return (
      <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
        <div className="max-w-[75%] px-4 py-2.5 rounded-2xl bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground italic" style={{ fontFamily: 'Inter, sans-serif' }}>
            This message was filtered for safety
          </p>
          <span className="text-[10px] text-muted-foreground mt-1 block">{time}</span>
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
            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
            : 'bg-muted text-foreground',
        )}
      >
        {/* Sender name for received messages */}
        {!isMine && (
          <p
            className="text-xs font-semibold mb-0.5 opacity-70"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {message.sender_name}
          </p>
        )}

        <p className="text-sm leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
          {message.content}
        </p>

        <div className="flex items-center justify-end gap-1 mt-1">
          {/* ARIA flag indicator */}
          {message.aria_flagged && !message.is_hidden && (
            <AlertTriangle className="w-3 h-3 text-amber-300" />
          )}
          <span
            className={cn(
              'text-[10px]',
              isMine ? 'text-white/70' : 'text-muted-foreground',
            )}
          >
            {time}
          </span>
        </div>
      </div>
    </div>
  );
}
