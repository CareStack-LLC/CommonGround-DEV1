'use client';

import { useRealtime } from '@/contexts/realtime-context';

interface OnlineIndicatorProps {
  userId: string;
  userName?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Online Presence Indicator
 *
 * Displays real-time online/offline status for a user.
 * Uses Supabase Realtime Presence tracking (replaces WebSocket onUserStatus).
 */
export function OnlineIndicator({
  userId,
  userName,
  showLabel = false,
  size = 'md',
  className = '',
}: OnlineIndicatorProps) {
  const { isUserOnline } = useRealtime();
  const isOnline = isUserOnline(userId);

  // Size mappings
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div
          className={`${sizeClasses[size]} rounded-full ${
            isOnline
              ? 'bg-[#3DAA8A] shadow-sm shadow-[#3DAA8A]/50'
              : 'bg-gray-300'
          } transition-colors duration-300`}
        />
        {isOnline && (
          <div
            className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-[#3DAA8A] animate-ping opacity-75`}
          />
        )}
      </div>
      {showLabel && (
        <span className={`${textSizeClasses[size]} text-gray-600`}>
          {isOnline ? (
            <>
              <span className="font-medium text-[#2D8A70]">
                {userName || 'User'}
              </span>
              {' '}
              <span className="text-gray-500">is online</span>
            </>
          ) : (
            <span className="text-gray-400">Offline</span>
          )}
        </span>
      )}
    </div>
  );
}

/**
 * Compact badge version for avatars or small spaces
 */
export function OnlineBadge({ userId, size = 'md' }: { userId: string; size?: 'sm' | 'md' | 'lg' }) {
  const { isUserOnline } = useRealtime();
  const isOnline = isUserOnline(userId);

  if (!isOnline) return null;

  const sizeClasses = {
    sm: 'w-2.5 h-2.5 border-[1.5px]',
    md: 'w-3 h-3 border-2',
    lg: 'w-4 h-4 border-2',
  };

  return (
    <div
      className={`absolute bottom-0 right-0 ${sizeClasses[size]} bg-[#3DAA8A] border-white rounded-full shadow-sm`}
    />
  );
}
