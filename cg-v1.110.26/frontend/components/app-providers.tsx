'use client';

/**
 * AppProviders — Heavy client-side providers
 *
 * Wraps children in Subscription, WebSocket, Realtime, and Notification
 * providers, plus non-critical client components (ServiceWorkerRegister,
 * IncomingCallNotification, PortalWrapper).
 *
 * Loaded via `next/dynamic` in the root layout so its JS is code-split
 * into a separate chunk and doesn't block the initial render of
 * lightweight pages (marketing, landing pages, blog).
 */

import { SubscriptionProvider } from '@/contexts/subscription-context';
import { NotificationProvider } from '@/contexts/notification-context';
import { WebSocketProvider } from '@/contexts/websocket-context';
import { RealtimeProvider } from '@/contexts/realtime-context';
import { ServiceWorkerRegister } from '@/components/service-worker-register';
import { PortalWrapper } from '@/components/portal-wrapper';
import { IncomingCallNotification } from '@/components/incoming-call-notification';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SubscriptionProvider>
      <WebSocketProvider>
        <RealtimeProvider>
          <NotificationProvider>
            <ServiceWorkerRegister />
            <IncomingCallNotification />
            <PortalWrapper>
              {children}
            </PortalWrapper>
          </NotificationProvider>
        </RealtimeProvider>
      </WebSocketProvider>
    </SubscriptionProvider>
  );
}
