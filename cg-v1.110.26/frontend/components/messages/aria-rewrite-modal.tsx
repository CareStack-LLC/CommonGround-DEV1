'use client';

import { useState } from 'react';
import { Shield, ShieldAlert, ShieldX, RotateCcw, Send, Edit3, X, AlertTriangle, Sparkles, Scale, Flame, Clock, Zap, TrendingUp, MessageSquare, Lightbulb } from 'lucide-react';

export interface ARIARewritePayload {
    aria_flagged: true;
    aria_mode: 'standard' | 'strict';
    original_message: string;
    suggested_rewrite: string | null;
    explanation: string;
    categories: string[];
    toxicity_score?: number;
    severity?: string;
    confidence_score?: number;
    response_time_ms?: number;
    // V2 Sentinel Shield enrichment
    v2_category_confidence?: Record<string, number>;
    v2_window_heat?: number;
    v2_domain_scores?: Record<string, number>;
    v2_session_patterns?: string[];
    v2_time_signals?: string[];
    v2_recipient_coaching?: string;
    v2_reporting_tags?: string[];
    v2_legal_flags?: string[];
}

interface ARIARewriteModalProps {
    payload: ARIARewritePayload;
    onUseRewrite: (rewrittenContent: string) => void;
    onEditRewrite: (startingContent: string) => void;
    /** Only shown in Standard mode */
    onSendOriginal?: () => void;
    onCancel: () => void;
    isSending?: boolean;
    /** Context determines header text and styling */
    context?: 'parent' | 'child' | 'circle_contact';
}

/** Time signal display config */
const TIME_SIGNAL_CONFIG: Record<string, { label: string; icon: string }> = {
    late_night: { label: 'Late Night', icon: '🌙' },
    message_storm: { label: 'Rapid Messages', icon: '⚡' },
    silence_to_flood: { label: 'Silence then Flood', icon: '🌊' },
    sustained_campaign: { label: 'Sustained Pattern', icon: '📈' },
};

/** V2 Domain display config — severity-tiered using semantic CSS variables */
const DOMAIN_CONFIG: Record<string, { label: string; color: string }> = {
    CTRL: { label: 'Coercive Control', color: 'bg-cg-error' },
    THRT: { label: 'Threats', color: 'bg-cg-error' },
    PSYB: { label: 'Psychological', color: 'bg-cg-warning' },
    CONT: { label: 'Contempt', color: 'bg-cg-warning' },
    ALNT: { label: 'Alienation', color: 'bg-cg-warning' },
    ESCP: { label: 'Escalation', color: 'bg-cg-warning' },
    PAGG: { label: 'Passive Aggression', color: 'bg-[var(--portal-accent)]' },
    MNIP: { label: 'Manipulation', color: 'bg-[var(--portal-accent)]' },
};

/** Severity tier color classes — portal-aware, dark mode compatible */
const SEVERITY_COLORS = {
    severe: 'bg-cg-error-subtle text-cg-error border-cg-error/20',
    moderate: 'bg-cg-warning-subtle text-cg-warning border-cg-warning/20',
    mild: 'bg-[var(--portal-accent)]/10 text-[var(--portal-accent)] border-[var(--portal-accent)]/20',
} as const;

/** Category display config — V1 labels + V2 Sentinel Shield categories */
const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon?: string }> = {
    // Severe — confirmed harmful patterns
    hate_speech: { label: 'Hate Speech', color: SEVERITY_COLORS.severe },
    sexual_harassment: { label: 'Sexual Harassment', color: SEVERITY_COLORS.severe },
    threats: { label: 'Threats', color: SEVERITY_COLORS.severe },
    threatening: { label: 'Threats', color: SEVERITY_COLORS.severe },
    grooming: { label: 'Grooming', color: SEVERITY_COLORS.severe },
    stranger_danger: { label: 'Stranger Danger', color: SEVERITY_COLORS.severe },
    // Moderate — escalation risk
    custody_weaponization: { label: 'Custody Weaponization', color: SEVERITY_COLORS.moderate },
    parental_alienation: { label: 'Parental Alienation', color: SEVERITY_COLORS.moderate },
    manipulation: { label: 'Manipulation', color: SEVERITY_COLORS.moderate },
    emotional_manipulation: { label: 'Emotional Manipulation', color: SEVERITY_COLORS.moderate },
    coparenting_conflict: { label: 'Co-Parenting Conflict', color: SEVERITY_COLORS.moderate },
    hostility: { label: 'Hostility', color: SEVERITY_COLORS.moderate },
    financial_coercion: { label: 'Financial Coercion', color: SEVERITY_COLORS.moderate },
    bullying: { label: 'Bullying', color: SEVERITY_COLORS.moderate },
    controlling: { label: 'Controlling', color: SEVERITY_COLORS.moderate },
    insult: { label: 'Insult', color: SEVERITY_COLORS.moderate },
    blame: { label: 'Blame', color: SEVERITY_COLORS.moderate },
    age_inappropriate: { label: 'Age Inappropriate', color: SEVERITY_COLORS.moderate },
    // Mild — tone concerns
    profanity: { label: 'Profanity', color: SEVERITY_COLORS.mild },
    sarcasm: { label: 'Sarcasm', color: SEVERITY_COLORS.mild },
    dismissive: { label: 'Dismissive', color: SEVERITY_COLORS.mild },
    passive_aggressive: { label: 'Passive Aggressive', color: SEVERITY_COLORS.mild },
    modern_slang: { label: 'Inappropriate Slang', color: SEVERITY_COLORS.mild },
    evasion: { label: 'Evasion Attempt', color: SEVERITY_COLORS.mild },
};

