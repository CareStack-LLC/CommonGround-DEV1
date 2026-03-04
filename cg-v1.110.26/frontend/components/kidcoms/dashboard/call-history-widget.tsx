'use client';

import { Phone, Video, User, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CallRecord {
  id: string;
  contactName: string;
  contactAvatar?: string;
  type: 'video' | 'voice';
  duration: string; // e.g., "7:32"
  timestamp: Date;
  missed?: boolean;
}

interface CallHistoryWidgetProps {
  calls: CallRecord[];
  onCallClick?: (contactName: string) => void;
  className?: string;
}

export function CallHistoryWidget({ calls, onCallClick, className }: CallHistoryWidgetProps) {
  // Format time as relative (e.g., "2 hours ago")
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="font-bold text-slate-800 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Recent Calls
        </h3>
      </div>

      {/* Call List */}
      <div className="divide-y divide-slate-100">
        {calls.length === 0 ? (
          <div className="p-6 text-center">
            <Phone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
              No recent calls
            </p>
          </div>
        ) : (
          calls.slice(0, 5).map((call) => (
            <button
              key={call.id}
              onClick={() => onCallClick?.(call.contactName)}
              className={cn(
                'w-full px-4 py-3 flex items-center gap-3',
                'hover:bg-slate-50 transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500'
              )}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center">
                {call.contactAvatar ? (
                  <img src={call.contactAvatar} alt={call.contactName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-slate-400" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-left">
                <div className="font-semibold text-slate-800 text-sm truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {call.contactName}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span style={{ fontFamily: 'Inter, sans-serif' }}>
                    {formatRelativeTime(call.timestamp)}
                  </span>
                </div>
              </div>

              {/* Call Type & Duration */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-lg',
                  call.type === 'video' ? 'bg-teal-50' : 'bg-emerald-50'
                )}>
                  {call.type === 'video' ? (
                    <Video className="w-3.5 h-3.5 text-teal-600" />
                  ) : (
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span className={cn(
                    'text-xs font-mono font-medium',
                    call.type === 'video' ? 'text-teal-700' : 'text-emerald-700'
                  )}>
                    {call.duration}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* View All Footer */}
      {calls.length > 5 && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
          <button
            onClick={() => onCallClick?.('view_all')}
            className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            View all calls ({calls.length})
          </button>
        </div>
      )}
    </div>
  );
}
