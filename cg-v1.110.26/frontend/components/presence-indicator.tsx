'use client';

import { useRealtimePresence } from '@/hooks/use-realtime-presence';

interface PresenceIndicatorProps {
  familyFileId: string;
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

/**
 * Presence Indicator Component
 * Shows a green pulsing dot when the user is online, gray dot when offline.
 */
export function PresenceIndicator({
  familyFileId,
  userId,
  size = 'md',
  showLabel = false,
}: PresenceIndicatorProps) {
  const { isUserOnline } = useRealtimePresence({ familyFileId });
  const isOnline = isUserOnline(userId);

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <div
          className={`${sizeClasses[size]} rounded-full ${
            isOnline ? 'bg-emerald-500' : 'bg-slate-400'
          }`}
        />
        {isOnline && (
          <div
            className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-emerald-500 animate-ping opacity-75`}
          />
        )}
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
}

/**
 * Simple online dot without subscription management
 * Use when you already have presence data from useRealtimePresence
 */
export function OnlineDot({
  isOnline,
  size = 'md',
}: {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div className="relative">
      <div
        className={`${sizeClasses[size]} rounded-full ${
          isOnline ? 'bg-emerald-500' : 'bg-slate-400'
        }`}
      />
      {isOnline && (
        <div
          className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-emerald-500 animate-ping opacity-75`}
        />
      )}
    </div>
  );
}
