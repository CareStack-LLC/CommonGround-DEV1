"use client";

import Link from "next/link";
import {
    ArrowRight,
    FolderOpen,
    Shield,
    Clock,
    CircleDot,
    Scale,
    UserCheck,
    Gavel,
    CheckCircle2,
    MessageSquare,
    Calendar,
    FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PipelineStatus =
    | "new_lead"
    | "intake"
    | "active"
    | "court_prep"
    | "closed"
    | string;

interface CaseData {
    id: string;
    case_name?: string;
    client_name?: string;
    family_name?: string;
    parent_a_name?: string;
    parent_b_name?: string;
    status?: PipelineStatus;
    compliance_score?: number;
    created_at?: string;
    last_activity?: string;
    next_event?: string;
    next_event_date?: string;
    unread_messages?: number;
    agreement_status?: string;
    professional_type?: string;
    assigned_professional?: string;
    [key: string]: any;
}

const STATUS_CONFIG: Record<
    string,
    { label: string; color: string; dotColor: string; barColor: string; icon: React.ReactNode }
> = {
    new_lead: {
        label: "New Lead",
        color: "bg-amber-50 text-amber-700 border-amber-200",
        dotColor: "bg-amber-400",
        barColor: "bg-amber-400",
        icon: <CircleDot className="h-3.5 w-3.5" />,
    },
    intake: {
        label: "Intake",
        color: "bg-blue-50 text-blue-700 border-blue-200",
        dotColor: "bg-blue-400",
        barColor: "bg-blue-400",
        icon: <UserCheck className="h-3.5 w-3.5" />,
    },
    active: {
        label: "Active",
        color: "bg-teal-50 text-teal-700 border-teal-200",
        dotColor: "bg-teal-400",
        barColor: "bg-teal-400",
        icon: <Scale className="h-3.5 w-3.5" />,
    },
    court_prep: {
        label: "Court Prep",
        color: "bg-purple-50 text-purple-700 border-purple-200",
        dotColor: "bg-purple-400",
        barColor: "bg-purple-500",
        icon: <Gavel className="h-3.5 w-3.5" />,
    },
    closed: {
        label: "Closed",
        color: "bg-slate-100 text-slate-500 border-slate-200",
        dotColor: "bg-slate-300",
        barColor: "bg-slate-300",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
};

function getStatusConfig(status: string) {
    return STATUS_CONFIG[status] || STATUS_CONFIG.active;
}

function getDaysOpen(createdAt?: string): number {
    if (!createdAt) return 0;
    const diff = Date.now() - new Date(createdAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getComplianceColor(score: number) {
    if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (score >= 60) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-red-700 bg-red-50 border-red-200";
}

function getCaseName(c: CaseData): string {
    return c.case_name || c.family_name || c.client_name || "Unnamed Case";
}

function formatLastActivity(ts?: string): string {
    if (!ts) return "";
    const diff = Date.now() - new Date(ts).getTime();
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    return "Just now";
}

function formatEventDate(dateStr?: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface LeadPipelineProps {
    cases: CaseData[];
}

export function LeadPipeline({ cases }: LeadPipelineProps) {
    if (!cases || cases.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-14 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <FolderOpen className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium text-sm">No active cases yet</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                    Leads will appear here once a family invites your firm
                </p>
                <Link href="/professional/intake?tab=invitations">
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-[var(--portal-primary)] text-[var(--portal-primary)] hover:bg-[var(--portal-primary)]/5"
                    >
                        View Pending Invitations
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {cases.map((c, i) => {
                const status = c.status || "active";
                const config = getStatusConfig(status);
                const compliance = typeof c.compliance_score === "number" ? c.compliance_score : null;
                const daysOpen = getDaysOpen(c.created_at);
                const lastActivity = formatLastActivity(c.last_activity);
                const nextEventLabel = c.next_event
                    ? `${c.next_event}${c.next_event_date ? ` · ${formatEventDate(c.next_event_date)}` : ""}`
                    : null;

                const parentA = c.parent_a_name || c.parent_names?.[0] || null;
                const parentB = c.parent_b_name || c.parent_names?.[1] || null;

                return (
                    <Link
                        key={c.id || i}
                        href={`/professional/cases/${c.id}`}
                        className="group block"
                    >
                        <div className="relative rounded-xl bg-white border border-slate-100 hover:border-[var(--portal-primary)]/30 hover:shadow-md transition-all duration-200 overflow-hidden">
                            {/* Left color bar */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.barColor}`} />

                            <div className="pl-5 pr-4 py-3.5">
                                {/* Top row: name + badges */}
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-bold text-slate-800 group-hover:text-[var(--portal-primary)] transition-colors">
                                                {getCaseName(c)}
                                            </p>
                                            <Badge
                                                className={`text-[10px] font-semibold px-2 py-0.5 border ${config.color} flex items-center gap-1 shrink-0`}
                                            >
                                                {config.icon}
                                                {config.label}
                                            </Badge>
                                            {(c.unread_messages ?? 0) > 0 && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full">
                                                    <MessageSquare className="h-2.5 w-2.5" />
                                                    {c.unread_messages}
                                                </span>
                                            )}
                                        </div>

                                        {/* Parents row */}
                                        {(parentA || parentB) && (
                                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                                                {[parentA, parentB].filter(Boolean).join(" · ")}
                                            </p>
                                        )}
                                    </div>

                                    {/* Compliance chip */}
                                    {compliance !== null && (
                                        <span
                                            className={`text-xs font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 shrink-0 ${getComplianceColor(compliance)}`}
                                        >
                                            <Shield className="h-3 w-3" />
                                            {compliance}%
                                        </span>
                                    )}

                                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[var(--portal-primary)] transition-colors shrink-0 mt-0.5" />
                                </div>

                                {/* Bottom row: metadata chips */}
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    {daysOpen > 0 && (
                                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                            <Clock className="h-3 w-3" />
                                            {daysOpen}d open
                                        </span>
                                    )}
                                    {lastActivity && (
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            · Updated {lastActivity}
                                        </span>
                                    )}
                                    {nextEventLabel && (
                                        <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">
                                            <Calendar className="h-2.5 w-2.5" />
                                            {nextEventLabel}
                                        </span>
                                    )}
                                    {c.agreement_status && (
                                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                            <FileText className="h-3 w-3" />
                                            {c.agreement_status}
                                        </span>
                                    )}
                                    {c.assigned_professional && (
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            · {c.assigned_professional}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
