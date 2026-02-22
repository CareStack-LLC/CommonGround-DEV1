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
            className={`group flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${notification.is_read
                    ? "bg-white border-slate-100"
                    : "bg-blue-50/40 border-blue-100 hover:border-blue-200"
                }`}
            onClick={handleClick}
        >
            {/* Unread dot */}
            <div className="mt-1 shrink-0 relative">
                <div className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm">
                    {TYPE_ICONS[notification.type] || TYPE_ICONS.system}
                </div>
                {!notification.is_read && (
                    <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${SEVERITY_DOT[notification.severity] || "bg-blue-500"}`} />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${notification.is_read ? "text-slate-700 font-medium" : "text-slate-900 font-semibold"}`}>
                    {notification.title}
                </p>
                {notification.body && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.body}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">{timeAgo(notification.created_at)}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {!notification.is_read && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
                        title="Mark read"
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                    >
                        <Check className="h-3.5 w-3.5" />
                    </button>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); onDismiss(notification.id); }}
                    title="Dismiss"
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
                {notification.action_url && (
                    <div className="p-1.5 text-slate-300">
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
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20">
                            <Bell className="h-6 w-6" />
                        </div>
                        Notifications
                        {unreadCount > 0 && (
                            <Badge className="bg-blue-600 text-white text-xs">{unreadCount} new</Badge>
                        )}
                    </h1>
                    <p className="text-slate-500 mt-1">Your activity history and alerts</p>
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5 text-xs border-slate-200">
                            <CheckCheck className="h-3.5 w-3.5" />
                            Mark All Read
                        </Button>
                    )}
                    <Link href="/professional/notifications/preferences">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs border-slate-200">
                            <Settings className="h-3.5 w-3.5" />
                            Preferences
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <Card className="border-slate-200">
                <CardContent className="py-3">
                    <div className="flex gap-3 flex-wrap">
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-44 h-8 text-xs border-slate-200">
                                <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
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
                            <SelectTrigger className="w-36 h-8 text-xs border-slate-200">
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
                <Card className="border-dashed border-slate-200 bg-slate-50/50">
                    <CardContent className="py-16 text-center">
                        <Bell className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500 font-medium">No notifications</p>
                        <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {GROUP_ORDER.filter(g => grouped[g]?.length > 0).map(group => (
                        <div key={group}>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">{group}</h3>
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
        </div>
    );
}
