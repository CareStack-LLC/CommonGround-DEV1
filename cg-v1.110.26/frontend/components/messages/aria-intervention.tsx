'use client';

import { ARIAAnalysisResponse } from '@/lib/api';
import {
  Sparkles,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Send,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';

interface ARIAInterventionProps {
  analysis: ARIAAnalysisResponse;
  originalMessage: string;
  onSendAnyway: () => void;
  onCancel: () => void;
}

/**
 * WS3: ARIA Intervention Component (Flag Only)
 *
 * Simplified to show toxicity warnings without suggesting rewrites.
 * Users must revise their own messages.
 */
export function ARIAIntervention({
  analysis,
  originalMessage,
  onSendAnyway,
  onCancel,
}: ARIAInterventionProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getLevelConfig = (level: string) => {
    switch (level) {
      case 'green':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: <CheckCircle className="h-6 w-6 text-green-600" />,
          title: 'Message looks good!',
          subtitle: 'Your message maintains a constructive tone.',
          color: 'text-green-700',
        };
      case 'yellow':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-300',
          icon: <Sparkles className="h-6 w-6 text-amber-600" />,
          title: 'Tone Check',
          subtitle: 'This message may be misunderstood.',
          color: 'text-amber-700',
        };
      case 'orange':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-400',
          icon: <AlertTriangle className="h-6 w-6 text-orange-600" />,
          title: 'Conflict Risk',
          subtitle: 'This message is likely to escalate conflict.',
          color: 'text-orange-700',
        };
      case 'red':
        return {
          bg: 'bg-red-50',
          border: 'border-red-400',
          icon: <XCircle className="h-6 w-6 text-red-600" />,
          title: 'Message Blocked',
          subtitle: 'This message violates safety policies and cannot be sent.',
          color: 'text-red-700',
        };
      default:
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-300',
          icon: <Sparkles className="h-6 w-6 text-amber-600" />,
          title: 'ARIA Review',
          subtitle: 'Analysis complete.',
          color: 'text-amber-700',
        };
    }
  };

  const config = getLevelConfig(analysis.block_send ? 'red' : analysis.toxicity_level);
  const canSendAnyway = !analysis.block_send;

  return (
    <div className={`rounded-xl border-2 ${config.border} ${config.bg} overflow-hidden`}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-white/70 flex items-center justify-center">
              {config.icon}
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-lg ${config.color}`}>
              {config.title}
            </h3>
            <p className="text-sm text-gray-700 mt-1">
              {config.subtitle}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-black/5 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Explanation */}
        {analysis.explanation && (
          <div className="mt-4 text-sm text-gray-700 leading-relaxed">
            {analysis.explanation}
          </div>
        )}

        {/* Conflict Risk Meter */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-gray-600">Conflict Risk</span>
            <span className="text-xs font-semibold text-gray-800">
              {Math.round(analysis.toxicity_score * 100)}%
            </span>
          </div>
          <div className="h-2 bg-white/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                analysis.toxicity_level === 'green'
                  ? 'bg-green-500'
                  : analysis.toxicity_level === 'yellow'
                  ? 'bg-amber-500'
                  : analysis.toxicity_level === 'orange'
                  ? 'bg-orange-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${analysis.toxicity_score * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Detected Issues (Collapsible) */}
      {analysis.categories && analysis.categories.length > 0 && (
        <div className="px-5 pb-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span>Detected Issues ({analysis.categories.length})</span>
          </button>

          {showDetails && (
            <div className="mt-3 space-y-2">
              {analysis.categories.map((category, idx) => (
                <div
                  key={idx}
                  className="text-xs bg-white/60 px-3 py-2 rounded-lg border border-gray-200"
                >
                  <span className="font-medium capitalize">{category}</span>
                  {analysis.triggers && analysis.triggers[idx] && (
                    <span className="text-gray-600 ml-2">
                      • {analysis.triggers[idx]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-5 pt-2 border-t border-gray-200/50">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Edit Message Button (Primary) */}
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-xl transition-all shadow-sm hover:shadow"
          >
            Edit Message
          </button>

          {/* Send Anyway Button (If Allowed) */}
          {canSendAnyway && (
            <button
              onClick={onSendAnyway}
              className={`flex-1 px-4 py-3 font-medium rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 ${
                analysis.toxicity_level === 'green'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
              }`}
            >
              <Send className="h-4 w-4" />
              <span>Send Anyway</span>
            </button>
          )}

          {/* Blocked - Cannot Send */}
          {!canSendAnyway && (
            <div className="flex-1 px-4 py-3 bg-red-100 text-red-700 font-medium rounded-xl text-center border-2 border-red-300">
              Cannot Send
            </div>
          )}
        </div>

        {/* Warning Text */}
        {canSendAnyway && analysis.toxicity_level !== 'green' && (
          <p className="mt-3 text-xs text-center text-gray-600">
            Messages sent despite warnings may be reviewed by court or legal professionals.
          </p>
        )}
      </div>
    </div>
  );
}
