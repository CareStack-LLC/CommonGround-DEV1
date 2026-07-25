'use client';

import { Suspense, lazy, useState } from 'react';
import { CreditCard, FileText, BarChart3 } from 'lucide-react';
import { TabBar, useTabState, SkeletonCards } from '@/components/superadmin';

const BillingContent = lazy(() => import('./_billing-content'));
const ReportsContent = lazy(() => import('./_reports-content'));

const TABS = [
  { key: 'billing', label: 'Billing & Revenue', icon: CreditCard },
  { key: 'reports', label: 'Reports', icon: FileText },
];

export default function BillingAndReportsPage() {
  const [tab, setTab] = useTabState('billing');
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['billing']));

  const handleTabChange = (key: string) => {
    setTab(key);
    setLoadedTabs((prev) => new Set(prev).add(key));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Billing & Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Revenue, subscriptions, and generated reports</p>
      </div>

      <TabBar tabs={TABS} activeTab={tab} onTabChange={handleTabChange} />

      <Suspense fallback={<SkeletonCards count={4} />}>
        {tab === 'billing' && <BillingContent />}
        {tab === 'reports' && loadedTabs.has('reports') && <ReportsContent />}
      </Suspense>
    </div>
  );
}
