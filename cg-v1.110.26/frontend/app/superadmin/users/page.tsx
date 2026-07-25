'use client';

import { Suspense, lazy, useState } from 'react';
import { Users, Activity } from 'lucide-react';
import { TabBar, useTabState, SkeletonCards } from '@/components/superadmin';

const UsersContent = lazy(() => import('./_users-content'));
const ActivityLogContent = lazy(() => import('./_activity-log-content'));

const TABS = [
  { key: 'users', label: 'Users', icon: Users },
  { key: 'activity', label: 'Activity Log', icon: Activity },
];

export default function UsersAndActivityPage() {
  const [tab, setTab] = useTabState('users');
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['users']));

  const handleTabChange = (key: string) => {
    setTab(key);
    setLoadedTabs((prev) => new Set(prev).add(key));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Users & Activity</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage users and track platform activity</p>
      </div>

      <TabBar tabs={TABS} activeTab={tab} onTabChange={handleTabChange} />

      <Suspense fallback={<SkeletonCards count={4} />}>
        {tab === 'users' && <UsersContent />}
        {tab === 'activity' && loadedTabs.has('activity') && <ActivityLogContent />}
      </Suspense>
    </div>
  );
}
