'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send, Shield, Loader2, AlertTriangle, Paperclip, X, Image as ImageIcon, FileText } from 'lucide-react';
import { circleMessagesAPI, CircleMessageData, CircleARIAInterventionPayload } from '@/lib/api';
import { ARIARewriteModal, ARIARewritePayload } from '@/components/messages/aria-rewrite-modal';
import { useRealtimeCircleMessages } from '@/hooks/use-realtime-circle-messages';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

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

  // ARIA intervention state
  const [ariaIntervention, setAriaIntervention] = useState<CircleARIAInterventionPayload | null>(null);
  const [pendingMessageContent, setPendingMessageContent] = useState<string>('');
  const [pendingAttachmentData, setPendingAttachmentData] = useState<{ url: string; type: string; name: string; size: number } | null>(null);

  // Attachment state
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    };
  }, [attachmentPreview]);

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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`File type not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 10 MB.');
      return;
    }

    // Set preview
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    const previewUrl = URL.createObjectURL(file);
    setAttachmentPreview(previewUrl);
    setPendingAttachment(file);
    setError(null);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function clearAttachment() {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachmentPreview(null);
    setPendingAttachment(null);
  }

  async function handleSend(overrideContent?: string, ariaAccepted?: boolean, interventionAction?: string) {
    const content = overrideContent || newMessage.trim() || (pendingAttachment ? `Sent an image` : '');
    if (!content && !pendingAttachment && !pendingAttachmentData) return;
    if (isSending || !childId) return;

    const currentAttachment = pendingAttachment;
    if (!overrideContent) {
      setNewMessage('');
      clearAttachment();
    }
    setIsSending(true);

    try {
      let attachmentData = pendingAttachmentData || undefined;

      // Upload attachment first if present (and not already uploaded)
      if (currentAttachment && !attachmentData) {
        setIsUploading(true);
        try {
          attachmentData = await circleMessagesAPI.uploadAttachmentAsChild(currentAttachment);
        } finally {
          setIsUploading(false);
        }
      }

      const result = await circleMessagesAPI.sendAsChild({
        child_id: childId,
        recipient_id: contactId,
        recipient_type: 'circle_contact',
        content,
        ...(attachmentData && {
          attachment_url: attachmentData.url,
          attachment_type: attachmentData.type,
          attachment_name: attachmentData.name,
          attachment_size: attachmentData.size,
        }),
        ...(ariaAccepted !== undefined && { aria_accepted_rewrite: ariaAccepted }),
        ...(interventionAction && { intervention_action: interventionAction }),
      });

      if (result.type === 'intervention') {
        // ARIA flagged — show intervention modal
        setAriaIntervention(result.payload);
        setPendingMessageContent(content);
        setPendingAttachmentData(attachmentData || null);
        setIsSending(false);
        return;
      }

      // Message sent successfully
      setAriaIntervention(null);
      setPendingMessageContent('');
      setPendingAttachmentData(null);

      setMessages((prev) => {
        if (prev.some((m) => m.id === result.message.id)) return prev;
        return [...prev, result.message];
      });
      scrollToBottom();
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      if (!overrideContent) setNewMessage(content);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  /** Handle ARIA modal: use rewritten version */
  function handleAriaUseRewrite(rewrittenContent: string) {
    setAriaIntervention(null);
    handleSend(rewrittenContent, true, 'accepted');
  }

  /** Handle ARIA modal: edit first (puts content back in compose box) */
  function handleAriaEditRewrite(startingContent: string) {
    setAriaIntervention(null);
    setNewMessage(startingContent);
    inputRef.current?.focus();
  }

  /** Handle ARIA modal: cancel */
  function handleAriaCancel() {
    setAriaIntervention(null);
    setPendingMessageContent('');
    setPendingAttachmentData(null);
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

      {/* ARIA Intervention Modal */}
      {ariaIntervention && (
        <div className="px-4 py-3 bg-slate-900/95 border-t border-slate-800">
          <ARIARewriteModal
            payload={{
              aria_flagged: true,
              aria_mode: ariaIntervention.aria_mode,
              original_message: ariaIntervention.original_message,
              suggested_rewrite: ariaIntervention.suggested_rewrite || null,
              explanation: ariaIntervention.explanation || 'ARIA detected something in your message.',
              categories: ariaIntervention.categories || [],
              severity: ariaIntervention.severity,
              confidence_score: ariaIntervention.confidence_score,
            }}
            onUseRewrite={handleAriaUseRewrite}
            onEditRewrite={handleAriaEditRewrite}
            onCancel={handleAriaCancel}
            isSending={isSending}
            context="child"
          />
        </div>
      )}

      {/* Attachment Preview */}
      {attachmentPreview && (
        <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800">
          <div className="relative inline-block">
            <img
              src={attachmentPreview}
              alt="Attachment preview"
              className="h-20 w-20 object-cover rounded-lg border border-slate-700"
            />
            <button
              onClick={clearAttachment}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              aria-label="Remove attachment"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            {pendingAttachment?.name} ({((pendingAttachment?.size || 0) / 1024).toFixed(0)} KB)
          </p>
        </div>
      )}

      {/* Compose Area */}
      <div className="px-4 py-3 bg-slate-900/90 backdrop-blur-sm border-t border-slate-800 mb-16">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            className="p-3 rounded-xl hover:bg-slate-800 transition-colors text-slate-400 hover:text-teal-400"
            aria-label="Attach image"
          >
            <Paperclip className="w-5 h-5" />
          </button>

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
            disabled={(!newMessage.trim() && !pendingAttachment) || isSending}
            className={cn(
              'p-3 rounded-xl transition-all duration-200',
              (newMessage.trim() || pendingAttachment)
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

        {/* Attachment display */}
        {message.attachment_url && message.attachment_type === 'image' && (
          <div className="mb-2">
            <img
              src={message.attachment_url}
              alt={message.attachment_name || 'Image'}
              className="rounded-lg max-w-full max-h-60 object-cover cursor-pointer"
              onClick={() => window.open(message.attachment_url!, '_blank')}
              loading="lazy"
            />
          </div>
        )}

        {message.attachment_url && message.attachment_type !== 'image' && (
          <a
            href={message.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-2 mb-2 px-3 py-2 rounded-lg text-sm',
              isMine ? 'bg-white/20 hover:bg-white/30' : 'bg-slate-700 hover:bg-slate-600',
            )}
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{message.attachment_name || 'File'}</span>
          </a>
        )}

        {message.content && (
          <p className="text-sm leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
            {message.content}
          </p>
        )}

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
