"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Bell, Check, CheckCheck, FileText, Users, Calendar, MessageSquare,
    AlertTriangle, Settings, Trash2, Filter, ChevronRight, Clock, Bot,
    Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProfessionalAuth } from "../layout";
import { useToast } from "@/hooks/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Notification {
    id: string;
    type: string;
    title: string;
    body?: string;
    action_url?: string;
    resource_type?: string;
    resource_id?: string;
    is_read: boolean;
    read_at?: string;
    severity: "info" | "warning" | "error" | "success";
    created_at: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const TYPE_ICONS: Record<string, React.ReactNode> = {
    intake_pending: <FileText className="h-4 w-4 text-amber-500" />,
    access_request: <Users className="h-4 w-4 text-blue-500" />,
    court_event: <Calendar className="h-4 w-4 text-purple-500" />,
    message: <MessageSquare className="h-4 w-4 text-emerald-500" />,
    compliance: <Shield className="h-4 w-4 text-red-500" />,
    task_due: <Clock className="h-4 w-4 text-orange-400" />,
    system: <Bot className="h-4 w-4 text-slate-400" />,
};

const SEVERITY_DOT: Record<string, string> = {
    error: "bg-red-500",
    warning: "bg-amber-400",
    success: "bg-emerald-500",
    info: "bg-blue-500",
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return "just now";
}

function dateGroup(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (d >= today) return "Today";
    if (d >= yesterday) return "Yesterday";
    if (d >= weekAgo) return "This Week";
    return "Older";
}

const GROUP_ORDER = ["Today", "Yesterday", "This Week", "Older"];

