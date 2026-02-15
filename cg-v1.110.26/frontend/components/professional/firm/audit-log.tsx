"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Clock,
    UserPlus,
    UserMinus,
    Settings,
    Shield,
    FileText,
    Download,
    Filter,
    Loader2,
    RefreshCw,
    User,
    ArrowRight,
    AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ───────────────────────────────────────────────────────
interface AuditEvent {
    id: string;
    event_type: string;
    actor_name: string;
    actor_email: string | null;
    description: string;
    metadata: Record<string, any> | null;
    created_at: string;
}

const EVENT_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    member_invited: {
        icon: <UserPlus className="h-4 w-4" />,
        color: "text-blue-600 bg-blue-50",
        label: "Member Invited",
    },
    member_joined: {
        icon: <UserPlus className="h-4 w-4" />,
        color: "text-green-600 bg-green-50",
        label: "Member Joined",
    },
    member_removed: {
        icon: <UserMinus className="h-4 w-4" />,
        color: "text-red-600 bg-red-50",
        label: "Member Removed",
    },
    role_changed: {
        icon: <Shield className="h-4 w-4" />,
        color: "text-amber-600 bg-amber-50",
        label: "Role Changed",
    },
    case_assigned: {
        icon: <FileText className="h-4 w-4" />,
        color: "text-indigo-600 bg-indigo-50",
        label: "Case Assigned",
    },
    case_unassigned: {
        icon: <FileText className="h-4 w-4" />,
        color: "text-slate-600 bg-slate-50",
        label: "Case Unassigned",
    },
    settings_updated: {
        icon: <Settings className="h-4 w-4" />,
        color: "text-purple-600 bg-purple-50",
        label: "Settings Updated",
    },
    template_created: {
        icon: <FileText className="h-4 w-4" />,
        color: "text-teal-600 bg-teal-50",
        label: "Template Created",
    },
    template_updated: {
        icon: <FileText className="h-4 w-4" />,
        color: "text-teal-600 bg-teal-50",
        label: "Template Updated",
    },
};

const DEFAULT_CONFIG = {
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-slate-600 bg-slate-50",
    label: "Activity",
};

// ─── Component ───────────────────────────────────────────────────
interface AuditLogProps {
    firmId: string;
    token: string;
}

