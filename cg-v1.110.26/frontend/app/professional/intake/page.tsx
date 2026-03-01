"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Plus,
    Loader2,
    RefreshCw,
    TrendingUp,
    Bot,
    Shield,
    Bell,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useProfessionalAuth } from "../layout";
import { CustodyIntakeTable, IntakeSession } from "@/components/professional/intake/custody-intake-table";
import { InvitationSummaryAlert } from "@/components/professional/invitation-summary-alert";
import { AssignProfessionalDialog } from "@/components/professional/assign-professional-dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface IntakeStats {
    total: number;
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
    completion_rate: number;
}

export default function IntakePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token, profile, isLoading: authLoading, activeFirm } = useProfessionalAuth();

    const [links, setLinks] = useState<IntakeSession[]>([]);
    const [stats, setStats] = useState<IntakeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");

    const [invitations, setInvitations] = useState<any[]>([]);
    const [invitationsLoading, setInvitationsLoading] = useState(false);
    const [selectedInvitation, setSelectedInvitation] = useState<any>(null);
    const [showAssignDialog, setShowAssignDialog] = useState(false);

    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "aria");

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
                const items = Array.isArray(data) ? data : data.items || [];
                // Map backend field names to what the table expects if necessary
                const mappedItems = items.map((item: any) => ({
                    ...item,
                    expires_at: item.access_link_expires_at
                }));
                setLinks(mappedItems);
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

    const fetchInvitations = useCallback(async () => {
        if (!token || !activeFirm) return;
        setInvitationsLoading(true);
        try {
            const res = await fetch(
                `${API_BASE}/api/v1/professional/firms/${activeFirm.id}/invitations`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setInvitations(data.items || []);
            }
        } catch (err) {
            console.error("Error fetching invitations:", err);
        } finally {
            setInvitationsLoading(false);
        }
    }, [token, activeFirm]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchLinks(), fetchStats()]);
            setLoading(false);
        };
        load();
    }, [fetchLinks, fetchStats]);

    useEffect(() => {
        if (activeTab === "invitations") {
            fetchInvitations();
        }
    }, [activeTab, fetchInvitations]);



    const handleAcceptInvitation = (invitation: any) => {
        setSelectedInvitation(invitation);
        setShowAssignDialog(true);
    };

    const handleAssignProfessional = async (professionalId: string) => {
        if (!token || !selectedInvitation || !activeFirm) return;

        try {
            const response = await fetch(
                `${API_BASE}/api/v1/professional/firms/${activeFirm.id}/invitations/${selectedInvitation.id}/accept`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ assigned_professional_id: professionalId }),
                }
            );

            if (response.ok) {
                setShowAssignDialog(false);
                setSelectedInvitation(null);
                fetchInvitations();
            }
        } catch (error) {
            console.error("Error accepting invitation:", error);
        }
    };

    const handleDeclineInvitation = async (invitationId: string) => {
        if (!token || !activeFirm) return;

        try {
            const response = await fetch(
                `${API_BASE}/api/v1/professional/firms/${activeFirm.id}/invitations/${invitationId}/decline`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                fetchInvitations();
            }
        } catch (error) {
            console.error("Error declining invitation:", error);
        }
    };

    const completionRate = stats
        ? stats.total > 0
            ? Math.round(((stats.completed + (stats as any).reviewed || 0) / stats.total) * 100)
            : 0
        : 0;

    const pendingInvitations = invitations.filter(inv => inv.status === "pending");

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg shadow-purple-500/20">
                            <Bot className="h-6 w-6" />
                        </div>
                        Intake Center
                    </h1>
                    <p className="text-slate-500 mt-1.5 ml-[60px]">
                        Manage case invitations and ARIA-assisted intake sessions
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="invitations" className="relative">
                        <Shield className="h-4 w-4 mr-2" />
                        Case Invitations
                        {pendingInvitations.length > 0 && (
                            <Badge className="ml-2 bg-emerald-600 text-white px-1.5 py-0 text-[10px] min-w-[20px]">
                                {pendingInvitations.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="aria">
                        <Bot className="h-4 w-4 mr-2" />
                        ARIA Sessions
                    </TabsTrigger>
                </TabsList>

                {/* Case Invitations Tab */}
                <TabsContent value="invitations" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-600">
                            Review and accept case invitations from parents seeking representation
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchInvitations}
                            disabled={invitationsLoading}
                        >
                            <RefreshCw className={`h-4 w-4 ${invitationsLoading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>

                    {invitationsLoading ? (
                        <div className="flex items-center justify-center min-h-[40vh]">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : pendingInvitations.length === 0 ? (
                        <Card className="border-dashed border-slate-200 bg-slate-50">
                            <CardContent className="py-16 text-center">
                                <Bell className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                                <p className="text-slate-500 font-medium">No pending invitations</p>
                                <p className="text-sm text-slate-400 mt-1">
                                    Case invitations will appear here when parents request representation
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6">
                            {pendingInvitations.map((invitation) => (
                                <InvitationSummaryAlert
                                    key={invitation.id}
                                    invitationId={invitation.id}
                                    firmId={activeFirm?.id || ""}
                                    token={token}
                                    onAccept={() => handleAcceptInvitation(invitation)}
                                    onDecline={() => handleDeclineInvitation(invitation.id)}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ARIA Sessions Tab */}
                <TabsContent value="aria" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-600">
                            Generate, track, and manage AI-assisted intake sessions
                        </p>
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
                                onClick={() => router.push("/professional/intake/new")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                New ARIA Intake
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
                        {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </Button>
                ))}
            </div>

                    {/* Data Table */}
                    <CustodyIntakeTable
                        data={links}
                        isLoading={loading}
                        onRefresh={fetchLinks}
                    />
                </TabsContent>
            </Tabs>

            {/* Assign Professional Dialog */}
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                <DialogContent>
                    <AssignProfessionalDialog
                        token={token}
                        firmId={activeFirm?.id || ""}
                        invitationId={selectedInvitation?.id || ""}
                        onAccept={handleAssignProfessional}
                        isAccepting={false}
                        onCancel={() => setShowAssignDialog(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
