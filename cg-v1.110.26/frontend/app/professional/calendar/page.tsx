"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Video,
  Briefcase,
  Scale,
  FileText,
  Users,
  MoreHorizontal,
  AlertTriangle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfessionalAuth } from "../layout";
import { EventForm } from "@/components/professional/event-form";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Helper function for API calls
async function professionalFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}/api/v1${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Types
interface ProfessionalEvent {
  id: string;
  professional_id: string;
  firm_id?: string;
  title: string;
  description?: string;
  event_type: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  timezone?: string;
  location?: string;
  virtual_meeting_url?: string;
  family_file_id?: string;
  family_file_title?: string;
  attendee_ids?: string[];
  attendee_emails?: string[];
  parent_visibility: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  parent_event_id?: string;
  reminder_minutes?: number;
  notes?: string;
  color?: string;
  is_cancelled: boolean;
  cancelled_at?: string;
  cancellation_reason?: string;
}

interface EventConflict {
  event_id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  overlap_minutes: number;
}

interface CalendarSummary {
  total_events: number;
  active_events: number;
  cancelled_events: number;
  events_by_type: Record<string, number>;
  period_start: string;
  period_end: string;
}

// Event type configuration
const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  meeting: { label: "Meeting", color: "#3B82F6", icon: <Users className="h-4 w-4" /> },
  court_hearing: { label: "Court Hearing", color: "#DC2626", icon: <Scale className="h-4 w-4" /> },
  video_call: { label: "Video Call", color: "#10B981", icon: <Video className="h-4 w-4" /> },
  document_deadline: { label: "Deadline", color: "#F59E0B", icon: <FileText className="h-4 w-4" /> },
  consultation: { label: "Consultation", color: "#8B5CF6", icon: <Briefcase className="h-4 w-4" /> },
  deposition: { label: "Deposition", color: "#6366F1", icon: <Scale className="h-4 w-4" /> },
  mediation: { label: "Mediation", color: "#EC4899", icon: <Users className="h-4 w-4" /> },
  other: { label: "Other", color: "#6B7280", icon: <CalendarIcon className="h-4 w-4" /> },
};

// Calendar helpers
const getMonthDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
};

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
};

