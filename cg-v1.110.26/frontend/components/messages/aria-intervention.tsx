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
  Shield,
  MicOff,
} from 'lucide-react';
import { useState } from 'react';

interface ARIAInterventionProps {
  analysis: ARIAAnalysisResponse;
  originalMessage: string;
  onSendAnyway: () => void;
  onCancel: () => void;
}

/**
 * WS3: ARIA Intervention Component (Guardian Visual Update)
 *
 * Visual refresh to match the "ARIA Guardian" splash screen aesthetic.
 * uses DM Serif Display for headings and cleaner status indicators.
 */
export function ARIAIntervention({
  analysis,
  originalMessage,
  onSendAnyway,
  onCancel,
}: ARIAInterventionProps) {
  const [showDetails, setShowDetails] = useState(true);

  const getLevelConfig = (level: string, isBlocked: boolean) => {
    if (isBlocked) {
      return {
        bg: 'bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-card',
        border: 'border-red-200 dark:border-red-900/60',
        iconBg: 'bg-red-100 dark:bg-red-950/40',
        iconColor: 'text-red-500',
        icon: <XCircle className="h-6 w-6 text-red-500" />,
        title: 'Message Blocked',
        subtitle: 'Severe violation of communication protocols.',
        btnPrimary: 'bg-red-600 hover:bg-red-700 text-white',
      };
    }

    switch (level) {
      case 'green':
        return {
          bg: 'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-card',
          border: 'border-emerald-200 dark:border-emerald-900/60',
          iconBg: 'bg-emerald-100 dark:bg-emerald-950/40',
          iconColor: 'text-emerald-500',
          icon: <CheckCircle className="h-6 w-6 text-emerald-500" />,
          title: 'Communication Verified',
          subtitle: 'Your message maintains a constructive tone.',
          btnPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        };
      case 'yellow':
        return {
          bg: 'bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-card',
          border: 'border-amber-200 dark:border-amber-900/60',
          iconBg: 'bg-amber-100 dark:bg-amber-950/40',
          iconColor: 'text-amber-500',
          icon: <Sparkles className="h-6 w-6 text-amber-500" />,
          title: 'Tone Calibration',
          subtitle: 'This message may be misinterpreted.',
          btnPrimary: 'bg-amber-600 hover:bg-amber-700 text-white',
        };
      case 'orange':
        return {
          bg: 'bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-card',
          border: 'border-orange-200 dark:border-orange-900/60',
          iconBg: 'bg-orange-100 dark:bg-orange-950/40',
          iconColor: 'text-orange-500',
          icon: <AlertTriangle className="h-6 w-6 text-orange-500" />,
          title: 'Conflict Risk',
          subtitle: 'High probability of escalation detected.',
          btnPrimary: 'bg-orange-600 hover:bg-orange-700 text-white',
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-card',
          border: 'border-amber-200 dark:border-amber-900/60',
          iconBg: 'bg-amber-100 dark:bg-amber-950/40',
          iconColor: 'text-amber-500',
          icon: <Sparkles className="h-6 w-6 text-amber-500" />,
          title: 'ARIA Review',
          subtitle: 'Analysis complete.',
          btnPrimary: 'bg-amber-600 hover:bg-amber-700 text-white',
        };
    }
  };

  const config = getLevelConfig(analysis.toxicity_level, analysis.block_send || false);
  const canSendAnyway = !analysis.block_send;

  const getCategoryColor = (category: string) => {
    const cat = category.toLowerCase();
    if (['hate_speech', 'sexual_harassment', 'threatening'].includes(cat)) return 'bg-red-500';
    if (['custody_weaponization', 'financial_coercion', 'hostility'].includes(cat)) return 'bg-orange-500';
    return 'bg-amber-500';
  };

  return (
    <div className={`rounded-2xl border-2 ${config.border} ${config.bg} shadow-lg overflow-hidden transition-all duration-300`}>
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start gap-5">
          {/* Guardian Icon Box */}
          <div className="flex-shrink-0">
            <div className={`w-14 h-14 rounded-2xl ${config.iconBg} flex items-center justify-center shadow-sm`}>
              {/* Use Shield for blocked/severe, normal icon for others? Or always Shield? User likes the Guardian branding. */}
              {analysis.block_send ? (
                <Shield className="h-7 w-7 text-red-600" />
              ) : (
                config.icon
              )}
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                {config.title}
              </h3>
              {/* Optional: Add 'Guardian Active' badge? */}
            </div>
            <p className="text-muted-foreground font-medium text-sm leading-relaxed">
              {config.subtitle}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onCancel}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* AI Explanation */}
        {analysis.explanation && (
          <div className="mt-5 text-foreground text-sm leading-relaxed bg-card/60 p-4 rounded-xl border border-border italic">
            &quot;{analysis.explanation}&quot;
          </div>
        )}

        {/* Categories (Guardian Steps Style) */}
        {analysis.categories && analysis.categories.length > 0 && (
          <div className="mt-6">
            <div className="bg-card/80 rounded-xl p-4 border border-border shadow-sm space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Detailed Analysis</p>
              {analysis.categories.map((category, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <div className={`w-6 h-6 rounded-full ${getCategoryColor(category).replace('500', '100')} flex items-center justify-center flex-shrink-0`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${getCategoryColor(category)}`}></div>
                  </div>
                  <span className="text-foreground font-medium capitalize">
                    {category.replace(/_/g, ' ')}
                  </span>
                  {analysis.triggers && analysis.triggers[idx] && (
                    <span className="text-muted-foreground text-xs ml-auto truncate max-w-[150px]">
                      Detected: &quot;{analysis.triggers[idx]}&quot;
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 pt-2">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Edit Message Button (Primary) */}
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3.5 bg-card border-2 border-border hover:border-muted-foreground/30 text-foreground font-bold rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            Edit Message
          </button>

          {/* Send Anyway Button (If Allowed) */}
          {canSendAnyway && (
            <button
              onClick={onSendAnyway}
              className={`flex-1 px-6 py-3.5 font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 ${config.btnPrimary}`}
            >
              <Send className="h-4 w-4" />
              <span>Send Anyway</span>
            </button>
          )}

          {/* Blocked - Cannot Send */}
          {!canSendAnyway && (
            <div className="flex-1 px-6 py-3.5 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-bold rounded-xl text-center border-2 border-red-200 dark:border-red-900/60 cursor-not-allowed">
              Message Restricted
            </div>
          )}
        </div>

        {/* Disclaimer */}
        {canSendAnyway && analysis.toxicity_level !== 'green' && (
          <p className="mt-4 text-xs text-center text-muted-foreground font-medium">
            <Shield className="w-3 h-3 inline mr-1 mb-0.5" />
            Guardian active. Messages are logged for court review.
          </p>
        )}
      </div>
    </div>
  );
}
