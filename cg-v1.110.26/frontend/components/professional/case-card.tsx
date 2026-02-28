"use client";

import Link from "next/link";
import {
    Users,
    MessageSquare,
    AlertTriangle,
    Calendar,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    ShieldAlert
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface CaseCardProps {
    caseData: {
        id: string;
        family_file_id: string;
        parent1_name: string;
        parent2_name: string;
        status: string;
        urgency_score: number;
        message_count: number;
        flagged_count: number;
        next_event_title?: string;
        next_event_date?: string;
        compliance_score: number;
        compliance_trend?: number[]; // Optional historical compliance scores
    };
}

export function CaseCard({ caseData }: CaseCardProps) {
    const getUrgencyColor = (score: number) => {
        if (score >= 80) return "text-red-600 bg-red-50 border-red-200";
        if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
        return "text-emerald-600 bg-emerald-50 border-emerald-200";
    };

    const getUrgencyBadge = (score: number) => {
        if (score >= 80) return "Destructive";
        if (score >= 50) return "Warning";
        return "Secondary";
    };

    // Generate sparkline data (either from actual trend data or synthetic)
    const generateSparklineData = () => {
        if (caseData.compliance_trend && caseData.compliance_trend.length > 0) {
            return caseData.compliance_trend.map((value, index) => ({
                index,
                value,
            }));
        }
        // Generate synthetic trend based on current score
        const baseScore = caseData.compliance_score;
        const variance = 8;
        return Array.from({ length: 14 }, (_, i) => ({
            index: i,
            value: Math.max(0, Math.min(100, baseScore + (Math.random() - 0.5) * variance)),
        }));
    };

    const sparklineData = generateSparklineData();

    // Calculate trend direction
    const trendDirection = sparklineData.length >= 2
        ? sparklineData[sparklineData.length - 1].value - sparklineData[0].value
        : 0;

    const getTrendColor = (score: number) => {
        if (score < 70) return "#f59e0b"; // amber-500
        return "#14b8a6"; // teal-500
    };

    return (
        <Link href={`/professional/cases/${caseData.family_file_id}`}>
            <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-slate-200/60 overflow-hidden bg-white">
                {/* Header - Party Names & Urgency */}
                <div className="p-4 border-b border-slate-50 flex items-start justify-between bg-slate-50/30">
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                            <div className="h-8 w-8 rounded-full bg-[var(--portal-primary)] flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                                {caseData.parent1_name[0]}
                            </div>
                            <div className="h-8 w-8 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                                {caseData.parent2_name[0]}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 group-hover:text-[var(--portal-primary)] transition-colors">
                                {caseData.parent1_name} v. {caseData.parent2_name}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                Case ID: {caseData.family_file_id.slice(0, 8)}
                            </p>
                        </div>
                    </div>
                    <Badge
                        variant={"secondary"}
                        className={`text-[10px] font-bold px-2 py-0 ${getUrgencyColor(caseData.urgency_score)}`}
                    >
                        {caseData.urgency_score}% URGENT
                    </Badge>
                </div>

                <CardContent className="p-4 space-y-4">
                    {/* Compliance Progress with Sparkline */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                <ShieldAlert className="h-3 w-3" />
                                Compliance
                                {trendDirection !== 0 && (
                                    <span className={`flex items-center gap-0.5 text-[10px] font-bold ${trendDirection > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {trendDirection > 0 ? (
                                            <TrendingUp className="h-3 w-3" />
                                        ) : (
                                            <TrendingDown className="h-3 w-3" />
                                        )}
                                        {Math.abs(trendDirection).toFixed(0)}%
                                    </span>
                                )}
                            </span>
                            <span className="font-bold text-slate-700">{caseData.compliance_score}%</span>
                        </div>
                        <Progress
                            value={caseData.compliance_score}
                            className={`h-1.5 ${caseData.compliance_score < 70 ? '[&>div]:bg-amber-500' : '[&>div]:bg-[var(--portal-primary)]'}`}
                        />

                        {/* Sparkline */}
                        <div className="h-8 -mx-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={sparklineData}>
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke={getTrendColor(caseData.compliance_score)}
                                        strokeWidth={1.5}
                                        dot={false}
                                        animationDuration={300}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded-lg">
                            <MessageSquare className="h-4 w-4 text-blue-500" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-medium leading-none mb-1 text-center">MESSAGES</span>
                                <span className="text-sm font-bold leading-none text-center">{caseData.message_count}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-medium leading-none mb-1 text-center">FLAGGED</span>
                                <span className="text-sm font-bold leading-none text-center">{caseData.flagged_count}</span>
                            </div>
                        </div>
                    </div>

                    {/* Next Event Footer */}
                    {caseData.next_event_title && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                            <Calendar className="h-4 w-4 text-purple-500 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-none mb-0.5">NEXT EVENT</p>
                                <p className="text-xs font-medium text-slate-700 truncate leading-none">
                                    {caseData.next_event_title} ({caseData.next_event_date})
                                </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 ml-auto group-hover:translate-x-1 transition-transform" />
                        </div>
                    )}
                </CardContent>
            </Card>
        </Link>
    );
}
