"use client";

import { Card } from "@tremor/react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { UserPlus, TrendingUp, TrendingDown } from "lucide-react";

interface WeeklyLeadData {
    week: string;
    leads: number;
}

interface LeadTrackingChartProps {
    data?: WeeklyLeadData[];
}

function generateSampleData(): WeeklyLeadData[] {
    const data: WeeklyLeadData[] = [];
    const today = new Date();

    for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - i * 7);
        const label = weekStart.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
        // Simulate a realistic lead funnel with slight growth trend
        const base = 3 + Math.floor(i * 0.3);
        const noise = Math.floor(Math.random() * 4);
        data.push({ week: label, leads: Math.max(0, base + noise) });
    }
    return data;
}

export function LeadTrackingChart({ data }: LeadTrackingChartProps) {
    const chartData = data && data.length > 0 ? data : generateSampleData();

    const totalLeads = chartData.reduce((sum, d) => sum + d.leads, 0);
    const lastWeek = chartData[chartData.length - 1]?.leads ?? 0;
    const prevWeek = chartData[chartData.length - 2]?.leads ?? 0;
    const weekDelta = lastWeek - prevWeek;
    const avgPerWeek = (totalLeads / chartData.length).toFixed(1);

    // Highlight the most recent bar
    const maxIndex = chartData.length - 1;

    return (
        <Card className="border-slate-200/60 shadow-sm">
            <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl shadow-lg shadow-amber-500/20">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">
                                Lead Volume — Week over Week
                            </h3>
                            <p className="text-sm text-slate-500">
                                Incoming leads across the last 12 weeks
                            </p>
                        </div>
                    </div>

                    {/* This week vs last */}
                    <div className="text-right shrink-0">
                        <div className="flex items-center justify-end gap-2">
                            {weekDelta >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <span
                                className={`text-2xl font-bold ${weekDelta >= 0 ? "text-emerald-600" : "text-red-500"
                                    }`}
                            >
                                {weekDelta >= 0 ? "+" : ""}
                                {weekDelta}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">vs. last week</p>
                    </div>
                </div>

                <div className="h-[220px] -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e2e8f0"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="week"
                                stroke="#94a3b8"
                                fontSize={11}
                                tickLine={false}
                                axisLine={{ stroke: "#e2e8f0" }}
                                interval={2}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={11}
                                tickLine={false}
                                axisLine={{ stroke: "#e2e8f0" }}
                                allowDecimals={false}
                                width={24}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "white",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                }}
                                labelStyle={{
                                    color: "#475569",
                                    fontWeight: 600,
                                    marginBottom: "4px",
                                }}
                                formatter={(value: number | undefined) => [
                                    `${value ?? 0} lead${(value ?? 0) !== 1 ? "s" : ""}`,
                                    "",
                                ]}
                                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                            />
                            <Bar dataKey="leads" radius={[4, 4, 0, 0]}>
                                {chartData.map((_, index) => (
                                    <Cell
                                        key={index}
                                        fill={
                                            index === maxIndex
                                                ? "#f59e0b"
                                                : index >= chartData.length - 4
                                                    ? "#fb923c"
                                                    : "#fed7aa"
                                        }
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Summary stats */}
                <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            This Week
                        </p>
                        <p className="text-xl font-bold text-amber-600">{lastWeek}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            12-Week Total
                        </p>
                        <p className="text-xl font-bold text-slate-800">{totalLeads}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Weekly Avg
                        </p>
                        <p className="text-xl font-bold text-slate-600">{avgPerWeek}</p>
                    </div>
                </div>
            </div>
        </Card>
    );
}
