'use client';

import { TrendingUp, AlertTriangle } from 'lucide-react';

interface ARIAPatternForecastProps {
    forecast: string;
}

/**
 * ARIA V3 Beta: Pattern Forecast
 *
 * Displays predictive analysis based on session memory patterns.
 * Intended for the professional dashboard Sentinel Shield tab.
 * Gated by ARIA_V3_FORECAST flag.
 *
 * Portal-aware styling using semantic CSS variables.
 */
export function ARIAPatternForecast({ forecast }: ARIAPatternForecastProps) {
    if (!forecast) return null;

    return (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-cg-pattern-subtle border border-cg-pattern/20">
            <div className="p-2 rounded-lg bg-cg-pattern/10 flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-cg-pattern" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold text-cg-pattern uppercase tracking-wider">
                        Pattern Forecast
                    </p>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[var(--portal-accent)]/10 text-[var(--portal-accent)] border border-[var(--portal-accent)]/20">
                        Beta
                    </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                    {forecast}
                </p>
            </div>
        </div>
    );
}