/** Severity tier config */
function getSeverityConfig(severity?: string) {
    switch (severity) {
        case 'severe':
            return {
                gradient: 'from-[#C53030] to-[#E09520] dark:from-[#9B2C2C] dark:to-[#1E3A4A]',
                headerBg: 'bg-gradient-to-r from-[#FEE2E2] to-[#FEF7ED] dark:from-[#7A2222]/50 dark:to-[#1E3A4A]/40',
                border: 'border-[#FEE2E2]/80 dark:border-[#7A2222]/60',
                icon: ShieldX,
                title: 'Message Blocked',
                iconColor: 'text-[#C53030] dark:text-[#E06B6B]',
                iconBg: 'bg-[#FEE2E2] dark:bg-[#7A2222]/50',
                pulse: true,
            };
        case 'moderate':
            return {
                gradient: 'from-[#F5A623] to-[#E09520] dark:from-[#E09520] dark:to-[#1E3A4A]',
                headerBg: 'bg-gradient-to-r from-[#FEF7ED] to-[#FEF7ED] dark:from-[#1E3A4A]/40 dark:to-[#1E3A4A]/30',
                border: 'border-[#FEF7ED]/80 dark:border-[#1E3A4A]/60',
                icon: ShieldAlert,
                title: 'Court Risk Warning',
                iconColor: 'text-[#E09520] dark:text-[#F5A623]',
                iconBg: 'bg-[#FEF7ED] dark:bg-[#1E3A4A]/50',
                pulse: false,
            };
        default: // mild or safe
            return {
                gradient: 'from-[#F5A623] to-[#F5A623] dark:from-[#E09520] dark:to-[#E09520]',
                headerBg: 'bg-gradient-to-r from-[#FEF7ED]/80 to-[#FEF7ED]/60 dark:from-[#1E3A4A]/30 dark:to-[#1E3A4A]/20',
                border: 'border-[#FEF7ED]/60 dark:border-[#1E3A4A]/40',
                icon: Shield,
                title: 'Tone Check',
                iconColor: 'text-[#E09520] dark:text-[#F5A623]',
                iconBg: 'bg-[#FEF7ED] dark:bg-[#1E3A4A]/50',
                pulse: false,
            };
    }
}

/**
 * ARIA v2 Rewrite Modal — Premium Severity-Tiered Design
 *
 * Shown when the backend returns a 202 with aria_flagged=true.
 * Presents the original message vs. ARIA's contextual rewrite.
 *
 * Severity tiers:
 * - 🟡 Mild: Soft amber, "Tone Check"
 * - 🟠 Moderate: Orange gradient, "Court Risk Warning"
 * - 🔴 Severe: Red gradient + pulse, "Message Blocked"
 *
 * Modes:
 * - Standard: Accept / Edit / Send Original (adults)
 * - Strict: Accept / Edit only (children, or strict-mode parents)
 *
 * Contexts:
 * - parent: Standard legal-tone language
 * - child: Kid-friendly ARIA mascot language
 * - circle_contact: Professional portal language
 */