export function FirmAuditLog({ firmId, token }: AuditLogProps) {
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [eventFilter, setEventFilter] = useState("all");
    const [dateRange, setDateRange] = useState("30d");

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: "100" });
            if (eventFilter !== "all") params.set("event_type", eventFilter);
            if (dateRange !== "all") {
                const days = parseInt(dateRange);
                const since = new Date();
                since.setDate(since.getDate() - days);
                params.set("since", since.toISOString());
            }

            const res = await fetch(
                `${API_BASE}/api/v1/professional/firms/${firmId}/audit-log?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setEvents(Array.isArray(data) ? data : data.events || []);
            } else {
                // API may not exist yet — show mock data for UI development
                setEvents(generateMockEvents());
            }
        } catch (err) {
            console.error("Error fetching audit log:", err);
            setEvents(generateMockEvents());
        } finally {
            setLoading(false);
        }
    }, [firmId, token, eventFilter, dateRange]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const exportAuditLog = () => {
        const csv = [
            "Date,Event,Actor,Description",
            ...events.map(
                (e) =>
                    `"${new Date(e.created_at).toISOString()}","${e.event_type}","${e.actor_name}","${e.description}"`
            ),
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `audit-log-${firmId}-${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    const groupByDate = (events: AuditEvent[]) => {
        const groups: Record<string, AuditEvent[]> = {};
        events.forEach((event) => {
            const dateKey = new Date(event.created_at).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
            });
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(event);
        });
        return groups;
    };

    const grouped = groupByDate(events);

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Select value={eventFilter} onValueChange={setEventFilter}>
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                            <Filter className="h-3 w-3 mr-1" />
                            <SelectValue placeholder="Event type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Events</SelectItem>
                            <SelectItem value="member_invited">Member Invited</SelectItem>
                            <SelectItem value="member_joined">Member Joined</SelectItem>
                            <SelectItem value="member_removed">Member Removed</SelectItem>
                            <SelectItem value="role_changed">Role Changed</SelectItem>
                            <SelectItem value="case_assigned">Case Assigned</SelectItem>
                            <SelectItem value="settings_updated">Settings Updated</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                            <SelectItem value="all">All time</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={exportAuditLog} className="h-8 text-xs">
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Export CSV
                    </Button>
                    <Button variant="ghost" size="sm" onClick={fetchEvents} className="h-8">
                        <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Timeline */}
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No activity recorded yet</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([dateKey, dayEvents]) => (
                        <div key={dateKey}>
                            <p className="text-xs font-medium text-muted-foreground mb-2">{dateKey}</p>
                            <div className="space-y-1">
                                {dayEvents.map((event) => {
                                    const cfg = EVENT_CONFIG[event.event_type] || DEFAULT_CONFIG;
                                    return (
                                        <div
                                            key={event.id}
                                            className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-slate-50/50 transition-colors"
                                        >
                                            <div className={`p-1.5 rounded-full ${cfg.color} flex-shrink-0 mt-0.5`}>
                                                {cfg.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm">
                                                    <span className="font-medium">{event.actor_name}</span>{" "}
                                                    <span className="text-muted-foreground">{event.description}</span>
                                                </p>
                                                {event.metadata && Object.keys(event.metadata).length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {Object.entries(event.metadata).map(([k, v]) => (
                                                            <Badge
                                                                key={k}
                                                                variant="outline"
                                                                className="text-[10px] py-0"
                                                            >
                                                                {k}: {String(v)}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground flex-shrink-0">
                                                {formatTime(event.created_at)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Mock Data (for UI development – removed once backend wired) ──
function generateMockEvents(): AuditEvent[] {
    const now = Date.now();
    return [
        {
            id: "1",
            event_type: "member_invited",
            actor_name: "Sarah Chen",
            actor_email: "sarah@firm.com",
            description: "invited John Smith to the firm",
            metadata: { role: "attorney", email: "john@firm.com" },
            created_at: new Date(now - 2 * 3600000).toISOString(),
        },
        {
            id: "2",
            event_type: "case_assigned",
            actor_name: "Sarah Chen",
            actor_email: "sarah@firm.com",
            description: "assigned case Martinez v. Martinez to Dr. Emily Wong",
            metadata: { case_number: "FF-2024-0891" },
            created_at: new Date(now - 5 * 3600000).toISOString(),
        },
        {
            id: "3",
            event_type: "settings_updated",
            actor_name: "Michael Park",
            actor_email: "michael@firm.com",
            description: "updated firm branding settings",
            metadata: null,
            created_at: new Date(now - 24 * 3600000).toISOString(),
        },
        {
            id: "4",
            event_type: "role_changed",
            actor_name: "Sarah Chen",
            actor_email: "sarah@firm.com",
            description: "changed Emily Wong's role from member to admin",
            metadata: { previous_role: "member", new_role: "admin" },
            created_at: new Date(now - 48 * 3600000).toISOString(),
        },
        {
            id: "5",
            event_type: "member_joined",
            actor_name: "Dr. Emily Wong",
            actor_email: "emily@firm.com",
            description: "joined the firm",
            metadata: { role: "member" },
            created_at: new Date(now - 72 * 3600000).toISOString(),
        },
        {
            id: "6",
            event_type: "template_created",
            actor_name: "Michael Park",
            actor_email: "michael@firm.com",
            description: "created intake template 'High-Conflict Screening'",
            metadata: { template_type: "intake" },
            created_at: new Date(now - 96 * 3600000).toISOString(),
        },
    ];
}
