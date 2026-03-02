"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    FileText,
    Sparkles,
    DollarSign,
    TrendingUp,
    Bot,
    AlertTriangle,
    Calendar,
    Clock,
    CheckCircle2,
    MessageSquare,
    Plus,
    ArrowRight,
    Shield,
    Circle,
    MoreVertical,
    Scale,
    Landmark,
    PenLine,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { EventForm } from "@/components/professional/event-form";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CaseOverviewTabProps {
    familyFileId: string;
    token: string;
}

export function CaseOverviewTab({ familyFileId, token }: CaseOverviewTabProps) {
    const [loading, setLoading] = useState(true);
    const [agreementSummary, setAgreementSummary] = useState<any>(null);
    const [financialStats, setFinancialStats] = useState<any>(null);
    const [ariaMetrics, setAriaMetrics] = useState<any>(null);
    const [ariaAnalysis, setAriaAnalysis] = useState<any>(null);
    const [exchanges, setExchanges] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);

    // Quick Action States
    const [showAddTask, setShowAddTask] = useState(false);
    const [showAddEvent, setShowAddEvent] = useState(false);
    const [taskForm, setTaskForm] = useState({ title: "", priority: "medium", due_date: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, [familyFileId, token]);

    const fetchData = async () => {
        if (!token || !familyFileId) return;
        setLoading(true);
        try {
            // 1. Fetch active agreement and summary
            const agreementRes = await fetch(`${API_BASE}/api/v1/agreements/family-file/${familyFileId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (agreementRes.ok) {
                const agreements = await agreementRes.json();
                const activeItem = Array.isArray(agreements)
                    ? agreements.find((a: any) => a.status === "active") || agreements[0]
                    : agreements;

                if (activeItem?.id) {
                    const summaryRes = await fetch(`${API_BASE}/api/v1/agreements/${activeItem.id}/quick-summary`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (summaryRes.ok) setAgreementSummary(await summaryRes.json());
                }
            }

            // 2. ClearFund Stats
            const financialRes = await fetch(`${API_BASE}/api/v1/professional/cases/${familyFileId}/compliance/financials`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (financialRes.ok) setFinancialStats(await financialRes.json());

            // 3. ARIA Metrics & Analysis
            const ariaMetricsRes = await fetch(`${API_BASE}/api/v1/professional/cases/${familyFileId}/aria/metrics`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (ariaMetricsRes.ok) setAriaMetrics(await ariaMetricsRes.json());

            const ariaAnalysisRes = await fetch(`${API_BASE}/api/v1/professional/cases/${familyFileId}/aria/analysis`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (ariaAnalysisRes.ok) setAriaAnalysis(await ariaAnalysisRes.json());

            // 4. Exchanges
            const exchangesRes = await fetch(`${API_BASE}/api/v1/exchanges/case/${familyFileId}/history?days=30&limit=3`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (exchangesRes.ok) {
                const data = await exchangesRes.json();
                setExchanges(data.exchanges || data || []);
            }

            // 5. Tasks
            const tasksRes = await fetch(`${API_BASE}/api/v1/professional/tasks?case_id=${familyFileId}&completed=false`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (tasksRes.ok) setTasks(await tasksRes.json());

        } catch (error) {
            console.error("Error fetching overview data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskForm.title.trim()) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/tasks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...taskForm,
                    case_id: familyFileId,
                }),
            });
            if (res.ok) {
                setShowAddTask(false);
                setTaskForm({ title: "", priority: "medium", due_date: "" });
                fetchData();
            }
        } catch (error) {
            console.error("Error creating task:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateEvent = async (data: any) => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/events`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...data,
                    family_file_id: familyFileId,
                }),
            });
            if (res.ok) {
                setShowAddEvent(false);
                fetchData();
            }
        } catch (error) {
            console.error("Error creating event:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-96 w-full rounded-sm" />
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-64 w-full rounded-sm" />
                        <Skeleton className="h-64 w-full rounded-sm" />
                    </div>
                    <Skeleton className="h-96 w-full rounded-sm" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <style>{`
                .legal-section-number {
                    font-family: 'Crimson Pro', Georgia, serif;
                    font-weight: 700;
                    color: #92400e;
                    font-size: 3rem;
                    line-height: 1;
                    opacity: 0.15;
                    position: absolute;
                    top: -0.5rem;
                    left: -0.25rem;
                }

                .serif { font-family: 'Crimson Pro', Georgia, serif; }
                .sans { font-family: 'Outfit', system-ui, sans-serif; }

                .legal-divider {
                    height: 2px;
                    background: linear-gradient(90deg, #92400e 0%, #d97706 20%, transparent 100%);
                }

                .metric-card {
                    position: relative;
                    overflow: hidden;
                }

                .metric-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: linear-gradient(90deg, #92400e, #d97706);
                }

                .exchange-date-box {
                    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                    border: 2px solid #92400e;
                }

                .task-checkbox {
                    border: 2px solid #92400e;
                    transition: all 0.2s ease;
                }

                .task-checkbox:hover {
                    background: #fef3c7;
                    transform: scale(1.1);
                }

                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-fade-in-up {
                    animation: fadeInUp 0.6s ease-out forwards;
                }
            `}</style>

            {/* I. AGREEMENT ABSTRACT - Featured Section */}
            <div className="animate-fade-in-up">
                <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-2xl overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>

                    <CardHeader className="pb-4 border-b-2 border-amber-900/10">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-900 rounded-sm shadow-lg">
                                    <Landmark className="h-7 w-7 text-amber-50" strokeWidth={1.5} />
                                </div>
                                <div>
                                    <div className="flex items-baseline gap-3 mb-1">
                                        <span className="text-xs sans font-bold text-amber-900/60 tracking-[0.2em] uppercase">
                                            Article I
                                        </span>
                                        <div className="h-px w-12 bg-amber-900/30"></div>
                                    </div>
                                    <CardTitle className="text-2xl serif font-bold text-slate-900 leading-tight">
                                        Agreement Abstract
                                    </CardTitle>
                                    <CardDescription className="mt-1 sans text-slate-600">
                                        Executive Summary of Parenting Plan Provisions
                                    </CardDescription>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="sans text-amber-900 hover:text-amber-950 hover:bg-amber-50 font-semibold border border-amber-900/20 hover:border-amber-900/40"
                                asChild
                            >
                                <Link href={`/professional/cases/${familyFileId}/agreement`}>
                                    Full Text <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-8 pb-8">
                        <div className="grid lg:grid-cols-5 gap-10">
                            {/* Abstract Text */}
                            <div className="lg:col-span-3 space-y-6">
                                <div className="prose prose-lg max-w-none">
                                    <div className="serif text-slate-800 leading-relaxed text-base">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {agreementSummary?.summary || "*No active agreement summary has been generated for this case. The agreement abstract will appear here once the parenting plan has been finalized and processed.*"}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                                {/* Key Provisions */}
                                {agreementSummary?.key_points && agreementSummary.key_points.length > 0 && (
                                    <div className="pt-6 border-t border-amber-900/10">
                                        <h4 className="sans text-xs font-bold text-amber-900 tracking-[0.15em] uppercase mb-4">
                                            Principal Provisions
                                        </h4>
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {agreementSummary.key_points.slice(0, 4).map((point: string, idx: number) => (
                                                <div key={idx} className="flex items-start gap-3 group">
                                                    <div className="mt-1 p-1.5 bg-amber-100 rounded-sm shrink-0">
                                                        <Sparkles className="h-3.5 w-3.5 text-amber-700" strokeWidth={2} />
                                                    </div>
                                                    <span className="sans text-sm text-slate-700 leading-relaxed">{point}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Compliance Sidebar */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Compliance Metrics */}
                                <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100/50 border-2 border-amber-900/20 rounded-sm">
                                    <h4 className="sans text-xs font-bold text-amber-900 tracking-[0.15em] uppercase mb-5 flex items-center gap-2">
                                        <div className="h-px flex-1 bg-amber-900/30"></div>
                                        Adherence Metrics
                                        <div className="h-px flex-1 bg-amber-900/30"></div>
                                    </h4>
                                    <div className="space-y-5">
                                        <div>
                                            <div className="flex justify-between items-baseline mb-2">
                                                <span className="sans text-xs text-slate-600 font-medium">Overall Compliance</span>
                                                <span className="serif text-2xl font-bold text-amber-900">
                                                    {financialStats?.overall_compliance ? Math.round(financialStats.overall_compliance * 100) : 82}%
                                                </span>
                                            </div>
                                            <div className="h-2 bg-white border border-amber-900/20 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-amber-700 to-amber-600"
                                                    style={{ width: `${financialStats?.overall_compliance ? Math.round(financialStats.overall_compliance * 100) : 82}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-amber-900/10">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="sans text-[10px] text-slate-500 uppercase tracking-wider block mb-2">
                                                        Petitioner
                                                    </span>
                                                    <div className="h-2 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full shadow-sm"></div>
                                                    <span className="sans text-xs font-bold text-slate-700 mt-1 block">100%</span>
                                                </div>
                                                <div>
                                                    <span className="sans text-[10px] text-slate-500 uppercase tracking-wider block mb-2">
                                                        Respondent
                                                    </span>
                                                    <div className="h-2 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-full shadow-sm" style={{ width: '85%' }}></div>
                                                    <span className="sans text-xs font-bold text-slate-700 mt-1 block">85%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Alert Notice */}
                                <div className="p-5 bg-white border-2 border-red-900/20 rounded-sm shadow-md">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2.5 bg-red-50 border border-red-900/20 rounded-sm shrink-0">
                                            <AlertTriangle className="h-5 w-5 text-red-900" strokeWidth={2} />
                                        </div>
                                        <div>
                                            <h5 className="sans text-sm font-bold text-slate-900 mb-1">Pending Action Required</h5>
                                            <p className="sans text-xs text-slate-600 leading-relaxed">
                                                Shared expense review due in 3 days
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column - Primary Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* II. CUSTODY EXCHANGES - Recent Activity */}
                    <Card className="border-2 border-slate-300 bg-white shadow-lg metric-card">
                        <CardHeader className="pb-4 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-baseline gap-3 mb-1">
                                        <span className="text-xs sans font-bold text-amber-900/60 tracking-[0.2em] uppercase">
                                            Article II
                                        </span>
                                        <div className="h-px w-8 bg-amber-900/30"></div>
                                    </div>
                                    <CardTitle className="serif text-xl font-bold text-slate-900 flex items-center gap-3">
                                        Custody Exchanges
                                    </CardTitle>
                                    <CardDescription className="sans text-slate-600 mt-1">
                                        Recent and upcoming parental transitions
                                    </CardDescription>
                                </div>
                                <Button variant="ghost" size="sm" className="sans font-medium" asChild>
                                    <Link href={`/professional/cases/${familyFileId}/schedule`} className="text-xs text-amber-900 hover:text-amber-950">
                                        Full Schedule
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {exchanges.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {exchanges.map((ex: any, idx: number) => (
                                        <div key={ex.id} className="p-5 flex items-center justify-between hover:bg-amber-50/30 transition-colors group">
                                            <div className="flex items-center gap-5">
                                                <div className="exchange-date-box flex flex-col items-center justify-center w-16 h-16 rounded-sm shadow-md">
                                                    <span className="sans text-[9px] uppercase font-bold text-amber-900 tracking-wider">
                                                        {new Date(ex.scheduled_date).toLocaleDateString("en-US", { month: "short" })}
                                                    </span>
                                                    <span className="serif text-2xl font-bold text-amber-950 leading-none">
                                                        {new Date(ex.scheduled_date).getDate()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="sans text-sm font-semibold text-slate-900 mb-1">
                                                        {ex.exchange_type || "Standard Exchange"}
                                                    </p>
                                                    <div className="flex items-center gap-3 text-xs text-slate-600">
                                                        <span className="flex items-center gap-1.5">
                                                            <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                                                            {ex.scheduled_time}
                                                        </span>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="line-clamp-1">{ex.location_name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge className={
                                                ex.status === "completed"
                                                    ? "bg-emerald-50 text-emerald-900 border-2 border-emerald-900/30 sans font-semibold"
                                                    : ex.status === "missed"
                                                    ? "bg-red-50 text-red-900 border-2 border-red-900/30 sans font-semibold"
                                                    : "bg-blue-50 text-blue-900 border-2 border-blue-900/30 sans font-semibold"
                                            }>
                                                {ex.status.charAt(0).toUpperCase() + ex.status.slice(1)}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center">
                                    <Calendar className="h-12 w-12 mx-auto text-slate-200 mb-3" />
                                    <p className="serif italic text-slate-400">No recent exchanges recorded.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* III. FINANCIAL OVERVIEW - Two Column Cards */}
                    <div className="grid sm:grid-cols-2 gap-6">
                        {/* ClearFund Summary */}
                        <Card className="border-2 border-emerald-900/30 bg-gradient-to-br from-emerald-50 to-white shadow-lg metric-card">
                            <CardHeader className="pb-3">
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-[10px] sans font-bold text-emerald-900/60 tracking-[0.2em] uppercase">
                                        Art. III.A
                                    </span>
                                </div>
                                <CardTitle className="sans text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" strokeWidth={2.5} />
                                    ClearFund Portfolio
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="serif text-3xl font-bold text-slate-900 mb-1">
                                        {financialStats?.total_amount ? `$${financialStats.total_amount.toLocaleString()}` : "$2,450"}
                                    </p>
                                    <p className="sans text-xs text-slate-600">Total Shared Obligations</p>
                                </div>
                                <div className="pt-3 border-t border-emerald-900/10 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="sans text-xs text-slate-600">Funded</span>
                                        <Badge variant="outline" className="bg-white border-emerald-900/30 text-emerald-900 sans font-bold text-xs">
                                            {financialStats?.amount_funded ? `${Math.round((financialStats.amount_funded / financialStats.total_amount) * 100)}%` : "92%"}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="sans text-slate-600">Primary Category</span>
                                        <span className="sans font-semibold text-slate-900 capitalize">
                                            {(financialStats?.top_category || "medical").replace("_", " ")}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="sans text-slate-600">Pending Verification</span>
                                        <span className="sans font-semibold text-amber-900">
                                            {financialStats?.pending_count || 3} Items
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ARIA Intelligence */}
                        <Card className="border-2 border-slate-900/30 bg-gradient-to-br from-slate-50 to-white shadow-lg metric-card">
                            <CardHeader className="pb-3">
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-[10px] sans font-bold text-slate-900/60 tracking-[0.2em] uppercase">
                                        Art. III.B
                                    </span>
                                </div>
                                <CardTitle className="sans text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                                    <Bot className="h-4 w-4" strokeWidth={2.5} />
                                    ARIA Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="serif text-3xl font-bold text-slate-900 mb-1">
                                            {ariaMetrics?.total_messages_analyzed || 128}
                                        </p>
                                        <p className="sans text-xs text-slate-600">Messages Analyzed</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="serif text-2xl font-bold text-slate-900">
                                            {ariaMetrics?.good_faith_score_a || 88}%
                                        </p>
                                        <p className="sans text-[10px] text-slate-500">Resolution Score</p>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-slate-900/10">
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {ariaMetrics?.by_category ? Object.keys(ariaMetrics.by_category).slice(0, 3).map(cat => (
                                            <Badge key={cat} variant="outline" className="bg-white border-slate-900/20 sans text-[10px] capitalize font-medium">
                                                {cat.replace("_", " ")}
                                            </Badge>
                                        )) : (
                                            <>
                                                <Badge variant="outline" className="bg-white border-slate-900/20 sans text-[10px] font-medium">Scheduling</Badge>
                                                <Badge variant="outline" className="bg-white border-slate-900/20 sans text-[10px] font-medium">Expenses</Badge>
                                                <Badge variant="outline" className="bg-white border-slate-900/20 sans text-[10px] font-medium">Escalation</Badge>
                                            </>
                                        )}
                                    </div>
                                    <p className="serif text-xs italic text-slate-600 leading-relaxed">
                                        "{ariaAnalysis?.professional_recommendation || "Maintain standard monitoring protocols for scheduling disputes."}"
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Right Sidebar - Actions & Tasks */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <Card className="border-2 border-amber-900/30 bg-white shadow-lg">
                        <CardHeader className="pb-4 border-b border-amber-900/10">
                            <div className="flex items-baseline gap-3 mb-1">
                                <span className="text-xs sans font-bold text-amber-900/60 tracking-[0.2em] uppercase">
                                    Section IV
                                </span>
                            </div>
                            <CardTitle className="serif text-lg font-bold text-slate-900">Case Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-5 space-y-3">
                            <Button
                                className="w-full justify-start sans text-sm h-11 bg-white border-2 border-blue-900/20 hover:bg-blue-50 hover:border-blue-900/40 text-slate-900 font-medium shadow-sm transition-all"
                                variant="outline"
                                asChild
                            >
                                <Link href={`/professional/cases/${familyFileId}/messages`}>
                                    <MessageSquare className="h-4 w-4 mr-3 text-blue-900" strokeWidth={2} />
                                    Message Client
                                </Link>
                            </Button>
                            <Button
                                className="w-full justify-start sans text-sm h-11 bg-white border-2 border-amber-900/20 hover:bg-amber-50 hover:border-amber-900/40 text-slate-900 font-medium shadow-sm transition-all"
                                variant="outline"
                                onClick={() => setShowAddEvent(true)}
                            >
                                <Scale className="h-4 w-4 mr-3 text-amber-900" strokeWidth={2} />
                                Schedule Court Event
                            </Button>
                            <Button
                                className="w-full justify-start sans text-sm h-11 bg-white border-2 border-emerald-900/20 hover:bg-emerald-50 hover:border-emerald-900/40 text-slate-900 font-medium shadow-sm transition-all"
                                variant="outline"
                                onClick={() => setShowAddTask(true)}
                            >
                                <PenLine className="h-4 w-4 mr-3 text-emerald-900" strokeWidth={2} />
                                Create Case Task
                            </Button>
                            <Button
                                className="w-full justify-start sans text-sm h-11 bg-white border-2 border-slate-900/20 hover:bg-slate-50 hover:border-slate-900/40 text-slate-900 font-medium shadow-sm transition-all"
                                variant="outline"
                                asChild
                            >
                                <Link href={`/professional/cases/${familyFileId}/exports`}>
                                    <Shield className="h-4 w-4 mr-3 text-slate-900" strokeWidth={2} />
                                    Court Exports
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Active Tasks */}
                    <Card className="border-2 border-slate-300 bg-white shadow-lg">
                        <CardHeader className="pb-4 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="serif text-lg font-bold text-slate-900">Active Tasks</CardTitle>
                                    <CardDescription className="sans text-xs text-slate-600 mt-1">
                                        Pending action items
                                    </CardDescription>
                                </div>
                                <button
                                    onClick={() => setShowAddTask(true)}
                                    className="p-2 hover:bg-amber-50 rounded-sm border border-transparent hover:border-amber-900/20 transition-all"
                                >
                                    <Plus className="h-4 w-4 text-amber-900" strokeWidth={2.5} />
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-5">
                            {tasks.length > 0 ? (
                                <div className="space-y-4">
                                    {tasks.slice(0, 5).map((task: any) => (
                                        <div key={task.id} className="flex items-start gap-3 group">
                                            <button className="task-checkbox mt-1 w-5 h-5 rounded-sm shrink-0 flex items-center justify-center">
                                                <Circle className="h-3 w-3 text-amber-900" strokeWidth={2.5} />
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <p className="sans text-sm text-slate-900 leading-snug mb-1">
                                                    {task.title}
                                                </p>
                                                {task.due_date && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                        <Clock className="h-3 w-3" strokeWidth={2} />
                                                        <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center">
                                    <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-200 mb-3" strokeWidth={1.5} />
                                    <p className="serif italic text-sm text-slate-400">No pending tasks</p>
                                </div>
                            )}
                            {tasks.length > 5 && (
                                <Button variant="link" className="sans text-amber-900 text-xs p-0 h-auto mt-5 w-full justify-start hover:text-amber-950 font-medium">
                                    View all {tasks.length} tasks <ArrowRight className="ml-2 h-3.5 w-3.5" />
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Task Creation Dialog */}
            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
                <DialogContent className="sm:max-w-md border-2 border-amber-900/20">
                    <DialogHeader>
                        <DialogTitle className="serif text-xl font-bold text-slate-900">New Case Task</DialogTitle>
                        <DialogDescription className="sans text-slate-600">
                            Create a task for this case file
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateTask} className="space-y-5 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="task-title" className="sans text-sm font-semibold text-slate-900">Task Description</Label>
                            <Input
                                id="task-title"
                                value={taskForm.title}
                                onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                                placeholder="e.g., File motion for temporary orders"
                                className="sans border-2 border-slate-300 focus:border-amber-900"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="sans text-sm font-semibold text-slate-900">Priority Level</Label>
                                <Select value={taskForm.priority} onValueChange={v => setTaskForm({ ...taskForm, priority: v })}>
                                    <SelectTrigger className="sans border-2 border-slate-300">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="sans text-sm font-semibold text-slate-900">Due Date</Label>
                                <Input
                                    type="date"
                                    value={taskForm.due_date}
                                    onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
                                    className="sans border-2 border-slate-300 focus:border-amber-900"
                                />
                            </div>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setShowAddTask(false)} className="sans border-2">
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-amber-900 hover:bg-amber-950 sans font-semibold" disabled={isSubmitting}>
                                {isSubmitting ? "Creating..." : "Create Task"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Court Event Dialog */}
            <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-amber-900/20">
                    <DialogHeader>
                        <DialogTitle className="serif text-xl font-bold text-slate-900">Schedule Court Event</DialogTitle>
                        <DialogDescription className="sans text-slate-600">
                            Add a hearing, mediation, or deadline to the case calendar
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <EventForm
                            onSubmit={handleCreateEvent}
                            onCancel={() => setShowAddEvent(false)}
                            initialData={{
                                family_file_id: familyFileId,
                                event_type: "court_hearing"
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