const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export default function ProfessionalCalendarPage() {
  const { profile, token } = useProfessionalAuth();
  const [events, setEvents] = useState<ProfessionalEvent[]>([]);
  const [summary, setSummary] = useState<CalendarSummary | null>(null);
  const [cases, setCases] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ProfessionalEvent | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [view, setView] = useState<"month" | "week" | "day">("month");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  // Fetch events for the current month
  const fetchEvents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const [eventsResponse, summaryResponse] = await Promise.all([
        professionalFetch<{ events: ProfessionalEvent[]; total: number }>(
          `/professional/events?start_date=${startDate}&end_date=${endDate}&limit=500`,
          token
        ),
        professionalFetch<CalendarSummary>(
          `/professional/events/summary?start_date=${startDate}&end_date=${endDate}`,
          token
        ),
      ]);

      setEvents(eventsResponse.events || []);
      setSummary(summaryResponse);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  }, [year, month, token]);

  // Fetch cases for the event form
  useEffect(() => {
    if (!token) return;
    const fetchCases = async () => {
      try {
        const response = await professionalFetch<Array<{ family_file_id: string; family_file_title: string }>>(
          "/professional/cases",
          token
        );
        setCases(
          response.map((c) => ({
            id: c.family_file_id,
            title: c.family_file_title || "Untitled Case",
          }))
        );
      } catch (error) {
        console.error("Failed to fetch cases:", error);
      }
    };
    fetchCases();
  }, [token]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Get events for a specific day
  const getEventsForDay = (day: number | null) => {
    if (!day) return [];
    const targetDate = new Date(year, month, day);
    return events.filter((event) => {
      const eventStart = new Date(event.start_time);
      return isSameDay(eventStart, targetDate);
    });
  };

  // Navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Handle event actions
  const handleCancelEvent = async (eventId: string) => {
    if (!token) return;
    try {
      await professionalFetch(`/professional/events/${eventId}/cancel`, token, { method: "POST" });
      fetchEvents();
      setSelectedEvent(null);
    } catch (error) {
      console.error("Failed to cancel event:", error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!token) return;
    try {
      await professionalFetch(`/professional/events/${eventId}`, token, { method: "DELETE" });
      fetchEvents();
      setSelectedEvent(null);
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
  };

  // Create new event
  const handleCreateEvent = async (data: any) => {
    if (!token) return;
    // Convert local datetime strings to ISO format
    const payload = {
      ...data,
      start_time: new Date(data.start_time).toISOString(),
      end_time: new Date(data.end_time).toISOString(),
      family_file_id: data.family_file_id || null,
    };

    await professionalFetch("/professional/events", token, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setShowEventForm(false);
    fetchEvents();
  };

  // Check for conflicts
  const handleCheckConflicts = async (startTime: string, endTime: string): Promise<EventConflict[]> => {
    if (!token) return [];
    try {
      const params = new URLSearchParams({ start_time: startTime, end_time: endTime });
      const response = await professionalFetch<{ has_conflicts: boolean; conflicts: EventConflict[] }>(
        `/professional/events/conflicts?${params}`,
        token
      );
      return response.conflicts || [];
    } catch (error) {
      console.error("Failed to check conflicts:", error);
      return [];
    }
  };

  const days = getMonthDays(year, month);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-teal-600" />
            Professional Calendar
          </h1>
          <p className="text-muted-foreground">
            Schedule meetings, court hearings, and case-related events.
          </p>
        </div>
        <Button onClick={() => setShowEventForm(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </div>

      {/* Calendar Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-teal-600">{summary.active_events}</div>
              <div className="text-sm text-muted-foreground">Events This Month</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">
                {summary.events_by_type?.court_hearing || 0}
              </div>
              <div className="text-sm text-muted-foreground">Court Hearings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">
                {summary.events_by_type?.meeting || 0}
              </div>
              <div className="text-sm text-muted-foreground">Meetings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-600">
                {summary.events_by_type?.document_deadline || 0}
              </div>
              <div className="text-sm text-muted-foreground">Deadlines</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendar Navigation */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold">
                {monthName} {year}
              </h2>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={goToToday}>
                Today
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={view === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("month")}
              >
                Month
              </Button>
              <Button
                variant={view === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("week")}
              >
                Week
              </Button>
              <Button
                variant={view === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("day")}
              >
                Day
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {/* Week day headers */}
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {days.map((day, index) => {
                const dayEvents = getEventsForDay(day);
                const isToday = day !== null && isSameDay(new Date(year, month, day), today);
                const isSelected =
                  day !== null && selectedDate && isSameDay(new Date(year, month, day), selectedDate);

                return (
                  <div
                    key={index}
                    className={`
                      min-h-[100px] bg-background p-1 cursor-pointer hover:bg-muted/50 transition-colors
                      ${!day ? "bg-muted/30" : ""}
                      ${isSelected ? "ring-2 ring-teal-500 ring-inset" : ""}
                    `}
                    onClick={() => day && setSelectedDate(new Date(year, month, day))}
                  >
                    {day && (
                      <>
                        <div
                          className={`
                            text-sm font-medium p-1 w-7 h-7 flex items-center justify-center rounded-full
                            ${isToday ? "bg-teal-600 text-white" : "text-foreground"}
                          `}
                        >
                          {day}
                        </div>
                        <div className="space-y-1 mt-1">
                          {dayEvents.slice(0, 3).map((event) => {
                            const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.other;
                            return (
                              <div
                                key={event.id}
                                className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                                style={{ backgroundColor: `${event.color || config.color}20`, color: event.color || config.color }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(event);
                                }}
                              >
                                {event.all_day ? "All day" : formatTime(event.start_time)} {event.title}
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-muted-foreground pl-1">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Events Sidebar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events
            .filter((e) => new Date(e.start_time) >= today && !e.is_cancelled)
            .slice(0, 5)
            .map((event) => {
              const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.other;
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div
                    className="w-1 h-12 rounded-full"
                    style={{ backgroundColor: event.color || config.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{event.title}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {formatDate(event.start_time)} at {formatTime(event.start_time)}
                    </div>
                    {event.location && (
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </div>
                    )}
                    {event.family_file_title && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {event.family_file_title}
                      </Badge>
                    )}
                  </div>
                  <Badge
                    style={{ backgroundColor: `${event.color || config.color}20`, color: event.color || config.color }}
                  >
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          {events.filter((e) => new Date(e.start_time) >= today && !e.is_cancelled).length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No upcoming events this month
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-lg">{selectedEvent.title}</DialogTitle>
                    <DialogDescription>
                      {EVENT_TYPE_CONFIG[selectedEvent.event_type]?.label || "Event"}
                    </DialogDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {}}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCancelEvent(selectedEvent.id)}>
                        Cancel Event
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteEvent(selectedEvent.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {selectedEvent.is_cancelled && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded">
                    <AlertTriangle className="h-4 w-4" />
                    <span>This event has been cancelled</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {selectedEvent.all_day
                      ? "All day"
                      : `${formatTime(selectedEvent.start_time)} - ${formatTime(selectedEvent.end_time)}`}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{formatDate(selectedEvent.start_time)}</span>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.virtual_meeting_url && (
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={selectedEvent.virtual_meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 hover:underline"
                    >
                      Join Video Call
                    </a>
                  </div>
                )}

                {selectedEvent.family_file_title && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <Link
                      href={`/professional/cases/${selectedEvent.family_file_id}`}
                      className="text-teal-600 hover:underline"
                    >
                      {selectedEvent.family_file_title}
                    </Link>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-muted-foreground text-sm">{selectedEvent.description}</p>
                  </div>
                )}

                {selectedEvent.notes && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-muted-foreground text-sm">{selectedEvent.notes}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Event Form Dialog */}
      <Dialog open={showEventForm} onOpenChange={setShowEventForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Event</DialogTitle>
            <DialogDescription>Create a new calendar event</DialogDescription>
          </DialogHeader>
          <EventForm
            onSubmit={handleCreateEvent}
            onCancel={() => setShowEventForm(false)}
            cases={cases}
            onCheckConflicts={handleCheckConflicts}
            initialData={
              selectedDate
                ? {
                    start_time: `${selectedDate.toISOString().slice(0, 10)}T09:00`,
                    end_time: `${selectedDate.toISOString().slice(0, 10)}T10:00`,
                  }
                : undefined
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
