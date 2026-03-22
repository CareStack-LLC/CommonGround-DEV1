'use client';

import { Suspense, lazy, useState } from 'react';
import { Server, Gauge, Brain } from 'lucide-react';
import { TabBar, useTabState, SkeletonCards } from '@/components/superadmin';

const ServicesContent = lazy(() => import('./_services-content'));
const PerformanceContent = lazy(() => import('./_performance-content'));

const TABS = [
  { key: 'services', label: 'Services', icon: Server },
  { key: 'api', label: 'API Performance', icon: Gauge },
];

export default function SystemHealthPage() {
  const [tab, setTab] = useTabState('services');
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['services']));

  const handleTabChange = (key: string) => {
    setTab(key);
    setLoadedTabs((prev) => new Set(prev).add(key));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">System Health</h1>
        <p className="text-sm text-[#6B8A9A] mt-0.5">Monitor services, API performance, and AI usage</p>
      </div>

      <TabBar tabs={TABS} activeTab={tab} onTabChange={handleTabChange} />

      <Suspense fallback={<SkeletonCards count={4} />}>
        {tab === 'services' && <ServicesContent />}
        {tab === 'api' && loadedTabs.has('api') && <PerformanceContent />}
      </Suspense>
    </div>
  );
}
