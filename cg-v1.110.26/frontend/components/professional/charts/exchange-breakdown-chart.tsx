"use client";

import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { CheckCircle2, Clock, XCircle, Calendar } from "lucide-react";

interface ExchangeBreakdownData {
  on_time: number;
  late: number;
  missed: number;
  total: number;
}

interface ExchangeBreakdownChartProps {
  data: ExchangeBreakdownData;
}

export function ExchangeBreakdownChart({ data }: ExchangeBreakdownChartProps) {
  const chartData = [
    { name: "On Time", value: data.on_time, color: "#14b8a6", icon: CheckCircle2 },
    { name: "Late", value: data.late, color: "#f59e0b", icon: Clock },
    { name: "Missed", value: data.missed, color: "#ef4444", icon: XCircle },
  ].filter((item) => item.value > 0);

  const onTimeRate = data.total > 0 ? ((data.on_time / data.total) * 100).toFixed(1) : "0.0";

  return (
    <Card className="border-slate-200/60 shadow-sm">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl shadow-lg shadow-amber-500/20">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Exchange Compliance</h3>
              <p className="text-sm text-slate-500">Last 30 days breakdown</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-teal-600">{onTimeRate}%</div>
            <p className="text-xs text-slate-500 mt-1">On-Time Rate</p>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="w-full lg:w-1/2 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    animationDuration={300}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value) => [value || 0, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full lg:w-1/2 space-y-3">
              {chartData.map((item) => {
                const Icon = item.icon;
                const percentage = ((item.value / data.total) * 100).toFixed(1);
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${item.color}15` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: item.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{item.name}</p>
                        <p className="text-xs text-slate-500">{percentage}% of total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-900">{item.value}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                        Exchanges
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No exchange data for this period</p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Total
            </p>
            <p className="text-xl font-bold text-slate-900">{data.total}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Successful
            </p>
            <p className="text-xl font-bold text-teal-600">{data.on_time + data.late}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Completion
            </p>
            <p className="text-xl font-bold text-emerald-600">
              {data.total > 0
                ? (((data.on_time + data.late) / data.total) * 100).toFixed(0)
                : 0}
              %
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
