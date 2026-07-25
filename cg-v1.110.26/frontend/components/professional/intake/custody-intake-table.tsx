"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
    MoreHorizontal,
    Copy,
    CheckCircle2,
    Clock,
    XCircle,
    Send,
    Eye,
    ExternalLink,
    Trash2,
    AlertCircle
} from "lucide-react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export interface IntakeSession {
    id: string;
    client_name: string;
    client_email: string;
    intake_type: string;
    status: string;
    access_token: string;
    intake_link: string;
    session_number: string;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    expires_at: string | null;
    message_count: number;
}

interface CustodyIntakeTableProps {
    data: IntakeSession[];
    isLoading: boolean;
    onRefresh?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: {
        label: "Pending",
        color: "bg-[#FEF7ED] text-[#B8791A] border-[#FBE3BF]",
        icon: <Clock className="h-3.5 w-3.5" />,
    },
    active: {
        label: "In Progress",
        color: "bg-[#E0EFF8] text-[#1E4E6B] border-[#E0EFF8]",
        icon: <Eye className="h-3.5 w-3.5" />,
    },
    completed: {
        label: "Completed",
        color: "bg-[#E8F4F0] text-[#2D8A70] border-[#C5E5DB]",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    reviewed: {
        label: "Reviewed",
        color: "bg-[#E8F4F0] text-[#2D8A70] border-[#C5E5DB]",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    cancelled: {
        label: "Cancelled",
        color: "bg-slate-50 text-slate-600 border-slate-200",
        icon: <XCircle className="h-3.5 w-3.5" />,
    },
    expired: {
        label: "Expired",
        color: "bg-[#FEE2E2] text-[#C53030] border-[#FEE2E2]",
        icon: <AlertCircle className="h-3.5 w-3.5" />,
    },
};

export function CustodyIntakeTable({ data, isLoading, onRefresh }: CustodyIntakeTableProps) {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const copyLink = (token: string, id: string) => {
        const url = `${window.location.origin}/intake/${token}`;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), "MMM d, yyyy");
        } catch (e) {
            return dateString;
        }
    };

    const isExpired = (expiresAt: string | null) => {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    };

    if (isLoading) {
        return (
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[250px]">Client</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 border rounded-md bg-slate-50 text-center">
                <p className="text-muted-foreground mb-2">No intake sessions found.</p>
                <Button variant="outline" onClick={onRefresh}>Refresh</Button>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[250px]">Client</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row) => {
                        const expired = isExpired(row.expires_at);
                        const statusKey = expired && row.status !== 'completed' && row.status !== 'reviewed' ? 'expired' : row.status;
                        const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;

                        return (
                            <TableRow key={row.id}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{row.client_name}</span>
                                        <span className="text-xs text-muted-foreground">{row.client_email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`${status.color} border gap-1 whitespace-nowrap`}>
                                        {status.icon}
                                        {status.label}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <span className="capitalize text-sm">{row.intake_type.replace(/_/g, " ")}</span>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm text-muted-foreground">{formatDate(row.created_at)}</span>
                                </TableCell>
                                <TableCell>
                                    <span className={`text-sm ${expired ? "text-[#C53030] font-medium" : "text-muted-foreground"}`}>
                                        {row.expires_at ? formatDate(row.expires_at) : "Never"}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button aria-label="Copy"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => copyLink(row.access_token, row.id)}
                                            title="Copy Link"
                                        >
                                            {copiedId === row.id ? (
                                                <CheckCircle2 className="h-4 w-4 text-[#2D8A70]" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <Link href={`/professional/intake/${row.id}`}>
                                                    <DropdownMenuItem>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                </Link>
                                                <DropdownMenuItem onClick={() => window.open(`/intake/${row.access_token}`, '_blank')}>
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    Preview Form
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-[#C53030]"
                                                    disabled={row.status === 'completed' || row.status === 'cancelled'}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Cancel Session
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
