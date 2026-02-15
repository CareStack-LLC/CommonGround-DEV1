"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Link2,
    Copy,
    CheckCircle2,
    Clock,
    XCircle,
    Send,
    Plus,
    ExternalLink,
    BarChart3,
    Loader2,
    RefreshCw,
    Trash2,
    Mail,
    Eye,
    TrendingUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useProfessionalAuth } from "../../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ───────────────────────────────────────────────────────
interface IntakeLink {
    id: string;
    client_name: string;
    client_email: string;
    intake_type: string;
    status: string;
    access_token: string;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    expires_at: string | null;
    message_count: number;
}

interface IntakeStats {
    total: number;
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
    completion_rate: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: {
        label: "Pending",
        color: "bg-amber-50 text-amber-700 border-amber-200",
        icon: <Clock className="h-3.5 w-3.5" />,
    },
    active: {
        label: "In Progress",
        color: "bg-blue-50 text-blue-700 border-blue-200",
        icon: <Eye className="h-3.5 w-3.5" />,
    },
    completed: {
        label: "Completed",
        color: "bg-green-50 text-green-700 border-green-200",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    reviewed: {
        label: "Reviewed",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    cancelled: {
        label: "Cancelled",
        color: "bg-slate-50 text-slate-600 border-slate-200",
        icon: <XCircle className="h-3.5 w-3.5" />,
    },
    expired: {
        label: "Expired",
        color: "bg-red-50 text-red-600 border-red-200",
        icon: <XCircle className="h-3.5 w-3.5" />,
    },
};

// ─── Page Component ──────────────────────────────────────────────
export default function IntakeLinkTrackingPage() {
    const { token, profile, isLoading: authLoading } = useProfessionalAuth();

    const [links, setLinks] = useState<IntakeLink[]>([]);
    const [stats, setStats] = useState<IntakeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // New link form
    const [showNewForm, setShowNewForm] = useState(false);
    const [newClientName, setNewClientName] = useState("");
    const [newClientEmail, setNewClientEmail] = useState("");
    const [newIntakeType, setNewIntakeType] = useState("standard_custody");
    const [creating, setCreating] = useState(false);

    const fetchLinks = useCallback(async () => {
        if (!token) return;
        try {
            const params = new URLSearchParams();
            if (statusFilter !== "all") params.set("status", statusFilter);
            params.set("limit", "100");

            const res = await fetch(
                `${API_BASE}/api/v1/professional/intake/sessions?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setLinks(Array.isArray(data) ? data : data.sessions || []);
            }
        } catch (err) {
            console.error("Error fetching links:", err);
        }
    }, [token, statusFilter]);

    const fetchStats = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/intake/stats`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error("Error fetching stats:", err);
        }
    }, [token]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchLinks(), fetchStats()]);
            setLoading(false);
        };
        load();
    }, [fetchLinks, fetchStats]);

    const createLink = async () => {
        if (!token || !newClientName.trim() || !newClientEmail.trim()) return;
        setCreating(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/intake/sessions`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    client_name: newClientName.trim(),
                    client_email: newClientEmail.trim(),
                    intake_type: newIntakeType,
                }),
            });
            if (res.ok) {
                setShowNewForm(false);
                setNewClientName("");
                setNewClientEmail("");
                setNewIntakeType("standard_custody");
                await Promise.all([fetchLinks(), fetchStats()]);
            }
        } catch (err) {
            console.error("Error creating link:", err);
        } finally {
            setCreating(false);
        }
    };

    const resendLink = async (sessionId: string) => {
        if (!token) return;
        try {
            await fetch(`${API_BASE}/api/v1/professional/intake/sessions/${sessionId}/resend`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            await fetchLinks();
        } catch (err) {
            console.error("Error resending link:", err);
        }
    };

    const cancelLink = async (sessionId: string) => {
        if (!token) return;
        try {
            await fetch(`${API_BASE}/api/v1/professional/intake/sessions/${sessionId}/cancel`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            await Promise.all([fetchLinks(), fetchStats()]);
        } catch (err) {
            console.error("Error cancelling link:", err);
        }
    };

    const copyToClipboard = (link: IntakeLink) => {
        const url = `${window.location.origin}/intake/${link.access_token}`;
        navigator.clipboard.writeText(url);
        setCopiedId(link.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const formatRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const daysUntilExpiry = (expiresAt: string | null) => {
        if (!expiresAt) return null;
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const completionRate = stats
        ? stats.total > 0
            ? Math.round(((stats.completed + (stats as any).reviewed || 0) / stats.total) * 100)
            : 0
        : 0;

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/professional/intake">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Intake Link Tracking</h1>
                        <p className="text-muted-foreground">
                            Generate, track, and manage intake session links
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            fetchLinks();
                            fetchStats();
                        }}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={() => setShowNewForm(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Generate Link
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Total Sent</p>
                            <p className="text-2xl font-bold">{stats.total}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Pending</p>
                            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">In Progress</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Completed</p>
                            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs text-muted-foreground">Completion Rate</p>
                                <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
                            </div>
                            <p className="text-2xl font-bold text-indigo-600">{completionRate}%</p>
                            <Progress value={completionRate} className="h-1.5 mt-1" />
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* New Link Form */}
            {showNewForm && (
                <Card className="mb-6 border-indigo-200 bg-gradient-to-r from-indigo-50/30 to-purple-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-indigo-600" />
                            Generate New Intake Link
                        </CardTitle>
                        <CardDescription>
                            Create a unique link to send to your client for their ARIA intake session
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label className="text-sm">Client Name</Label>
                                <Input
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                    placeholder="Jane Smith"
                                    className="mt-1.5 bg-white"
                                />
                            </div>
                            <div>
                                <Label className="text-sm">Client Email</Label>
                                <Input
                                    value={newClientEmail}
                                    onChange={(e) => setNewClientEmail(e.target.value)}
                                    placeholder="jane@example.com"
                                    className="mt-1.5 bg-white"
                                    type="email"
                                />
                            </div>
                            <div>
                                <Label className="text-sm">Intake Type</Label>
                                <Select value={newIntakeType} onValueChange={setNewIntakeType}>
                                    <SelectTrigger className="mt-1.5 bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="standard_custody">Standard 17-Section</SelectItem>
                                        <SelectItem value="custom">Custom Questionnaire</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <Button
                                onClick={createLink}
                                disabled={creating || !newClientName.trim() || !newClientEmail.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {creating ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4 mr-2" />
                                )}
                                {creating ? "Creating..." : "Generate & Send"}
                            </Button>
                            <Button variant="ghost" onClick={() => setShowNewForm(false)}>
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filter Row */}
            <div className="flex items-center gap-2 mb-4">
                <p className="text-sm font-medium text-muted-foreground">Filter:</p>
                {["all", "pending", "active", "completed", "cancelled"].map((s) => (
                    <Button
                        key={s}
                        variant={statusFilter === s ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter(s)}
                        className={
                            statusFilter === s
                                ? "bg-indigo-600 text-white"
                                : "text-muted-foreground"
                        }
                    >
                        {s === "all" ? "All" : STATUS_CONFIG[s]?.label || s}
                    </Button>
                ))}
            </div>

            {/* Link List */}
            {links.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No intake links yet</h3>
                        <p className="text-muted-foreground mb-4">
                            Generate your first intake link to start collecting client information through ARIA.
                        </p>
                        <Button onClick={() => setShowNewForm(true)} variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Generate First Link
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {links.map((link) => {
                        const statusCfg = STATUS_CONFIG[link.status] || STATUS_CONFIG.pending;
                        const expiryDays = daysUntilExpiry(link.expires_at);
                        const isExpired = expiryDays !== null && expiryDays <= 0;

                        return (
                            <Card
                                key={link.id}
                                className={`hover:shadow-sm transition-shadow ${isExpired ? "opacity-60" : ""
                                    }`}
                            >
                                <CardContent className="py-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex-shrink-0">
                                                <Badge
                                                    variant="outline"
                                                    className={`${statusCfg.color} border gap-1`}
                                                >
                                                    {statusCfg.icon}
                                                    {statusCfg.label}
                                                </Badge>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-sm truncate">
                                                        {link.client_name}
                                                    </p>
                                                    <span className="text-xs text-muted-foreground">
                                                        {link.client_email}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <span className="text-xs text-muted-foreground">
                                                        Sent {formatRelativeTime(link.created_at)}
                                                    </span>
                                                    {link.message_count > 0 && (
                                                        <span className="text-xs text-blue-600">
                                                            {link.message_count} messages
                                                        </span>
                                                    )}
                                                    {link.completed_at && (
                                                        <span className="text-xs text-green-600">
                                                            Completed {formatRelativeTime(link.completed_at)}
                                                        </span>
                                                    )}
                                                    {expiryDays !== null && !isExpired && expiryDays <= 3 && (
                                                        <span className="text-xs text-amber-600">
                                                            Expires in {expiryDays}d
                                                        </span>
                                                    )}
                                                    {isExpired && (
                                                        <span className="text-xs text-red-600">Expired</span>
                                                    )}
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {link.intake_type === "standard_custody"
                                                            ? "Standard"
                                                            : "Custom"}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {/* Copy link */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => copyToClipboard(link)}
                                                title="Copy link"
                                            >
                                                {copiedId === link.id ? (
                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>

                                            {/* Resend */}
                                            {(link.status === "pending" || isExpired) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => resendLink(link.id)}
                                                    title="Resend link"
                                                >
                                                    <Send className="h-4 w-4" />
                                                </Button>
                                            )}

                                            {/* View session */}
                                            <Link href={`/professional/intake/${link.id}`}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    title="View session"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </Link>

                                            {/* Cancel */}
                                            {link.status === "pending" && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-400 hover:text-red-600"
                                                    onClick={() => cancelLink(link.id)}
                                                    title="Cancel"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
