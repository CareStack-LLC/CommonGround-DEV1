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
            <div className="relative overflow-hidden rounded-sm bg-gradient-to-br from-[#1E3A4A] via-[#2D6A8F] to-[#1E3A4A] px-8 py-8 shadow-2xl border-2 border-[#1E3A4A]/40">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#3DAA8A] via-[#D4A853] to-[#3DAA8A]" />
                <div className="flex items-start gap-5">
                    <div className="p-4 bg-[#F4F8F7] border-2 border-[#1E3A4A]/20 rounded-sm shadow-xl shrink-0">
                        <Gavel className="h-8 w-8 text-[#1E3A4A]" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="serif text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
                            Intake Center
                        </h1>
                        <p className="sans text-[#E8F4F0] mt-2 text-sm tracking-wide leading-relaxed">
                            Case Invitations & Client Intake Administration
                        </p>
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-md bg-[#F4F8F7]/50 border-2 border-[#1E3A4A]/10 p-1">
                    <TabsTrigger
                        value="invitations"
                        className="relative serif data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-[#1E3A4A]/20 data-[state=active]:text-[#1E3A4A]"
                    >
                        <Scale className="h-4 w-4 mr-2" strokeWidth={1.5} />
                        Case Invitations
                        {pendingInvitations.length > 0 && (
                            <Badge className="ml-2 bg-[#1E3A4A] text-[#F4F8F7] px-1.5 py-0 text-[10px] min-w-[20px]">
                                {pendingInvitations.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger
                        value="aria"
                        className="serif data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-[#1E3A4A]/20 data-[state=active]:text-[#1E3A4A]"
                    >
                        <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} />
                        ARIA Sessions
                    </TabsTrigger>
                </TabsList>

                {/* Case Invitations Tab */}
                <TabsContent value="invitations" className="space-y-4">
                    <div className="flex items-center justify-between border-b-2 border-[#1E3A4A]/10 pb-3">
                        <div>
                            <p className="sans text-xs font-bold text-[#1E3A4A]/60 tracking-[0.15em] uppercase mb-1">
                                Pending Matters
                            </p>
                            <p className="sans text-sm text-slate-600 leading-relaxed">
                                Review and accept case invitations from parties seeking representation
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchInvitations}
                            disabled={invitationsLoading}
                            className="border-2 border-[#1E3A4A]/20 hover:bg-[#F4F8F7]"
                        >
                            <RefreshCw className={`h-4 w-4 ${invitationsLoading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>

                    {invitationsLoading ? (
                        <div className="flex items-center justify-center min-h-[40vh]">
                            <Loader2 className="h-8 w-8 animate-spin text-[#1E3A4A]" />
                        </div>
                    ) : pendingInvitations.length === 0 ? (
                        <Card className="border-2 border-dashed border-[#1E3A4A]/20 bg-gradient-to-br from-[#F4F8F7]/30 to-white shadow-sm">
                            <CardContent className="py-16 text-center">
                                <Bell className="h-12 w-12 mx-auto text-[#1E3A4A]/30 mb-3" />
                                <p className="serif text-lg font-bold text-slate-900 mb-1">No Pending Invitations</p>
                                <p className="sans text-sm text-slate-500 mt-1">
                                    Case invitations will appear here when parties request representation
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
                    <div className="flex items-center justify-between border-b-2 border-[#1E3A4A]/10 pb-3">
                        <div>
                            <p className="sans text-xs font-bold text-[#1E3A4A]/60 tracking-[0.15em] uppercase mb-1">
                                AI-Assisted Sessions
                            </p>
                            <p className="sans text-sm text-slate-600 leading-relaxed">
                                Generate, track, and manage ARIA intake sessions
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    fetchLinks();
                                    fetchStats();
                                }}
                                className="border-2 border-[#1E3A4A]/20 hover:bg-[#F4F8F7]"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                                onClick={() => router.push("/professional/intake/new")}
                                className="bg-[#1E3A4A] hover:bg-[#1E3A4A] text-[#F4F8F7] border-2 border-[#1E3A4A]/40 shadow-lg"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                New ARIA Intake
                            </Button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                    <Card className="border-2 border-slate-300 bg-white shadow-sm">
                        <CardContent className="pt-4">
                            <p className="sans text-xs font-bold text-slate-600 tracking-[0.15em] uppercase">Total Sent</p>
                            <p className="serif text-2xl font-bold text-slate-900">{stats.total}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white shadow-sm">
                        <CardContent className="pt-4">
                            <p className="sans text-xs font-bold text-amber-900/60 tracking-[0.15em] uppercase">Pending</p>
                            <p className="serif text-2xl font-bold text-amber-900">{stats.pending}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white shadow-sm">
                        <CardContent className="pt-4">
                            <p className="sans text-xs font-bold text-blue-900/60 tracking-[0.15em] uppercase">In Progress</p>
                            <p className="serif text-2xl font-bold text-blue-900">{stats.active}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
                        <CardContent className="pt-4">
                            <p className="sans text-xs font-bold text-emerald-900/60 tracking-[0.15em] uppercase">Completed</p>
                            <p className="serif text-2xl font-bold text-emerald-900">{stats.completed}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-2 border-[#1E3A4A]/30 bg-gradient-to-br from-[#F4F8F7] to-[#E8F4F0]/50 shadow-md">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-1">
                                <p className="sans text-xs font-bold text-[#1E3A4A]/60 tracking-[0.15em] uppercase">Completion</p>
                                <TrendingUp className="h-3.5 w-3.5 text-[#1E3A4A]" strokeWidth={2} />
                            </div>
                            <p className="serif text-2xl font-bold text-[#1E3A4A]">{completionRate}%</p>
                            <Progress value={completionRate} className="h-1.5 mt-1 bg-[#1E3A4A]/20" />
                        </CardContent>
                    </Card>
                    </div>
                    )}

                    {/* Filter Row */}
            <div className="flex items-center gap-2 mb-4">
                <p className="sans text-xs font-bold text-[#1E3A4A]/60 tracking-[0.15em] uppercase">Filter:</p>
                {["all", "pending", "active", "completed", "cancelled"].map((s) => (
                    <Button
                        key={s}
                        variant={statusFilter === s ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter(s)}
                        className={
                            statusFilter === s
                                ? "bg-[#1E3A4A] text-[#F4F8F7] border-2 border-[#1E3A4A]/40 shadow-sm sans"
                                : "border-2 border-slate-300 text-slate-600 hover:bg-[#F4F8F7] sans"
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
