'use client';

import { Calendar, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time?: string;
  location?: string;
  type?: 'school' | 'activity' | 'family' | 'other';
}

interface CalendarWidgetProps {
  events: CalendarEvent[];
  onEventClick?: (eventId: string) => void;
  className?: string;
}

const eventTypeColors = {
  school: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  activity: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  family: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  other: { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-500' },
};

export function CalendarWidget({ events, onEventClick, className }: CalendarWidgetProps) {
  // Format date as "Mon, Jan 15"
  const formatDate = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if date is tomorrow
  const isTomorrow = (date: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear()
    );
  };

  // Get upcoming events (next 7 days)
  const upcomingEvents = events
    .filter(event => {
      const now = new Date();
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return event.date >= now && event.date <= weekFromNow;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4);

  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Upcoming
        </h3>
        <Calendar className="w-4 h-4 text-slate-400" />
      </div>

      {/* Events List */}
      <div className="divide-y divide-slate-100">
        {upcomingEvents.length === 0 ? (
          <div className="p-6 text-center">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
              No upcoming events
            </p>
          </div>
        ) : (
          upcomingEvents.map((event) => {
            const typeStyles = eventTypeColors[event.type || 'other'];

            return (
              <button
                key={event.id}
                onClick={() => onEventClick?.(event.id)}
                className={cn(
                  'w-full px-4 py-3 flex gap-3',
                  'hover:bg-slate-50 transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500'
                )}
              >
                {/* Date Circle */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center w-12">
                  <div className="text-xs font-medium text-slate-500 uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {event.date.toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                  <div className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {event.date.getDate()}
                  </div>
                  {isToday(event.date) && (
                    <div className="text-xs font-bold text-teal-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Today
                    </div>
                  )}
                  {isTomorrow(event.date) && (
                    <div className="text-xs font-bold text-violet-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Tomorrow
                    </div>
                  )}
                </div>

                {/* Event Info */}
                <div className="flex-1 min-w-0 text-left">
                  {/* Title */}
                  <div className="font-semibold text-slate-800 text-sm line-clamp-1 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {event.title}
                  </div>

                  {/* Time & Location */}
                  <div className="space-y-1">
                    {event.time && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span style={{ fontFamily: 'Inter, sans-serif' }}>{event.time}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate" style={{ fontFamily: 'Inter, sans-serif' }}>{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Type Indicator */}
                <div className="flex-shrink-0 flex items-center">
                  <div className={cn('w-2 h-2 rounded-full', typeStyles.dot)} />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* View Calendar Footer */}
      {events.length > 4 && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
          <button
            onClick={() => onEventClick?.('view_calendar')}
            className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            View full calendar
          </button>
        </div>
      )}
    </div>
  );
}
