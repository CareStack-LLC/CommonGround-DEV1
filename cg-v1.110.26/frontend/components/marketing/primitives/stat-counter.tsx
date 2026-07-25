'use client';

/**
 * StatCounter
 *
 * Animated number that counts up from 0 to `value` once the element
 * scrolls into view (IntersectionObserver). If `value` doesn't parse
 * as a finite number (e.g. "4.9★", "24/7", "–"), the raw string is
 * rendered as-is — no animation.
 *
 * Uses `prefers-reduced-motion` to skip animation for users who've
 * asked for it at the OS level.
 */

import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface StatCounterProps {
  value: string;
  label: string;
  accent?: 'teal' | 'gold';
  icon?: LucideIcon;
  durationMs?: number;
  className?: string;
}

const ACCENT_COLOR: Record<'teal' | 'gold', string> = {
  teal: 'var(--cg-sage)',
  gold: 'var(--cg-amber)',
};

// Try to split a value like "1,200+" or "$29" into:
//   prefix "$", number 29, suffix ""
// or "1,200+" into prefix "", number 1200, suffix "+".
// If we can't find a number, returns null and the caller renders the raw string.
function parseValue(raw: string): { prefix: string; num: number; suffix: string } | null {
  const match = raw.match(/^([^\d-]*?)(-?[\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  const [, prefix, numStr, suffix] = match;
  const parsed = Number(numStr.replace(/,/g, ''));
  if (!Number.isFinite(parsed)) return null;
  return { prefix, num: parsed, suffix };
}

function formatNumber(n: number, originalStr: string): string {
  const hasComma = originalStr.includes(',');
  const decimals = (originalStr.split('.')[1] ?? '').length;
  const fixed = decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
  if (!hasComma) return fixed;
  const [intPart, decPart] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
}

export function StatCounter({
  value,
  label,
  accent = 'teal',
  icon: Icon,
  durationMs = 1400,
  className = '',
}: StatCounterProps) {
  const parsed = parseValue(value);
  const isAnimatable = parsed !== null;

  const [display, setDisplay] = useState<string>(
    isAnimatable ? `${parsed!.prefix}0${parsed!.suffix}` : value,
  );
  const ref = useRef<HTMLDivElement | null>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isAnimatable || !ref.current || hasAnimated.current) return;
    const node = ref.current;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      setDisplay(value);
      hasAnimated.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || hasAnimated.current) return;
          hasAnimated.current = true;
          observer.disconnect();

          const { prefix, num, suffix } = parsed!;
          const start = performance.now();

          const step = (now: number) => {
            const t = Math.min(1, (now - start) / durationMs);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - t, 3);
            const current = num * eased;
            setDisplay(`${prefix}${formatNumber(current, String(num))}${suffix}`);
            if (t < 1) {
              requestAnimationFrame(step);
            } else {
              setDisplay(value);
            }
          };
          requestAnimationFrame(step);
        });
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isAnimatable, parsed, value, durationMs]);

  const color = ACCENT_COLOR[accent];

  return (
    <div
      ref={ref}
      className={`text-center ${className}`.trim()}
    >
      {Icon && (
        <Icon
          className="mx-auto mb-2 h-6 w-6"
          style={{ color }}
          aria-hidden="true"
        />
      )}
      <div
        className="font-serif leading-none text-3xl sm:text-4xl md:text-5xl"
        style={{ color }}
      >
        {display}
      </div>
      <div className="mt-2 text-xs sm:text-sm font-medium uppercase tracking-wider text-gray-500">
        {label}
      </div>
    </div>
  );
}
