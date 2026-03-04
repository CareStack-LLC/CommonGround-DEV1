'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Gavel, Check, XCircle, HelpCircle } from 'lucide-react';
import { calendarAPI, CalendarDataV2, EventV2, BusyPeriod, ExchangeInstanceForCalendar, CourtEventForCalendar } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import CourtEventDetails from './court-event-details';
import { useAuth } from '@/lib/auth-context';
import { formatInUserTimezone } from '@/lib/timezone';

interface CalendarViewProps {
  caseId: string;
  agreementId?: string;  // Filter events by SharedCare Agreement
  onCreateEvent?: (date: Date) => void;
  onEventClick?: (event: EventV2) => void;
  onExchangeClick?: (exchange: ExchangeInstanceForCalendar) => void;
}

export default function CalendarView({
  caseId,
  agreementId,
  onCreateEvent,
  onEventClick,
  onExchangeClick,
}: CalendarViewProps) {
  const { timezone } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDataV2 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourtEvent, setSelectedCourtEvent] = useState<CourtEventForCalendar | null>(null);

  // Timezone-aware time formatter
  const formatEventTime = (dateString: string): string => {
    return formatInUserTimezone(dateString, timezone, 'h:mm a');
  };

  useEffect(() => {
    loadCalendarData();
  }, [caseId, currentDate]);

  const loadCalendarData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get first and last day of current month (use UTC to avoid timezone issues)
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      // Use UTC dates to ensure we get all events regardless of timezone
      const firstDay = new Date(Date.UTC(year, month, 1, 0, 0, 0));
      const lastDay = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

      const data = await calendarAPI.getData(
        caseId,
        firstDay.toISOString(),
        lastDay.toISOString(),
        true // Include busy periods
      );

      setCalendarData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load calendar');
      console.error('Error loading calendar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar grid
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getEventsForDate = (date: Date): EventV2[] => {
    if (!calendarData) return [];

    return calendarData.events.filter(event => {
      const eventStart = new Date(event.start_time);
      return (
        eventStart.getDate() === date.getDate() &&
        eventStart.getMonth() === date.getMonth() &&
        eventStart.getFullYear() === date.getFullYear()
      );
    });
  };

  const getBusyPeriodsForDate = (date: Date): BusyPeriod[] => {
    if (!calendarData) return [];

    return calendarData.busy_periods.filter(period => {
      const periodStart = new Date(period.start_time);
      return (
        periodStart.getDate() === date.getDate() &&
        periodStart.getMonth() === date.getMonth() &&
        periodStart.getFullYear() === date.getFullYear()
      );
    });
  };

  const getExchangesForDate = (date: Date): ExchangeInstanceForCalendar[] => {
    if (!calendarData?.exchanges) return [];

    return calendarData.exchanges.filter(exchange => {
      const exchangeTime = new Date(exchange.scheduled_time);
      return (
        exchangeTime.getDate() === date.getDate() &&
        exchangeTime.getMonth() === date.getMonth() &&
        exchangeTime.getFullYear() === date.getFullYear()
      );
    });
  };

  const getCourtEventsForDate = (date: Date): CourtEventForCalendar[] => {
    if (!calendarData?.court_events) return [];

    return calendarData.court_events.filter(event => {
      const eventDate = new Date(event.event_date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const calendarDays = generateCalendarDays();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">{monthName}</h2>
        <div className="flex items-center gap-2">
          <Button onClick={today} variant="outline" size="sm" className="text-xs sm:text-sm">
            Today
          </Button>
          <Button onClick={previousMonth} variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button onClick={nextMonth} variant="outline" size="sm">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-cg-error-subtle border border-cg-error/30 text-cg-error px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Collections Legend */}
      {calendarData && calendarData.my_collections.length > 0 && (
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs sm:text-sm bg-cg-cream p-3 rounded-lg border border-cg-sand-dark">
          <span className="font-medium text-foreground">My Collections:</span>
          {calendarData.my_collections.map(collection => (
            <div key={collection.id} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: collection.color }}
              />
              <span className="text-muted-foreground">{collection.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-cg-amber" />
            <span className="text-muted-foreground">Pickup/Dropoff</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-cg-error" />
            <span className="text-muted-foreground">Court Event</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-cg-slate-light" />
            <span className="text-muted-foreground">Other Parent (Busy)</span>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <Card className="overflow-x-auto bg-cg-cream border-cg-sand-dark">
        <div className="min-w-[320px] sm:min-w-[600px]">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-cg-sage text-white border-b border-cg-sage-dark">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <div key={day} className="p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.charAt(0)}</span>
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 auto-rows-fr min-h-[350px] sm:min-h-[500px]">
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="border-r border-b border-cg-sand-dark bg-cg-sand/30" />;
            }

            const events = getEventsForDate(date);
            const exchanges = getExchangesForDate(date);
            const courtEvents = getCourtEventsForDate(date);
            const busyPeriods = getBusyPeriodsForDate(date);
            const isTodayDate = isToday(date);

            return (
              <div
                key={date.toISOString()}
                className={`border-r border-b border-cg-sand-dark p-1 sm:p-2 min-h-[70px] sm:min-h-[100px] hover:bg-cg-sage-subtle/50 transition-colors ${
                  isTodayDate ? 'bg-cg-sage-subtle' : 'bg-white dark:bg-card'
                }`}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <span
                    className={`text-xs sm:text-sm font-medium ${
                      isTodayDate ? 'bg-cg-sage text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center' : 'text-foreground'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  <button
                    onClick={() => onCreateEvent?.(date)}
                    className="opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity p-1"
                    aria-label="Add event"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 text-cg-sage hover:text-cg-sage-dark" />
                  </button>
                </div>

                {/* Events */}
                <div className="space-y-0.5 sm:space-y-1">
                  {events.slice(0, 2).map(event => {
                    const collection = calendarData?.my_collections.find(
                      c => c.id === event.collection_id
                    );
                    const eventColor = event.is_owner
                      ? collection?.color || '#4A6C58'
                      : '#64748B'; // Slate for shared events

                    // RSVP indicator
                    const rsvpStatus = event.my_attendance?.rsvp_status;
                    const rsvpIndicator = rsvpStatus === 'going' ? '✓' :
                                          rsvpStatus === 'not_going' ? '✗' :
                                          rsvpStatus === 'maybe' ? '?' : '';

                    return (
                      <button
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className="w-full text-left px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs hover:opacity-80 transition-opacity truncate flex items-center gap-1"
                        style={{
                          backgroundColor: eventColor,
                          color: 'white',
                        }}
                        title={`${event.title}${rsvpStatus ? ` (${rsvpStatus})` : ''}`}
                      >
                        {rsvpIndicator && (
                          <span className={`flex-shrink-0 ${
                            rsvpStatus === 'going' ? 'text-green-200' :
                            rsvpStatus === 'not_going' ? 'text-red-200' : 'text-yellow-200'
                          }`}>
                            {rsvpIndicator}
                          </span>
                        )}
                        <span className="truncate">
                          <span className="hidden sm:inline">{formatEventTime(event.start_time)} </span>{event.title}
                        </span>
                      </button>
                    );
                  })}

                  {/* Exchanges (Pickup/Dropoff) */}
                  {exchanges.slice(0, 2).map(exchange => (
                    <button
                      key={exchange.id}
                      onClick={() => onExchangeClick?.(exchange)}
                      className="w-full px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs bg-cg-amber text-white truncate flex items-center gap-1 hover:bg-cg-amber/80 transition-colors text-left cursor-pointer"
                      title={`${exchange.title} - ${exchange.location || 'No location'} - Click to check in`}
                    >
                      <RefreshCw className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                      <span className="truncate">
                        <span className="hidden sm:inline">{formatEventTime(exchange.scheduled_time)} </span>{exchange.title}
                      </span>
                    </button>
                  ))}

                  {/* Court Events */}
                  {courtEvents.slice(0, 2).map(courtEvent => {
                    // RSVP indicator for court events
                    const rsvpStatus = courtEvent.my_rsvp_status;
                    const RsvpIcon = rsvpStatus === 'attending' ? Check :
                                     rsvpStatus === 'not_attending' ? XCircle :
                                     rsvpStatus === 'maybe' ? HelpCircle : null;

                    return (
                      <button
                        key={courtEvent.id}
                        onClick={() => setSelectedCourtEvent(courtEvent)}
                        className={`w-full px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs text-white truncate flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer text-left ${
                          courtEvent.is_mandatory ? 'bg-cg-error' : 'bg-cg-slate'
                        }`}
                        title={`${courtEvent.title}${courtEvent.is_mandatory ? ' (Required)' : ''}${rsvpStatus ? ` - ${rsvpStatus}` : ''} - Click to respond`}
                      >
                        <Gavel className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                        {RsvpIcon && (
                          <RsvpIcon className={`h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0 ${
                            rsvpStatus === 'attending' ? 'text-green-300' :
                            rsvpStatus === 'not_attending' ? 'text-red-300' : 'text-yellow-300'
                          }`} />
                        )}
                        <span className="truncate">
                          <span className="hidden sm:inline">{courtEvent.start_time ? formatTimeString(courtEvent.start_time) : ''} </span>{courtEvent.title}
                        </span>
                      </button>
                    );
                  })}

                  {/* Busy Periods */}
                  {busyPeriods.slice(0, 1).map((period, i) => (
                    <div
                      key={i}
                      className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs bg-cg-slate-subtle text-cg-slate truncate"
                      title={period.label}
                    >
                      {period.label}
                    </div>
                  ))}

                  {/* Show "more" indicator */}
                  {events.length + exchanges.length + courtEvents.length + busyPeriods.length > 3 && (
                    <div className="text-[10px] sm:text-xs text-muted-foreground px-1">
                      +{events.length + exchanges.length + courtEvents.length + busyPeriods.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </Card>

      {/* Summary */}
      {calendarData && (
        <div className="text-sm text-muted-foreground text-center">
          {calendarData.events.length === 0 && (calendarData.exchanges?.length || 0) === 0 && (calendarData.court_events?.length || 0) === 0 && calendarData.busy_periods.length === 0 ? (
            <span className="text-muted-foreground/60">
              No events this month. Click the + on any day to create one!
            </span>
          ) : (
            <>
              {calendarData.events.length} event{calendarData.events.length !== 1 ? 's' : ''}
              {(calendarData.exchanges?.length || 0) > 0 && (
                <span> • {calendarData.exchanges.length} exchange{calendarData.exchanges.length !== 1 ? 's' : ''}</span>
              )}
              {(calendarData.court_events?.length || 0) > 0 && (
                <span> • {calendarData.court_events.length} court event{calendarData.court_events.length !== 1 ? 's' : ''}</span>
              )}
              {calendarData.busy_periods.length > 0 && (
                <span> • {calendarData.busy_periods.length} busy period{calendarData.busy_periods.length !== 1 ? 's' : ''}</span>
              )}
            </>
          )}
        </div>
      )}

      {/* Court Event Details Modal */}
      {selectedCourtEvent && (
        <CourtEventDetails
          event={selectedCourtEvent}
          onClose={() => setSelectedCourtEvent(null)}
          onRsvpUpdate={() => {
            setSelectedCourtEvent(null);
            loadCalendarData(); // Refresh calendar after RSVP
          }}
        />
      )}
    </div>
  );
}

// formatEventTime is now defined inside CalendarView component with timezone support

function formatTimeString(timeString: string): string {
  // Handle time strings like "09:00:00" or "14:30:00"
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}
