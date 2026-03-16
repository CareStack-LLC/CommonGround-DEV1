'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Gavel, Check, XCircle, HelpCircle, Calendar, CalendarDays } from 'lucide-react';
import { calendarAPI, CalendarDataV2, EventV2, BusyPeriod, ExchangeInstanceForCalendar, CourtEventForCalendar } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import CourtEventDetails from './court-event-details';
import { useAuth } from '@/lib/auth-context';
import { formatInUserTimezone } from '@/lib/timezone';

type ViewMode = 'month' | 'week';

interface CalendarViewProps {
  caseId: string;
  agreementId?: string;  // Filter events by SharedCare Agreement
  onCreateEvent?: (date: Date) => void;
  onEventClick?: (event: EventV2) => void;
  onExchangeClick?: (exchange: ExchangeInstanceForCalendar) => void;
}

// Hours to display in week view (6 AM to 10 PM)
const WEEK_VIEW_START_HOUR = 6;
const WEEK_VIEW_END_HOUR = 22;
const HOUR_HEIGHT = 48; // px per hour slot

export default function CalendarView({
  caseId,
  agreementId,
  onCreateEvent,
  onEventClick,
  onExchangeClick,
}: CalendarViewProps) {
  const { timezone } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [calendarData, setCalendarData] = useState<CalendarDataV2 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourtEvent, setSelectedCourtEvent] = useState<CourtEventForCalendar | null>(null);
  const weekScrollRef = useRef<HTMLDivElement>(null);

  // Timezone-aware time formatter
  const formatEventTime = (dateString: string): string => {
    return formatInUserTimezone(dateString, timezone, 'h:mm a');
  };

  useEffect(() => {
    loadCalendarData();
  }, [caseId, currentDate, viewMode]);

  // Auto-scroll week view to 7 AM on mount
  useEffect(() => {
    if (viewMode === 'week' && weekScrollRef.current) {
      const scrollTo = (7 - WEEK_VIEW_START_HOUR) * HOUR_HEIGHT;
      weekScrollRef.current.scrollTop = scrollTo;
    }
  }, [viewMode, calendarData]);

  const loadCalendarData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let firstDay: Date;
      let lastDay: Date;

      if (viewMode === 'month') {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        firstDay = new Date(Date.UTC(year, month, 1, 0, 0, 0));
        lastDay = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
      } else {
        const { start, end } = getWeekRange(currentDate);
        firstDay = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0));
        lastDay = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59));
      }

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

  // --- Navigation ---

  const goToPrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    } else {
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - 7);
      setCurrentDate(prev);
    }
  };

  const goToNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    } else {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 7);
      setCurrentDate(next);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // --- Date Helpers ---

  const getWeekRange = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Sunday
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Saturday
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const generateWeekDays = (): Date[] => {
    const { start } = getWeekRange(currentDate);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  // Generate calendar grid for month view
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
    const now = new Date();
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  };

  const isSameDate = (a: Date, b: Date): boolean => {
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  };

  // --- Event color helper (shared between month and week views) ---

  const getEventColor = (event: EventV2): string => {
    const isProfessional = event.is_professional_event || !!event.professional_id;
    if (isProfessional) return '#2D6A8F';
    const collection = calendarData?.my_collections.find(c => c.id === event.collection_id);
    return event.is_owner ? (collection?.color || '#3DAA8A') : '#64748B';
  };

  // --- Header text ---

  const getHeaderText = (): string => {
    if (viewMode === 'month') {
      return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    const weekDays = generateWeekDays();
    const start = weekDays[0];
    const end = weekDays[6];
    const startMonth = start.toLocaleString('default', { month: 'short' });
    const endMonth = end.toLocaleString('default', { month: 'short' });
    if (start.getMonth() === end.getMonth()) {
      return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
  };

  // --- Compute hour position for week view events ---

  const getEventTopAndHeight = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const clampedStart = Math.max(startHour, WEEK_VIEW_START_HOUR);
    const top = (clampedStart - WEEK_VIEW_START_HOUR) * HOUR_HEIGHT;

    let height = HOUR_HEIGHT; // default 1 hour
    if (endTime) {
      const end = new Date(endTime);
      const endHour = end.getHours() + end.getMinutes() / 60;
      const clampedEnd = Math.min(endHour, WEEK_VIEW_END_HOUR);
      height = Math.max((clampedEnd - clampedStart) * HOUR_HEIGHT, 20); // min 20px
    }

    return { top, height };
  };

  const calendarDays = generateCalendarDays();

  if (isLoading && !calendarData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    );
  }

  // --- Summary text helper ---
  const summaryPeriod = viewMode === 'month' ? 'month' : 'week';

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">{getHeaderText()}</h2>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-cg-sand-dark overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-cg-sage text-white'
                  : 'bg-cg-cream text-foreground hover:bg-cg-sand'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Month</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-cg-sage text-white'
                  : 'bg-cg-cream text-foreground hover:bg-cg-sand'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Week</span>
            </button>
          </div>

          <Button onClick={goToToday} variant="outline" size="sm" className="text-xs sm:text-sm">
            Today
          </Button>
          <Button onClick={goToPrevious} variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button onClick={goToNext} variant="outline" size="sm">
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

      {/* ==================== MONTH VIEW ==================== */}
      {viewMode === 'month' && (
        <Card className="overflow-x-auto bg-cg-cream border-cg-sand-dark">
          <div className="min-w-[320px] sm:min-w-[600px]">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 bg-cg-sage text-white border-b border-cg-sage-dark">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
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
                    isTodayDate ? 'bg-cg-sage-subtle' : 'bg-cg-cream'
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
                      const isProfessional = event.is_professional_event || !!event.professional_id;
                      const eventColor = getEventColor(event);
                      const rsvpStatus = event.my_attendance?.rsvp_status;
                      const rsvpIndicator = rsvpStatus === 'going' ? '✓' :
                                            rsvpStatus === 'not_going' ? '✗' :
                                            rsvpStatus === 'maybe' ? '?' : '';

                      return (
                        <button
                          key={event.id}
                          onClick={() => onEventClick?.(event)}
                          className="w-full text-left px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs hover:opacity-80 transition-opacity truncate flex items-center gap-1"
                          style={{ backgroundColor: eventColor, color: 'white' }}
                          title={`${isProfessional ? '⚖ ' : ''}${event.title}${rsvpStatus ? ` (${rsvpStatus})` : ''}`}
                        >
                          {isProfessional && <span className="flex-shrink-0">⚖</span>}
                          {rsvpIndicator && (
                            <span className={`flex-shrink-0 ${
                              rsvpStatus === 'going' ? 'text-green-200' :
                              rsvpStatus === 'not_going' ? 'text-red-200' : 'text-yellow-200'
                            }`}>{rsvpIndicator}</span>
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
      )}

      {/* ==================== WEEK VIEW ==================== */}
      {viewMode === 'week' && (
        <Card className="overflow-hidden bg-cg-cream border-cg-sand-dark">
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Day Headers */}
              <div className="grid border-b border-cg-sage-dark" style={{ gridTemplateColumns: '50px repeat(7, 1fr)' }}>
                {/* Time column header */}
                <div className="bg-cg-sage p-2" />
                {generateWeekDays().map((date) => {
                  const isTodayDate = isToday(date);
                  const dayName = date.toLocaleString('default', { weekday: 'short' });
                  const dayChar = dayName.charAt(0);
                  return (
                    <div
                      key={date.toISOString()}
                      className={`bg-cg-sage text-white p-2 sm:p-3 text-center border-l border-cg-sage-dark ${
                        isTodayDate ? 'bg-cg-sage-dark' : ''
                      }`}
                    >
                      <div className="text-xs sm:text-sm font-semibold">
                        <span className="hidden sm:inline">{dayName}</span>
                        <span className="sm:hidden">{dayChar}</span>
                      </div>
                      <div className={`text-sm sm:text-lg font-bold mt-0.5 ${
                        isTodayDate ? 'bg-white text-cg-sage rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center mx-auto' : ''
                      }`}>
                        {date.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* All-day events row */}
              {(() => {
                const weekDays = generateWeekDays();
                const hasAllDayContent = weekDays.some(date => {
                  const exchanges = getExchangesForDate(date);
                  const busyPeriods = getBusyPeriodsForDate(date);
                  return exchanges.length > 0 || busyPeriods.length > 0;
                });

                if (!hasAllDayContent) return null;

                return (
                  <div className="grid border-b border-cg-sand-dark bg-cg-cream" style={{ gridTemplateColumns: '50px repeat(7, 1fr)' }}>
                    <div className="p-1 text-[10px] sm:text-xs text-muted-foreground text-right pr-2 pt-2">
                      all day
                    </div>
                    {weekDays.map((date) => {
                      const exchanges = getExchangesForDate(date);
                      const busyPeriods = getBusyPeriodsForDate(date);
                      return (
                        <div key={date.toISOString()} className="border-l border-cg-sand-dark p-1 min-h-[32px] space-y-0.5">
                          {exchanges.map(exchange => (
                            <button
                              key={exchange.id}
                              onClick={() => onExchangeClick?.(exchange)}
                              className="w-full px-1.5 py-0.5 rounded text-[10px] sm:text-xs bg-cg-amber text-white truncate flex items-center gap-1 hover:bg-cg-amber/80 transition-colors text-left cursor-pointer"
                              title={`${exchange.title} - ${exchange.location || 'No location'}`}
                            >
                              <RefreshCw className="h-2.5 w-2.5 flex-shrink-0" />
                              <span className="truncate">{exchange.title}</span>
                            </button>
                          ))}
                          {busyPeriods.map((period, i) => (
                            <div
                              key={i}
                              className="px-1.5 py-0.5 rounded text-[10px] sm:text-xs bg-cg-slate-subtle text-cg-slate truncate"
                              title={period.label}
                            >
                              {period.label}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Hourly Grid */}
              <div
                ref={weekScrollRef}
                className="overflow-y-auto"
                style={{ maxHeight: '500px' }}
              >
                <div className="grid relative" style={{ gridTemplateColumns: '50px repeat(7, 1fr)' }}>
                  {/* Time labels + horizontal lines */}
                  {Array.from({ length: WEEK_VIEW_END_HOUR - WEEK_VIEW_START_HOUR }, (_, i) => {
                    const hour = WEEK_VIEW_START_HOUR + i;
                    const label = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
                    return (
                      <div
                        key={`time-${hour}`}
                        className="contents"
                      >
                        {/* Time label */}
                        <div
                          className="text-[10px] sm:text-xs text-muted-foreground text-right pr-2 border-b border-cg-sand-dark relative"
                          style={{ height: `${HOUR_HEIGHT}px`, gridColumn: '1', gridRow: i + 1 }}
                        >
                          <span className="relative -top-2">{label}</span>
                        </div>
                        {/* Day columns for this hour row */}
                        {Array.from({ length: 7 }, (_, dayIdx) => (
                          <div
                            key={`slot-${hour}-${dayIdx}`}
                            className="border-l border-b border-cg-sand-dark hover:bg-cg-sage-subtle/30 transition-colors cursor-pointer"
                            style={{ height: `${HOUR_HEIGHT}px`, gridColumn: dayIdx + 2, gridRow: i + 1 }}
                            onClick={() => {
                              const weekDays = generateWeekDays();
                              const clickDate = new Date(weekDays[dayIdx]);
                              clickDate.setHours(hour, 0, 0, 0);
                              onCreateEvent?.(clickDate);
                            }}
                          />
                        ))}
                      </div>
                    );
                  })}

                  {/* Positioned Events */}
                  {generateWeekDays().map((date, dayIdx) => {
                    const events = getEventsForDate(date);
                    const courtEvents = getCourtEventsForDate(date);

                    return (
                      <div
                        key={`events-col-${dayIdx}`}
                        className="relative pointer-events-none"
                        style={{
                          gridColumn: dayIdx + 2,
                          gridRow: `1 / ${WEEK_VIEW_END_HOUR - WEEK_VIEW_START_HOUR + 1}`,
                        }}
                      >
                        {/* Regular events */}
                        {events.map((event) => {
                          const { top, height } = getEventTopAndHeight(event.start_time, event.end_time);
                          const eventColor = getEventColor(event);
                          const isProfessional = event.is_professional_event || !!event.professional_id;

                          return (
                            <button
                              key={event.id}
                              onClick={(e) => { e.stopPropagation(); onEventClick?.(event); }}
                              className="absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-xs text-white overflow-hidden hover:opacity-80 transition-opacity pointer-events-auto text-left cursor-pointer z-10"
                              style={{
                                top: `${top}px`,
                                height: `${height}px`,
                                backgroundColor: eventColor,
                                minHeight: '20px',
                              }}
                              title={`${isProfessional ? '⚖ ' : ''}${event.title} — ${formatEventTime(event.start_time)}`}
                            >
                              <div className="font-medium truncate leading-tight">
                                {isProfessional && <span>⚖ </span>}
                                {event.title}
                              </div>
                              {height >= 36 && (
                                <div className="text-[9px] sm:text-[10px] opacity-80 truncate leading-tight">
                                  {formatEventTime(event.start_time)}
                                </div>
                              )}
                            </button>
                          );
                        })}

                        {/* Court events */}
                        {courtEvents.map((courtEvent) => {
                          // Court events may have a time string like "09:00:00"
                          let top = 3 * HOUR_HEIGHT; // Default to 9 AM
                          let height = HOUR_HEIGHT;
                          if (courtEvent.start_time) {
                            const [h, m] = courtEvent.start_time.split(':').map(Number);
                            const startHour = h + (m || 0) / 60;
                            top = Math.max(startHour - WEEK_VIEW_START_HOUR, 0) * HOUR_HEIGHT;
                          }

                          return (
                            <button
                              key={courtEvent.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedCourtEvent(courtEvent); }}
                              className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-xs text-white overflow-hidden hover:opacity-80 transition-opacity pointer-events-auto text-left cursor-pointer z-10 ${
                                courtEvent.is_mandatory ? 'bg-cg-error' : 'bg-cg-slate'
                              }`}
                              style={{ top: `${top}px`, height: `${height}px`, minHeight: '20px' }}
                              title={`${courtEvent.title}${courtEvent.is_mandatory ? ' (Required)' : ''}`}
                            >
                              <div className="font-medium truncate leading-tight flex items-center gap-1">
                                <Gavel className="h-2.5 w-2.5 flex-shrink-0" />
                                {courtEvent.title}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Current time indicator */}
                  {(() => {
                    const now = new Date();
                    const weekDays = generateWeekDays();
                    const todayIdx = weekDays.findIndex(d => isToday(d));
                    if (todayIdx === -1) return null;

                    const currentHour = now.getHours() + now.getMinutes() / 60;
                    if (currentHour < WEEK_VIEW_START_HOUR || currentHour > WEEK_VIEW_END_HOUR) return null;

                    const top = (currentHour - WEEK_VIEW_START_HOUR) * HOUR_HEIGHT;

                    return (
                      <div
                        className="absolute pointer-events-none z-20"
                        style={{
                          gridColumn: `${todayIdx + 2}`,
                          gridRow: `1 / ${WEEK_VIEW_END_HOUR - WEEK_VIEW_START_HOUR + 1}`,
                          top: `${top}px`,
                          left: 0,
                          right: 0,
                        }}
                      >
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-cg-error -ml-1" />
                          <div className="flex-1 h-0.5 bg-cg-error" />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Summary */}
      {calendarData && (
        <div className="text-sm text-muted-foreground text-center">
          {calendarData.events.length === 0 && (calendarData.exchanges?.length || 0) === 0 && (calendarData.court_events?.length || 0) === 0 && calendarData.busy_periods.length === 0 ? (
            <span className="text-muted-foreground/60">
              No events this {summaryPeriod}. Click the + on any {viewMode === 'week' ? 'time slot' : 'day'} to create one!
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
