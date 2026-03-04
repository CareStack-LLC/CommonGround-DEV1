"use client";

import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { MessageSquare, AlertTriangle } from "lucide-react";

interface ARIACategoryData {
  category: string;
  count: number;
  percentage?: number;
}

interface ARIACategoryChartProps {
  data: ARIACategoryData[];
  totalMessages?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  hostility: "#ef4444",
  blame: "#f97316",
  "passive-aggressive": "#f59e0b",
  profanity: "#dc2626",
  dismissive: "#fb923c",
  controlling: "#ea580c",
  threatening: "#b91c1c",
  sarcasm: "#fbbf24",
};

const CATEGORY_LABELS: Record<string, string> = {
  hostility: "Hostility",
  blame: "Blame",
  "passive-aggressive": "Passive-Aggressive",
  profanity: "Profanity",
  dismissive: "Dismissive",
  controlling: "Controlling",
  threatening: "Threatening",
  sarcasm: "Sarcasm",
};

export function ARIACategoryChart({ data, totalMessages = 0 }: ARIACategoryChartProps) {
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const topCategories = sortedData.slice(0, 6);

  const chartData = topCategories.map((item) => ({
    category: CATEGORY_LABELS[item.category] || item.category,
    count: item.count,
    fill: CATEGORY_COLORS[item.category] || "#94a3b8",
  }));

  const totalInterventions = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="border-slate-200/60 shadow-sm">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl shadow-lg shadow-amber-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">ARIA Intervention Categories</h3>
              <p className="text-sm text-slate-500">Top communication issues detected</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-amber-600">{totalInterventions}</div>
            <p className="text-xs text-slate-500 mt-1">Total Flags</p>
          </div>
        </div>

        {chartData.length > 0 ? (
          <>
            <div className="h-[280px] -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    width={75}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    labelStyle={{ color: "#475569", fontWeight: 600, marginBottom: "4px" }}
                    formatter={(value) => [value || 0, "Occurrences"]}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} animationDuration={300}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Legend */}
            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-3 gap-3">
              {chartData.map((item) => (
                <div key={item.category} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.fill }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{item.category}</p>
                    <p className="text-[10px] text-slate-500">
                      {item.count} ({totalMessages > 0 ? ((item.count / totalMessages) * 100).toFixed(1) : 0}%)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No intervention data available</p>
          </div>
        )}
      </div>
    </Card>
  );
}
