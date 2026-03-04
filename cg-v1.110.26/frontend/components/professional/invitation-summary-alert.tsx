"use client";

import { useState, useEffect } from "react";
import {
    Baby,
    FileText,
    Shield,
    MessageSquare,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    RefreshCw,
    Users,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface InvitationSummaryAlertProps {
    invitationId: string;
    firmId: string;
    token: string | null;
    onAccept?: (professionalId?: string) => void;
    onDecline?: () => void;
}

export function InvitationSummaryAlert({
    invitationId,
    firmId,
    token,
    onAccept,
    onDecline,
}: InvitationSummaryAlertProps) {
    const [preview, setPreview] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (invitationId && firmId && token) {
            fetchPreview();
        }
    }, [invitationId, firmId, token]);

    const fetchPreview = async () => {
        setLoading(true);
        setError(null);
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(
                `${API_BASE}/api/v1/professional/firms/${firmId}/invitations/${invitationId}/preview`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setPreview(data);
            } else {
                setError("Failed to load case preview");
            }
        } catch (err) {
            console.error("Error fetching preview:", err);
            setError("Failed to load case preview");
        } finally {
            setLoading(false);
        }
    };

    const statusColor = (health: string) => {
        switch (health) {
            case "excellent":
                return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "good":
                return "bg-teal-100 text-teal-700 border-teal-200";
            case "fair":
                return "bg-amber-100 text-amber-700 border-amber-200";
            case "concerning":
                return "bg-rose-100 text-rose-700 border-rose-200";
            default:
                return "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

    if (loading) {
        return (
            <Card className="border-slate-200 overflow-hidden">
                <div className="h-1 bg-slate-200 animate-pulse" />
                <CardContent className="p-6 flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-slate-300 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    if (error || !preview) {
        return (
            <Card className="border-rose-200 bg-rose-50/30 overflow-hidden">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-rose-500" />
                        <span className="text-sm font-medium text-rose-700">{error || "Preview unavailable"}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={fetchPreview}>
                        Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-emerald-200 shadow-lg shadow-emerald-500/5 overflow-hidden transition-all hover:shadow-xl hover:shadow-emerald-500/10">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
            <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-500/20">
                            <Shield className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Case Invitation Preview</CardTitle>
                            <CardDescription className="flex items-center gap-1.5">
                                <Badge variant="outline" className={`${statusColor(preview.compliance.overall_health)} border px-1.5 py-0 capitalize text-[10px]`}>
                                    {preview.compliance.overall_health} Health
                                </Badge>
                                <span>{preview.family_file_title}</span>
                            </CardDescription>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Representing</p>
                        <Badge className="bg-slate-100 text-slate-700 border-slate-200 capitalize">
                            {preview.representing?.replace("_", " ") || "Neutral / Shared"}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 bg-gradient-to-b from-white to-slate-50/50">
                <div className="grid md:grid-cols-3 gap-6">
                    {/* People & Specs */}
                    <div className="space-y-4">
                        <div>
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">People Involved</Label>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <Users className="h-4 w-4 text-blue-500" />
                                    <span className="font-semibold">{preview.parent_a_name}</span>
                                    <span className="text-slate-400">&</span>
                                    <span className="font-semibold">{preview.parent_b_name}</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {preview.children?.map((c: any) => (
                                        <div key={c.id} className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-medium text-slate-600 shadow-sm">
                                            <Baby className="h-3 w-3 text-emerald-500" />
                                            {c.first_name} ({c.age}y)
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Requested Role</Label>
                            <Badge variant="outline" className="text-[10px] uppercase bg-blue-50 text-blue-600 border-blue-200">{preview.requested_role?.replace("_", " ")}</Badge>
                        </div>
                    </div>

                    {/* Compliance Metrics */}
                    <div className="space-y-4">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">30D Health Metrics</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <MetricBox
                                label="Exchange"
                                value={`${Math.round(preview.compliance.exchange_completion_rate * 100)}%`}
                                subtext="Completion"
                                status={preview.compliance.exchange_completion_rate > 0.8 ? "good" : "warning"}
                            />
                            <MetricBox
                                label="Messaging"
                                value={`${preview.messages.total_messages_30d}`}
                                subtext={`${Math.round(preview.messages.flag_rate * 100)}% Flagged`}
                                status={preview.messages.flag_rate < 0.1 ? "good" : "warning"}
                            />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 p-2 rounded-lg">
                            <FileText className="h-3.5 w-3.5 text-blue-500" />
                            <span className="flex-1 truncate">
                                {preview.agreement.has_active_agreement ? `Active: ${preview.agreement.agreement_title}` : "No Active Agreement"}
                            </span>
                            {preview.agreement.has_active_agreement && (
                                <span className="font-bold text-emerald-600">{preview.agreement.completed_sections}/{preview.agreement.total_sections}</span>
                            )}
                        </div>
                    </div>

                    {/* Financials & Actions */}
                    <div className="space-y-4">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Financial Obligations</Label>
                        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <TrendingUp className="h-8 w-8 text-emerald-600" />
                            </div>
                            <div className="flex justify-between items-end mb-1">
                                <p className="text-xl font-bold font-mono text-slate-900">${preview.clearfund.total_amount.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-emerald-600 uppercase">Total Volume</p>
                            </div>
                            <div className="flex items-center gap-2 overflow-hidden">
                                <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden flex">
                                    <div className="bg-emerald-500 h-full" style={{ width: `${(preview.clearfund.paid_amount / preview.clearfund.total_amount) * 100 || 0}%` }} />
                                    <div className="bg-amber-400 h-full" style={{ width: `${(preview.clearfund.pending_obligations / preview.clearfund.total_obligations) * 100 || 0}%` }} />
                                </div>
                                <span className="text-[10px] whitespace-nowrap text-slate-500 font-bold">{preview.clearfund.pending_obligations} Pending</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => onAccept && onAccept()}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 py-5"
                            >
                                Accept Case
                            </Button>
                            <Button
                                onClick={() => onDecline && onDecline()}
                                variant="outline"
                                className="border-slate-200 hover:bg-slate-50 py-5"
                            >
                                Decline
                            </Button>
                        </div>
                    </div>
                </div>

                {preview.message && (
                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <div className="flex items-start gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                            <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Message from Parent</p>
                                <p className="text-sm text-slate-700 italic">"{preview.message}"</p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function MetricBox({ label, value, subtext, status }: { label: string; value: string; subtext: string; status: "good" | "warning" | "danger" }) {
    const colors = {
        good: "text-emerald-600",
        warning: "text-amber-600",
        danger: "text-rose-600"
    };

    return (
        <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">{label}</p>
            <p className={`text-xl font-bold ${colors[status]}`}>{value}</p>
            <p className="text-[9px] text-slate-400 font-medium truncate">{subtext}</p>
        </div>
    );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
    return <span className={className}>{children}</span>;
}
