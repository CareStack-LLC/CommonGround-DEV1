"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, ShieldAlert, BarChart3, Users, TrendingUp, Activity } from "lucide-react";

interface FirmAnalytics {
    firm_id: string;
    total_active_cases: number;
    total_professionals: number;
    high_conflict_cases: number;
    aria_intervention_rate_30d: number;
    total_aria_flags_30d: number;
    generated_at: string;
}

interface FirmAnalyticsDashboardProps {
    firmId: string;
    token: string;
}

export function FirmAnalyticsDashboard({ firmId, token }: FirmAnalyticsDashboardProps) {
    const [analytics, setAnalytics] = useState<FirmAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (firmId && token) {
            fetchAnalytics();
        }
    }, [firmId, token]);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/professional/firms/${firmId}/analytics`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setAnalytics(await res.json());
            }
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-gray-100 rounded-xl" />
                ))}
            </div>
        );
    }

    if (!analytics) return <div className="text-center p-8 text-gray-500">Unable to load analytics data.</div>;

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Active Cases</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.total_active_cases}</div>
                        <p className="text-xs text-muted-foreground">Active assignments</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Professionals</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.total_professionals}</div>
                        <p className="text-xs text-muted-foreground">Admins & Partners</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">High Conflict Cases</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.high_conflict_cases}</div>
                        <p className="text-xs text-muted-foreground">Requires attention</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">ARIA Intervention Rate</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.aria_intervention_rate_30d}%</div>
                        <p className="text-xs text-muted-foreground">{analytics.total_aria_flags_30d} flags in last 30d</p>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Visuals Section */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Conflict Trends
                        </CardTitle>
                        <CardDescription>Estimated conflict levels over time</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[200px] flex items-center justify-center bg-slate-50 rounded-lg border border-dashed">
                        <span className="text-sm text-muted-foreground">Trend chart visualization coming soon</span>
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Recent Activity
                        </CardTitle>
                        <CardDescription>Latest firm-wide actions</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[200px] flex items-center justify-center bg-slate-50 rounded-lg border border-dashed">
                        <span className="text-sm text-muted-foreground">Activity feed visualization coming soon</span>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
