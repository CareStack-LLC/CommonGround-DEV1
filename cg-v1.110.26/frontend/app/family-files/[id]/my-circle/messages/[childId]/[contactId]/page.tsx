'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Send,
  Loader2,
  Shield,
  AlertTriangle,
  MessageCircle,
  User,
  Paperclip,
  X,
  FileText,
} from 'lucide-react';
import { circleMessagesAPI, circleAPI, familyFilesAPI, CircleMessageData, CircleARIAInterventionPayload } from '@/lib/api';
import { ARIARewriteModal } from '@/components/messages/aria-rewrite-modal';
import { Navigation } from '@/components/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { PageContainer } from '@/components/layout';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

interface PageParams {
  params: Promise<{ id: string; childId: string; contactId: string }>;
}

export default function ParentChatViewPage({ params }: PageParams) {
  const resolvedParams = use(params);
  const { id: familyFileId, childId, contactId } = resolvedParams;
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<CircleMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [childName, setChildName] = useState('');
  const [contactName, setContactName] = useState('');

  // ARIA intervention state
  const [ariaIntervention, setAriaIntervention] = useState<CircleARIAInterventionPayload | null>(null);
  const [pendingMessageContent, setPendingMessageContent] = useState<string>('');
  const [pendingAttachmentData, setPendingAttachmentData] = useState<{ url: string; type: string; name: string; size: number } | null>(null);

  // Attachment state
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInitialData();
  }, [childId, contactId]);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [childId, contactId]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    };
  }, [attachmentPreview]);

  async function loadInitialData() {
    try {
      setIsLoading(true);

      // Load child and contact info
      const [childrenList, contactsList] = await Promise.all([
        familyFilesAPI.getChildren(familyFileId),
        circleAPI.list(familyFileId),
      ]);

      const child = childrenList.items.find((c: { id: string }) => c.id === childId);
      const contact = contactsList.items.find((c: { id: string }) => c.id === contactId);

      if (child) setChildName(child.first_name);
      if (contact) setContactName(contact.contact_name);

      // Load messages
      await loadMessages(false);
    } catch (err) {
      console.error('Error loading chat data:', err);
      setError('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMessages(silent = false) {
    try {
      const result = await circleMessagesAPI.getConversationAsParent(childId, contactId, 0, 100);
      setMessages(result.items);
    } catch (err) {
      if (!silent) {
        console.error('Error loading messages:', err);
      }
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`File type not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 10 MB.');
      return;
    }

    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    const previewUrl = URL.createObjectURL(file);
    setAttachmentPreview(previewUrl);
    setPendingAttachment(file);
    setError(null);

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function clearAttachment() {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachmentPreview(null);
    setPendingAttachment(null);
  }

  async function handleSend(overrideContent?: string, ariaAccepted?: boolean, interventionAction?: string) {
    const content = overrideContent || newMessage.trim() || (pendingAttachment ? 'Sent an image' : '');
    if (!content && !pendingAttachment && !pendingAttachmentData) return;
    if (isSending) return;

    const currentAttachment = pendingAttachment;

    try {
      setIsSending(true);
      setError(null);

      let attachmentData = pendingAttachmentData || undefined;

      if (currentAttachment && !attachmentData) {
        setIsUploading(true);
        try {
          attachmentData = await circleMessagesAPI.uploadAttachmentAsParent(currentAttachment);
        } finally {
          setIsUploading(false);
        }
      }

      const result = await circleMessagesAPI.sendAsParent({
        child_id: childId,
        recipient_id: contactId,
        recipient_type: 'contact',
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
      setNewMessage('');
      clearAttachment();
      inputRef.current?.focus();

      // Reload messages to show the new one
      await loadMessages(true);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  }

  function handleAriaUseRewrite(rewrittenContent: string) {
    setAriaIntervention(null);
    handleSend(rewrittenContent, true, 'accepted');
  }

  function handleAriaEditRewrite(startingContent: string) {
    setAriaIntervention(null);
    setNewMessage(startingContent);
    inputRef.current?.focus();
  }

  function handleAriaSendOriginal() {
    setAriaIntervention(null);
    handleSend(pendingMessageContent, false, 'sent_anyway');
  }

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

  function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  }

  // Group messages by date
  function getMessageGroups(): { date: string; messages: CircleMessageData[] }[] {
    const groups: { date: string; messages: CircleMessageData[] }[] = [];
    let currentDate = '';

    for (const msg of messages) {
      const msgDate = new Date(msg.sent_at).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msg.sent_at, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background pb-20 lg:pb-0">
          <Navigation />
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
            <p className="mt-4 text-muted-foreground font-medium">Loading conversation...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const messageGroups = getMessageGroups();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20 lg:pb-0 flex flex-col">
        <Navigation />
        <PageContainer background="transparent">
          <div className="flex flex-col h-[calc(100vh-180px)]">
            {/* Chat Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
              <button
                onClick={() => router.push(`/family-files/${familyFileId}/my-circle?tab=messages`)}
                className="w-10 h-10 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </button>

              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/10 to-[#2D6A8F]/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-teal-600" />
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-foreground truncate">
                  {contactName} &amp; {childName}
                </h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3 text-teal-500" />
                  Monitored by ARIA &middot; Parent view
                </p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-6 pb-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">No messages yet</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Send a message to start the conversation between you and {contactName} about {childName}.
                  </p>
                </div>
              ) : (
                messageGroups.map((group, gi) => (
                  <div key={gi}>
                    {/* Date Separator */}
                    <div className="flex items-center justify-center mb-4">
                      <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground font-medium">
                        {formatDate(group.date)}
                      </span>
                    </div>

                    {/* Messages */}
                    <div className="space-y-2">
                      {group.messages.map((msg) => {
                        const isParent = msg.sender_type === 'parent';
                        const isChild = msg.sender_type === 'child';
                        const isContact = msg.sender_type === 'contact';

                        return (
                          <div key={msg.id}>
                            <div
                              className={`flex ${isParent ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[75%] ${isParent ? 'order-1' : ''}`}>
                                {/* Sender Name */}
                                {!isParent && (
                                  <div className="flex items-center gap-1.5 mb-1 px-1">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                      isChild ? 'bg-[#E0EFF8] dark:bg-[#1E3A4A]/30' : 'bg-teal-100 dark:bg-teal-900/30'
                                    }`}>
                                      <User className={`h-2.5 w-2.5 ${
                                        isChild ? 'text-[#2D6A8F] dark:text-[#4BA8C8]' : 'text-teal-600 dark:text-teal-400'
                                      }`} />
                                    </div>
                                    <span className="text-xs font-medium text-muted-foreground">
                                      {msg.sender_name}
                                    </span>
                                  </div>
                                )}

                                {/* Message Bubble */}
                                <div
                                  className={`rounded-2xl px-4 py-2.5 ${
                                    isParent
                                      ? 'bg-teal-600 text-white rounded-br-md'
                                      : isChild
                                        ? 'bg-[#E0EFF8] dark:bg-[#1E3A4A]/30 text-foreground rounded-bl-md'
                                        : 'bg-card border border-border text-foreground rounded-bl-md'
                                  }`}
                                >
                                  {/* Attachment display */}
                                  {msg.attachment_url && msg.attachment_type === 'image' && (
                                    <div className="mb-2">
                                      <img
                                        src={msg.attachment_url}
                                        alt={msg.attachment_name || 'Image'}
                                        className="rounded-lg max-w-full max-h-60 object-cover cursor-pointer"
                                        onClick={() => window.open(msg.attachment_url!, '_blank')}
                                        loading="lazy"
                                      />
                                    </div>
                                  )}

                                  {msg.attachment_url && msg.attachment_type !== 'image' && (
                                    <a
                                      href={msg.attachment_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-2 mb-2 px-3 py-2 rounded-lg text-sm ${
                                        isParent ? 'bg-white/20 hover:bg-white/30' : 'bg-muted hover:bg-muted/80'
                                      }`}
                                    >
                                      <FileText className="w-4 h-4 flex-shrink-0" />
                                      <span className="truncate">{msg.attachment_name || 'File'}</span>
                                    </a>
                                  )}

                                  {msg.content && (
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                  )}
                                  <div className={`flex items-center gap-1.5 mt-1 ${
                                    isParent ? 'justify-end' : 'justify-start'
                                  }`}>
                                    <span className={`text-[10px] ${
                                      isParent ? 'text-teal-200' : 'text-muted-foreground'
                                    }`}>
                                      {formatTime(msg.sent_at)}
                                    </span>
                                  </div>
                                </div>

                                {/* ARIA Flag Indicator */}
                                {msg.aria_flagged && (
                                  <div className="flex items-center gap-1 px-1 mt-1">
                                    <AlertTriangle className="h-3 w-3 text-[#F5A623]" />
                                    <span className="text-[10px] text-[#E09520] dark:text-[#F5A623] font-medium">
                                      Flagged by ARIA: {msg.aria_category || 'Review needed'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error Banner */}
            {error && (
              <div className="bg-[#FEE2E2] dark:bg-[#7A2222]/20 border border-[#FEE2E2] dark:border-[#9B2C2C] rounded-xl p-3 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#C53030] flex-shrink-0" />
                <p className="text-sm text-[#9B2C2C] dark:text-[#FCA5A5] flex-1">{error}</p>
                <button onClick={() => setError(null)} className="text-[#C53030] hover:text-[#9B2C2C] text-xs font-medium">
                  Dismiss
                </button>
              </div>
            )}

            {/* ARIA Intervention Modal */}
            {ariaIntervention && (
              <div className="pb-3">
                <ARIARewriteModal
                  payload={{
                    aria_flagged: true,
                    aria_mode: ariaIntervention.aria_mode,
                    original_message: ariaIntervention.original_message,
                    suggested_rewrite: ariaIntervention.suggested_rewrite || null,
                    explanation: ariaIntervention.explanation || 'ARIA detected a potential concern.',
                    categories: ariaIntervention.categories || [],
                    severity: ariaIntervention.severity,
                    confidence_score: ariaIntervention.confidence_score,
                  }}
                  onUseRewrite={handleAriaUseRewrite}
                  onEditRewrite={handleAriaEditRewrite}
                  onSendOriginal={handleAriaSendOriginal}
                  onCancel={handleAriaCancel}
                  isSending={isSending}
                  context="parent"
                />
              </div>
            )}

            {/* Attachment Preview */}
            {attachmentPreview && (
              <div className="pb-2">
                <div className="relative inline-block">
                  <img
                    src={attachmentPreview}
                    alt="Attachment preview"
                    className="h-20 w-20 object-cover rounded-lg border border-border"
                  />
                  <button
                    onClick={clearAttachment}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-[#C53030] rounded-full flex items-center justify-center hover:bg-[#C53030] transition-colors"
                    aria-label="Remove attachment"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingAttachment?.name} ({((pendingAttachment?.size || 0) / 1024).toFixed(0)} KB)
                </p>
              </div>
            )}

            {/* Message Input */}
            <div className="border-t border-border pt-3">
              <div className="flex items-end gap-2">
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
                  className="w-11 h-11 rounded-xl border-2 border-border hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-teal-600 flex-shrink-0"
                  aria-label="Attach image"
                >
                  <Paperclip className="h-5 w-5" />
                </button>

                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message as parent...`}
                    rows={1}
                    className="w-full px-4 py-3 bg-card border-2 border-border rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-foreground placeholder:text-muted-foreground resize-none text-sm"
                    style={{ maxHeight: '120px' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                    }}
                  />
                </div>
                <button
                  onClick={() => handleSend()}
                  disabled={(!newMessage.trim() && !pendingAttachment) || isSending}
                  className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                Messages sent as parent are visible to {contactName} and {childName}
              </p>
            </div>
          </div>
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}