// ─────────────────────────────────────────────
// NotificationItem component
// ─────────────────────────────────────────────
function NotificationItem({
    notification,
    onMarkRead,
    onDismiss,
}: {
    notification: Notification;
    onMarkRead: (id: string) => void;
    onDismiss: (id: string) => void;
}) {
    const router = useRouter();

    const handleClick = () => {
        if (!notification.is_read) onMarkRead(notification.id);
        if (notification.action_url) router.push(notification.action_url);
    };

    return (
        <div
            className={`group flex items-start gap-3 p-4 rounded-sm border-2 transition-all cursor-pointer ${notification.is_read
                    ? "bg-gradient-to-br from-white via-amber-50/20 to-white border-amber-900/20 hover:shadow-sm"
                    : "bg-amber-50 border-amber-900/40 hover:border-amber-900/60 shadow-md"
                }`}
            onClick={handleClick}
        >
            {/* Unread dot */}
            <div className="mt-1 shrink-0 relative">
                <div className="p-2 bg-white border-2 border-amber-900/20 rounded-sm shadow-sm">
                    {TYPE_ICONS[notification.type] || TYPE_ICONS.system}
                </div>
                {!notification.is_read && (
                    <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${SEVERITY_DOT[notification.severity] || "bg-amber-500"}`} />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={`sans text-sm leading-snug ${notification.is_read ? "text-slate-700 font-medium" : "text-slate-900 font-bold"}`}>
                    {notification.title}
                </p>
                {notification.body && (
                    <p className="sans text-xs text-slate-600 mt-0.5 line-clamp-2">{notification.body}</p>
                )}
                <p className="sans text-xs text-slate-500 mt-1">{timeAgo(notification.created_at)}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {!notification.is_read && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
                        title="Mark read"
                        className="p-1.5 text-slate-400 hover:text-emerald-900 hover:bg-emerald-50 rounded-sm transition-all border-2 border-transparent hover:border-emerald-900/20"
                    >
                        <Check className="h-3.5 w-3.5" />
                    </button>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); onDismiss(notification.id); }}
                    title="Dismiss"
                    className="p-1.5 text-slate-400 hover:text-red-900 hover:bg-red-50 rounded-sm transition-all border-2 border-transparent hover:border-red-900/20"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
                {notification.action_url && (
                    <div className="p-1.5 text-amber-900/40">
                        <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function NotificationsPage() {
    const { token, profile } = useProfessionalAuth();
    const { toast } = useToast();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState("all");
    const [readFilter, setReadFilter] = useState("all");

    const fetchNotifications = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (readFilter !== "all") params.append("read", readFilter === "read" ? "true" : "false");
            if (typeFilter !== "all") params.append("type", typeFilter);
            params.append("limit", "100");

            const res = await fetch(
                `${API_BASE}/api/v1/professional/notifications?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setNotifications(Array.isArray(data) ? data : data.items || []);
            } else {
                // Graceful: show empty state if endpoint not yet wired
                setNotifications([]);
            }
        } catch {
            setNotifications([]);
        } finally {
            setIsLoading(false);
        }
    }, [token, typeFilter, readFilter]);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    const markRead = async (id: string) => {
        setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
        try {
            await fetch(`${API_BASE}/api/v1/professional/notifications/${id}/read`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch { /* optimistic update already applied */ }
    };

    const dismiss = async (id: string) => {
        setNotifications(ns => ns.filter(n => n.id !== id));
        try {
            await fetch(`${API_BASE}/api/v1/professional/notifications/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch { /* already removed from UI */ }
    };

    const markAllRead = async () => {
        setNotifications(ns => ns.map(n => ({ ...n, is_read: true })));
        try {
            await fetch(`${API_BASE}/api/v1/professional/notifications/mark-all-read`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            toast({ title: "All notifications marked as read" });
        } catch { /* optimistic applied */ }
    };

    // Group notifications
    const grouped = notifications.reduce<Record<string, Notification[]>>((acc, n) => {
        const g = dateGroup(n.created_at);
        if (!acc[g]) acc[g] = [];
        acc[g].push(n);
        return acc;
    }, {});

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            <link
                href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Outfit:wght@400;500;600;700&display=swap"
                rel="stylesheet"
            />

            {/* Header */}
            <div className="relative overflow-hidden rounded-sm bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 px-8 py-8 shadow-2xl border-2 border-amber-900/40">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-5">
                        <div className="p-4 bg-amber-50 border-2 border-amber-900/20 rounded-sm shadow-xl shrink-0">
                            <Bell className="h-8 w-8 text-amber-900" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h1 className="serif text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight flex items-center gap-3">
                                Notifications
                                {unreadCount > 0 && (
                                    <Badge className="bg-white text-amber-900 border-2 border-amber-900/20 sans text-xs font-bold">{unreadCount} new</Badge>
                                )}
                            </h1>
                            <p className="sans text-sm text-amber-100 mt-2">Your activity history and alerts</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5 text-xs border-2 border-white/30 text-white hover:bg-white/10 sans">
                                <CheckCheck className="h-3.5 w-3.5" />
                                Mark All Read
                            </Button>
                        )}
                        <Link href="/professional/notifications/preferences">
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs border-2 border-white/30 text-white hover:bg-white/10 sans">
                                <Settings className="h-3.5 w-3.5" />
                                Preferences
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/20 to-white shadow-sm">
                <CardContent className="py-3">
                    <div className="flex gap-3 flex-wrap">
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-44 h-8 sans text-xs border-2 border-slate-300">
                                <Filter className="h-3.5 w-3.5 mr-1.5 text-amber-900" />
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="intake_pending">Intake</SelectItem>
                                <SelectItem value="access_request">Case Invitations</SelectItem>
                                <SelectItem value="court_event">Court Events</SelectItem>
                                <SelectItem value="message">Messages</SelectItem>
                                <SelectItem value="compliance">Compliance</SelectItem>
                                <SelectItem value="task_due">Tasks</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={readFilter} onValueChange={setReadFilter}>
                            <SelectTrigger className="w-36 h-8 sans text-xs border-2 border-slate-300">
                                <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="unread">Unread Only</SelectItem>
                                <SelectItem value="read">Read Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Notifications list */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : notifications.length === 0 ? (
                <Card className="border-dashed border-2 border-amber-900/30 bg-gradient-to-br from-amber-50/30 to-white shadow-sm">
                    <CardContent className="py-16 text-center">
                        <Bell className="h-12 w-12 mx-auto mb-3 text-amber-900/40" />
                        <p className="serif text-slate-900 font-bold">No notifications</p>
                        <p className="sans text-xs text-slate-600 mt-1">You're all caught up!</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {GROUP_ORDER.filter(g => grouped[g]?.length > 0).map(group => (
                        <div key={group}>
                            <h3 className="sans text-xs font-bold text-amber-900/60 uppercase tracking-widest mb-2 px-1">{group}</h3>
                            <div className="space-y-2">
                                {grouped[group].map(n => (
                                    <NotificationItem
                                        key={n.id}
                                        notification={n}
                                        onMarkRead={markRead}
                                        onDismiss={dismiss}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style jsx global>{`
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
