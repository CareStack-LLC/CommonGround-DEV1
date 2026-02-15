"use client";

import { useState, useEffect } from "react";
import {
    Phone,
    FileText,
    Plus,
    History,
    Download,
    FileCheck,
    MoreVertical,
    Clock,
    User,
    ExternalLink,
    Calendar,
    AlertCircle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { toast } from "@/hooks/use-toast";
import { CallInterface } from "@/components/professional/call/call-interface";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CallLog {
    id: string;
    family_file_id: string;
    professional_id: string;
    participant_ids: string[];
    call_type: string;
    duration_seconds: number;
    status: string;
    notes: string;
    recording_url?: string;
    started_at: string;
    ended_at?: string;
}

interface ComplianceReport {
    id: string;
    family_file_id: string;
    generated_by_id: string;
    report_type: string;
    export_format?: 'pdf' | 'excel';
    date_range_start: string;
    date_range_end: string;
    status: string;
    file_url?: string;
    created_at: string;
}

export function CallsReportsTab({ familyFileId, token }: { familyFileId: string, token: string }) {
    const [callLogs, setCallLogs] = useState<CallLog[]>([]);
    const [reports, setReports] = useState<ComplianceReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiveMode, setIsLiveMode] = useState(false);

    // New Call Form State
    const [isLogCallOpen, setIsLogCallOpen] = useState(false);
    const [callForm, setCallForm] = useState({
        call_type: "phone",
        participant_ids: ["parent_a", "parent_b"], // Simplified for demo
        duration_seconds: 600,
        status: "completed",
        notes: "",
        started_at: new Date().toISOString()
    });

    // New Report Form State
    const [isGenReportOpen, setIsGenReportOpen] = useState(false);
    const [reportForm, setReportForm] = useState({
        report_type: "standard_compliance",
        date_range_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        date_range_end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchData();
    }, [familyFileId, token]);

    const fetchData = async () => {
        if (!token || !familyFileId) return;
        setIsLoading(true);
        try {
            // Fetch Call Logs
            const callsRes = await fetch(`${API_BASE}/api/v1/professional/cases/${familyFileId}/calls`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (callsRes.ok) {
                const data = await callsRes.json();
                setCallLogs(data);
            }

            // Fetch Reports
            const reportsRes = await fetch(`${API_BASE}/api/v1/professional/cases/${familyFileId}/reports`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (reportsRes.ok) {
                const data = await reportsRes.json();
                setReports(data);
            }
        } catch (error) {
            console.error("Error fetching calls/reports:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogCall = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/cases/${familyFileId}/calls`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(callForm)
            });

            if (res.ok) {
                toast({ title: "Call logged successfully" });
                setIsLogCallOpen(false);
                fetchData();
            } else {
                toast({ title: "Failed to log call", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "An error occurred", variant: "destructive" });
        }
    };

    const handleGenerateReport = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/cases/${familyFileId}/reports`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(reportForm)
            });

            if (res.ok) {
                toast({ title: "Report generation started" });
                setIsGenReportOpen(false);
                fetchData();
            } else {
                toast({ title: "Failed to generate report", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "An error occurred", variant: "destructive" });
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const handleDownloadReport = async (reportId: string, filename: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/reports/${reportId}/download`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                toast({ title: "Report downloaded" });
            } else {
                toast({ title: "Failed to download report", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error downloading report", variant: "destructive" });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Case Documentation</h3>
                    <p className="text-sm text-slate-500">Manage professional call logs and compliance reports</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setIsLogCallOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        <Phone className="h-4 w-4 mr-2" />
                        Log Call
                    </Button>
                    <Button
                        onClick={() => setIsGenReportOpen(true)}
                        variant="outline"
                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Report
                    </Button>
                    <Button
                        onClick={() => setIsLiveMode(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100"
                    >
                        <Phone className="h-4 w-4 mr-2" />
                        Live Control
                    </Button>
                </div>
            </div>

            {isLiveMode ? (
                <div className="animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-4 bg-slate-900 text-white p-3 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-red-500 animate-pulse border-none">LIVE SESSION</Badge>
                            <span className="text-sm font-medium opacity-80">ARIA Safety Shield Active</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white/10"
                            onClick={() => setIsLiveMode(false)}
                        >
                            Exit Live View
                        </Button>
                    </div>
                    <CallInterface
                        familyFileId={familyFileId}
                        token={token}
                        onEndCall={() => setIsLiveMode(false)}
                    />
                </div>
            ) : (
                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Call Logs Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-700 font-semibold px-1">
                            <History className="h-5 w-5 text-indigo-500" />
                            Recent Calls
                        </div>

                        {callLogs.length > 0 ? (
                            <div className="space-y-3">
                                {callLogs.map((call) => (
                                    <Card key={call.id} className="overflow-hidden border-slate-100 hover:border-indigo-200 transition-colors group">
                                        <div className="p-4 flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                                <Phone className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-semibold text-slate-900 capitalize">
                                                        {call.call_type} Call
                                                    </span>
                                                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                                                        {call.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-2">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDuration(call.duration_seconds)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(call.started_at).toLocaleDateString()}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {call.participant_ids.length} Participants
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                                                    {call.notes || "No notes recorded for this call."}
                                                </p>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40">
                                                    <DropdownMenuItem className="text-xs">Edit Notes</DropdownMenuItem>
                                                    {call.recording_url && (
                                                        <DropdownMenuItem className="text-xs">Listen Recording</DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem className="text-xs text-red-600">Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center">
                                <Phone className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                                <p className="text-slate-500 font-medium">No calls logged yet.</p>
                                <Button
                                    variant="link"
                                    className="text-indigo-600"
                                    onClick={() => setIsLogCallOpen(true)}
                                >
                                    Log your first call
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Compliance Reports Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-700 font-semibold px-1">
                            <FileCheck className="h-5 w-5 text-indigo-500" />
                            Compliance Reports
                        </div>

                        {reports.length > 0 ? (
                            <div className="space-y-3">
                                {reports.map((report) => (
                                    <Card key={report.id} className="overflow-hidden border-slate-100 hover:border-emerald-200 transition-colors group">
                                        <div className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-900 text-sm">
                                                        {report.report_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                    </h4>
                                                    <p className="text-xs text-slate-500">
                                                        Generated on {new Date(report.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge
                                                    variant={report.status === 'completed' ? 'success' : 'secondary'}
                                                    className="text-[10px] h-5"
                                                >
                                                    {report.status}
                                                </Badge>
                                                {report.status === 'completed' ? (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-indigo-600"
                                                        onClick={() => handleDownloadReport(report.id, `Report-${report.id.slice(0, 8)}.${report.export_format === 'excel' ? 'csv' : 'pdf'}`)}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button size="icon" variant="ghost" disabled className="h-8 w-8 text-slate-300">
                                                        <Clock className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center">
                                <FileCheck className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                                <p className="text-slate-500 font-medium">No reports generated yet.</p>
                                <Button
                                    variant="link"
                                    className="text-indigo-600"
                                    onClick={() => setIsGenReportOpen(true)}
                                >
                                    Generate case report
                                </Button>
                            </div>
                        )}

                        {/* Tips Card */}
                        <Card className="bg-indigo-50 border-none mt-6">
                            <CardContent className="p-4 flex gap-3">
                                <AlertCircle className="h-5 w-5 text-indigo-500 shrink-0" />
                                <div className="text-xs text-indigo-800 leading-relaxed">
                                    <p className="font-bold mb-1">Professional Advisory</p>
                                    Compliance reports aggregate ARIA flags, exchange metadata, and message sentiment. Use them for court submissions or mediation preparations.
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Log Call Dialog */}
            <Dialog open={isLogCallOpen} onOpenChange={setIsLogCallOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Log Professional Call</DialogTitle>
                        <DialogDescription>
                            Record the details of a case-related call for compliance tracking.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="call_type" className="text-right">Type</Label>
                            <Select
                                value={callForm.call_type}
                                onValueChange={(v) => setCallForm({ ...callForm, call_type: v })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="phone">Phone Call</SelectItem>
                                    <SelectItem value="video">Video Call</SelectItem>
                                    <SelectItem value="in_person">In-Person Meeting</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="duration" className="text-right">Duration</Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Input
                                    id="duration"
                                    type="number"
                                    value={callForm.duration_seconds / 60}
                                    onChange={(e) => setCallForm({ ...callForm, duration_seconds: parseInt(e.target.value) * 60 })}
                                />
                                <span className="text-sm text-slate-500">minutes</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="notes" className="text-right mt-2">Notes</Label>
                            <Textarea
                                id="notes"
                                className="col-span-3 min-h-[100px]"
                                placeholder="Summary of discussion, agreements reached..."
                                value={callForm.notes}
                                onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLogCallOpen(false)}>Cancel</Button>
                        <Button onClick={handleLogCall} className="bg-indigo-600 hover:bg-indigo-700">Save Log Entry</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Generate Report Dialog */}
            <Dialog open={isGenReportOpen} onOpenChange={setIsGenReportOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Generate Compliance Report</DialogTitle>
                        <DialogDescription>
                            Create a comprehensive PDF summary of case activity.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start">Start Date</Label>
                                <Input
                                    id="start"
                                    type="date"
                                    value={reportForm.date_range_start}
                                    onChange={(e) => setReportForm({ ...reportForm, date_range_start: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end">End Date</Label>
                                <Input
                                    id="end"
                                    type="date"
                                    value={reportForm.date_range_end}
                                    onChange={(e) => setReportForm({ ...reportForm, date_range_end: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Report Template</Label>
                            <Select
                                value={reportForm.report_type}
                                onValueChange={(v) => setReportForm({ ...reportForm, report_type: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="standard_compliance">Standard Compliance Review</SelectItem>
                                    <SelectItem value="communication_audit">Communication Audit (Sentiments & Flags)</SelectItem>
                                    <SelectItem value="financial_reconciliation">Financial Reconciliation</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsGenReportOpen(false)}>Cancel</Button>
                        <Button onClick={handleGenerateReport} className="bg-indigo-600 hover:bg-indigo-700">
                            Generate PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
