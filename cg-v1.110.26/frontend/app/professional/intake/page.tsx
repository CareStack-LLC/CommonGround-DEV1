"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Plus,
    Loader2,
    RefreshCw,
    TrendingUp,
    Bot,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProfessionalAuth } from "../layout";
import { CustodyIntakeTable, IntakeSession } from "@/components/professional/intake/custody-intake-table";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface IntakeStats {
    total: number;
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
    completion_rate: number;
}

export default function IntakePage() {
    const router = useRouter();
    const { token, profile, isLoading: authLoading } = useProfessionalAuth();

    const [links, setLinks] = useState<IntakeSession[]>([]);
    const [stats, setStats] = useState<IntakeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");

    const fetchLinks = useCallback(async () => {
        if (!token) return;
        try {
            const params = new URLSearchParams();
            if (statusFilter !== "all") params.set("status", statusFilter);
            params.set("limit", "100");

            const res = await fetch(
                `${API_BASE}/api/v1/professional/intake/sessions?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                const items = Array.isArray(data) ? data : data.items || [];
                // Map backend field names to what the table expects if necessary
                const mappedItems = items.map((item: any) => ({
                    ...item,
                    expires_at: item.access_link_expires_at
                }));
                setLinks(mappedItems);
            }
        } catch (err) {
            console.error("Error fetching links:", err);
        }
    }, [token, statusFilter]);

    const fetchStats = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/intake/stats`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error("Error fetching stats:", err);
        }
    }, [token]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchLinks(), fetchStats()]);
            setLoading(false);
        };
        load();
    }, [fetchLinks, fetchStats]);



    const completionRate = stats
        ? stats.total > 0
            ? Math.round(((stats.completed + (stats as any).reviewed || 0) / stats.total) * 100)
            : 0
        : 0;

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Intake Link Tracking</h1>
                    <p className="text-muted-foreground">
                        Generate, track, and manage intake session links
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            fetchLinks();
                            fetchStats();
                        }}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={() => router.push("/professional/intake/new")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New ARIA Intake
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Total Sent</p>
                            <p className="text-2xl font-bold">{stats.total}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Pending</p>
                            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">In Progress</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Completed</p>
                            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs text-muted-foreground">Completion Rate</p>
                                <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
                            </div>
                            <p className="text-2xl font-bold text-indigo-600">{completionRate}%</p>
                            <Progress value={completionRate} className="h-1.5 mt-1" />
                        </CardContent>
                    </Card>
                </div>
            )}


            {/* Filter Row */}
            <div className="flex items-center gap-2 mb-4">
                <p className="text-sm font-medium text-muted-foreground">Filter:</p>
                {["all", "pending", "active", "completed", "cancelled"].map((s) => (
                    <Button
                        key={s}
                        variant={statusFilter === s ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter(s)}
                        className={
                            statusFilter === s
                                ? "bg-indigo-600 text-white"
                                : "text-muted-foreground"
                        }
                    >
                        {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </Button>
                ))}
            </div>

            {/* Data Table */}
            <CustodyIntakeTable
                data={links}
                isLoading={loading}
                onRefresh={fetchLinks}
            />
        </div>
    );
}
