"use client";

import { useState, useEffect } from "react";
import {
    Phone,
    MoreVertical,
    Clock,
    User,
    Calendar,
    History,
} from "lucide-react";
import { Card } from "@/components/ui/card";
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

export function CallsTab({ familyFileId, token }: { familyFileId: string, token: string }) {
    const [callLogs, setCallLogs] = useState<CallLog[]>([]);
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

    useEffect(() => {
        fetchCalls();
    }, [familyFileId, token]);

    const fetchCalls = async () => {
        if (!token || !familyFileId) return;
        setIsLoading(true);
        try {
            const callsRes = await fetch(`${API_BASE}/api/v1/professional/cases/${familyFileId}/calls`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (callsRes.ok) {
                const data = await callsRes.json();
                setCallLogs(data);
            }
        } catch (error) {
            console.error("Error fetching calls:", error);
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
                fetchCalls();
            } else {
                toast({ title: "Failed to log call", variant: "destructive" });
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
                    <h3 className="text-lg font-bold text-slate-900">Call Logs & Live Interface</h3>
                    <p className="text-sm text-slate-500">Manage professional call history</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setIsLogCallOpen(true)}
                        variant="outline"
                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                        <Phone className="h-4 w-4 mr-2" />
                        Log Manual Call
                    </Button>
                    <Button
                        onClick={() => setIsLiveMode(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100"
                    >
                        <Phone className="h-4 w-4 mr-2" />
                        Start Live Call
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
            ) : callLogs.length > 0 ? (
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
        </div>
    );
}
