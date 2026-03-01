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
    status?: PipelineStatus;
    compliance_score?: number;
    created_at?: string;
    last_activity?: string;
    // minimal fields expected from dashboardData.priority_cases
    [key: string]: any;
}

const STATUS_CONFIG: Record<
    string,
    { label: string; color: string; dotColor: string; icon: React.ReactNode }
> = {
    new_lead: {
        label: "New Lead",
        color: "bg-amber-50 text-amber-700 border-amber-200",
        dotColor: "bg-amber-400",
        icon: <CircleDot className="h-3.5 w-3.5" />,
    },
    intake: {
        label: "Intake",
        color: "bg-blue-50 text-blue-700 border-blue-200",
        dotColor: "bg-blue-400",
        icon: <UserCheck className="h-3.5 w-3.5" />,
    },
    active: {
        label: "Active",
        color: "bg-teal-50 text-teal-700 border-teal-200",
        dotColor: "bg-teal-400",
        icon: <Scale className="h-3.5 w-3.5" />,
    },
    court_prep: {
        label: "Court Prep",
        color: "bg-purple-50 text-purple-700 border-purple-200",
        dotColor: "bg-purple-400",
        icon: <Gavel className="h-3.5 w-3.5" />,
    },
    closed: {
        label: "Closed",
        color: "bg-slate-100 text-slate-500 border-slate-200",
        dotColor: "bg-slate-300",
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
    if (score >= 80) return "text-emerald-600 bg-emerald-50";
    if (score >= 60) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
}

function getCaseName(c: CaseData): string {
    return c.case_name || c.family_name || c.client_name || "Unnamed Case";
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
        <div className="space-y-1.5">
            {cases.map((c, i) => {
                const status = c.status || "active";
                const config = getStatusConfig(status);
                const compliance = typeof c.compliance_score === "number" ? c.compliance_score : null;
                const daysOpen = getDaysOpen(c.created_at);

                return (
                    <Link
                        key={c.id || i}
                        href={`/professional/cases/${c.id}`}
                        className="group block"
                    >
                        <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white border border-slate-100 hover:border-[var(--portal-primary)]/30 hover:shadow-md transition-all duration-200">
                            {/* Status dot */}
                            <span
                                className={`h-2.5 w-2.5 rounded-full shrink-0 ${config.dotColor}`}
                            />

                            {/* Case name */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[var(--portal-primary)] transition-colors">
                                    {getCaseName(c)}
                                </p>
                                {daysOpen > 0 && (
                                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {daysOpen}d open
                                    </p>
                                )}
                            </div>

                            {/* Status badge */}
                            <Badge
                                className={`text-[10px] font-semibold px-2 py-0.5 border ${config.color} hidden sm:flex items-center gap-1`}
                            >
                                {config.icon}
                                {config.label}
                            </Badge>

                            {/* Compliance chip */}
                            {compliance !== null && (
                                <span
                                    className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${getComplianceColor(
                                        compliance
                                    )}`}
                                >
                                    <Shield className="h-3 w-3" />
                                    {compliance}%
                                </span>
                            )}

                            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[var(--portal-primary)] transition-colors shrink-0" />
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
