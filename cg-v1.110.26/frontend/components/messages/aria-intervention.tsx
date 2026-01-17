'use client';

import { useState } from 'react';
import { ARIAAnalysisResponse } from '@/lib/api';
import {
  Sparkles,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Edit3,
  RefreshCw,
  Send,
  X,
  ChevronDown,
} from 'lucide-react';

interface ARIAInterventionProps {
  analysis: ARIAAnalysisResponse;
  originalMessage: string;
  onAccept: () => void;
  onModify: (newMessage: string) => void;
  onReject: (newMessage: string) => void;
  onSendAnyway: () => void;
  onCancel: () => void;
}

/**
 * ARIA Guardian Intervention Component
 *
 * Design: Amber glowing guardian aesthetic
 * - Warm amber colors for attention
 * - Soft, non-threatening design
 * - Clear action paths
 */
export function ARIAIntervention({
  analysis,
  originalMessage,
  onAccept,
  onModify,
  onReject,
  onSendAnyway,
  onCancel,
}: ARIAInterventionProps) {
  const [action, setAction] = useState<'none' | 'modify' | 'reject'>('none');
  const [editedMessage, setEditedMessage] = useState(analysis.suggestion || '');
  const [showDetails, setShowDetails] = useState(false);

  const getLevelConfig = (level: string) => {
    switch (level) {
      case 'green':
        return {
          bg: 'bg-cg-success-subtle',
          border: 'border-cg-success/30',
          icon: <CheckCircle className="h-6 w-6 text-cg-success" />,
          title: 'Message looks good!',
          subtitle: 'Your message maintains a constructive tone.',
          color: 'text-cg-success',
        };
      case 'yellow':
        return {
          bg: 'bg-cg-amber-subtle',
          border: 'border-cg-amber/30',
          icon: <Sparkles className="h-6 w-6 text-cg-amber" />,
          title: 'ARIA has a suggestion',
          subtitle: 'A small adjustment could improve the tone.',
          color: 'text-cg-amber',
        };
      case 'orange':
        return {
          bg: 'bg-cg-warning-subtle',
          border: 'border-cg-warning/50',
          icon: <AlertTriangle className="h-6 w-6 text-cg-warning" />,
          title: 'Tone check recommended',
          subtitle: 'This message may escalate conflict.',
          color: 'text-cg-warning',
        };
      case 'red':
        return {
          bg: 'bg-cg-error-subtle',
          border: 'border-cg-error/30',
          icon: <XCircle className="h-6 w-6 text-cg-error" />,
          title: 'Message Blocked',
          subtitle: 'This message violates safety policies and cannot be sent.',
          color: 'text-cg-error',
        };
      default:
        return {
          bg: 'bg-cg-amber-subtle',
          border: 'border-cg-amber/30',
          icon: <Sparkles className="h-6 w-6 text-cg-amber" />,
          title: 'ARIA Review',
          subtitle: 'Analysis complete.',
          color: 'text-cg-amber',
        };
    }
  };

  const config = getLevelConfig(analysis.block_send ? 'red' : analysis.toxicity_level);
  // Strictly prevent sending if block_send is true
  const canSendAnyway = !analysis.block_send && analysis.toxicity_level !== 'red'; // Double safety check

  return (
    <div className={`aria-guardian ${config.bg} ${config.border} overflow-hidden max-h-[80vh] sm:max-h-[85vh] flex flex-col`}>
      {/* Header - Compact on mobile */}
      <div className="p-3 sm:p-5 flex-shrink-0">
        <div className="flex items-start gap-2 sm:gap-4">
          {/* Animated Icon - Smaller on mobile */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/50 flex items-center justify-center aria-glow">
              <div className="scale-90 sm:scale-100">{config.icon}</div>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-base sm:text-lg ${config.color}`}>
              {config.title}
            </h3>
            <p className="text-xs sm:text-sm text-foreground/70 mt-0.5">
              {config.subtitle}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onCancel}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-black/5 transition-smooth flex-shrink-0"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/50" />
          </button>
        </div>

        {/* Explanation - Hidden on mobile, shown in details */}
        {analysis.explanation && (
          <p className="hidden sm:block mt-3 text-sm text-foreground leading-relaxed">
            {analysis.explanation}
          </p>
        )}

        {/* Conflict Risk Meter - More compact */}
        <div className="mt-3 sm:mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-foreground/70">Conflict Risk</span>
            <span className="text-xs font-semibold text-foreground">
              {Math.round(analysis.toxicity_score * 100)}%
            </span>
          </div>
          <div className="h-1.5 sm:h-2 bg-white/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${analysis.toxicity_level === 'green'
                  ? 'bg-cg-success'
                  : analysis.toxicity_level === 'yellow'
                    ? 'bg-cg-amber'
                    : analysis.toxicity_level === 'orange'
                      ? 'bg-cg-warning'
                      : 'bg-cg-error'
                }`}
              style={{ width: `${analysis.toxicity_score * 100}%` }}
            />
          </div>
        </div>

        {/* Expandable Details - Includes explanation on mobile */}
        <div className="mt-2 sm:mt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-xs font-medium text-foreground/70 hover:text-foreground transition-smooth"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            {showDetails ? 'Hide details' : 'Show details'}
          </button>

          {showDetails && (
            <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3 animate-in slide-in-from-top-2 duration-200">
              {/* Explanation on mobile */}
              {analysis.explanation && (
                <p className="sm:hidden text-xs text-foreground leading-relaxed">
                  {analysis.explanation}
                </p>
              )}

              {/* Categories */}
              {analysis.categories.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground/70 mb-1.5">Detected patterns:</p>
                  <div className="flex flex-wrap gap-1">
                    {analysis.categories.map((category, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-white/50 rounded-lg text-xs font-medium text-foreground/80 capitalize"
                      >
                        {category.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Triggers */}
              {analysis.triggers.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground/70 mb-1.5">Specific concerns:</p>
                  <ul className="space-y-0.5">
                    {analysis.triggers.map((trigger, index) => (
                      <li key={index} className="text-xs text-foreground/70 pl-3 relative">
                        <span className="absolute left-0">•</span>
                        "{trigger}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages Comparison - Scrollable area */}
      <div className="border-t border-black/5 overflow-y-auto flex-1 min-h-0">
        <div className="p-3 sm:p-5 space-y-3 sm:space-y-4">
          {/* Original Message */}
          <div>
            <p className="text-xs font-medium text-foreground/70 mb-1.5">Your message:</p>
            <div className="p-2.5 sm:p-3 bg-white/30 rounded-xl text-sm text-foreground border border-black/5">
              {originalMessage}
            </div>
          </div>

          {/* Suggestion */}
          {analysis.suggestion && action === 'none' && (
            <div>
              <p className="text-xs font-medium text-foreground/70 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-cg-amber" />
                ARIA's suggestion:
              </p>
              <div className="p-2.5 sm:p-3 bg-white rounded-xl text-sm text-foreground border-2 border-cg-amber/30 shadow-sm">
                {analysis.suggestion}
              </div>
            </div>
          )}

          {/* Edit Mode */}
          {(action === 'modify' || action === 'reject') && (
            <div>
              <p className="text-xs font-medium text-foreground/70 mb-1.5">
                {action === 'modify' ? 'Edit the suggestion:' : 'Write your alternative:'}
              </p>
              <textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full p-2.5 sm:p-3 bg-white rounded-xl text-sm text-foreground border-2 border-cg-sage/30 focus:border-cg-sage focus:ring-2 focus:ring-cg-sage/20 outline-none transition-all resize-none"
                rows={3}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Actions - Fixed at bottom, compact on mobile */}
      <div className="border-t border-black/5 p-3 sm:p-5 bg-white/30 flex-shrink-0">
        {action === 'none' ? (
          <div className="space-y-2">
            {/* Primary Action - Accept Suggestion */}
            {analysis.suggestion && (
              <button
                onClick={onAccept}
                className="w-full cg-btn-primary flex items-center justify-center gap-2 py-2.5 sm:py-3"
              >
                <CheckCircle className="h-4 w-4" />
                Use ARIA's Suggestion
              </button>
            )}

            {/* Secondary Actions + Send/Cancel in one row on mobile */}
            <div className="flex gap-2">
              {analysis.suggestion && (
                <button
                  onClick={() => setAction('modify')}
                  className="flex-1 cg-btn-secondary flex items-center justify-center gap-1.5 py-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>
              )}

              <button
                onClick={() => {
                  setEditedMessage('');
                  setAction('reject');
                }}
                className="flex-1 cg-btn-secondary flex items-center justify-center gap-1.5 py-2"
              >
                <RefreshCw className="h-4 w-4" />
                Rewrite
              </button>
            </div>

            {/* Send Anyway / Cancel - Inline on mobile */}
            <div className="flex gap-2">
              {canSendAnyway && (
                <button
                  onClick={onSendAnyway}
                  className="flex-1 text-xs sm:text-sm font-medium text-foreground/60 hover:text-foreground py-1.5 transition-smooth"
                >
                  Send Original
                </button>
              )}
              <button
                onClick={onCancel}
                className="flex-1 text-xs sm:text-sm font-medium text-foreground/60 hover:text-foreground py-1.5 transition-smooth"
              >
                Cancel
              </button>
            </div>

            {!canSendAnyway && (
              <p className="text-xs text-cg-error text-center pt-1 font-medium">
                {analysis.block_send
                  ? "This message violates safety guidelines."
                  : "Revision required before sending."}
              </p>
            )}
          </div>
        ) : (
          /* Edit Mode Actions */
          <div className="space-y-2">
            <button
              onClick={() => action === 'modify' ? onModify(editedMessage) : onReject(editedMessage)}
              disabled={!editedMessage.trim()}
              className="w-full cg-btn-primary flex items-center justify-center gap-2 py-2.5 sm:py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              Send Message
            </button>
            <button
              onClick={() => {
                setAction('none');
                setEditedMessage(analysis.suggestion || '');
              }}
              className="w-full text-xs sm:text-sm font-medium text-foreground/60 hover:text-foreground py-1.5 transition-smooth"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
