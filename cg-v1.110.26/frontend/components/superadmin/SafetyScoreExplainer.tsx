"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

import type { HealthScoringExplainer } from "@/lib/admin-api";

interface SafetyScoreExplainerProps {
  scoring: HealthScoringExplainer | null | undefined;
  /**
   * Visual variant. "badge" is a small "About this score" pill (for
   * next to a metric card); "inline" is a plain text link suitable for
   * embedding in a header row.
   */
  variant?: "badge" | "inline";
}

/**
 * Popover that explains the Customer-Success Health Score / Safety Score
 * so admins seeing a raw "25" number know:
 *
 *   - it's a heuristic, not an engagement signal,
 *   - which four inputs feed it and how they're weighted,
 *   - what's *not* in the score (messages, ARIA, ClearFund, etc.),
 *   - that it's low-confidence until we have real usage data to train on.
 *
 * Backend returns the same content inside every `/admin/cs/health-scores`
 * response under `scoring.transparency` — we just surface it here.
 */
export function SafetyScoreExplainer({
  scoring,
  variant = "badge",
}: SafetyScoreExplainerProps) {
  const [open, setOpen] = useState(false);

  if (!scoring) return null;
  const { transparency, weights } = scoring;

  const trigger =
    variant === "badge" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-cg-slate/30 bg-[#1A3648]/60 text-[11px] text-[#8AACBC] hover:text-[#D0E4EC] hover:border-cg-sage/40 transition-colors"
        aria-label="About the health score"
      >
        <Info className="w-3 h-3" />
        About this score
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] text-[#8AACBC] hover:text-cg-sage-light underline decoration-dotted underline-offset-2"
      >
        <Info className="w-3 h-3" />
        About this score
      </button>
    );

  return (
    <>
      {trigger}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#162D3A] border border-cg-slate/30 rounded-xl w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-4 border-b border-cg-slate/20">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  About the Health Score
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  0–100 scale · higher = healthier
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-white"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs text-[#D0E4EC] leading-relaxed">
              {transparency.is_heuristic && (
                <div className="px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px]">
                  This is a <strong>heuristic</strong> with{" "}
                  <strong>{transparency.confidence}</strong> confidence — not
                  a usage-based engagement signal. Interpret directional
                  changes, not the absolute number.
                </div>
              )}

              <div>
                <p className="text-[11px] font-semibold text-[#8AACBC] uppercase tracking-wide mb-2">
                  Formula
                </p>
                <p className="text-[11px] text-muted-foreground mb-2">
                  {transparency.weighting}
                </p>
                <ul className="space-y-1">
                  {Object.entries(weights).map(([factor, weight]) => (
                    <li
                      key={factor}
                      className="flex items-center justify-between text-[11px]"
                    >
                      <span className="text-[#D0E4EC]">
                        {factor.replace(/_/g, " ")}
                      </span>
                      <span className="font-mono text-cg-sage-light">
                        {Math.round(weight * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#8AACBC] uppercase tracking-wide mb-2">
                  Inputs used
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#D0E4EC]">
                  {transparency.data_sources.map((src) => (
                    <li key={src}>{src}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#8AACBC] uppercase tracking-wide mb-2">
                  Not included (yet)
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-muted-foreground">
                  {transparency.not_included.map((src) => (
                    <li key={src}>{src}</li>
                  ))}
                </ul>
                <p className="text-[11px] text-[#4A6E7F] mt-2 italic">
                  These real engagement signals will replace the heuristic
                  once we have enough usage data to calibrate a model.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
