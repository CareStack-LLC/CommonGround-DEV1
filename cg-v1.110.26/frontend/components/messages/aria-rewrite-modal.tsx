'use client';

import { useState } from 'react';
import { Shield, ShieldAlert, ShieldX, RotateCcw, Send, Edit3, X, AlertTriangle, Sparkles, Scale } from 'lucide-react';

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

/** Category display config */
const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon?: string }> = {
    profanity: { label: 'Profanity', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-900' },
    hate_speech: { label: 'Hate Speech', color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900' },
    sexual_harassment: { label: 'Sexual Harassment', color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900' },
    threats: { label: 'Threats', color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900' },
    threatening: { label: 'Threats', color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900' },
    custody_weaponization: { label: 'Custody Weaponization', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900' },
    parental_alienation: { label: 'Parental Alienation', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900' },
    grooming: { label: 'Grooming', color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900' },
    manipulation: { label: 'Manipulation', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900' },
    emotional_manipulation: { label: 'Emotional Manipulation', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900' },
    coparenting_conflict: { label: 'Co-Parenting Conflict', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900' },
    hostility: { label: 'Hostility', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-900' },
    stranger_danger: { label: 'Stranger Danger', color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900' },
    financial_coercion: { label: 'Financial Coercion', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900' },
    age_inappropriate: { label: 'Age Inappropriate', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-900' },
    bullying: { label: 'Bullying', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-900' },
    modern_slang: { label: 'Inappropriate Slang', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900' },
    evasion: { label: 'Evasion Attempt', color: 'bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-400 border-slate-200 dark:border-slate-900' },
};

/** Severity tier config */
function getSeverityConfig(severity?: string) {
    switch (severity) {
        case 'severe':
            return {
                gradient: 'from-red-600 to-rose-700 dark:from-red-800 dark:to-rose-900',
                headerBg: 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/40',
                border: 'border-red-200/80 dark:border-red-900/60',
                icon: ShieldX,
                title: 'Message Blocked',
                iconColor: 'text-red-600 dark:text-red-400',
                iconBg: 'bg-red-100 dark:bg-red-950/50',
                pulse: true,
            };
        case 'moderate':
            return {
                gradient: 'from-orange-500 to-amber-600 dark:from-orange-800 dark:to-amber-900',
                headerBg: 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30',
                border: 'border-orange-200/80 dark:border-orange-900/60',
                icon: ShieldAlert,
                title: 'Court Risk Warning',
                iconColor: 'text-orange-600 dark:text-orange-400',
                iconBg: 'bg-orange-100 dark:bg-orange-950/50',
                pulse: false,
            };
        default: // mild or safe
            return {
                gradient: 'from-amber-400 to-yellow-500 dark:from-amber-700 dark:to-yellow-800',
                headerBg: 'bg-gradient-to-r from-amber-50/80 to-yellow-50/60 dark:from-amber-950/30 dark:to-yellow-950/20',
                border: 'border-amber-200/60 dark:border-amber-900/40',
                icon: Shield,
                title: 'Tone Check',
                iconColor: 'text-amber-600 dark:text-amber-400',
                iconBg: 'bg-amber-100 dark:bg-amber-950/50',
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
                <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-teal-100/70 to-emerald-50/50 dark:from-teal-950/50 dark:to-emerald-950/30 border-b border-teal-200/60 dark:border-teal-900/40">
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
                        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 p-3 min-h-[80px]">
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
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/60">
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

            {/* Category badges */}
            {payload.categories && payload.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-5 pt-3">
                    {payload.categories.map((cat) => {
                        const catConfig = CATEGORY_CONFIG[cat] || {
                            label: cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                            color: 'bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-400 border-slate-200 dark:border-slate-900',
                        };
                        return (
                            <span
                                key={cat}
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catConfig.color}`}
                            >
                                {catConfig.label}
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

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-2 gap-3 p-5">
                {/* Original */}
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your message</p>
                    <div className="rounded-xl bg-red-50/80 dark:bg-red-950/15 border border-red-200/50 dark:border-red-900/30 p-3 min-h-[80px]">
                        <p className="text-sm text-foreground leading-relaxed">{payload.original_message}</p>
                    </div>
                </div>

                {/* ARIA Suggestion */}
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                        <RotateCcw className="h-3 w-3" />
                        ARIA's suggestion
                    </p>
                    {editingRewrite ? (
                        <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="w-full rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 p-3 text-sm text-foreground leading-relaxed resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            autoFocus
                        />
                    ) : (
                        <div className="rounded-xl bg-emerald-50/80 dark:bg-emerald-950/15 border border-emerald-200/50 dark:border-emerald-900/30 p-3 min-h-[80px]">
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
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
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
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
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
