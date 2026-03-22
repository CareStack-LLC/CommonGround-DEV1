'use client';

import { Suspense, lazy, useState } from 'react';
import { TrendingUp, Gamepad2 } from 'lucide-react';
import { TabBar, useTabState, SkeletonCards } from '@/components/superadmin';

const GrowthContent = lazy(() => import('./_growth-content'));
const KidSpaceContent = lazy(() => import('./_kidspace-content'));

const TABS = [
  { key: 'growth', label: 'Growth', icon: TrendingUp },
  { key: 'kidspace', label: 'KidSpace', icon: Gamepad2 },
];

export default function GrowthAndEngagementPage() {
  const [tab, setTab] = useTabState('growth');
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['growth']));

  const handleTabChange = (key: string) => {
    setTab(key);
    setLoadedTabs((prev) => new Set(prev).add(key));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Growth & Engagement</h1>
        <p className="text-sm text-zinc-500 mt-0.5">User growth trends and KidSpace engagement analytics</p>
      </div>

      <TabBar tabs={TABS} activeTab={tab} onTabChange={handleTabChange} />

      <Suspense fallback={<SkeletonCards count={4} />}>
        {tab === 'growth' && <GrowthContent />}
        {tab === 'kidspace' && loadedTabs.has('kidspace') && <KidSpaceContent />}
      </Suspense>
    </div>
  );
}
