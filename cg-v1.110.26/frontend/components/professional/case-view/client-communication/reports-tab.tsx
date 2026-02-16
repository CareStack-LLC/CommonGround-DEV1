"use client";

import { useState, useEffect } from "react";
import {
    FileCheck,
    FileText,
    Download,
    Clock,
    AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

export function ReportsTab({ familyFileId, token }: { familyFileId: string, token: string }) {
    const [reports, setReports] = useState<ComplianceReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // New Report Form State
    const [isGenReportOpen, setIsGenReportOpen] = useState(false);
    const [reportForm, setReportForm] = useState({
        report_type: "standard_compliance",
        date_range_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        date_range_end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchReports();
    }, [familyFileId, token]);

    const fetchReports = async () => {
        if (!token || !familyFileId) return;
        setIsLoading(true);
        try {
            const reportsRes = await fetch(`${API_BASE}/api/v1/professional/cases/${familyFileId}/reports`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (reportsRes.ok) {
                const data = await reportsRes.json();
                setReports(data);
            }
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setIsLoading(false);
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
                fetchReports();
            } else {
                toast({ title: "Failed to generate report", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "An error occurred", variant: "destructive" });
        }
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Compliance Reports</h3>
                    <p className="text-sm text-slate-500">Generate and download case documentation</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setIsGenReportOpen(true)}
                        variant="outline"
                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Report
                    </Button>
                </div>
            </div>

            {/* Compliance Reports Section */}
            <div className="space-y-4">
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
