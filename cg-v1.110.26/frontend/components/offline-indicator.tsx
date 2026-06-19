'use client';

import { useEffect, useState } from 'react';

/**
 * Small toast that appears when the device goes offline, so users understand
 * that offline-enabled screens (e.g. the custody calendar) are showing saved
 * data. Renders nothing on the server / when online (no hydration mismatch).
 */
export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-full bg-[#1E3A4A] px-4 py-2 text-sm font-medium text-white shadow-lg">
        <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
        You&rsquo;re offline — showing saved info
      </div>
    </div>
  );
}
