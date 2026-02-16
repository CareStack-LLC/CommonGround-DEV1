"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Inbox,
    UserPlus,
    Clock,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    Filter,
    Search,
    Loader2,
    RefreshCw,
    Users,
    FileText,
    Calendar,
    MapPin,
    Lock,
    ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
interface QueueItem {
    id: string;
    family_file_id: string;
    family_file_number: string | null;
    family_file_title: string | null;
    state: string | null;
    county: string | null;
    children_count: number;
    parent_a_name: string | null;
    parent_b_name: string | null;
    status: string;
    created_at: string;
    expires_at: string | null;
    assigned_to_id: string | null;
    assigned_to_name: string | null;
    urgency: "normal" | "high" | "urgent";
}

interface TeamMember {
    id: string;
    professional_id: string;
    display_name: string;
    role: string;
    active_cases: number;
    specializations: string[];
}

// ─── Page Component ──────────────────────────────────────────────
export default function CaseQueuePage() {
    const { token, activeFirm, isLoading: authLoading } = useProfessionalAuth();

    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [urgencyFilter, setUrgencyFilter] = useState("all");
    const [assigning, setAssigning] = useState<string | null>(null);
    const [selectedMember, setSelectedMember] = useState<Record<string, string>>({});

    const fetchQueue = useCallback(async () => {
        if (!token || !activeFirm) return;
        try {
            const params = new URLSearchParams({ status: "pending" });
            const res = await fetch(
                `${API_BASE}/api/v1/professional/firms/${activeFirm.id}/invitations?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                const items: QueueItem[] = (Array.isArray(data) ? data : data.invitations || []).map(
                    (inv: any) => ({
                        ...inv,
                        urgency: getUrgency(inv),
                    })
                );
                setQueue(items);
            }
        } catch (err) {
            console.error("Error fetching queue:", err);
        }
    }, [token, activeFirm]);

    const fetchTeam = useCallback(async () => {
        if (!token || !activeFirm) return;
        try {
            const res = await fetch(
                `${API_BASE}/api/v1/professional/firms/${activeFirm.id}/members`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                const members = (Array.isArray(data) ? data : data.members || [])
                    .filter((m: any) => m.status === "active")
                    .map((m: any) => ({
                        id: m.id,
                        professional_id: m.professional_id,
                        display_name:
                            m.user_first_name && m.user_last_name
                                ? `${m.user_first_name} ${m.user_last_name}`
                                : m.user_email || "Unknown",
                        role: m.role,
                        active_cases: m.active_cases || 0,
                        specializations: m.specializations || [],
                    }));
                setTeamMembers(members);
            }
        } catch (err) {
            console.error("Error fetching team:", err);
        }
    }, [token, activeFirm]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchQueue(), fetchTeam()]);
            setLoading(false);
        };
        load();
    }, [fetchQueue, fetchTeam]);

    const getUrgency = (inv: any): "normal" | "high" | "urgent" => {
        if (!inv.expires_at) return "normal";
        const daysLeft = Math.ceil(
            (new Date(inv.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft <= 1) return "urgent";
        if (daysLeft <= 3) return "high";
        return "normal";
    };

    const handleAssign = async (invitationId: string) => {
        const memberId = selectedMember[invitationId];
        if (!token || !activeFirm || !memberId) return;

        setAssigning(invitationId);
        try {
            const member = teamMembers.find((m) => m.id === memberId);
            const res = await fetch(
                `${API_BASE}/api/v1/professional/firms/${activeFirm.id}/invitations/${invitationId}/accept`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        professional_id: member?.professional_id,
                    }),
                }
            );
            if (res.ok) {
                await fetchQueue();
            }
        } catch (err) {
            console.error("Error assigning case:", err);
        } finally {
            setAssigning(null);
        }
    };

    const urgencyConfig = {
        normal: { label: "Normal", color: "bg-slate-100 text-slate-600", icon: null },
        high: {
            label: "High",
            color: "bg-amber-100 text-amber-700",
            icon: <Clock className="h-3.5 w-3.5" />,
        },
        urgent: {
            label: "Urgent",
            color: "bg-red-100 text-red-700",
            icon: <AlertTriangle className="h-3.5 w-3.5" />,
        },
    };

    // Filter
    const filteredQueue = queue.filter((item) => {
        if (urgencyFilter !== "all" && item.urgency !== urgencyFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            return (
                (item.family_file_title || "").toLowerCase().includes(q) ||
                (item.parent_a_name || "").toLowerCase().includes(q) ||
                (item.parent_b_name || "").toLowerCase().includes(q) ||
                (item.family_file_number || "").toLowerCase().includes(q)
            );
        }
        return true;
    });

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Tier gate: Small Firm+
    if (!activeFirm) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <Link href="/professional/firm">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">Case Queue</h1>
                </div>
                <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50">
                    <CardContent className="py-12 text-center">
                        <Lock className="h-12 w-12 mx-auto text-amber-500 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Firm Required</h3>
                        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                            The Case Queue & Dispatcher is available for Small Firm tier and above.
                            Create or join a firm to access this feature.
                        </p>
                        <Link href="/professional/firm">
                            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                Go to Firm Settings
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/professional/firm">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Case Queue</h1>
                        <p className="text-muted-foreground">
                            {activeFirm.name} — Assign incoming cases to team members
                        </p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={fetchQueue}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <Card>
                    <CardContent className="pt-4 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Inbox className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">In Queue</p>
                            <p className="text-xl font-bold">{queue.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Urgent</p>
                            <p className="text-xl font-bold text-red-600">
                                {queue.filter((q) => q.urgency === "urgent").length}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Users className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Available Team</p>
                            <p className="text-xl font-bold">{teamMembers.length}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search cases..."
                        className="pl-9"
                    />
                </div>
                <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                        <Filter className="h-3.5 w-3.5 mr-1.5" />
                        <SelectValue placeholder="Urgency" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Urgency</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Queue */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : filteredQueue.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                        <h3 className="text-lg font-medium mb-2">Queue is clear</h3>
                        <p className="text-muted-foreground">
                            {queue.length === 0
                                ? "No pending cases to assign."
                                : "No cases match your current filters."}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredQueue
                        .sort((a, b) => {
                            const urgencyOrder = { urgent: 0, high: 1, normal: 2 };
                            return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
                        })
                        .map((item) => {
                            const urg = urgencyConfig[item.urgency];
                            const daysLeft = item.expires_at
                                ? Math.ceil(
                                    (new Date(item.expires_at).getTime() - Date.now()) /
                                    (1000 * 60 * 60 * 24)
                                )
                                : null;

                            return (
                                <Card
                                    key={item.id}
                                    className={`border-l-4 ${item.urgency === "urgent"
                                        ? "border-l-red-500"
                                        : item.urgency === "high"
                                            ? "border-l-amber-400"
                                            : "border-l-slate-200"
                                        }`}
                                >
                                    <CardContent className="py-4">
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                            {/* Case Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-medium truncate">
                                                        {item.family_file_title || `Case ${item.family_file_number || "—"}`}
                                                    </h3>
                                                    <Badge
                                                        variant="outline"
                                                        className={`${urg.color} text-xs gap-1`}
                                                    >
                                                        {urg.icon}
                                                        {urg.label}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    {item.parent_a_name && (
                                                        <span className="flex items-center gap-1">
                                                            <Users className="h-3.5 w-3.5" />
                                                            {item.parent_a_name}
                                                            {item.parent_b_name && ` & ${item.parent_b_name}`}
                                                        </span>
                                                    )}
                                                    {(item.state || item.county) && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="h-3.5 w-3.5" />
                                                            {[item.county, item.state].filter(Boolean).join(", ")}
                                                        </span>
                                                    )}
                                                    {item.children_count > 0 && (
                                                        <span>
                                                            {item.children_count} child{item.children_count !== 1 ? "ren" : ""}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {new Date(item.created_at).toLocaleDateString()}
                                                    </span>
                                                    {daysLeft !== null && (
                                                        <span
                                                            className={
                                                                daysLeft <= 1
                                                                    ? "text-red-600 font-medium"
                                                                    : daysLeft <= 3
                                                                        ? "text-amber-600"
                                                                        : ""
                                                            }
                                                        >
                                                            {daysLeft <= 0
                                                                ? "Expiring today"
                                                                : `${daysLeft}d to respond`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Assign Controls */}
                                            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                                                <Select
                                                    value={selectedMember[item.id] || ""}
                                                    onValueChange={(val) =>
                                                        setSelectedMember((prev) => ({ ...prev, [item.id]: val }))
                                                    }
                                                >
                                                    <SelectTrigger className="flex-1 md:w-[180px] h-9 text-sm">
                                                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                                                        <SelectValue placeholder="Assign to..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {teamMembers.map((member) => (
                                                            <SelectItem key={member.id} value={member.id}>
                                                                <div className="flex items-center justify-between w-full">
                                                                    <span>{member.display_name}</span>
                                                                    <span className="text-xs text-muted-foreground ml-2">
                                                                        {member.active_cases} cases
                                                                    </span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <Button
                                                    size="sm"
                                                    onClick={() => handleAssign(item.id)}
                                                    disabled={!selectedMember[item.id] || assigning === item.id}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                                >
                                                    {assigning === item.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            Assign
                                                            <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                                        </>
                                                    )}
                                                </Button>
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
