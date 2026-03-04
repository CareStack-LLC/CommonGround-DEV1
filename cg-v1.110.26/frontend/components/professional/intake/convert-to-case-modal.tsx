"use client";

import { useState } from "react";
import {
    CheckCircle2,
    FolderOpen,
    Loader2,
    ArrowRight,
    AlertCircle,
    Users,
    Bot,
    FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ConvertToCaseModalProps {
    open: boolean;
    onClose: () => void;
    sessionId: string;
    clientName: string;
    token: string | null;
    firmId?: string;
    onSuccess: (caseId: string) => void;
}

export function ConvertToCaseModal({
    open,
    onClose,
    sessionId,
    clientName,
    token,
    firmId,
    onSuccess,
}: ConvertToCaseModalProps) {
    const [assignmentRole, setAssignmentRole] = useState("lead_attorney");
    const [representing, setRepresenting] = useState("parent_a");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [caseId, setCaseId] = useState<string | null>(null);

    const handleConvert = async () => {
        if (!token || !sessionId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `${API_BASE}/api/v1/professional/intake/sessions/${sessionId}/convert-to-case`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        assignment_role: assignmentRole,
                        representing,
                        firm_id: firmId,
                    }),
                }
            );
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Conversion failed" }));
                throw new Error(err.detail || "Conversion failed");
            }
            const data = await res.json();
            setCaseId(data.family_file_id || data.case_id);
            setSuccess(true);
            onSuccess(data.family_file_id || data.case_id);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <FolderOpen className="h-5 w-5" />
                        </div>
                        Convert Intake to Case
                    </DialogTitle>
                    <DialogDescription>
                        Convert the completed intake for <strong>{clientName}</strong> into an active case file.
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="py-6 text-center">
                        <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl w-fit mx-auto mb-4">
                            <CheckCircle2 className="h-10 w-10" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">Case Created!</h3>
                        <p className="text-slate-500 mb-4">
                            The intake has been successfully converted to a case file.
                        </p>
                        <Button
                            asChild
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            <a href={`/professional/cases/${caseId}`}>
                                Open Case
                                <ArrowRight className="h-4 w-4" />
                            </a>
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Confirmation Details */}
                        <div className="space-y-4 py-2">
                            {error && (
                                <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <FileText className="h-4 w-4" />
                                    <span>Intake data, responses, and documents will be attached to the case.</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Bot className="h-4 w-4" />
                                    <span>ARIA controls will be enabled for the new case.</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Users className="h-4 w-4" />
                                    <span>You will be assigned as the case professional.</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Your Role on Case</Label>
                                    <Select value={assignmentRole} onValueChange={setAssignmentRole}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="lead_attorney">Lead Attorney</SelectItem>
                                            <SelectItem value="associate">Associate</SelectItem>
                                            <SelectItem value="paralegal">Paralegal</SelectItem>
                                            <SelectItem value="mediator">Mediator</SelectItem>
                                            <SelectItem value="parenting_coordinator">Parenting Coordinator</SelectItem>
                                            <SelectItem value="intake_coordinator">Intake Coordinator</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Representing</Label>
                                    <Select value={representing} onValueChange={setRepresenting}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="parent_a">Petitioner</SelectItem>
                                            <SelectItem value="parent_b">Respondent</SelectItem>
                                            <SelectItem value="both">Both Parties</SelectItem>
                                            <SelectItem value="court">Court / Neutral</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={onClose} disabled={loading}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConvert}
                                disabled={loading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Creating Case...
                                    </>
                                ) : (
                                    <>
                                        <FolderOpen className="h-4 w-4" />
                                        Convert to Case
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
