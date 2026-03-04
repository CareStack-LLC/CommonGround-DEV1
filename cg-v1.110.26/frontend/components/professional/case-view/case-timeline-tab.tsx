"use client";

import { useState, useEffect } from "react";
import {
    Clock,
    MessageSquare,
    Calendar,
    FileText,
    Scale,
    Filter,
    Bot,
    RefreshCw,
    Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

const EVENT_TYPES = [
    { value: "message", label: "Messages", icon: MessageSquare, color: "purple" },
    { value: "exchange", label: "Exchanges", icon: Calendar, color: "amber" },
    { value: "agreement", label: "Agreement", icon: FileText, color: "slate" },
    { value: "court", label: "Court Events", icon: Scale, color: "blue" },
    { value: "aria", label: "ARIA Flags", icon: Bot, color: "emerald" },
];

export function CaseTimelineTab({ familyFileId, token }: { familyFileId: string, token: string }) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

    useEffect(() => {
        fetchTimeline();
    }, [familyFileId, token, selectedTypes]);

    const fetchTimeline = async () => {
        if (!token || !familyFileId) return;

        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (selectedTypes.length > 0) {
                selectedTypes.forEach((t) => queryParams.append("event_types", t));
            }
            queryParams.append("limit", "50");

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
            <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map((type) => (
                        <Button
                            key={type.value}
                            variant={selectedTypes.includes(type.value) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleEventType(type.value)}
                            className={selectedTypes.includes(type.value) ? "bg-indigo-600 hover:bg-indigo-700" : "h-8"}
                        >
                            <type.icon className="h-3.5 w-3.5 mr-1.5" />
                            {type.label}
                        </Button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchTimeline} className="h-8">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600" />
                </div>
            ) : events.length > 0 ? (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {Object.entries(groupedEvents).map(([date, dateEvents]) => (
                        <div key={date} className="relative">
                            <div className="md:flex md:items-center md:justify-center mb-4">
                                <div className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-slate-200 relative z-10">
                                    {date}
                                </div>
                            </div>
                            <div className="space-y-4">
                                {dateEvents.map((event) => (
                                    <TimelineItem key={event.id} event={event} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Clock className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">No events matching your filters.</p>
                </div>
            )}
        </div>
    );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
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

    const getEventColor = (type: string) => {
        const colorMap: Record<string, string> = {
            message: "bg-purple-50 text-purple-600 border-purple-100",
            exchange: "bg-amber-50 text-amber-600 border-amber-100",
            agreement: "bg-slate-50 text-slate-600 border-slate-100",
            court: "bg-blue-50 text-blue-600 border-blue-100",
            aria: "bg-emerald-50 text-emerald-600 border-emerald-100",
        };
        return colorMap[type] || "bg-slate-50 text-slate-600 border-slate-100";
    };

    return (
        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            {/* Dot */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors group-hover:bg-indigo-500 group-hover:text-white group-hover:scale-110 duration-300">
                <div className="group-hover:hidden">
                    {getEventIcon(event.event_type)}
                </div>
                <div className="hidden group-hover:block">
                    {getEventIcon(event.event_type)}
                </div>
            </div>

            {/* Content */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-white shadow-sm transition-all group-hover:shadow-md group-hover:border-indigo-100 duration-300">
                <div className="flex items-center justify-between mb-1">
                    <time className="text-xs font-bold text-indigo-500">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </time>
                    <Badge variant="outline" className={`text-[10px] capitalize ${getEventColor(event.event_type)}`}>
                        {event.event_type}
                    </Badge>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">{event.title}</h4>
                {event.description && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {event.description}
                    </p>
                )}
            </div>
        </div>
    );
}
