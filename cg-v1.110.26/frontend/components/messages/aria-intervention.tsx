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
          title: 'Please revise your message',
          subtitle: 'This message has high conflict potential.',
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

  const config = getLevelConfig(analysis.toxicity_level);
  const canSendAnyway = analysis.toxicity_level !== 'red';

  return (
    <div className={`aria-guardian ${config.bg} ${config.border} overflow-hidden`}>
      {/* Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Animated Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-white/50 flex items-center justify-center aria-glow">
              {config.icon}
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-lg ${config.color}`}>
              {config.title}
            </h3>
            <p className="text-sm text-foreground/70 mt-0.5">
              {config.subtitle}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-black/5 transition-smooth flex-shrink-0"
          >
            <X className="h-5 w-5 text-foreground/50" />
          </button>
        </div>

        {/* Explanation */}
        {analysis.explanation && (
          <p className="mt-4 text-sm text-foreground leading-relaxed">
            {analysis.explanation}
          </p>
        )}

        {/* Conflict Risk Meter */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-foreground/70">Conflict Risk</span>
            <span className="text-xs font-semibold text-foreground">
              {Math.round(analysis.toxicity_score * 100)}%
            </span>
          </div>
          <div className="h-2 bg-white/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                analysis.toxicity_level === 'green'
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

        {/* Expandable Details */}
        {(analysis.categories.length > 0 || analysis.triggers.length > 0) && (
          <div className="mt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-xs font-medium text-foreground/70 hover:text-foreground transition-smooth"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
              {showDetails ? 'Hide details' : 'Show details'}
            </button>

            {showDetails && (
              <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                {/* Categories */}
                {analysis.categories.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground/70 mb-2">Detected patterns:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.categories.map((category, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-white/50 rounded-lg text-xs font-medium text-foreground/80"
                        >
                          {category.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Triggers */}
                {analysis.triggers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground/70 mb-2">Specific concerns:</p>
                    <ul className="space-y-1">
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
        )}
      </div>

      {/* Messages Comparison */}
      <div className="border-t border-black/5">
        <div className="p-4 sm:p-5 space-y-4">
          {/* Original Message */}
          <div>
            <p className="text-xs font-medium text-foreground/70 mb-2">Your message:</p>
            <div className="p-3 bg-white/30 rounded-xl text-sm text-foreground border border-black/5">
              {originalMessage}
            </div>
          </div>

          {/* Suggestion */}
          {analysis.suggestion && action === 'none' && (
            <div>
              <p className="text-xs font-medium text-foreground/70 mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-cg-amber" />
                ARIA's suggestion:
              </p>
              <div className="p-3 bg-white rounded-xl text-sm text-foreground border-2 border-cg-amber/30 shadow-sm">
                {analysis.suggestion}
              </div>
            </div>
          )}

          {/* Edit Mode */}
          {(action === 'modify' || action === 'reject') && (
            <div>
              <p className="text-xs font-medium text-foreground/70 mb-2">
                {action === 'modify' ? 'Edit the suggestion:' : 'Write your alternative:'}
              </p>
              <textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full p-3 bg-white rounded-xl text-sm text-foreground border-2 border-cg-sage/30 focus:border-cg-sage focus:ring-2 focus:ring-cg-sage/20 outline-none transition-all resize-none"
                rows={4}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-black/5 p-4 sm:p-5 bg-white/30">
        {action === 'none' ? (
          <div className="space-y-2">
            {/* Primary Action - Accept Suggestion */}
            {analysis.suggestion && (
              <button
                onClick={onAccept}
                className="w-full cg-btn-primary flex items-center justify-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Use ARIA's Suggestion
              </button>
            )}

            {/* Secondary Actions */}
            <div className="flex gap-2">
              {analysis.suggestion && (
                <button
                  onClick={() => setAction('modify')}
                  className="flex-1 cg-btn-secondary flex items-center justify-center gap-2 py-2.5"
                >
                  <Edit3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                  <span className="sm:hidden">Edit</span>
                </button>
              )}

              <button
                onClick={() => {
                  setEditedMessage('');
                  setAction('reject');
                }}
                className="flex-1 cg-btn-secondary flex items-center justify-center gap-2 py-2.5"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Rewrite</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>

            {/* Send Anyway / Cancel */}
            <div className="flex gap-2 pt-2">
              {canSendAnyway && (
                <button
                  onClick={onSendAnyway}
                  className="flex-1 text-sm font-medium text-foreground/60 hover:text-foreground py-2 transition-smooth"
                >
                  Send Original
                </button>
              )}
              <button
                onClick={onCancel}
                className="flex-1 text-sm font-medium text-foreground/60 hover:text-foreground py-2 transition-smooth"
              >
                Cancel
              </button>
            </div>

            {!canSendAnyway && (
              <p className="text-xs text-cg-error text-center pt-2">
                This message requires revision before sending.
              </p>
            )}
          </div>
        ) : (
          /* Edit Mode Actions */
          <div className="space-y-2">
            <button
              onClick={() => action === 'modify' ? onModify(editedMessage) : onReject(editedMessage)}
              disabled={!editedMessage.trim()}
              className="w-full cg-btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              Send Message
            </button>
            <button
              onClick={() => {
                setAction('none');
                setEditedMessage(analysis.suggestion || '');
              }}
              className="w-full text-sm font-medium text-foreground/60 hover:text-foreground py-2 transition-smooth"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
