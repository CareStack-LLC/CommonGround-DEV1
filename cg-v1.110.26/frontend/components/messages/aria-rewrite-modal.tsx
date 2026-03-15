'use client';

import { useState } from 'react';
import { Shield, RotateCcw, Send, Edit3, X } from 'lucide-react';

export interface ARIARewritePayload {
    aria_flagged: true;
    aria_mode: 'standard' | 'strict';
    original_message: string;
    suggested_rewrite: string | null;
    explanation: string;
    categories: string[];
    toxicity_score: number;
}

interface ARIARewriteModalProps {
    payload: ARIARewritePayload;
    onUseRewrite: (rewrittenContent: string) => void;
    onEditRewrite: (startingContent: string) => void;
    /** Only shown in Standard mode */
    onSendOriginal?: () => void;
    onCancel: () => void;
    isSending?: boolean;
}

/**
 * ARIA v2 Rewrite Modal
 *
 * Shown when the backend returns a 202 with aria_flagged=true.
 * Presents the original message vs. ARIA's contextual rewrite.
 * - Standard mode: three options (Use ARIA / Edit / Send Original)
 * - Strict mode: two options (Use ARIA / Edit) — "Send Original" is hidden
 */
export function ARIARewriteModal({
    payload,
    onUseRewrite,
    onEditRewrite,
    onSendOriginal,
    onCancel,
    isSending = false,
}: ARIARewriteModalProps) {
    const [editingRewrite, setEditingRewrite] = useState(false);
    const [editedContent, setEditedContent] = useState(payload.suggested_rewrite ?? '');
    const isStrict = payload.aria_mode === 'strict';

    const handleUseRewrite = () => {
        onUseRewrite(editingRewrite ? editedContent : (payload.suggested_rewrite ?? ''));
    };

    const handleStartEdit = () => {
        setEditedContent(payload.suggested_rewrite ?? '');
        setEditingRewrite(true);
    };

    const handleConfirmEdit = () => {
        onUseRewrite(editedContent);
    };

    return (
        <div className="relative rounded-2xl border border-amber-200/60 dark:border-amber-900/60 bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/30 dark:to-card shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-amber-100/60 to-orange-50/40 dark:from-amber-950/40 dark:to-card border-b border-amber-200/60 dark:border-amber-900/40">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                    <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-sm">ARIA noticed something</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{payload.explanation}</p>
                </div>
                <button
                    onClick={onCancel}
                    disabled={isSending}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Mode badge */}
            {isStrict && (
                <div className="px-5 pt-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200/60 dark:border-red-900/60">
                        <Shield className="h-3 w-3" />
                        Strict Mode — editing required before sending
                    </span>
                </div>
            )}

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-2 gap-3 p-5">
                {/* Original */}
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your message</p>
                    <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 p-3 min-h-[80px]">
                        <p className="text-sm text-foreground leading-relaxed">{payload.original_message}</p>
                    </div>
                </div>

                {/* ARIA Rewrite */}
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
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
                        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 p-3 min-h-[80px]">
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
                        title="Send your original message anyway"
                    >
                        Send original
                    </button>
                )}
            </div>
        </div>
    );
}
