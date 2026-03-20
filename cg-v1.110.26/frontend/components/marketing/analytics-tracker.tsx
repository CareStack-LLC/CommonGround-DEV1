'use client';

import { useEffect } from 'react';
import { setupSectionTracking, trackCTAClick } from '@/lib/analytics';

/**
 * Drop this component into any marketing page to auto-track
 * section views via IntersectionObserver.
 *
 * Add data-section="section-name" to any container you want tracked.
 */
export function SectionTracker({ page }: { page: string }) {
  useEffect(() => {
    // Small delay to ensure DOM is painted
    const timer = setTimeout(() => setupSectionTracking(page), 500);
    return () => clearTimeout(timer);
  }, [page]);

  return null;
}

/**
 * Wrapper for CTA links that also fires a GA event.
 */
export function TrackedCTA({
  ctaName,
  location,
  href,
  className,
  children,
}: {
  ctaName: string;
  location: string;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => trackCTAClick(ctaName, location)}
    >
      {children}
    </a>
  );
}
