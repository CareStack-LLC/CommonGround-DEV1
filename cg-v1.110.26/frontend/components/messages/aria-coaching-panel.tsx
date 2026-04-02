'use client';

import { Lightbulb, X } from 'lucide-react';
import { useState } from 'react';

interface ARIACoachingPanelProps {
    draftCoaching: string;
    onDismiss: () => void;
}

/**
 * ARIA V3 Beta: Pre-Send Coaching Panel
 *
 * Shows proactive coaching suggestions below the compose textarea
 * before the user sends their message. Gated by ARIA_V3_COACHING flag.
 *
 * Portal-aware styling using semantic CSS variables.
 */
export function ARIACoachingPanel({ draftCoaching, onDismiss }: ARIACoachingPanelProps) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed || !draftCoaching) return null;

    const handleDismiss = () => {
        setDismissed(true);
        onDismiss();
    };

    return (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-cg-coaching-subtle border border-cg-coaching/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Lightbulb className="h-4 w-4 text-cg-coaching flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-cg-coaching uppercase tracking-wider mb-1">
                    Coaching Suggestion
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                    {draftCoaching}
                </p>
            </div>
            <button
                onClick={handleDismiss}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                aria-label="Dismiss coaching suggestion"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
