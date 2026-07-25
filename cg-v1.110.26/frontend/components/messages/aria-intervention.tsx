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
  Flame,
  TrendingUp,
  Lightbulb,
  Scale,
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
        bg: 'bg-gradient-to-br from-[#FEE2E2] to-white dark:from-[#7A2222]/30 dark:to-card',
        border: 'border-[#FEE2E2] dark:border-[#7A2222]/60',
        iconBg: 'bg-[#FEE2E2] dark:bg-[#7A2222]/40',
        iconColor: 'text-[#C53030]',
        icon: <XCircle className="h-6 w-6 text-[#C53030]" />,
        title: 'Message Blocked',
        subtitle: 'Severe violation of communication protocols.',
        btnPrimary: 'bg-[#C53030] hover:bg-[#9B2C2C] text-white',
      };
    }

    switch (level) {
      case 'green':
        return {
          bg: 'bg-gradient-to-br from-[#E8F4F0] to-white dark:from-[#1E3A4A]/30 dark:to-card',
          border: 'border-[#E8F4F0] dark:border-[#1E3A4A]/60',
          iconBg: 'bg-[#E8F4F0] dark:bg-[#1E3A4A]/40',
          iconColor: 'text-[#3DAA8A]',
          icon: <CheckCircle className="h-6 w-6 text-[#3DAA8A]" />,
          title: 'Communication Verified',
          subtitle: 'Your message maintains a constructive tone.',
          btnPrimary: 'bg-[#2D8A70] hover:bg-[#2D8A70] text-white',
        };
      case 'yellow':
        return {
          bg: 'bg-gradient-to-br from-[#FEF7ED] to-white dark:from-[#1E3A4A]/30 dark:to-card',
          border: 'border-[#FEF7ED] dark:border-[#1E3A4A]/60',
          iconBg: 'bg-[#FEF7ED] dark:bg-[#1E3A4A]/40',
          iconColor: 'text-[#F5A623]',
          icon: <Sparkles className="h-6 w-6 text-[#F5A623]" />,
          title: 'Tone Calibration',
          subtitle: 'This message may be misinterpreted.',
          btnPrimary: 'bg-[#E09520] hover:bg-[#E09520] text-white',
        };
      case 'orange':
        return {
          bg: 'bg-gradient-to-br from-[#FEF7ED] to-white dark:from-[#1E3A4A]/30 dark:to-card',
          border: 'border-[#FEF7ED] dark:border-[#1E3A4A]/60',
          iconBg: 'bg-[#FEF7ED] dark:bg-[#1E3A4A]/40',
          iconColor: 'text-[#F5A623]',
          icon: <AlertTriangle className="h-6 w-6 text-[#F5A623]" />,
          title: 'Conflict Risk',
          subtitle: 'High probability of escalation detected.',
          btnPrimary: 'bg-[#E09520] hover:bg-[#E09520] text-white',
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-[#FEF7ED] to-white dark:from-[#1E3A4A]/30 dark:to-card',
          border: 'border-[#FEF7ED] dark:border-[#1E3A4A]/60',
          iconBg: 'bg-[#FEF7ED] dark:bg-[#1E3A4A]/40',
          iconColor: 'text-[#F5A623]',
          icon: <Sparkles className="h-6 w-6 text-[#F5A623]" />,
          title: 'ARIA Review',
          subtitle: 'Analysis complete.',
          btnPrimary: 'bg-[#E09520] hover:bg-[#E09520] text-white',
        };
    }
  };

  const config = getLevelConfig(analysis.toxicity_level, analysis.block_send || false);
  const canSendAnyway = !analysis.block_send;

  const getCategoryColor = (category: string) => {
    const cat = category.toLowerCase();
    if (['hate_speech', 'sexual_harassment', 'threatening'].includes(cat)) return 'bg-[#C53030]';
    if (['custody_weaponization', 'financial_coercion', 'hostility'].includes(cat)) return 'bg-[#F5A623]';
    return 'bg-[#F5A623]';
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
                <Shield className="h-7 w-7 text-[#C53030]" />
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
          <button aria-label="Close"
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

        {/* V2: Window Heat */}
        {(analysis.window_heat_score != null && analysis.window_heat_score > 0) && (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <Flame className="h-3.5 w-3.5 text-cg-heat flex-shrink-0" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conversation Heat</span>
              <div
                className="flex-1 h-2 bg-[var(--portal-border)] rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={analysis.window_heat_score}
                aria-valuemin={0}
                aria-valuemax={5}
                aria-label={`Conversation heat: ${analysis.window_heat_score.toFixed(1)} out of 5`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${analysis.window_heat_score >= 3.5 ? 'bg-cg-heat-high' : 'bg-cg-heat'}`}
                  style={{ width: `${Math.min((analysis.window_heat_score / 5) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                {analysis.window_heat_score.toFixed(1)}/5
              </span>
            </div>
          </div>
        )}

        {/* V2: Domain Score Bars */}
        {analysis.domain_scores && Object.keys(analysis.domain_scores).length > 0 && (
          <div className="mt-4 bg-card/80 rounded-xl p-4 border border-border shadow-sm space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Domain Analysis</p>
            {Object.entries(analysis.domain_scores)
              .filter(([, score]) => (score as number) > 0)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([domain, score]) => (
                <div key={domain} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground w-24 truncate capitalize">{domain.replace(/_/g, ' ')}</span>
                  <div
                    className="flex-1 h-1.5 bg-[var(--portal-border)] rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={score as number}
                    aria-valuemin={0}
                    aria-valuemax={1}
                    aria-label={`${domain} score: ${Math.round((score as number) * 100)}%`}
                  >
                    <div
                      className={`h-full rounded-full ${(score as number) >= 0.7 ? 'bg-cg-heat-high' : 'bg-cg-heat'}`}
                      style={{ width: `${Math.min((score as number) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold tabular-nums text-muted-foreground w-8 text-right">
                    {Math.round((score as number) * 100)}%
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* V2: Session Patterns */}
        {analysis.session_patterns && analysis.session_patterns.length > 0 && (
          <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-cg-pattern-subtle border border-cg-pattern/20">
            <TrendingUp className="h-4 w-4 text-cg-pattern flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-cg-pattern uppercase tracking-wider mb-1">Recurring Patterns</p>
              <p className="text-sm text-foreground leading-relaxed">
                {analysis.session_patterns.join(' · ')}
              </p>
            </div>
          </div>
        )}

        {/* V2: Recipient Coaching */}
        {analysis.recipient_coaching && (
          <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-cg-coaching-subtle border border-cg-coaching/20">
            <Lightbulb className="h-4 w-4 text-cg-coaching flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-cg-coaching uppercase tracking-wider mb-1">ARIA Coaching Tip</p>
              <p className="text-sm text-foreground leading-relaxed">
                {analysis.recipient_coaching}
              </p>
            </div>
          </div>
        )}

        {/* V2: Time Signal Badges */}
        {analysis.time_frequency_flags && analysis.time_frequency_flags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {analysis.time_frequency_flags.map((signal) => {
              const icons: Record<string, string> = {
                late_night: '🌙', message_storm: '⚡', silence_to_flood: '🌊', sustained_campaign: '📈',
              };
              const labels: Record<string, string> = {
                late_night: 'Late Night', message_storm: 'Rapid Messages', silence_to_flood: 'Silence then Flood', sustained_campaign: 'Sustained Pattern',
              };
              return (
                <span
                  key={signal}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cg-time-signal-subtle text-cg-time-signal border border-cg-time-signal/20"
                >
                  <span>{icons[signal] || '?'}</span>
                  {labels[signal] || signal.replace(/_/g, ' ')}
                </span>
              );
            })}
          </div>
        )}

        {/* V2: Legal Flags */}
        {analysis.legal_flags && analysis.legal_flags.length > 0 && (
          <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-cg-legal-subtle border border-cg-legal/20">
            <Scale className="h-4 w-4 text-cg-legal flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-cg-legal uppercase tracking-wider mb-1">Legal Concern</p>
              <p className="text-sm text-foreground leading-relaxed">
                {analysis.legal_flags.map(f => f.replace(/_/g, ' ')).join(', ')}
              </p>
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
            <div className="flex-1 px-6 py-3.5 bg-cg-error-subtle text-cg-error font-bold rounded-xl text-center border-2 border-cg-error/20 cursor-not-allowed">
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
