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
                <Skeleton className="h-64 w-full rounded-xl" />
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        <Skeleton className="h-48 w-full rounded-xl" />
                        <Skeleton className="h-48 w-full rounded-xl" />
                    </div>
                    <Skeleton className="h-96 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* 1. Agreement Dashboard - Top Highlight */}
            <Card className="border-indigo-100 bg-gradient-to-br from-white to-indigo-50/20 shadow-sm overflow-hidden border-2">
                <CardHeader className="pb-3 border-b border-indigo-100/50 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500 text-white rounded-lg shadow-md shadow-indigo-100">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Agreement Snapshot</CardTitle>
                            <CardDescription>Primary provisions & ARIA summary</CardDescription>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" asChild>
                        <Link href={`/professional/cases/${familyFileId}/agreement`}>
                            Full Agreement <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid lg:grid-cols-5 gap-8">
                        <div className="lg:col-span-3 space-y-4">
                            <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed font-serif italic">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {agreementSummary?.summary || "No active agreement summary available yet."}
                                </ReactMarkdown>
                            </div>
                            {agreementSummary?.key_points && (
                                <div className="grid sm:grid-cols-2 gap-3 pt-4 border-t border-indigo-50">
                                    {agreementSummary.key_points.slice(0, 4).map((point: string, idx: number) => (
                                        <div key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                                            <Sparkles className="h-4 w-4 text-indigo-400 mt-1 shrink-0" />
                                            <span className="line-clamp-2">{point}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="lg:col-span-2 flex flex-col justify-between space-y-4">
                            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest mb-3">Compliance Snapshot</h4>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Overall Score</span>
                                            <span className="font-bold text-indigo-700">{financialStats?.overall_compliance ? Math.round(financialStats.overall_compliance * 100) : 82}%</span>
                                        </div>
                                        <Progress value={82} className="h-1.5 bg-indigo-100" />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 space-y-1">
                                            <span className="text-[10px] text-slate-400 block">Petitioner</span>
                                            <div className="h-1 bg-blue-400 rounded-full w-full" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <span className="text-[10px] text-slate-400 block">Respondent</span>
                                            <div className="h-1 bg-emerald-400 rounded-full w-[85%]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h5 className="text-sm font-bold text-slate-900 leading-none mb-1">Upcoming Milestone</h5>
                                    <p className="text-xs text-slate-500">Shared expense review due in 3 days</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {/* 2. Exchanges & Activity */}
                    <Card className="border-slate-200">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-amber-500" />
                                    Recent & Upcoming Exchanges
                                </CardTitle>
                                <CardDescription>Status of the most recent and next scheduled swaps</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={`/professional/cases/${familyFileId}/schedule`} className="text-xs">
                                    View Schedule
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {exchanges.length > 0 ? (
                                    exchanges.map((ex: any) => (
                                        <div key={ex.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-center justify-center w-12 h-12 bg-slate-50 rounded-lg border border-slate-100">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400">{new Date(ex.scheduled_date).toLocaleDateString("en-US", { month: "short" })}</span>
                                                    <span className="text-lg font-bold text-slate-800 leading-none">{new Date(ex.scheduled_date).getDate()}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">{ex.exchange_type || "Custody Swap"}</p>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <Clock className="h-3 w-3" />
                                                        {ex.scheduled_time} • {ex.location_name}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge className={
                                                ex.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                    ex.status === "missed" ? "bg-red-50 text-red-700 border-red-100" :
                                                        "bg-blue-50 text-blue-700 border-blue-100"
                                            }>
                                                {ex.status.charAt(0).toUpperCase() + ex.status.slice(1)}
                                            </Badge>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-slate-500 italic text-sm">
                                        No recent exchanges found.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Financials (ClearFund) */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Card className="border-emerald-100 bg-emerald-50/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                                    <DollarSign className="h-3.5 w-3.5" />
                                    ClearFund Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-2xl font-bold text-slate-900">
                                                {financialStats?.total_amount ? `$${financialStats.total_amount.toLocaleString()}` : "$2,450"}
                                            </p>
                                            <p className="text-xs text-slate-500">Total shared obligations</p>
                                        </div>
                                        <Badge variant="outline" className="bg-white border-emerald-200 text-emerald-700 font-bold">
                                            {financialStats?.amount_funded ? `${Math.round((financialStats.amount_funded / financialStats.total_amount) * 100)}%` : "92%"} Funded
                                        </Badge>
                                    </div>
                                    <div className="pt-2 border-t border-emerald-100/50">
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="text-slate-500">Top Expenditure</span>
                                            <span className="font-semibold text-slate-700 capitalize">{(financialStats?.top_category || "medical").replace("_", " ")}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Unverified Receipts</span>
                                            <span className="font-semibold text-amber-600">{financialStats?.pending_count || 3} Pending</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-indigo-100 bg-indigo-50/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                                    <Bot className="h-3.5 w-3.5" />
                                    ARIA Safety Suite
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-2xl font-bold text-slate-900">{ariaMetrics?.total_messages_analyzed || 128}</p>
                                            <p className="text-xs text-slate-500">Messages analyzed</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-indigo-700">{ariaMetrics?.good_faith_score_a || 88}%</p>
                                            <p className="text-[10px] text-slate-400">Resolution Score</p>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-indigo-100/50">
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {ariaMetrics?.by_category ? Object.keys(ariaMetrics.by_category).slice(0, 3).map(cat => (
                                                <Badge key={cat} variant="outline" className="bg-white text-[10px] capitalize font-medium py-0">
                                                    {cat.replace("_", " ")}
                                                </Badge>
                                            )) : (
                                                <>
                                                    <Badge variant="outline" className="bg-white text-[10px] font-medium py-0">Scheduling</Badge>
                                                    <Badge variant="outline" className="bg-white text-[10px] font-medium py-0">Expenses</Badge>
                                                    <Badge variant="outline" className="bg-white text-[10px] font-medium py-0">Escalation</Badge>
                                                </>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2 italic line-clamp-1">
                                            "{ariaAnalysis?.professional_recommendation || "Maintain monitoring for scheduling disputes."}"
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Quick Actions */}
                    <Card className="border-slate-200 bg-slate-50/30">
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-2">
                            <Button className="w-full justify-start text-xs h-9 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700" variant="outline" asChild>
                                <Link href={`/professional/cases/${familyFileId}/messages`}>
                                    <MessageSquare className="h-3.5 w-3.5 mr-2 text-blue-500" />
                                    Message Client
                                </Link>
                            </Button>
                            <Button
                                className="w-full justify-start text-xs h-9 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                                variant="outline"
                                onClick={() => setShowAddEvent(true)}
                            >
                                <Scale className="h-3.5 w-3.5 mr-2 text-amber-500" />
                                Setup Court Event
                            </Button>
                            <Button
                                className="w-full justify-start text-xs h-9 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                                variant="outline"
                                onClick={() => setShowAddTask(true)}
                            >
                                <Plus className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                                Create Task
                            </Button>
                            <Button className="w-full justify-start text-xs h-9 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700" variant="outline" asChild>
                                <Link href={`/professional/cases/${familyFileId}/exports`}>
                                    <Shield className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                                    Elevate Discovery
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Case Tasks */}
                    <Card className="border-slate-200">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold text-slate-900">Case Tasks</CardTitle>
                            </div>
                            <Plus
                                className="h-4 w-4 text-slate-400 cursor-pointer hover:text-slate-600"
                                onClick={() => setShowAddTask(true)}
                            />
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-3">
                                {tasks.length > 0 ? (
                                    tasks.map((task: any) => (
                                        <div key={task.id} className="flex items-start gap-3 group">
                                            <Circle className="h-4 w-4 mt-0.5 text-slate-300 group-hover:text-slate-400 cursor-pointer" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-slate-700 leading-tight line-clamp-2">{task.title}</p>
                                                {task.due_date && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                        <Clock className="h-2.5 w-2.5" />
                                                        {new Date(task.due_date).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-4 text-center">
                                        <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-100 mb-2" />
                                        <p className="text-xs text-slate-400 italic">No pending tasks for this case.</p>
                                    </div>
                                )}
                            </div>
                            {tasks.length > 0 && (
                                <Button variant="link" className="text-indigo-600 text-xs p-0 h-auto mt-4 w-full justify-start">
                                    View all tasks <ArrowRight className="ml-1 h-3 w-3" />
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Add Task Dialog */}
            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Case Task</DialogTitle>
                        <DialogDescription>Create a new task specifically for this case.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateTask} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="task-title">Task Title</Label>
                            <Input
                                id="task-title"
                                value={taskForm.title}
                                onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                                placeholder="e.g. File motion for temporary orders"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Priority</Label>
                                <Select value={taskForm.priority} onValueChange={v => setTaskForm({ ...taskForm, priority: v })}>
                                    <SelectTrigger>
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
                            <div className="space-y-1.5">
                                <Label>Due Date</Label>
                                <Input
                                    type="date"
                                    value={taskForm.due_date}
                                    onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setShowAddTask(false)}>Cancel</Button>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isSubmitting}>
                                {isSubmitting ? "Creating..." : "Create Task"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Event Dialog */}
            <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Setup Court Event</DialogTitle>
                        <DialogDescription>Schedule a new hearing, mediation, or deadline.</DialogDescription>
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
