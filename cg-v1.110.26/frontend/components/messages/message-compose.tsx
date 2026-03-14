'use client';

import { useState, useRef } from 'react';
import { messagesAPI, ARIAAnalysisResponse, MessageAttachment, InterventionAction } from '@/lib/api';
import { ARIARewriteModal, type ARIARewritePayload } from './aria-rewrite-modal';
import {
  Send,
  Sparkles,
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
  Paperclip,
  X,
  File,
  Image as ImageIcon,
  FileText,
  Music,
  Video as VideoIcon,
} from 'lucide-react';

interface MessageComposeProps {
  caseId?: string;
  familyFileId?: string;
  agreementId?: string;
  recipientId: string;
  onMessageSent: (message?: any) => void;
  ariaEnabled?: boolean;
  ariaMode?: 'off' | 'standard' | 'strict';
  onTyping?: () => void;
  onStopTyping?: () => void;
}

interface AttachmentFile {
  id: string;
  file: File;
  preview?: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}

/**
 * Message Compose Component - Messages
 *
 * Features:
 * - ARIA Guardian integration
 * - Real-time tone analysis
 * - Organic minimalist design
 */
export function MessageCompose({
  caseId,
  familyFileId,
  agreementId,
  recipientId,
  onMessageSent,
  ariaEnabled = true,
  ariaMode = 'standard',
  onTyping,
  onStopTyping,
}: MessageComposeProps) {
  const [message, setMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [analysis, setAnalysis] = useState<ARIAAnalysisResponse | null>(null);
  const [ariaRewritePayload, setAriaRewritePayload] = useState<ARIARewritePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [lastFlaggedAnalysis, setLastFlaggedAnalysis] = useState<ARIAAnalysisResponse | null>(null);
  const [lastFlaggedMessage, setLastFlaggedMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper functions for attachments
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon;
    if (type.startsWith('video/')) return VideoIcon;
    if (type.startsWith('audio/')) return Music;
    if (type.includes('pdf') || type.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX_SIZE = 150 * 1024 * 1024; // 150MB

    const validFiles = files.filter(file => {
      if (file.size > MAX_SIZE) {
        alert(`${file.name} is too large. Maximum file size is 150MB.`);
        return false;
      }
      return true;
    });

    const newAttachments: AttachmentFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      uploading: false,
      uploaded: false,
    }));

    setAttachments(prev => [...prev, ...newAttachments]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const uploadAttachment = async (messageId: string, attachment: AttachmentFile): Promise<{ success: boolean; attachment?: MessageAttachment; error?: string; isAriaBlock?: boolean }> => {
    try {
      setAttachments(prev =>
        prev.map(a => a.id === attachment.id ? { ...a, uploading: true } : a)
      );

      const uploadedAttachment = await messagesAPI.uploadAttachment(messageId, attachment.file);

      setAttachments(prev =>
        prev.map(a => a.id === attachment.id ? { ...a, uploading: false, uploaded: true } : a)
      );

      return { success: true, attachment: uploadedAttachment };
    } catch (error: any) {
      const errorMessage = error?.message || 'Upload failed';
      console.error('Failed to upload attachment:', attachment.file.name, errorMessage, error);

      const isAriaBlock = errorMessage.includes('Image blocked by ARIA Safety Shield');

      // Check for ARIA Visual Shield Block
      if (isAriaBlock) {
        // We do NOT show the modal here anymore because the message is already "sent" (created).
        // Instead we allow the error to bubble up so we can delete the message.
        // But we still mark the local attachment as error.
      }

      setAttachments(prev =>
        prev.map(a => a.id === attachment.id ? {
          ...a,
          uploading: false,
          error: errorMessage
        } : a)
      );

      return { success: false, error: errorMessage, isAriaBlock };
    }
  };

  const handleAnalyze = async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      const result = await messagesAPI.analyze(message, { caseId, familyFileId });
      if (result.is_flagged) {
        setAriaRewritePayload({
          aria_flagged: true,
          aria_mode: ariaMode as any,
          original_message: message,
          suggested_rewrite: result.suggestion,
          explanation: result.explanation,
          categories: result.categories,
          toxicity_score: result.toxicity_score
        });
        setLastFlaggedAnalysis(result);
        setLastFlaggedMessage(message);
      } else {
        setAnalysis(result);
      }
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Failed to analyze message');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendDirect = async (content: string, interventionAction?: InterventionAction, ariaAcceptedRewrite?: boolean) => {
    try {
      setIsSending(true);
      setError(null);

      // Determine content - use placeholder only if there are pending attachments
      const messageContent = content.trim() || (attachments.length > 0 ? '' : '');

      // If modifying, send the ORIGINAL toxic message as content (so backend creates flag),
      // and the NEW clean message as the final_message in intervention_action.
      // If sending anyway, content is already the toxic message.
      const payloadContent = (interventionAction?.action === 'modified' && lastFlaggedMessage)
        ? lastFlaggedMessage
        : (messageContent || '(Attachment)');

      const newMessage = await messagesAPI.send({
        case_id: caseId,
        family_file_id: familyFileId,
        agreement_id: agreementId,
        recipient_id: recipientId,
        content: payloadContent,
        message_type: 'text',
        intervention_action: interventionAction,
        aria_accepted_rewrite: ariaAcceptedRewrite ?? false,
      } as any);

      // ARIA v2: backend may return 202 with a rewrite suggestion instead of saving
      if ((newMessage as any)?.aria_flagged) {
        setAriaRewritePayload(newMessage as unknown as ARIARewritePayload);
        setIsSending(false);
        return;
      }

      // Upload attachments if any
      let uploadErrorMessages: string[] = [];
      const uploadedAttachments: MessageAttachment[] = [];
      let hasAriaBlock = false;

      if (attachments.length > 0 && newMessage.id) {
        const uploadResults = await Promise.all(
          attachments.map(attachment => uploadAttachment(newMessage.id!, attachment))
        );

        // Collect successful attachments
        uploadResults.forEach(r => {
          if (r.success && r.attachment) {
            uploadedAttachments.push(r.attachment);
          }
        });

        // Collect errors
        uploadResults.forEach((r, index) => {
          if (!r.success) {
            const filename = attachments[index].file.name;
            if (r.isAriaBlock) {
              hasAriaBlock = true;
              // Extract reason if possible
              const reasonIndex = r.error?.indexOf('Image blocked by ARIA Safety Shield:');
              let reason = 'Content violation';
              if (reasonIndex !== -1 && r.error) {
                reason = r.error.substring(reasonIndex! + 'Image blocked by ARIA Safety Shield:'.length).trim();
              }
              uploadErrorMessages.push(`Failed to upload attachment: ${filename} Image blocked by ARIA Safety Shield: ${reason}`);
            } else {
              uploadErrorMessages.push(`Failed to upload ${filename}: ${r.error}`);
            }
          }
        });
      }

      // Cleanup if ARIA blocked the image and it was an attachment-only message
      if (hasAriaBlock && newMessage.content === '(Attachment)' && uploadedAttachments.length === 0) {
        // Delete the message
        try {
          if (newMessage.id) {
            await messagesAPI.delete(newMessage.id);
          }
        } catch (delErr) {
          console.error("Failed to cleanup blocked message", delErr);
        }

        // Clear form state but KEEP error
        setMessage('');
        setAnalysis(null);
        setAttachments([]); // Clear attachments so they don't stay stuck

        if (uploadErrorMessages.length > 0) {
          setError(uploadErrorMessages[0]); // Show the first significant error
        }

        // DO NOT call onMessageSent, so it doesn't appear in the list
        return;
      }

      // Clear form state
      setMessage('');
      setAnalysis(null);
      setLastFlaggedAnalysis(null);
      setLastFlaggedMessage(null);
      setAttachments([]);

      // Show warning if some uploads failed (but message preserved)
      if (uploadErrorMessages.length > 0) {
        // If we are here, either it wasn't an ARIA block, or it had text content, or some attachments succeeded
        setError(`Message sent, but issues occurred: ${uploadErrorMessages.join('; ')}`);
      }

      // Construct final message with attachments for optimistic UI update
      const finalMessage = {
        ...newMessage,
        attachments: uploadedAttachments
      };

      onMessageSent(finalMessage);
    } catch (err: any) {
      console.error('Failed to send message:', err);

      let errorMessage = 'Failed to send message';
      if (err.status === 401) {
        errorMessage = 'Authentication error. Please try logging in again.';
      } else if (err.status === 422) {
        errorMessage = 'Invalid message format. Please check your message.';
      } else if (err.status === 403) {
        errorMessage = 'You do not have permission to send messages in this case.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendAnyway = () => {
    handleSendDirect(message, {
      action: 'sent_anyway',
      final_message: message
    });
  };

  // ARIA v2: User chose to use ARIA's contextual rewrite
  const handleUseARIARewrite = async (rewrittenContent: string) => {
    setAriaRewritePayload(null);
    await handleSendDirect(rewrittenContent, undefined, true);
  };

  // ARIA v2: Standard mode only — send original despite flagging
  const handleSendOriginalAnyway = async () => {
    setAriaRewritePayload(null);
    await handleSendDirect(message, { action: 'sent_anyway', final_message: message }, true);
  };

  // ARIA v2: Dismiss rewrite modal and let user edit in compose box
  const handleDismissRewriteModal = () => {
    setAriaRewritePayload(null);
  };

  const handleCancel = () => {
    setAnalysis(null);
    setError(null);
  };

  const handleQuickSend = async () => {
    // Allow send if there's either a message or attachments
    if (!message.trim() && attachments.length === 0) {
      setError('Please enter a message or attach a file');
      return;
    }

    // ARIA v2: Bypass pre-analysis and go straight to send.
    // The backend will return a 202 if a rewrite is needed.
    await handleSendDirect(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickSend();
    }
  };

  return (
    <div className="space-y-4">
      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-cg-error-subtle border border-cg-error/20 rounded-xl">
          <AlertCircle className="h-5 w-5 text-cg-error flex-shrink-0" />
          <p className="text-sm text-cg-error">{error}</p>
        </div>
      )}

      {/* ARIA v2 Rewrite Modal (highest priority — shown instead of compose when flagged) */}
      {ariaRewritePayload && (
        <ARIARewriteModal
          payload={ariaRewritePayload}
          onUseRewrite={handleUseARIARewrite}
          onEditRewrite={(startingContent) => {
            setMessage(startingContent);
            setAriaRewritePayload(null);
          }}
          onSendOriginal={ariaRewritePayload.aria_mode === 'standard' ? handleSendOriginalAnyway : undefined}
          onCancel={handleDismissRewriteModal}
          isSending={isSending}
        />
      )}

      {/* Compose Form */}
      {!ariaRewritePayload && (
        <div className="space-y-4">
          {/* ARIA Status Indicator */}
          {ariaEnabled && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="relative">
                <Shield className="h-4 w-4 text-cg-amber" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cg-success rounded-full" />
              </div>
              <span>ARIA Guardian active</span>
            </div>
          )}

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              {attachments.map(attachment => {
                const FileIconComponent = getFileIcon(attachment.file.type);
                return (
                  <div
                    key={attachment.id}
                    className="relative group bg-white border-2 border-slate-200 rounded-lg p-2 pr-8 hover:border-[#2C5F5D] transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      {attachment.preview ? (
                        <img
                          src={attachment.preview}
                          alt={attachment.file.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                          <FileIconComponent className="w-6 h-6 text-slate-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate max-w-[150px]">
                          {attachment.file.name}
                        </p>
                        <p className="text-xs text-slate-600">
                          {formatFileSize(attachment.file.size)}
                        </p>
                        {attachment.uploading && (
                          <p className="text-xs text-blue-600 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Uploading...
                          </p>
                        )}
                        {attachment.uploaded && (
                          <p className="text-xs text-green-600">Uploaded</p>
                        )}
                        {attachment.error && (
                          <p className="text-xs text-red-600">{attachment.error}</p>
                        )}
                      </div>
                    </div>
                    {!attachment.uploading && !attachment.uploaded && (
                      <button
                        type="button"
                        onClick={() => removeAttachment(attachment.id)}
                        className="absolute top-1 right-1 p-1 bg-white border border-slate-200 rounded-full hover:bg-red-50 hover:border-red-300 transition-colors"
                      >
                        <X className="w-3 h-3 text-slate-600 hover:text-red-600" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Text Input */}
          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                onTyping?.();
              }}
              onBlur={onStopTyping}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className={`w-full cg-input min-h-[100px] pr-24 resize-none transition-all duration-300 ${isAnalyzing ? 'blur-sm opacity-50' : ''}`}
              disabled={isSending || isAnalyzing}
            />

            {/* ARIA Mini-Guardian Splash (Analysis State) */}
            {isAnalyzing && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-xl">
                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#2C5F5D]/10 to-[#2C5F5D]/5 rounded-xl flex items-center justify-center shadow-sm mb-2">
                    <Shield className="h-5 w-5 text-[#2C5F5D] animate-pulse" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                    ARIA Checking...
                  </h4>
                  <div className="flex gap-1 mt-1">
                    <div className="w-1.5 h-1.5 bg-[#2C5F5D] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-[#2C5F5D] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-[#2C5F5D] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Character Count */}
            <div className={`absolute bottom-3 left-4 text-xs text-muted-foreground ${isAnalyzing ? 'opacity-0' : ''}`}>
              {message.length} / 10,000
            </div>

            {/* Attachment & Send Buttons */}
            <div className={`absolute bottom-3 right-3 flex gap-2 ${isAnalyzing ? 'opacity-0 pointer-events-none' : ''}`}>
              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending || isAnalyzing}
                className="p-2 rounded-lg text-muted-foreground hover:text-cg-sage hover:bg-cg-sage/10 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                title="Attach file"
              >
                <Paperclip className="h-5 w-5" />
              </button>

              {/* Preview Button */}
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!message.trim() || isAnalyzing || isSending}
                className="p-2 rounded-lg text-muted-foreground hover:text-cg-amber hover:bg-cg-amber-subtle transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                title="Preview with ARIA"
              >
                <Sparkles className="h-5 w-5" />
              </button>

              {/* Send Button */}
              <button
                type="button"
                onClick={handleQuickSend}
                disabled={(!message.trim() && attachments.length === 0) || isAnalyzing || isSending}
                className="p-2 rounded-lg bg-cg-sage text-white hover:bg-cg-sage-light transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Analysis Result (Green - Message OK) */}
          {analysis && !analysis.is_flagged && (
            <div className="flex items-center gap-3 p-3 bg-cg-success-subtle border border-cg-success/20 rounded-xl">
              <CheckCircle className="h-5 w-5 text-cg-success flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-cg-success">Message looks good!</p>
                <p className="text-xs text-cg-success/80">No conflict patterns detected.</p>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 text-cg-sage flex-shrink-0 mt-0.5" />
            <div>
              <p>
                <span className="font-medium text-foreground/80">Tip:</span>{' '}
                {ariaEnabled
                  ? 'Press Enter to send. ARIA will automatically check your message.'
                  : 'Click the sparkle icon to preview your message with ARIA.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
