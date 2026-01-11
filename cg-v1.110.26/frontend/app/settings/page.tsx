'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Settings Hub Page
 *
 * Redirects to account settings by default.
 */
export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/account');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-cg-primary border-t-transparent" />
    </div>
  );
}
