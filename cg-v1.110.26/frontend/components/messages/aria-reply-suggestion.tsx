'use client';

import { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, Send } from 'lucide-react';

interface ARIAReplySuggestionProps {
    messageId: string;
    suggestions: string[];
    onUse: (suggestion: string, index: number) => void;
}

/**
 * ARIA v2 Reply Suggestion Card
 *
 * Displayed below an incoming message when ARIA has generated reply suggestions.
 * Clicking a suggestion auto-fills the compose box via onUse callback.
 * Card is collapsible and dismissible.
 */
export function ARIAReplySuggestion({
    messageId,
    suggestions,
    onUse,
}: ARIAReplySuggestionProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [dismissed, setDismissed] = useState(false);

    if (dismissed || suggestions.length === 0) return null;

    return (
        <div className="mt-2 rounded-xl border border-teal-200/80 bg-gradient-to-b from-teal-50/80 to-white overflow-hidden text-sm shadow-sm animate-in fade-in slide-in-from-bottom-1 duration-200">
            {/* Header */}
            <button
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-teal-50 transition-colors"
                onClick={() => setIsExpanded((v) => !v)}
            >
                <div className="p-1 bg-teal-500/10 rounded-lg">
                    <Shield className="h-3.5 w-3.5 text-teal-600" />
                </div>
                <span className="flex-1 text-left text-xs font-semibold text-teal-700">
                    ARIA suggests a reply
                </span>
                {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                )}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setDismissed(true);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 px-1"
                >
                    Dismiss
                </button>
            </button>

            {/* Suggestions */}
            {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                    {suggestions.map((s, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-teal-100 hover:border-teal-300 hover:bg-teal-50/40 transition-colors group"
                        >
                            <p className="flex-1 text-xs text-slate-600 leading-relaxed">{s}</p>
                            <button
                                onClick={() => onUse(s, i)}
                                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:bg-teal-700"
                            >
                                <Send className="h-3 w-3" />
                                Use
                            </button>
                        </div>
                    ))}
                    <p className="text-xs text-slate-400 text-center pt-1">
                        Tap "Use" to fill your compose box with this reply
                    </p>
                </div>
            )}
        </div>
    );
}
