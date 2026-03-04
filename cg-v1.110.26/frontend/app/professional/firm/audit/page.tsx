"use client";

import { useState, useEffect } from "react";
import { useProfessionalAuth } from "../../layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Search, Filter, FileText, Shield, User, Clock } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AuditLogEntry {
    id: string;
    firm_id: string;
    actor_id: string;
    event_type: string;
    description: string;
    event_metadata: Record<string, any> | null;
    created_at: string;
    actor_name: string | null;
    actor_email: string | null;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
    member_invited: "Member Invited",
    member_joined: "Member Joined",
    member_removed: "Member Removed",
    role_updated: "Role Updated",
    case_assigned: "Case Assigned",
    settings_updated: "Settings Updated",
    template_created: "Template Created",
    template_updated: "Template Updated",
    firm_updated: "Firm Updated",
};

export default function FirmAuditLogPage() {
    const { token, activeFirm } = useProfessionalAuth();
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");

    useEffect(() => {
        if (token && activeFirm) {
            fetchLogs();
        }
    }, [token, activeFirm]);

    const fetchLogs = async () => {
        if (!activeFirm) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/v1/professional/firms/${activeFirm.id}/audit-log?limit=100`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setLogs(data);
            }
        } catch (err) {
            console.error("Error fetching audit logs:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredLogs = logs.filter((log) => {
        const matchesSearch =
            log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.actor_name && log.actor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.actor_email && log.actor_email.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesType = eventTypeFilter === "all" || log.event_type === eventTypeFilter;

        return matchesSearch && matchesType;
    });

    const uniqueEventTypes = Array.from(new Set(logs.map((log) => log.event_type)));

    if (!activeFirm) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="p-8 text-center">
                        <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h2 className="text-lg font-semibold mb-2">No Firm Selected</h2>
                        <p className="text-gray-500">Select a firm to view audit logs.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <Link href="/professional/firm" className="hover:text-gray-700 flex items-center gap-1">
                            <ArrowLeft className="h-4 w-4" />
                            Firm Settings
                        </Link>
                    </div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="h-6 w-6" />
                        Compliance Audit Log
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Track all administrative actions and changes within your firm
                    </p>
                </div>
                <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="p-4 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search by description or user..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                        <SelectTrigger className="w-[200px]">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                <SelectValue placeholder="Filter by event" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Events</SelectItem>
                            {uniqueEventTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {EVENT_TYPE_LABELS[type] || type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Activity History</CardTitle>
                    <CardDescription>
                        Showing {filteredLogs.length} events
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
                            ))}
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No audit logs found matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {EVENT_TYPE_LABELS[log.event_type] || log.event_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {log.description}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <User className="h-3 w-3 text-gray-400" />
                                                    <span className="text-sm">
                                                        {log.actor_name || log.actor_email || "System"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(log.created_at), "MMM d, h:mm a")}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
