"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    BarChart3,
    Shield,
    Download,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    FileText,
    FolderOpen,
    Hash,
    Calendar,
    Clock,
    ArrowRight,
    Loader2,
    Filter,
    ShieldCheck,
    Zap,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useProfessionalAuth } from "../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FirmReportSummary {
    total_cases: number;
    avg_compliance_score: number;
    cases_below_threshold: number;
    total_exchanges: number;
    exchange_compliance_rate: number;
    total_messages: number;
    aria_flagged_messages: number;
    reports_generated: number;
    period_days: number;
}

interface CaseComplianceRow {
    family_file_id: string;
    family_file_number: string;
    compliance_score: number;
    exchange_compliance_rate: number;
    aria_flags: number;
    last_activity: string;
    status: string;
}

interface GeneratedReport {
    id: string;
    title: string;
    family_file_id: string;
    sha256_hash: string;
    export_format: string;
    generated_at: string;
    status: string;
}

export default function ReportsPage() {
    const { token, activeFirm } = useProfessionalAuth();
    const [summary, setSummary] = useState<FirmReportSummary | null>(null);
    const [caseRows, setCaseRows] = useState<CaseComplianceRow[]>([]);
    const [reports, setReports] = useState<GeneratedReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [periodDays, setPeriodDays] = useState("30");
    const [sortBy, setSortBy] = useState<"score" | "flags" | "activity">("score");
    const [generating, setGenerating] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ days: periodDays });
            if (activeFirm) params.append("firm_id", activeFirm.id);

            // Fetch firm-wide compliance summary from dashboard
            const dashRes = await fetch(`${API_BASE}/api/v1/professional/dashboard?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (dashRes.ok) {
                const dash = await dashRes.json();
                // Derive firm summary from dashboard data
                setSummary({
                    total_cases: dash.case_count || 0,
                    avg_compliance_score: dash.avg_compliance_score || 0,
                    cases_below_threshold: dash.cases_below_threshold || 0,
                    total_exchanges: dash.total_exchanges || 0,
                    exchange_compliance_rate: dash.exchange_compliance_rate || 0,
                    total_messages: dash.total_messages || 0,
                    aria_flagged_messages: dash.aria_flagged_messages || 0,
                    reports_generated: dash.reports_generated || 0,
                    period_days: parseInt(periodDays),
                });
                // Case rows from priority_cases
                if (dash.priority_cases) {
                    setCaseRows(
                        dash.priority_cases.map((c: any) => ({
                            family_file_id: c.id || c.family_file_id,
                            family_file_number: c.family_file_number || `Case ${(c.id || "").slice(0, 8)}`,
                            compliance_score: c.compliance_score ?? 0,
                            exchange_compliance_rate: c.exchange_compliance_rate ?? 0,
                            aria_flags: c.aria_flags ?? 0,
                            last_activity: c.last_activity || c.updated_at || new Date().toISOString(),
                            status: c.status || "active",
                        }))
                    );
                }
            }

            // Fetch recent reports list
            const reportsRes = await fetch(`${API_BASE}/api/v1/professional/reports?limit=10`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (reportsRes.ok) {
                const data = await reportsRes.json();
                setReports(Array.isArray(data) ? data : data.reports || []);
            }
        } catch (e) {
            console.error("Reports fetch error:", e);
        } finally {
            setIsLoading(false);
        }
    }, [token, activeFirm, periodDays]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const generateReport = async (familyFileId: string, format: "pdf" | "excel") => {
        if (!token) return;
        setGenerating(familyFileId);
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/cases/${familyFileId}/reports`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ export_format: format, period_days: parseInt(periodDays) }),
            });
            if (res.ok) {
                await fetchData();
            }
        } catch (e) {
            console.error("Report generation error:", e);
        } finally {
            setGenerating(null);
        }
    };

    const downloadReport = (reportId: string) => {
        if (!token) return;
        window.open(
            `${API_BASE}/api/v1/professional/reports/${reportId}/download?token=${token}`,
            "_blank"
        );
    };

    const sortedCaseRows = [...caseRows].sort((a, b) => {
        if (sortBy === "score") return a.compliance_score - b.compliance_score;
        if (sortBy === "flags") return b.aria_flags - a.aria_flags;
        return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
    });

    const scoreColor = (score: number) => {
        if (score >= 80) return "text-emerald-600";
        if (score >= 60) return "text-amber-600";
        return "text-red-600";
    };

    const scoreBar = (score: number) => {
        if (score >= 80) return "bg-emerald-500";
        if (score >= 60) return "bg-amber-500";
        return "bg-red-500";
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                            <BarChart3 className="h-6 w-6" />
                        </div>
                        Reports & Compliance
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Firm-wide compliance metrics and SHA-256 verified report generation
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={periodDays} onValueChange={setPeriodDays}>
                        <SelectTrigger className="w-36 border-slate-200">
                            <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 90 days</SelectItem>
                            <SelectItem value="180">Last 6 months</SelectItem>
                            <SelectItem value="365">Last year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            {isLoading && !summary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : summary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                        <CardContent className="pt-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Avg Compliance</p>
                                <Shield className="h-4 w-4 text-indigo-500" />
                            </div>
                            <p className={`text-3xl font-black ${scoreColor(summary.avg_compliance_score)}`}>
                                {Math.round(summary.avg_compliance_score)}%
                            </p>
                            <Progress
                                value={summary.avg_compliance_score}
                                className="h-1.5 mt-2"
                            />
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
                        <CardContent className="pt-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Exchange Rate</p>
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </div>
                            <p className="text-3xl font-black text-emerald-600">
                                {Math.round(summary.exchange_compliance_rate)}%
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{summary.total_exchanges} total exchanges</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
                        <CardContent className="pt-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">ARIA Flags</p>
                                <Zap className="h-4 w-4 text-amber-500" />
                            </div>
                            <p className="text-3xl font-black text-amber-600">
                                {summary.aria_flagged_messages}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">of {summary.total_messages} messages</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                        <CardContent className="pt-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Reports</p>
                                <FileText className="h-4 w-4 text-blue-500" />
                            </div>
                            <p className="text-3xl font-black text-blue-600">
                                {summary.reports_generated}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">SHA-256 verified</p>
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Case Compliance Table */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <div className="h-1 w-6 bg-indigo-500 rounded-full" />
                            Case Compliance Overview
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Sort:</span>
                            <button
                                onClick={() => setSortBy("score")}
                                className={`text-xs px-2 py-1 rounded-lg transition-colors ${sortBy === "score" ? "bg-indigo-100 text-indigo-700 font-medium" : "text-slate-500 hover:bg-slate-100"}`}
                            >
                                Score ↑
                            </button>
                            <button
                                onClick={() => setSortBy("flags")}
                                className={`text-xs px-2 py-1 rounded-lg transition-colors ${sortBy === "flags" ? "bg-amber-100 text-amber-700 font-medium" : "text-slate-500 hover:bg-slate-100"}`}
                            >
                                Flags ↓
                            </button>
                            <button
                                onClick={() => setSortBy("activity")}
                                className={`text-xs px-2 py-1 rounded-lg transition-colors ${sortBy === "activity" ? "bg-slate-200 text-slate-700 font-medium" : "text-slate-500 hover:bg-slate-100"}`}
                            >
                                Recent
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
                        </div>
                    ) : sortedCaseRows.length === 0 ? (
                        <Card className="border-dashed border-slate-200 bg-slate-50">
                            <CardContent className="py-12 text-center">
                                <FolderOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                                <p className="text-slate-500">No active cases with compliance data</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            {sortedCaseRows.map((row) => (
                                <Card key={row.family_file_id} className="border-slate-100 hover:shadow-md transition-all">
                                    <CardContent className="py-4 px-5">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <p className="font-semibold text-slate-900 text-sm">
                                                        {row.family_file_number}
                                                    </p>
                                                    {row.aria_flags > 0 && (
                                                        <Badge variant="outline" className="text-xs text-amber-700 bg-amber-50 border-amber-200">
                                                            {row.aria_flags} ARIA flag{row.aria_flags !== 1 ? "s" : ""}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${scoreBar(row.compliance_score)}`}
                                                            style={{ width: `${row.compliance_score}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-sm font-bold ${scoreColor(row.compliance_score)}`}>
                                                        {Math.round(row.compliance_score)}%
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {generating === row.family_file_id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs gap-1.5"
                                                        onClick={() => generateReport(row.family_file_id, "pdf")}
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                        Generate PDF
                                                    </Button>
                                                )}
                                                <Link href={`/professional/cases/${row.family_file_id}/compliance`}>
                                                    <Button variant="ghost" size="sm">
                                                        <ArrowRight className="h-4 w-4 text-slate-400" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Reports Panel */}
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <div className="h-1 w-6 bg-blue-500 rounded-full" />
                        Recent Reports
                    </h2>

                    {reports.length === 0 ? (
                        <Card className="border-dashed border-slate-200 bg-slate-50">
                            <CardContent className="py-8 text-center">
                                <ShieldCheck className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                                <p className="text-sm text-slate-500">No reports generated yet.</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Generate a PDF from any case compliance page.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            {reports.map((r) => (
                                <Card key={r.id} className="border-slate-100">
                                    <CardContent className="py-3 px-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-900 truncate">{r.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-slate-400">
                                                        {new Date(r.generated_at).toLocaleDateString("en-US", {
                                                            month: "short", day: "numeric", year: "numeric",
                                                        })}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {r.export_format.toUpperCase()}
                                                    </Badge>
                                                </div>
                                                {r.sha256_hash && (
                                                    <div className="flex items-center gap-1 mt-1.5">
                                                        <Hash className="h-3 w-3 text-slate-300" />
                                                        <span className="text-[10px] text-slate-400 font-mono truncate">
                                                            {r.sha256_hash.slice(0, 16)}…
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="shrink-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                onClick={() => downloadReport(r.id)}
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Info box */}
                    <Card className="bg-indigo-50 border-indigo-100">
                        <CardContent className="py-4 px-4">
                            <div className="flex items-start gap-2">
                                <ShieldCheck className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-indigo-900">SHA-256 Verification</p>
                                    <p className="text-xs text-indigo-700 mt-0.5">
                                        Every report is cryptographically signed. Any post-export modification
                                        invalidates the hash, ensuring tamper-evident court-ready documents.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
