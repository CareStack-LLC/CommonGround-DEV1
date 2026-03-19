"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { Input } from "@/components/ui/input";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Helper for date input
const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  court_hearing: { label: "Court Date", color: "#DC2626", icon: <Scale className="h-4 w-4" /> },
  filing_deadline: { label: "Filing Deadline", color: "#F59E0B", icon: <FileText className="h-4 w-4" /> },
  meeting: { label: "Client Meeting", color: "#3B82F6", icon: <Users className="h-4 w-4" /> },
  custody_exchange: { label: "Custody Exchange", color: "#3DAA8A", icon: <CalendarIcon className="h-4 w-4" /> },
  intake_session: { label: "Intake Session", color: "#8B5CF6", icon: <Briefcase className="h-4 w-4" /> },
  video_call: { label: "Video Call", color: "#10B981", icon: <Video className="h-4 w-4" /> },
  document_deadline: { label: "Document Deadline", color: "#F59E0B", icon: <FileText className="h-4 w-4" /> },
  consultation: { label: "Consultation", color: "#2D6A8F", icon: <Briefcase className="h-4 w-4" /> },
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

const getWeekDates = (date: Date): Date[] => {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am to 8pm

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
  const [editingEvent, setEditingEvent] = useState<ProfessionalEvent | null>(null);
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

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => isSameDay(new Date(event.start_time), date));
  };

  // Navigation
  const prevPeriod = () => {
    if (view === "month") setCurrentDate(new Date(year, month - 1, 1));
    else if (view === "week") setCurrentDate(new Date(currentDate.getTime() - 7 * 86400000));
    else setCurrentDate(new Date(currentDate.getTime() - 86400000));
  };
  const nextPeriod = () => {
    if (view === "month") setCurrentDate(new Date(year, month + 1, 1));
    else if (view === "week") setCurrentDate(new Date(currentDate.getTime() + 7 * 86400000));
    else setCurrentDate(new Date(currentDate.getTime() + 86400000));
  };
  const goToToday = () => setCurrentDate(new Date());

  const weekDates = getWeekDates(currentDate);

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

  // Update existing event
  const handleUpdateEvent = async (data: any) => {
    if (!token || !editingEvent) return;
    const payload = {
      ...data,
      start_time: new Date(data.start_time).toISOString(),
      end_time: new Date(data.end_time).toISOString(),
      family_file_id: data.family_file_id || null,
    };

    try {
      await professionalFetch(`/professional/events/${editingEvent.id}`, token, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setEditingEvent(null);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error) {
      console.error("Failed to update event:", error);
    }
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');
        .serif { font-family: 'Crimson Pro', serif; }
        .sans { font-family: 'Outfit', sans-serif; }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Calendar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Events, meetings & important deadlines
          </p>
        </div>
        <Button onClick={() => setShowEventForm(true)} className="bg-[#3DAA8A] hover:bg-[#2D8A6E] text-white font-semibold px-5 h-10 rounded-xl shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </div>

      {/* Calendar Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-slate-900">{summary.active_events}</div>
              <div className="text-xs text-slate-500 uppercase font-semibold tracking-wide mt-1">Events This Month</div>
            </CardContent>
          </Card>
          <Card className="border border-red-200 bg-red-50/50 shadow-sm rounded-2xl">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-700">
                {summary.events_by_type?.court_hearing || 0}
              </div>
              <div className="text-xs text-red-600/70 uppercase font-semibold tracking-wide mt-1">Hearings</div>
            </CardContent>
          </Card>
          <Card className="border border-blue-200 bg-blue-50/50 shadow-sm rounded-2xl">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-700">
                {summary.events_by_type?.meeting || 0}
              </div>
              <div className="text-xs text-blue-600/70 uppercase font-semibold tracking-wide mt-1">Meetings</div>
            </CardContent>
          </Card>
          <Card className="border border-[#3DAA8A]/20 bg-[#F4F8F7]/50 shadow-sm rounded-2xl">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-[#1E3A4A]">
                {summary.events_by_type?.document_deadline || 0}
              </div>
              <div className="text-xs text-slate-500 uppercase font-semibold tracking-wide mt-1">Deadlines</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendar Navigation */}
      <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={prevPeriod} className="border-slate-200 hover:bg-[#F4F8F7] rounded-lg h-9 w-9">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold text-slate-900 min-w-[160px] text-center">
                {view === "day"
                  ? currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                  : view === "week"
                    ? `${weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : `${monthName} ${year}`}
              </h2>
              <Button variant="outline" size="icon" onClick={nextPeriod} className="border-slate-200 hover:bg-[#F4F8F7] rounded-lg h-9 w-9">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Input
                type="date"
                value={toInputDate(currentDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m, d] = e.target.value.split("-").map(Number);
                    setCurrentDate(new Date(y, m - 1, d));
                  }
                }}
                className="w-auto border-slate-200 rounded-lg"
              />
              <Button variant="outline" onClick={goToToday} className="border-slate-200 hover:bg-[#F4F8F7] rounded-lg">
                Today
              </Button>
            </div>
            <div className="flex bg-slate-100/80 rounded-lg p-0.5 gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("month")}
                className={view === "month" ? "bg-white text-[#1E3A4A] shadow-sm rounded-md" : "text-slate-500 hover:text-slate-700 rounded-md"}
              >
                Month
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("week")}
                className={view === "week" ? "bg-white text-[#1E3A4A] shadow-sm rounded-md" : "text-slate-500 hover:text-slate-700 rounded-md"}
              >
                Week
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("day")}
                className={view === "day" ? "bg-white text-[#1E3A4A] shadow-sm rounded-md" : "text-slate-500 hover:text-slate-700 rounded-md"}
              >
                Day
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3DAA8A]" />
            </div>
          ) : view === "month" ? (
            /* ── Month View ── */
            <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden">
              {weekDays.map((day) => (
                <div key={day} className="bg-[#F4F8F7] p-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {day}
                </div>
              ))}
              {days.map((day, index) => {
                const dayEvents = getEventsForDay(day);
                const isToday = day !== null && isSameDay(new Date(year, month, day), today);
                const isSelected = day !== null && selectedDate && isSameDay(new Date(year, month, day), selectedDate);
                return (
                  <div
                    key={index}
                    className={`min-h-[100px] bg-white p-1.5 cursor-pointer hover:bg-[#F4F8F7]/50 transition-colors ${!day ? "bg-slate-50/50" : ""} ${isSelected ? "ring-2 ring-[#3DAA8A] ring-inset" : ""}`}
                    onClick={() => day && setSelectedDate(new Date(year, month, day))}
                  >
                    {day && (
                      <>
                        <div className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "bg-[#3DAA8A] text-white" : "text-slate-900"}`}>
                          {day}
                        </div>
                        <div className="space-y-1 mt-1">
                          {dayEvents.slice(0, 3).map((event) => {
                            const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.other;
                            return (
                              <div key={event.id} className="text-xs p-1 rounded-md truncate cursor-pointer hover:opacity-80" style={{ backgroundColor: `${event.color || config.color}15`, color: event.color || config.color }}
                                onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}>
                                {event.all_day ? "All day" : formatTime(event.start_time)} {event.title}
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && <div className="text-xs text-slate-400 pl-1">+{dayEvents.length - 3} more</div>}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : view === "week" ? (
            /* ── Week View ── */
            <div className="grid grid-cols-8 gap-px bg-slate-200 rounded-xl overflow-hidden">
              {/* Time gutter header */}
              <div className="bg-[#F4F8F7] p-2" />
              {weekDates.map((d, i) => {
                const isToday = isSameDay(d, today);
                return (
                  <div key={i} className="bg-[#F4F8F7] p-2 text-center">
                    <div className="text-xs font-semibold text-slate-500 uppercase">{weekDays[i]}</div>
                    <div className={`text-lg font-bold mt-0.5 ${isToday ? "text-[#3DAA8A]" : "text-slate-900"}`}>{d.getDate()}</div>
                  </div>
                );
              })}
              {/* Time rows */}
              {HOURS.map((hour) => (
                <React.Fragment key={hour}>
                  <div className="bg-white p-2 text-right text-xs text-slate-400 font-medium border-r border-slate-100">
                    {hour > 12 ? `${hour - 12}p` : hour === 12 ? "12p" : `${hour}a`}
                  </div>
                  {weekDates.map((d, i) => {
                    const dayEvents = getEventsForDate(d).filter((e) => {
                      if (e.all_day) return hour === 7;
                      const h = new Date(e.start_time).getHours();
                      return h === hour;
                    });
                    return (
                      <div key={i} className="bg-white min-h-[48px] p-0.5 border-b border-slate-50 hover:bg-[#F4F8F7]/30 cursor-pointer"
                        onClick={() => { setSelectedDate(d); setView("day"); }}>
                        {dayEvents.map((event) => {
                          const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.other;
                          return (
                            <div key={event.id} className="text-xs p-1.5 rounded-md mb-0.5 truncate cursor-pointer" style={{ backgroundColor: `${event.color || config.color}15`, color: event.color || config.color }}
                              onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}>
                              {event.all_day ? "All day" : formatTime(event.start_time)} {event.title}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          ) : (
            /* ── Day View ── */
            <div className="space-y-0">
              {HOURS.map((hour) => {
                const hourEvents = getEventsForDate(currentDate).filter((e) => {
                  if (e.all_day) return hour === 7;
                  const h = new Date(e.start_time).getHours();
                  return h === hour;
                });
                return (
                  <div key={hour} className="flex border-b border-slate-100 min-h-[56px]">
                    <div className="w-20 shrink-0 p-2 text-right text-xs text-slate-400 font-medium border-r border-slate-100">
                      {hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? "12:00 PM" : `${hour}:00 AM`}
                    </div>
                    <div className="flex-1 p-1 hover:bg-[#F4F8F7]/30 transition-colors">
                      {hourEvents.map((event) => {
                        const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.other;
                        return (
                          <div key={event.id} className="p-2 rounded-lg mb-1 cursor-pointer hover:opacity-90 transition-opacity" style={{ backgroundColor: `${event.color || config.color}15`, borderLeft: `3px solid ${event.color || config.color}` }}
                            onClick={() => setSelectedEvent(event)}>
                            <p className="text-sm font-semibold" style={{ color: event.color || config.color }}>{event.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {event.all_day ? "All day" : `${formatTime(event.start_time)} – ${formatTime(event.end_time)}`}
                            </p>
                          </div>
                        );
                      })}
                    </div>
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
                      <DropdownMenuItem onClick={() => { setEditingEvent(selectedEvent); setSelectedEvent(null); }}>Edit</DropdownMenuItem>
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

      {/* Edit Event Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => { if (!open) setEditingEvent(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>Update calendar event details</DialogDescription>
          </DialogHeader>
          {editingEvent && (
            <EventForm
              onSubmit={handleUpdateEvent}
              onCancel={() => setEditingEvent(null)}
              cases={cases}
              onCheckConflicts={handleCheckConflicts}
              initialData={{
                title: editingEvent.title,
                description: editingEvent.description || "",
                event_type: editingEvent.event_type,
                start_time: editingEvent.start_time.slice(0, 16),
                end_time: editingEvent.end_time.slice(0, 16),
                all_day: editingEvent.all_day,
                location: editingEvent.location || "",
                virtual_meeting_url: editingEvent.virtual_meeting_url || "",
                family_file_id: editingEvent.family_file_id || "",
                parent_visibility: editingEvent.parent_visibility,
                reminder_minutes: editingEvent.reminder_minutes,
                notes: editingEvent.notes || "",
                color: editingEvent.color || "",
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
