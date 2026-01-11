'use client';

import { useState } from 'react';
import { messagesAPI, ARIAAnalysisResponse } from '@/lib/api';
import { ARIAIntervention } from './aria-intervention';
import {
  Send,
  Sparkles,
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

interface MessageComposeProps {
  caseId?: string;
  familyFileId?: string;
  agreementId?: string;
  recipientId: string;
  onMessageSent: () => void;
  ariaEnabled?: boolean;
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
}: MessageComposeProps) {
  const [message, setMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [analysis, setAnalysis] = useState<ARIAAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      await messagesAPI.send({
        case_id: caseId,
        family_file_id: familyFileId,
        agreement_id: agreementId,
        recipient_id: recipientId,
        content,
        message_type: 'text',
      });

      setMessage('');
      setAnalysis(null);
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

  const handleAccept = () => {
    if (analysis?.suggestion) {
      handleSendDirect(analysis.suggestion);
    }
  };

  const handleModify = (newMessage: string) => {
    handleSendDirect(newMessage);
  };

  const handleReject = (newMessage: string) => {
    handleSendDirect(newMessage);
  };

  const handleSendAnyway = () => {
    handleSendDirect(message);
  };

  const handleCancel = () => {
    setAnalysis(null);
    setError(null);
  };

  const handleQuickSend = async () => {
    if (ariaEnabled) {
      if (!message.trim()) {
        setError('Please enter a message');
        return;
      }

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
          onAccept={handleAccept}
          onModify={handleModify}
          onReject={handleReject}
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

          {/* Text Input */}
          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="w-full cg-input min-h-[100px] pr-24 resize-none"
              disabled={isSending || isAnalyzing}
            />

            {/* Character Count */}
            <div className="absolute bottom-3 left-4 text-xs text-muted-foreground">
              {message.length} / 10,000
            </div>

            {/* Send Button */}
            <div className="absolute bottom-3 right-3 flex gap-2">
              {/* Preview Button */}
              <button
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
                onClick={handleQuickSend}
                disabled={!message.trim() || isAnalyzing || isSending}
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
