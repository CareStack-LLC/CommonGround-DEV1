"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
    AlertTriangle, ShieldAlert, BarChart3, Users, TrendingUp, Activity,
    CheckCircle2, FolderOpen, Clock, Bot, FileText, ArrowRight, Zap, Shield,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FirmAnalytics {
    firm_id: string;
    total_active_cases: number;
    total_professionals: number;
    high_conflict_cases: number;
    aria_intervention_rate_30d: number;
    total_aria_flags_30d: number;
    total_intakes_30d?: number;
    intakes_converted_30d?: number;
    avg_compliance_score?: number;
    reports_generated_30d?: number;
    generated_at: string;
}

interface RecentActivity {
    id: string;
    activity_type: string;
    description: string;
    created_at: string;
    professional_name?: string;
}

interface FirmAnalyticsDashboardProps {
    firmId: string;
    token: string;
}

function ActivityTypIcon({ type }: { type: string }) {
    if (type?.includes("case")) return <FolderOpen className="h-3.5 w-3.5 text-teal-500" />;
    if (type?.includes("intake")) return <Bot className="h-3.5 w-3.5 text-purple-500" />;
    if (type?.includes("report")) return <FileText className="h-3.5 w-3.5 text-blue-500" />;
    if (type?.includes("member")) return <Users className="h-3.5 w-3.5 text-indigo-500" />;
    if (type?.includes("flag") || type?.includes("aria")) return <Zap className="h-3.5 w-3.5 text-amber-500" />;
    return <Activity className="h-3.5 w-3.5 text-slate-400" />;
}

export function FirmAnalyticsDashboard({ firmId, token }: FirmAnalyticsDashboardProps) {
    const [analytics, setAnalytics] = useState<FirmAnalytics | null>(null);
    const [activity, setActivity] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (firmId && token) fetchAll();
    }, [firmId, token]);

    const fetchAll = async () => {
        try {
            const [analyticsRes, activityRes] = await Promise.all([
                fetch(`${API_BASE}/api/v1/professional/firms/${firmId}/analytics`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${API_BASE}/api/v1/professional/activity-log?limit=8`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);
            if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
            if (activityRes.ok) {
                const data = await activityRes.json();
                setActivity(Array.isArray(data) ? data : data.items || []);
            }
        } catch (error) {
            console.error("Analytics fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-slate-100 rounded-xl" />)}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2].map((i) => <div key={i} className="h-56 bg-slate-100 rounded-xl" />)}
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="text-center p-12 text-slate-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Unable to load firm analytics. Please try refreshing.</p>
            </div>
        );
    }

    const conversionRate = analytics.total_intakes_30d && analytics.total_intakes_30d > 0
        ? Math.round(((analytics.intakes_converted_30d || 0) / analytics.total_intakes_30d) * 100)
        : 0;

    const complianceScore = analytics.avg_compliance_score ?? 0;
    const complianceColor = complianceScore >= 80 ? "text-emerald-600" : complianceScore >= 60 ? "text-amber-600" : "text-red-600";

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gradient-to-br from-teal-50 to-white border-teal-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-600">Active Cases</CardTitle>
                        <div className="p-1.5 bg-teal-100 rounded-lg">
                            <FolderOpen className="h-4 w-4 text-teal-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">{analytics.total_active_cases}</div>
                        <p className="text-xs text-slate-500 mt-1">Across all professionals</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-600">Team</CardTitle>
                        <div className="p-1.5 bg-blue-100 rounded-lg">
                            <Users className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">{analytics.total_professionals}</div>
                        <p className="text-xs text-slate-500 mt-1">Active members</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-600">High Conflict</CardTitle>
                        <div className="p-1.5 bg-orange-100 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-orange-600">{analytics.high_conflict_cases}</div>
                        <p className="text-xs text-slate-500 mt-1">Require attention</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-600">ARIA Rate (30d)</CardTitle>
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                            <ShieldAlert className="h-4 w-4 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-purple-600">{analytics.aria_intervention_rate_30d}%</div>
                        <p className="text-xs text-slate-500 mt-1">{analytics.total_aria_flags_30d} flags this month</p>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary KPIs */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Avg Compliance */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Shield className="h-4 w-4 text-indigo-500" />
                            Avg Compliance Score
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-4xl font-black mb-2 ${complianceColor}`}>
                            {Math.round(complianceScore)}%
                        </div>
                        <Progress value={complianceScore} className="h-2" />
                        <p className="text-xs text-slate-500 mt-2">Across all active cases</p>
                    </CardContent>
                </Card>

                {/* Intake Conversion */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Bot className="h-4 w-4 text-emerald-500" />
                            Intake Conversion (30d)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-emerald-600 mb-2">{conversionRate}%</div>
                        <Progress value={conversionRate} className="h-2" />
                        <p className="text-xs text-slate-500 mt-2">
                            {analytics.intakes_converted_30d ?? 0} of {analytics.total_intakes_30d ?? 0} converted
                        </p>
                    </CardContent>
                </Card>

                {/* Reports */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            Reports Generated (30d)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-blue-600 mb-2">
                            {analytics.reports_generated_30d ?? 0}
                        </div>
                        <p className="text-xs text-slate-500">SHA-256 verified court documents</p>
                        <Link href="/professional/reports">
                            <Button variant="link" size="sm" className="text-blue-600 px-0 mt-1 h-auto text-xs gap-1">
                                View all reports <ArrowRight className="h-3 w-3" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Activity Feed */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Recent Firm Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-4 w-4 text-slate-500" />
                            Recent Firm Activity
                        </CardTitle>
                        <CardDescription>Latest actions across the firm</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {activity.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">No recent activity</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {activity.map((item) => (
                                    <div key={item.id} className="flex items-start gap-3">
                                        <div className="p-1.5 bg-slate-100 rounded-lg shrink-0 mt-0.5">
                                            <ActivityTypIcon type={item.activity_type} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-700 leading-snug">{item.description}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {item.professional_name && (
                                                    <span className="text-xs text-slate-400">{item.professional_name}</span>
                                                )}
                                                <span className="text-xs text-slate-400 flex items-center gap-0.5">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(item.created_at).toLocaleDateString("en-US", {
                                                        month: "short", day: "numeric",
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Links */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-slate-500" />
                            Firm Management
                        </CardTitle>
                        <CardDescription>Quick access to all firm sections</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {[
                                { href: "/professional/firm/team", label: "Team Members", icon: <Users className="h-4 w-4 text-blue-500" />, desc: "Manage roles & invitations" },
                                { href: "/professional/firm/queue", label: "Case Queue", icon: <FolderOpen className="h-4 w-4 text-teal-500" />, desc: "Unassigned cases waiting" },
                                { href: "/professional/firm/templates", label: "Templates", icon: <FileText className="h-4 w-4 text-indigo-500" />, desc: "Firm document templates" },
                                { href: "/professional/firm/audit", label: "Audit Log", icon: <Shield className="h-4 w-4 text-slate-500" />, desc: "Full activity trail" },
                                { href: "/professional/reports", label: "Compliance Reports", icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, desc: "SHA-256 verified PDFs" },
                            ].map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
                                >
                                    <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-white transition-colors">
                                        {link.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800">{link.label}</p>
                                        <p className="text-xs text-slate-500">{link.desc}</p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
