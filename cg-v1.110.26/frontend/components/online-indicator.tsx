'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';

interface OnlineIndicatorProps {
  userId: string;
  userName?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * WS5: Online Presence Indicator
 *
 * Displays real-time online/offline status for a user.
 * Uses WebSocket events to update in real-time.
 */
export function OnlineIndicator({
  userId,
  userName,
  showLabel = false,
  size = 'md',
  className = '',
}: OnlineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(false);
  const { onUserStatus } = useWebSocket();

  // Listen for user status changes
  useEffect(() => {
    const unsubscribe = onUserStatus((data) => {
      if (data.user_id === userId) {
        setIsOnline(data.status === 'online');
      }
    });

    return unsubscribe;
  }, [userId, onUserStatus]);

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
              ? 'bg-green-500 shadow-sm shadow-green-500/50'
              : 'bg-gray-300'
          } transition-colors duration-300`}
        />
        {isOnline && (
          <div
            className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-green-500 animate-ping opacity-75`}
          />
        )}
      </div>
      {showLabel && (
        <span className={`${textSizeClasses[size]} text-gray-600`}>
          {isOnline ? (
            <>
              <span className="font-medium text-green-600">
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
  const [isOnline, setIsOnline] = useState(false);
  const { onUserStatus } = useWebSocket();

  useEffect(() => {
    const unsubscribe = onUserStatus((data) => {
      if (data.user_id === userId) {
        setIsOnline(data.status === 'online');
      }
    });

    return unsubscribe;
  }, [userId, onUserStatus]);

  if (!isOnline) return null;

  const sizeClasses = {
    sm: 'w-2.5 h-2.5 border-[1.5px]',
    md: 'w-3 h-3 border-2',
    lg: 'w-4 h-4 border-2',
  };

  return (
    <div
      className={`absolute bottom-0 right-0 ${sizeClasses[size]} bg-green-500 border-white rounded-full shadow-sm`}
    />
  );
}
