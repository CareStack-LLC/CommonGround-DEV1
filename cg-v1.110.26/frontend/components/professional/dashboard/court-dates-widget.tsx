"use client";

import Link from "next/link";
import { Calendar, ArrowRight, Gavel, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CourtEvent {
    id?: string;
    title: string;
    event_date: string;
    event_type?: string;
    start_time?: string;
    is_mandatory?: boolean;
    family_file_id?: string;
    [key: string]: any;
}

interface CourtDatesWidgetProps {
    events: CourtEvent[];
}

function getDaysUntil(dateStr: string): number {
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDaysLabel(days: number): { label: string; urgent: boolean } {
    if (days < 0) return { label: `${Math.abs(days)}d ago`, urgent: false };
    if (days === 0) return { label: "Today", urgent: true };
    if (days === 1) return { label: "Tomorrow", urgent: true };
    if (days <= 7) return { label: `In ${days} days`, urgent: true };
    return { label: `In ${days} days`, urgent: false };
}

export function CourtDatesWidget({ events }: CourtDatesWidgetProps) {
    // Filter and sort for court-related events: show all court_event types first, then others
    const courtEvents = [...events]
        .filter((e) => {
            const type = (e.event_type || "").toLowerCase();
            return (
                type.includes("court") ||
                type.includes("hearing") ||
                type.includes("trial") ||
                type.includes("mediation") ||
                type.includes("judgment") ||
                e.is_mandatory
            );
        })
        .sort(
            (a, b) =>
                new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        )
        .slice(0, 5);

    if (courtEvents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <Calendar className="h-9 w-9 text-slate-200 mb-3" />
                <p className="text-sm text-slate-400 font-medium">No court dates scheduled</p>
                <Link href="/professional/calendar" className="mt-3">
                    <Button size="sm" variant="outline" className="text-xs">
                        Open Calendar
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {courtEvents.map((event, i) => {
                const date = new Date(event.event_date);
                const daysUntil = getDaysUntil(event.event_date);
                const { label: daysLabel, urgent } = formatDaysLabel(daysUntil);
                const href = event.family_file_id
                    ? `/professional/cases/${event.family_file_id}/timeline`
                    : "/professional/calendar";

                return (
                    <Link key={event.id || i} href={href} className="group block">
                        <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 hover:shadow-sm transition-all duration-150 border border-transparent hover:border-slate-100">
                            {/* Date chip */}
                            <div className="flex flex-col items-center justify-center w-11 h-11 bg-slate-900 text-white rounded-xl shrink-0 shadow-md">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
                                    {date.toLocaleDateString("en-US", { month: "short" })}
                                </span>
                                <span className="text-lg font-bold leading-tight">
                                    {date.getDate()}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[var(--portal-primary)] transition-colors flex items-center gap-1.5">
                                    <Gavel className="h-3 w-3 text-slate-400 shrink-0" />
                                    {event.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span
                                        className={`text-[10px] font-semibold ${urgent ? "text-rose-600" : "text-slate-400"
                                            }`}
                                    >
                                        {daysLabel}
                                    </span>
                                    {event.start_time && (
                                        <span className="text-[10px] text-slate-400">
                                            · {event.start_time}
                                        </span>
                                    )}
                                    {event.is_mandatory && (
                                        <Badge className="text-[9px] px-1.5 py-0 bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-0.5">
                                            <AlertTriangle className="h-2.5 w-2.5" />
                                            Req.
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-[var(--portal-primary)] transition-colors shrink-0" />
                        </div>
                    </Link>
                );
            })}

            <Link href="/professional/calendar" className="block mt-1">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-slate-400 hover:text-slate-600"
                >
                    View Full Calendar
                    <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
            </Link>
        </div>
    );
}
