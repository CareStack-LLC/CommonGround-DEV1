"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  Calendar,
  FileText,
  Scale,
  Filter,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Bot,
  Download,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfessionalAuth } from "../../../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  severity?: string;
  status?: string;
}

interface TimelineSummary {
  total_events: number;
  messages: number;
  exchanges: number;
  agreements: number;
  court_events: number;
  aria_interventions: number;
}

const EVENT_TYPES = [
  { value: "message", label: "Messages", icon: MessageSquare, color: "purple" },
  { value: "exchange", label: "Exchanges", icon: Calendar, color: "amber" },
  { value: "agreement", label: "Agreement", icon: FileText, color: "slate" },
  { value: "court", label: "Court Events", icon: Scale, color: "blue" },
  { value: "aria", label: "ARIA Flags", icon: Bot, color: "emerald" },
];

export default function CaseTimelinePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { token } = useProfessionalAuth();
  const familyFileId = params.familyFileId as string;

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [summary, setSummary] = useState<TimelineSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    searchParams.get("types")?.split(",") || []
  );
  const [dateRange, setDateRange] = useState<string>("30d");

  useEffect(() => {
    fetchTimeline();
  }, [familyFileId, token, selectedTypes, dateRange]);

  const fetchTimeline = async () => {
    if (!token || !familyFileId) return;

    setIsLoading(true);
    try {
      // Build query params
      const queryParams = new URLSearchParams();
      if (selectedTypes.length > 0) {
        selectedTypes.forEach((t) => queryParams.append("event_types", t));
      }
      queryParams.append("limit", "100");

      // Fetch timeline events
      const response = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/timeline?${queryParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }

      // Fetch summary
      const summaryResponse = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/timeline/summary`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData);
      }
    } catch (error) {
      console.error("Error fetching timeline:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEventType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const getEventIcon = (type: string) => {
    const eventType = EVENT_TYPES.find((e) => e.value === type);
    if (!eventType) return <Clock className="h-4 w-4" />;
    const Icon = eventType.icon;
    return <Icon className="h-4 w-4" />;
  };

  const getEventColor = (type: string) => {
    const colorMap: Record<string, string> = {
      message: "bg-purple-100 text-purple-600 border-purple-200",
      exchange: "bg-amber-100 text-amber-600 border-amber-200",
      agreement: "bg-slate-100 text-slate-600 border-slate-200",
      court: "bg-blue-100 text-blue-600 border-blue-200",
      aria: "bg-emerald-100 text-emerald-600 border-emerald-200",
    };
    return colorMap[type] || "bg-gray-100 text-gray-600 border-gray-200";
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const groupEventsByDate = (events: TimelineEvent[]) => {
    const groups: Record<string, TimelineEvent[]> = {};
    events.forEach((event) => {
      const date = new Date(event.timestamp).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
    });
    return groups;
  };

  const groupedEvents = groupEventsByDate(events);

  return (
    <div className="space-y-6">
      <link
        href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Outfit:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Back Link */}
      <Link
        href={`/professional/cases/${familyFileId}`}
        className="inline-flex items-center gap-2 text-sm sans text-amber-900 hover:text-amber-800 font-semibold"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Case
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-sm bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 px-8 py-8 shadow-2xl border-2 border-amber-900/40">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-5">
            <div className="p-4 bg-amber-50 border-2 border-amber-900/20 rounded-sm shadow-xl shrink-0">
              <Clock className="h-8 w-8 text-amber-900" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="serif text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
                Case Timeline
              </h1>
              <p className="sans text-sm text-amber-100 mt-2">
                Chronological view of all case events
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchTimeline} className="border-2 border-white/30 text-white hover:bg-white/10 sans">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="border-2 border-white/30 text-white hover:bg-white/10 sans">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard
            label="Total Events"
            value={summary.total_events}
            icon={<Clock className="h-4 w-4" />}
            active={selectedTypes.length === 0}
            onClick={() => setSelectedTypes([])}
          />
          <SummaryCard
            label="Messages"
            value={summary.messages}
            icon={<MessageSquare className="h-4 w-4" />}
            active={selectedTypes.includes("message")}
            onClick={() => toggleEventType("message")}
          />
          <SummaryCard
            label="Exchanges"
            value={summary.exchanges}
            icon={<Calendar className="h-4 w-4" />}
            active={selectedTypes.includes("exchange")}
            onClick={() => toggleEventType("exchange")}
          />
          <SummaryCard
            label="Court Events"
            value={summary.court_events}
            icon={<Scale className="h-4 w-4" />}
            active={selectedTypes.includes("court")}
            onClick={() => toggleEventType("court")}
          />
          <SummaryCard
            label="ARIA Flags"
            value={summary.aria_interventions}
            icon={<Bot className="h-4 w-4" />}
            active={selectedTypes.includes("aria")}
            onClick={() => toggleEventType("aria")}
          />
        </div>
      )}

      {/* Filters */}
      <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/20 to-white shadow-sm">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-amber-900" />
              <span className="sans text-sm font-semibold text-slate-900">Filter by type:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((type) => (
                <Button
                  key={type.value}
                  variant={selectedTypes.includes(type.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleEventType(type.value)}
                  className={selectedTypes.includes(type.value) ? "bg-amber-900 hover:bg-amber-800 text-white border-2 border-amber-900/40 sans font-semibold" : "border-2 border-slate-300 sans hover:border-amber-900/40 hover:bg-amber-50"}
                >
                  <type.icon className="h-3.5 w-3.5 mr-1.5" />
                  {type.label}
                </Button>
              ))}
              {selectedTypes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTypes([])}
                  className="sans text-slate-600 hover:text-amber-900"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : events.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([date, dateEvents]) => (
            <div key={date}>
              <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-50 to-white/95 backdrop-blur py-2 mb-3 border-b-2 border-amber-900/20">
                <h3 className="serif text-sm font-bold text-amber-900">{date}</h3>
              </div>
              <div className="space-y-3">
                {dateEvents.map((event) => (
                  <TimelineEventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/20 to-white shadow-sm">
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-amber-900/40 mb-4" />
            <h3 className="serif text-lg font-bold text-slate-900 mb-2">No events found</h3>
            <p className="sans text-slate-600">
              {selectedTypes.length > 0
                ? "Try adjusting your filters"
                : "No timeline events recorded yet"}
            </p>
          </CardContent>
        </Card>
      )}

      <style>{`
        .serif {
          font-family: "Crimson Pro", serif;
        }
        .sans {
          font-family: "Outfit", sans-serif;
        }
      `}</style>
    </div>
  );
}

// Summary Card Component
function SummaryCard({
  label,
  value,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-sm border-2 text-left transition-all ${
        active
          ? "bg-amber-50 border-amber-900/40 ring-2 ring-amber-500/20 shadow-md"
          : "bg-gradient-to-br from-white via-amber-50/20 to-white border-amber-900/20 hover:border-amber-900/40 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={active ? "text-amber-900" : "text-slate-600"}>
          {icon}
        </span>
        <span className={`serif text-xl font-bold ${active ? "text-amber-900" : "text-slate-900"}`}>{value}</span>
      </div>
      <p className={`sans text-xs ${active ? "text-amber-900/70" : "text-slate-600"}`}>{label}</p>
    </button>
  );
}

// Timeline Event Card Component
function TimelineEventCard({ event }: { event: TimelineEvent }) {
  const getEventIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      message: <MessageSquare className="h-4 w-4" />,
      exchange: <Calendar className="h-4 w-4" />,
      agreement: <FileText className="h-4 w-4" />,
      court: <Scale className="h-4 w-4" />,
      aria: <Bot className="h-4 w-4" />,
    };
    return iconMap[type] || <Clock className="h-4 w-4" />;
  };

  const getEventColorClasses = (type: string) => {
    const colorMap: Record<string, string> = {
      message: "bg-purple-50 text-purple-900 border-2 border-purple-900/20",
      exchange: "bg-amber-50 text-amber-900 border-2 border-amber-900/20",
      agreement: "bg-slate-50 text-slate-900 border-2 border-slate-900/20",
      court: "bg-blue-50 text-blue-900 border-2 border-blue-900/20",
      aria: "bg-emerald-50 text-emerald-900 border-2 border-emerald-900/20",
    };
    return colorMap[type] || "bg-gray-50 text-gray-900 border-2 border-gray-900/20";
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const statusConfig: Record<string, { variant: "success" | "secondary" | "error" | "outline"; label: string }> = {
      completed: { variant: "success", label: "Completed" },
      pending: { variant: "secondary", label: "Pending" },
      missed: { variant: "error", label: "Missed" },
      cancelled: { variant: "outline", label: "Cancelled" },
    };
    const config = statusConfig[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/20 to-white hover:shadow-lg transition-shadow">
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`p-2.5 rounded-sm shrink-0 shadow-sm ${getEventColorClasses(event.event_type)}`}>
            {getEventIcon(event.event_type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="serif font-bold text-slate-900">{event.title}</h4>
                {event.description && (
                  <p className="sans text-sm text-slate-600 mt-0.5 line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {getStatusBadge(event.status)}
                <span className="sans text-xs text-slate-600">
                  {formatTime(event.timestamp)}
                </span>
              </div>
            </div>

            {/* Metadata */}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {event.metadata.sender && (
                  <Badge className="sans text-xs bg-amber-50 text-amber-900 border-2 border-amber-900/30">
                    From: {event.metadata.sender}
                  </Badge>
                )}
                {event.metadata.location && (
                  <Badge className="sans text-xs bg-slate-50 text-slate-900 border-2 border-slate-900/30">
                    {event.metadata.location}
                  </Badge>
                )}
                {event.metadata.intervention_type && (
                  <Badge className="sans text-xs bg-emerald-50 text-emerald-900 border-2 border-emerald-900/30">
                    {event.metadata.intervention_type}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
