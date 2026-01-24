'use client';

import { useState, useRef } from 'react';
import { messagesAPI, ARIAAnalysisResponse, MessageAttachment } from '@/lib/api';
import { ARIAIntervention } from './aria-intervention';
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
  onMessageSent: () => void;
  ariaEnabled?: boolean;
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
 * Message Compose Component - The Neutral Zone
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
  onTyping,
  onStopTyping,
}: MessageComposeProps) {
  const [message, setMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [analysis, setAnalysis] = useState<ARIAAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
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

  const uploadAttachment = async (messageId: string, attachment: AttachmentFile) => {
    try {
      setAttachments(prev =>
        prev.map(a => a.id === attachment.id ? { ...a, uploading: true } : a)
      );

      await messagesAPI.uploadAttachment(messageId, attachment.file);

      setAttachments(prev =>
        prev.map(a => a.id === attachment.id ? { ...a, uploading: false, uploaded: true } : a)
      );

      return true;
    } catch (error: any) {
      const errorMessage = error?.message || 'Upload failed';
      console.error('Failed to upload attachment:', attachment.file.name, errorMessage, error);
      setAttachments(prev =>
        prev.map(a => a.id === attachment.id ? {
          ...a,
          uploading: false,
          error: errorMessage
        } : a)
      );
      return false;
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
      setAnalysis(result);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Failed to analyze message');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendDirect = async (content: string) => {
    try {
      setIsSending(true);
      setError(null);

      // Determine content - use placeholder only if there are pending attachments
      const messageContent = content.trim() || (attachments.length > 0 ? '' : '');

      const newMessage = await messagesAPI.send({
        case_id: caseId,
        family_file_id: familyFileId,
        agreement_id: agreementId,
        recipient_id: recipientId,
        content: messageContent || '(Attachment)',
        message_type: 'text',
      });

      // Upload attachments if any
      let uploadErrors: string[] = [];
      if (attachments.length > 0 && newMessage.id) {
        const uploadResults = await Promise.all(
          attachments.map(async (attachment) => {
            const success = await uploadAttachment(newMessage.id!, attachment);
            return { name: attachment.file.name, success };
          })
        );

        // Collect any failed uploads
        uploadErrors = uploadResults
          .filter(r => !r.success)
          .map(r => r.name);
      }

      // Clear form state
      setMessage('');
      setAnalysis(null);
      setAttachments([]);

      // Show warning if some uploads failed
      if (uploadErrors.length > 0) {
        setError(`Message sent, but ${uploadErrors.length} attachment(s) failed to upload: ${uploadErrors.join(', ')}`);
      }

      onMessageSent();
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
    handleSendDirect(message);
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

    if (ariaEnabled && message.trim()) {
      try {
        setIsAnalyzing(true);
        setError(null);

        const result = await messagesAPI.analyze(message, { caseId, familyFileId });

        if (result.is_flagged) {
          setAnalysis(result);
          setIsAnalyzing(false);
          return;
        }

        setIsAnalyzing(false);
        await handleSendDirect(message);
      } catch (err: any) {
        console.error('ARIA analysis failed:', err);
        setError(err.message || 'Failed to analyze message');
        setIsAnalyzing(false);
      }
    } else {
      await handleSendDirect(message);
    }
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

      {/* ARIA Intervention Modal */}
      {analysis && analysis.is_flagged && (
        <ARIAIntervention
          analysis={analysis}
          originalMessage={message}
          onSendAnyway={handleSendAnyway}
          onCancel={handleCancel}
        />
      )}

      {/* Compose Form */}
      {!analysis?.is_flagged && (
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
              className="w-full cg-input min-h-[100px] pr-24 resize-none"
              disabled={isSending || isAnalyzing}
            />

            {/* Character Count */}
            <div className="absolute bottom-3 left-4 text-xs text-muted-foreground">
              {message.length} / 10,000
            </div>

            {/* Attachment & Send Buttons */}
            <div className="absolute bottom-3 right-3 flex gap-2">
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
                {isAnalyzing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
              </button>

              {/* Send Button */}
              <button
                type="button"
                onClick={handleQuickSend}
                disabled={(!message.trim() && attachments.length === 0) || isAnalyzing || isSending}
                className="p-2 rounded-lg bg-cg-sage text-white hover:bg-cg-sage-light transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send message"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
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
