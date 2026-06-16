'use client';

/**
 * Reveal — gentle scroll-reveal wrapper for below-fold marketing sections.
 *
 * One shared IntersectionObserver adds `.is-visible` the first time a
 * wrapped block reaches ~15% visibility, then stops observing it. The
 * animation itself is pure CSS (see `.cg-reveal` in globals.css) with:
 *   - a `prefers-reduced-motion: reduce` opt-out (content shown instantly)
 *   - a keyframe failsafe that forces visibility ~1.5s after paint even
 *     if JavaScript never runs.
 *
 * NEVER wrap above-the-fold/hero content — keeping the LCP element out of
 * the reveal path is what makes this zero-cost for Core Web Vitals.
 */

import { useEffect, useRef, type ReactNode } from 'react';

let sharedObserver: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            sharedObserver?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -5% 0px' }
    );
  }
  return sharedObserver;
}

export function Reveal({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = getObserver();
    if (!observer) {
      el.classList.add('is-visible');
      return;
    }
    // Already in view on mount (e.g. anchor navigation): show immediately.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add('is-visible');
      return;
    }
    observer.observe(el);
    return () => observer.unobserve(el);
  }, []);

  return (
    <div ref={ref} className={`cg-reveal ${className}`.trim()}>
      {children}
    </div>
  );
}
