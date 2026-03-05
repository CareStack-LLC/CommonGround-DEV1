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
        <div className="relative rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-amber-100/60 to-orange-50/40 border-b border-amber-200/60">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                    <Shield className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 text-sm">ARIA noticed something</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{payload.explanation}</p>
                </div>
                <button
                    onClick={onCancel}
                    disabled={isSending}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Mode badge */}
            {isStrict && (
                <div className="px-5 pt-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200/60">
                        <Shield className="h-3 w-3" />
                        Strict Mode — editing required before sending
                    </span>
                </div>
            )}

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-2 gap-3 p-5">
                {/* Original */}
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your message</p>
                    <div className="rounded-xl bg-red-50 border border-red-200/60 p-3 min-h-[80px]">
                        <p className="text-sm text-slate-700 leading-relaxed">{payload.original_message}</p>
                    </div>
                </div>

                {/* ARIA Rewrite */}
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-1">
                        <RotateCcw className="h-3 w-3" />
                        ARIA's suggestion
                    </p>
                    {editingRewrite ? (
                        <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="w-full rounded-xl bg-emerald-50 border border-emerald-300 p-3 text-sm text-slate-700 leading-relaxed resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            autoFocus
                        />
                    ) : (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200/60 p-3 min-h-[80px]">
                            {payload.suggested_rewrite ? (
                                <p className="text-sm text-slate-700 leading-relaxed">{payload.suggested_rewrite}</p>
                            ) : (
                                <p className="text-sm text-slate-400 italic">
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
                        className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
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
                        className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-500 text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                        title="Send your original message anyway"
                    >
                        Send original
                    </button>
                )}
            </div>
        </div>
    );
}
