'use client';

import { useEffect } from 'react';
import { setupSectionTracking, trackSectionView } from '@/lib/analytics';

export function LpAnalytics({ slug }: { slug: string }) {
  useEffect(() => {
    trackSectionView(`lp-${slug}`, 'page_view');
    setupSectionTracking(`lp-${slug}`);
  }, [slug]);

  return null;
}
