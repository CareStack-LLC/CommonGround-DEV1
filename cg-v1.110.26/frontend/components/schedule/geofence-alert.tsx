'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, QrCode, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GeofenceEntryEvent } from '@/lib/websocket';

interface GeofenceAlertProps {
  event: GeofenceEntryEvent;
  onOpenCheckIn?: (exchangeId: string) => void;
  onDismiss: () => void;
  autoDismissMs?: number;
}

/**
 * Animated alert toast shown when a parent enters a geofence area.
 * Displays "Parent Name is here at the exchange location" with a CTA to open check-in.
 */
export default function GeofenceAlert({
  event,
  onOpenCheckIn,
  onDismiss,
  autoDismissMs = 30000,
}: GeofenceAlertProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(), 300);
  }, [onDismiss]);

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setIsVisible(true), 50);

    // Auto-dismiss after timeout
    const dismissTimer = setTimeout(handleDismiss, autoDismissMs);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [autoDismissMs, handleDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4 transition-all duration-300 ${
        isVisible && !isExiting
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-cg-sage/30 overflow-hidden">
        {/* Animated top bar */}
        <div className="h-1 bg-gradient-to-r from-cg-sage to-cg-amber animate-pulse" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="w-10 h-10 rounded-full bg-cg-sage/10 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-cg-sage" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">
                {event.parent_name} is here
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {event.message || 'At the exchange location. Confirm the handoff with your QR code.'}
              </p>

              {/* CTA */}
              {onOpenCheckIn && (
                <Button
                  onClick={() => {
                    onOpenCheckIn(event.exchange_id);
                    handleDismiss();
                  }}
                  size="sm"
                  className="mt-2 bg-cg-sage hover:bg-cg-sage-dark text-white"
                >
                  <QrCode className="h-3.5 w-3.5 mr-1.5" />
                  Open Check-in
                </Button>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
