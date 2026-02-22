"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    ArrowLeft, Mail, Bell, Smartphone, MessageSquare,
    Moon, Save, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useProfessionalAuth } from "../../layout";
import { useToast } from "@/hooks/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Channel = "email" | "in_app" | "push" | "sms";
type NotifType = "intake_pending" | "access_request" | "court_event" | "message" | "compliance" | "task_due";

interface ChannelPref { email: boolean; in_app: boolean; push: boolean; sms: boolean; }
interface Prefs {
    channel_prefs: Record<NotifType, ChannelPref>;
    quiet_hours_enabled: boolean;
    quiet_hours_start: string;
    quiet_hours_end: string;
    weekend_mode: "normal" | "urgent_only" | "off";
}

const DEFAULT_PREFS: Prefs = {
    channel_prefs: {
        intake_pending: { email: true, in_app: true, push: true, sms: false },
        access_request: { email: true, in_app: true, push: true, sms: false },
        court_event: { email: true, in_app: true, push: true, sms: true },
        message: { email: false, in_app: true, push: true, sms: false },
        compliance: { email: true, in_app: true, push: false, sms: false },
        task_due: { email: false, in_app: true, push: true, sms: false },
    },
    quiet_hours_enabled: false,
    quiet_hours_start: "22:00",
    quiet_hours_end: "07:00",
    weekend_mode: "normal",
};

const TYPE_LABELS: Record<NotifType, string> = {
    intake_pending: "New Intake Submissions",
    access_request: "Case Invitations",
    court_event: "Court Events & Hearings",
    message: "New Messages",
    compliance: "Compliance Alerts",
    task_due: "Task Due Reminders",
};

const CHANNEL_ICONS: Record<Channel, React.ReactNode> = {
    email: <Mail className="h-4 w-4" />,
    in_app: <Bell className="h-4 w-4" />,
    push: <Smartphone className="h-4 w-4" />,
    sms: <MessageSquare className="h-4 w-4" />,
};

const CHANNEL_LABELS: Record<Channel, string> = {
    email: "Email",
    in_app: "In-App",
    push: "Push",
    sms: "SMS",
};

const NOTIF_TYPES: NotifType[] = [
    "intake_pending",
    "access_request",
    "court_event",
    "message",
    "compliance",
    "task_due",
];
const CHANNELS: Channel[] = ["email", "in_app", "push", "sms"];

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function NotificationPreferencesPage() {
    const { token } = useProfessionalAuth();
    const { toast } = useToast();

    const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!token) return;
        const load = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(
                    `${API_BASE}/api/v1/professional/notifications/preferences`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (res.ok) setPrefs(await res.json());
                else setPrefs(DEFAULT_PREFS);
            } catch {
                setPrefs(DEFAULT_PREFS);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [token]);

    const toggleChannel = (type: NotifType, channel: Channel) => {
        setPrefs(p => ({
            ...p,
            channel_prefs: {
                ...p.channel_prefs,
                [type]: {
                    ...p.channel_prefs[type],
                    [channel]: !p.channel_prefs[type][channel],
                },
            },
        }));
    };

    const handleSave = async () => {
        if (!token) return;
        setIsSaving(true);
        try {
            const res = await fetch(
                `${API_BASE}/api/v1/professional/notifications/preferences`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(prefs),
                }
            );
            if (res.ok) {
                toast({ title: "Preferences saved", description: "Your notification settings have been updated." });
            } else {
                toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
            }
        } catch {
            toast({ title: "Network error", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/professional/notifications">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500 hover:text-slate-700">
                        <ArrowLeft className="h-4 w-4" />
                        Notifications
                    </Button>
                </Link>
                <span className="text-slate-300">/</span>
                <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-blue-500" />
                    Notification Preferences
                </h1>
            </div>

            {/* Channel matrix */}
            <Card className="border-slate-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Notification Channels</CardTitle>
                    <CardDescription>Choose how you receive each type of notification.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-left pb-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/2">
                                    Notification Type
                                </th>
                                {CHANNELS.map(ch => (
                                    <th key={ch} className="pb-3 px-3 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="text-slate-400">{CHANNEL_ICONS[ch]}</div>
                                            <span className="text-xs font-semibold text-slate-500">{CHANNEL_LABELS[ch]}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {NOTIF_TYPES.map(type => (
                                <tr key={type} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 pr-4 text-sm font-medium text-slate-700">
                                        {TYPE_LABELS[type]}
                                    </td>
                                    {CHANNELS.map(ch => (
                                        <td key={ch} className="py-3 px-3 text-center">
                                            <Switch
                                                checked={prefs.channel_prefs[type][ch]}
                                                onCheckedChange={() => toggleChannel(type, ch)}
                                                className="data-[state=checked]:bg-blue-600"
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* Quiet Hours */}
            <Card className="border-slate-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Moon className="h-4 w-4 text-indigo-500" />
                        Quiet Hours
                    </CardTitle>
                    <CardDescription>Suppress push & SMS notifications during specific hours.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-slate-700">Enable Quiet Hours</Label>
                        <Switch
                            checked={prefs.quiet_hours_enabled}
                            onCheckedChange={v => setPrefs(p => ({ ...p, quiet_hours_enabled: v }))}
                            className="data-[state=checked]:bg-indigo-600"
                        />
                    </div>

                    {prefs.quiet_hours_enabled && (
                        <div className="flex items-center gap-4 pl-4">
                            <div className="flex items-center gap-2">
                                <Label className="text-sm text-slate-600 w-10">From</Label>
                                <input
                                    type="time"
                                    value={prefs.quiet_hours_start}
                                    onChange={(e) => setPrefs(p => ({ ...p, quiet_hours_start: e.target.value }))}
                                    className="h-8 px-2 text-sm border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-400"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-sm text-slate-600 w-10">Until</Label>
                                <input
                                    type="time"
                                    value={prefs.quiet_hours_end}
                                    onChange={(e) => setPrefs(p => ({ ...p, quiet_hours_end: e.target.value }))}
                                    className="h-8 px-2 text-sm border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-400"
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Weekend Mode */}
            <Card className="border-slate-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Weekend Mode</CardTitle>
                    <CardDescription>Control how notifications are delivered on weekends.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Select
                        value={prefs.weekend_mode}
                        onValueChange={(v) => setPrefs(p => ({ ...p, weekend_mode: v as Prefs["weekend_mode"] }))}
                    >
                        <SelectTrigger className="w-56 border-slate-200">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="normal">Normal (all notifications)</SelectItem>
                            <SelectItem value="urgent_only">Urgent Only</SelectItem>
                            <SelectItem value="off">Off (no notifications)</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Save */}
            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Preferences"}
                </Button>
            </div>
        </div>
    );
}