export function ARIARewriteModal({
    payload,
    onUseRewrite,
    onEditRewrite,
    onSendOriginal,
    onCancel,
    isSending = false,
    context = 'parent',
}: ARIARewriteModalProps) {
    const [editingRewrite, setEditingRewrite] = useState(false);
    const [editedContent, setEditedContent] = useState(payload.suggested_rewrite ?? '');
    const isStrict = payload.aria_mode === 'strict';
    const isChild = context === 'child';
    const severity = payload.severity || (payload.toxicity_score && payload.toxicity_score >= 0.8 ? 'severe' : payload.toxicity_score && payload.toxicity_score >= 0.6 ? 'moderate' : 'mild');
    const config = getSeverityConfig(severity);
    const IconComponent = config.icon;

    const handleUseRewrite = () => {
        onUseRewrite(editingRewrite ? editedContent : (payload.suggested_rewrite ?? ''));
    };

    const handleStartEdit = () => {
        setEditedContent(payload.suggested_rewrite ?? payload.original_message);
        setEditingRewrite(true);
    };

    const handleConfirmEdit = () => {
        onUseRewrite(editedContent);
    };

    // Child-friendly content
    if (isChild) {
        return (
            <div className="relative rounded-2xl border border-teal-200/60 dark:border-teal-900/60 bg-gradient-to-b from-teal-50 to-white dark:from-teal-950/30 dark:to-card shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Kid-friendly header */}
                <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-teal-100/70 to-[#E8F4F0]/50 dark:from-teal-950/50 dark:to-[#1E3A4A]/30 border-b border-teal-200/60 dark:border-teal-900/40">
                    <div className="p-2.5 bg-teal-500/15 rounded-2xl">
                        <Sparkles className="h-6 w-6 text-teal-500 dark:text-teal-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-base">ARIA wants to help! ✨</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Your message might not sound the way you mean it. Here's a nicer version!
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        disabled={isSending}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Side-by-side for kids */}
                <div className="grid grid-cols-2 gap-3 p-5">
                    <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What you wrote</p>
                        <div className="rounded-xl bg-[#FEF7ED] dark:bg-[#1E3A4A]/20 border border-[#FEF7ED]/60 dark:border-[#1E3A4A]/40 p-3 min-h-[80px]">
                            <p className="text-sm text-foreground leading-relaxed">{payload.original_message}</p>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            ARIA's version
                        </p>
                        {editingRewrite ? (
                            <textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="w-full rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-300 dark:border-teal-800 p-3 text-sm text-foreground leading-relaxed resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-teal-400"
                                autoFocus
                            />
                        ) : (
                            <div className="rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40 p-3 min-h-[80px]">
                                {payload.suggested_rewrite ? (
                                    <p className="text-sm text-foreground leading-relaxed">{payload.suggested_rewrite}</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">
                                        Try writing your message a different way!
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* V2: Child-friendly heat indicator (only when heat is noticeable) */}
                {payload.v2_window_heat != null && payload.v2_window_heat > 2 && (
                    <div className="mx-5 mb-3 flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-[var(--portal-accent)]/10 border border-[var(--portal-accent)]/20">
                        <Sparkles className="h-5 w-5 text-[var(--portal-accent)] flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground leading-relaxed">
                            This conversation is getting a little warm. Let&apos;s take a deep breath! 🌿
                        </p>
                    </div>
                )}

                {/* V2: Child-friendly coaching tip */}
                {payload.v2_recipient_coaching && (
                    <div className="mx-5 mb-3 flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-[var(--portal-primary)]/10 border border-[var(--portal-primary)]/20">
                        <Sparkles className="h-5 w-5 text-[var(--portal-primary)] flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground leading-relaxed">
                            ARIA&apos;s tip: {payload.v2_recipient_coaching}
                        </p>
                    </div>
                )}

                {/* Kid-friendly action buttons — big and friendly */}
                <div className="flex gap-3 px-5 pb-5">
                    {!editingRewrite && payload.suggested_rewrite && (
                        <button
                            onClick={handleUseRewrite}
                            disabled={isSending}
                            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 shadow-sm"
                        >
                            <Sparkles className="h-4 w-4" />
                            Send ARIA's version ✨
                        </button>
                    )}
                    {!editingRewrite ? (
                        <button
                            onClick={handleStartEdit}
                            disabled={isSending}
                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-teal-200 dark:border-teal-800 bg-card text-foreground text-sm font-medium hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-colors disabled:opacity-50"
                        >
                            <Edit3 className="h-4 w-4" />
                            Edit my message ✏️
                        </button>
                    ) : (
                        <button
                            onClick={handleConfirmEdit}
                            disabled={isSending || !editedContent.trim()}
                            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 shadow-sm"
                        >
                            <Send className="h-4 w-4" />
                            Send my version
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Adult version (parent + circle_contact) — premium severity-tiered design
    return (
        <div className={`relative rounded-2xl border ${config.border} bg-gradient-to-b from-white to-slate-50/50 dark:from-card dark:to-slate-950/20 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-400`}>
            {/* Severity gradient accent bar */}
            <div className={`h-1 bg-gradient-to-r ${config.gradient}`} />

            {/* Header */}
            <div className={`flex items-center gap-3 px-5 py-4 ${config.headerBg} border-b ${config.border}`}>
                <div className={`p-2.5 ${config.iconBg} rounded-xl ${config.pulse ? 'animate-pulse' : ''}`}>
                    <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground text-sm">{config.title}</h3>
                        {isStrict && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cg-error-subtle text-cg-error border border-cg-error/20">
                                Strict
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{payload.explanation}</p>
                </div>
                <button
                    onClick={onCancel}
                    disabled={isSending}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Category badges with optional confidence */}
            {payload.categories && payload.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-5 pt-3">
                    {payload.categories.map((cat) => {
                        const catConfig = CATEGORY_CONFIG[cat] || {
                            label: cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                            color: 'bg-[var(--portal-surface)] text-foreground border-[var(--portal-border)]',
                        };
                        const confidence = payload.v2_category_confidence?.[cat];
                        return (
                            <span
                                key={cat}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catConfig.color}`}
                            >
                                {catConfig.label}
                                {confidence != null && confidence > 0.5 && (
                                    <span className="text-[9px] opacity-70 tabular-nums">{Math.round(confidence * 100)}%</span>
                                )}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Confidence/severity meter */}
            {(payload.toxicity_score !== undefined || payload.confidence_score !== undefined) && (
                <div className="px-5 pt-3">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Severity</span>
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${config.gradient}`}
                                style={{ width: `${Math.min((payload.toxicity_score ?? payload.confidence_score ?? 0) * 100, 100)}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                            {Math.round((payload.toxicity_score ?? payload.confidence_score ?? 0) * 100)}%
                        </span>
                    </div>
                </div>
            )}

            {/* V2: Window Heat Indicator */}
            {payload.v2_window_heat != null && payload.v2_window_heat > 0 && (
                <div className="px-5 pt-2">
                    <div className="flex items-center gap-2">
                        <Flame className="h-3 w-3 text-cg-heat flex-shrink-0" />
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Conversation Heat</span>
                        <div
                            className="flex-1 h-1.5 bg-[var(--portal-border)] rounded-full overflow-hidden"
                            role="progressbar"
                            aria-valuenow={payload.v2_window_heat}
                            aria-valuemin={0}
                            aria-valuemax={5}
                            aria-label={`Conversation heat: ${payload.v2_window_heat.toFixed(1)} out of 5`}
                        >
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${payload.v2_window_heat >= 3.5 ? 'bg-cg-heat-high' : 'bg-cg-heat'}`}
                                style={{ width: `${Math.min((payload.v2_window_heat / 5) * 100, 100)}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                            {payload.v2_window_heat.toFixed(1)}/5
                        </span>
                    </div>
                </div>
            )}

            {/* V2: Domain Scores */}
            {payload.v2_domain_scores && Object.keys(payload.v2_domain_scores).length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-5 pt-2">
                    {Object.entries(payload.v2_domain_scores)
                        .filter(([, score]) => score > 0)
                        .sort(([, a], [, b]) => b - a)
                        .map(([domain, score]) => {
                            const domainCfg = DOMAIN_CONFIG[domain];
                            if (!domainCfg) return null;
                            return (
                                <span
                                    key={domain}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--portal-surface)] text-foreground border border-[var(--portal-border)]"
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${domainCfg.color}`} />
                                    {domainCfg.label}
                                    <span className="text-muted-foreground ml-0.5">{Math.round(score * 100)}%</span>
                                </span>
                            );
                        })}
                </div>
            )}

            {/* V2: Time Signal Badges */}
            {payload.v2_time_signals && payload.v2_time_signals.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-5 pt-2">
                    {payload.v2_time_signals.map((signal) => {
                        const signalCfg = TIME_SIGNAL_CONFIG[signal] || { label: signal, icon: '?' };
                        return (
                            <span
                                key={signal}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cg-time-signal-subtle text-cg-time-signal border border-cg-time-signal/20"
                            >
                                <span className="text-xs">{signalCfg.icon}</span>
                                {signalCfg.label}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* V2: Session Patterns */}
            {payload.v2_session_patterns && payload.v2_session_patterns.length > 0 && (
                <div className="mx-5 mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-cg-pattern-subtle border border-cg-pattern/20">
                    <TrendingUp className="h-3.5 w-3.5 text-cg-pattern flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[10px] font-semibold text-cg-pattern uppercase tracking-wider mb-1">Recurring Patterns</p>
                        <p className="text-xs text-foreground leading-relaxed">
                            {payload.v2_session_patterns.join(' · ')}
                        </p>
                    </div>
                </div>
            )}

            {/* V2: Recipient Coaching Note */}
            {payload.v2_recipient_coaching && (
                <div className="mx-5 mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-cg-coaching-subtle border border-cg-coaching/20">
                    <Lightbulb className="h-3.5 w-3.5 text-cg-coaching flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[10px] font-semibold text-cg-coaching uppercase tracking-wider mb-1">ARIA Coaching Tip</p>
                        <p className="text-xs text-foreground leading-relaxed">
                            {payload.v2_recipient_coaching}
                        </p>
                    </div>
                </div>
            )}

            {/* V2: Legal Flags (if present) */}
            {payload.v2_legal_flags && payload.v2_legal_flags.length > 0 && (
                <div className="mx-5 mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-cg-legal-subtle border border-cg-legal/20">
                    <Scale className="h-3.5 w-3.5 text-cg-legal flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[10px] font-semibold text-cg-legal uppercase tracking-wider mb-1">Legal Concern</p>
                        <p className="text-xs text-foreground leading-relaxed">
                            {payload.v2_legal_flags.map(f => f.replace(/_/g, ' ')).join(', ')}
                        </p>
                    </div>
                </div>
            )}

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-2 gap-3 p-5">
                {/* Original */}
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your message</p>
                    <div className="rounded-xl bg-[#FEE2E2]/80 dark:bg-[#7A2222]/15 border border-[#FEE2E2]/50 dark:border-[#7A2222]/30 p-3 min-h-[80px]">
                        <p className="text-sm text-foreground leading-relaxed">{payload.original_message}</p>
                    </div>
                </div>

                {/* ARIA Suggestion */}
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[#2D8A70] dark:text-[#5BC4A0] uppercase tracking-wide flex items-center gap-1">
                        <RotateCcw className="h-3 w-3" />
                        ARIA's suggestion
                    </p>
                    {editingRewrite ? (
                        <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="w-full rounded-xl bg-[#E8F4F0] dark:bg-[#1E3A4A]/20 border border-[#5BC4A0] dark:border-[#1E3A4A] p-3 text-sm text-foreground leading-relaxed resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#5BC4A0]"
                            autoFocus
                        />
                    ) : (
                        <div className="rounded-xl bg-[#E8F4F0]/80 dark:bg-[#1E3A4A]/15 border border-[#E8F4F0]/50 dark:border-[#1E3A4A]/30 p-3 min-h-[80px]">
                            {payload.suggested_rewrite ? (
                                <p className="text-sm text-foreground leading-relaxed">{payload.suggested_rewrite}</p>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">
                                    ARIA was unable to generate a rewrite. Please edit your message before sending.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Court reminder — subtle bottom banner */}
            <div className="mx-5 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
                <Scale className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                    This interaction is part of your court-documented communication record
                </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 px-5 pb-5">
                {/* Use ARIA's version */}
                {!editingRewrite && payload.suggested_rewrite && (
                    <button
                        onClick={handleUseRewrite}
                        disabled={isSending}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2D8A70] text-white text-sm font-medium hover:bg-[#2D8A70] transition-colors disabled:opacity-50 shadow-sm"
                    >
                        <Send className="h-4 w-4" />
                        Use ARIA's version
                    </button>
                )}

                {/* Edit before sending */}
                {!editingRewrite ? (
                    <button
                        onClick={handleStartEdit}
                        disabled={isSending}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                    >
                        <Edit3 className="h-4 w-4" />
                        Edit first
                    </button>
                ) : (
                    <button
                        onClick={handleConfirmEdit}
                        disabled={isSending || !editedContent.trim()}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2D8A70] text-white text-sm font-medium hover:bg-[#2D8A70] transition-colors disabled:opacity-50 shadow-sm"
                    >
                        <Send className="h-4 w-4" />
                        Send edited version
                    </button>
                )}

                {/* Send Original — Standard mode only */}
                {!isStrict && onSendOriginal && !editingRewrite && (
                    <button
                        onClick={onSendOriginal}
                        disabled={isSending}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border bg-card text-muted-foreground text-sm hover:bg-muted transition-colors disabled:opacity-50"
                        title="Send your original message anyway (will be logged)"
                    >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Send original
                    </button>
                )}
            </div>
        </div>
    );
}
