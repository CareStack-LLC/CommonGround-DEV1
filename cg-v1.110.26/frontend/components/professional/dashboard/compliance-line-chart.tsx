"use client";

import { Card } from "@tremor/react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Shield } from "lucide-react";

interface ComplianceData {
  date: string;
  firm_avg: number;
  parent_a_avg?: number;
  parent_b_avg?: number;
}

interface ComplianceLineChartProps {
  data?: ComplianceData[];
  period?: "7d" | "30d" | "90d";
}

export function ComplianceLineChart({ data, period = "30d" }: ComplianceLineChartProps) {
  // Generate sample data if none provided
  const chartData = data || generateSampleData(period);

  // Calculate trend
  const firstValue = chartData[0]?.firm_avg || 0;
  const lastValue = chartData[chartData.length - 1]?.firm_avg || 0;
  const trend = lastValue - firstValue;

  return (
    <Card className="border-slate-200/60 shadow-sm">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-xl shadow-lg shadow-teal-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Firm-Wide Compliance Trend</h3>
              <p className="text-sm text-slate-500">
                {period === "7d" ? "Last 7 days" : period === "30d" ? "Last 30 days" : "Last 90 days"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <TrendingUp className={`h-4 w-4 ${trend >= 0 ? "text-emerald-600" : "text-red-600 rotate-180"}`} />
              <span className={`text-2xl font-bold ${trend >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">vs. {period === "7d" ? "7" : period === "30d" ? "30" : "90"} days ago</p>
          </div>
        </div>

        <div className="h-[280px] -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                labelStyle={{ color: "#475569", fontWeight: 600, marginBottom: "4px" }}
                formatter={(value) => [`${(Number(value) || 0).toFixed(1)}%`, ""]}
              />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="line"
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    firm_avg: "Firm Average",
                    parent_a_avg: "Parent A Avg",
                    parent_b_avg: "Parent B Avg",
                  };
                  return <span className="text-xs font-medium text-slate-600">{labels[value] || value}</span>;
                }}
              />
              <Line
                type="monotone"
                dataKey="firm_avg"
                stroke="#14b8a6"
                strokeWidth={3}
                dot={{ fill: "#14b8a6", r: 4 }}
                activeDot={{ r: 6, fill: "#14b8a6" }}
                animationDuration={300}
              />
              <Line
                type="monotone"
                dataKey="parent_a_avg"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "#3b82f6", r: 3 }}
                activeDot={{ r: 5 }}
                animationDuration={300}
              />
              <Line
                type="monotone"
                dataKey="parent_b_avg"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "#8b5cf6", r: 3 }}
                activeDot={{ r: 5 }}
                animationDuration={300}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Average</p>
            <p className="text-xl font-bold text-teal-600">
              {(chartData.reduce((sum, d) => sum + d.firm_avg, 0) / chartData.length).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Peak</p>
            <p className="text-xl font-bold text-emerald-600">
              {Math.max(...chartData.map((d) => d.firm_avg)).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Lowest</p>
            <p className="text-xl font-bold text-amber-600">
              {Math.min(...chartData.map((d) => d.firm_avg)).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function generateSampleData(period: "7d" | "30d" | "90d"): ComplianceData[] {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const data: ComplianceData[] = [];

  const baseCompliance = 75;
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Generate trending data with variance
    const trendFactor = (days - i) / days; // 0 to 1
    const variance = (Math.random() - 0.5) * 8;

    data.push({
      date: period === "90d"
        ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
      firm_avg: Math.max(60, Math.min(95, baseCompliance + (trendFactor * 8) + variance)),
      parent_a_avg: Math.max(55, Math.min(92, baseCompliance + (trendFactor * 6) + variance - 3)),
      parent_b_avg: Math.max(58, Math.min(93, baseCompliance + (trendFactor * 7) + variance + 2)),
    });
  }

  return data;
}
