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
    Scale,
    Gavel,
    FileText,
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
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');
                .serif { font-family: 'Crimson Pro', serif; }
                .sans { font-family: 'Outfit', sans-serif; }
            `}</style>

            {/* Header */}
            <div className="pb-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Intake Center
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Manage invitations and client onboarding
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-md bg-slate-100/80 rounded-xl p-1">
                    <TabsTrigger
                        value="invitations"
                        className="relative text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-foreground rounded-lg"
                    >
                        <Scale className="h-4 w-4 mr-2" />
                        Invitations
                        {pendingInvitations.length > 0 && (
                            <Badge className="ml-2 bg-cg-sage text-white px-1.5 py-0 text-[10px] min-w-[20px]">
                                {pendingInvitations.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger
                        value="aria"
                        className="text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-foreground rounded-lg"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        ARIA Sessions
                    </TabsTrigger>
                </TabsList>

                {/* Case Invitations Tab */}
                <TabsContent value="invitations" className="space-y-4">
                    <div className="flex items-center justify-between pb-3">
                        <div>
                            <p className="text-sm text-slate-500">
                                Review and accept invitations from families seeking representation
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchInvitations}
                            disabled={invitationsLoading}
                            className="border-slate-200 hover:bg-background rounded-xl h-9"
                        >
                            <RefreshCw className={`h-4 w-4 ${invitationsLoading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>

                    {invitationsLoading ? (
                        <div className="flex items-center justify-center min-h-[40vh]">
                            <Loader2 className="h-8 w-8 animate-spin text-cg-sage" />
                        </div>
                    ) : pendingInvitations.length === 0 ? (
                        <Card className="border border-dashed border-slate-200 bg-white rounded-2xl">
                            <CardContent className="py-20 flex flex-col items-center justify-center text-center">
                                <div className="p-4 bg-background rounded-2xl mb-5">
                                    <Bell className="h-10 w-10 text-cg-sage" />
                                </div>
                                <p className="text-lg font-semibold text-slate-900 mb-1.5">No Pending Invitations</p>
                                <p className="text-sm text-slate-500 max-w-sm">
                                    Invitations will appear here when families request your representation
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
                    <div className="flex items-center justify-between pb-3">
                        <div>
                            <p className="text-sm text-slate-500">
                                Generate, track, and manage ARIA intake sessions
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button aria-label="Refresh"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    fetchLinks();
                                    fetchStats();
                                }}
                                className="border-slate-200 hover:bg-background rounded-xl h-9"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                                onClick={() => router.push("/professional/intake/new")}
                                className="bg-cg-sage hover:bg-cg-sage-dark text-white rounded-xl shadow-sm font-semibold"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                New ARIA Intake
                            </Button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                    <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl">
                        <CardContent className="pt-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Sent</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
                        </CardContent>
                    </Card>
                    <Card className="border border-cg-amber-tint bg-cg-amber-subtle/50 shadow-sm rounded-2xl">
                        <CardContent className="pt-4">
                            <p className="text-xs font-semibold text-cg-amber-dark/70 uppercase tracking-wide">Pending</p>
                            <p className="text-2xl font-bold text-cg-amber-deep mt-1">{stats.pending}</p>
                        </CardContent>
                    </Card>
                    <Card className="border border-blue-200 bg-blue-50/50 shadow-sm rounded-2xl">
                        <CardContent className="pt-4">
                            <p className="text-xs font-semibold text-blue-600/70 uppercase tracking-wide">In Progress</p>
                            <p className="text-2xl font-bold text-blue-700 mt-1">{stats.active}</p>
                        </CardContent>
                    </Card>
                    <Card className="border border-cg-sage-tint bg-cg-sage-subtle/50 shadow-sm rounded-2xl">
                        <CardContent className="pt-4">
                            <p className="text-xs font-semibold text-cg-sage-dark/70 uppercase tracking-wide">Completed</p>
                            <p className="text-2xl font-bold text-cg-sage-dark mt-1">{stats.completed}</p>
                        </CardContent>
                    </Card>
                    <Card className="border border-cg-sage/20 bg-background/50 shadow-sm rounded-2xl">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Completion</p>
                                <TrendingUp className="h-3.5 w-3.5 text-cg-sage" />
                            </div>
                            <p className="text-2xl font-bold text-foreground mt-1">{completionRate}%</p>
                            <Progress value={completionRate} className="h-1.5 mt-1 bg-slate-200" />
                        </CardContent>
                    </Card>
                    </div>
                    )}

                    {/* Filter Row */}
            <div className="flex items-center gap-2 mb-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mr-1">Filter:</p>
                {["all", "pending", "active", "completed", "cancelled"].map((s) => (
                    <Button
                        key={s}
                        variant={statusFilter === s ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter(s)}
                        className={
                            statusFilter === s
                                ? "bg-foreground text-white rounded-lg shadow-sm text-xs"
                                : "border-slate-200 text-slate-600 hover:bg-background rounded-lg text-xs"
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
