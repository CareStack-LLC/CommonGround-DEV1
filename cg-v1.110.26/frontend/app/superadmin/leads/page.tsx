'use client';

import { Suspense, lazy, useState } from 'react';
import { UserPlus, Upload, BarChart3, List } from 'lucide-react';
import { TabBar, useTabState, SkeletonCards } from '@/components/superadmin';

const LeadsContent = lazy(() => import('./_leads-content'));
const AnalyticsContent = lazy(() => import('./_analytics-content'));

const TABS = [
  { key: 'pipeline', label: 'Leads', icon: UserPlus },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function LeadsPage() {
  const [tab, setTab] = useTabState('pipeline');
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['pipeline']));

  const handleTabChange = (key: string) => {
    setTab(key);
    setLoadedTabs((prev) => new Set(prev).add(key));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Leads</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Lead pipeline, lists, and marketing analytics</p>
      </div>

      <TabBar tabs={TABS} activeTab={tab} onTabChange={handleTabChange} />

      <Suspense fallback={<SkeletonCards count={4} />}>
        {tab === 'pipeline' && <LeadsContent />}
        {tab === 'analytics' && loadedTabs.has('analytics') && <AnalyticsContent />}
      </Suspense>
    </div>
  );
}
