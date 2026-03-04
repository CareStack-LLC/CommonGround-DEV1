'use client';

import { useEffect } from 'react';

/**
 * Component that registers the service worker on mount.
 * Place this in the layout to ensure SW is registered app-wide.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker when page loads
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('[App] Service Worker registered:', registration.scope);

            // Check for updates periodically
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000); // Check every hour
          })
          .catch((error) => {
            console.error('[App] Service Worker registration failed:', error);
          });
      });
    }
  }, []);

  // This component doesn't render anything
  return null;
}
