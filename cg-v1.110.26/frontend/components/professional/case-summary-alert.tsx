"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  CheckCircle2,
  Clock,
  MessageSquare,
} from "lucide-react";

interface CaseSummaryData {
  compliance_score: number;
  compliance_trend: "up" | "down" | "stable";
  priority_level: "low" | "medium" | "high" | "urgent";
  key_insights: string[];
  action_items: string[];
  health_status: "excellent" | "good" | "fair" | "concerning";
}

interface CaseSummaryAlertProps {
  data: CaseSummaryData;
}

export function CaseSummaryAlert({ data }: CaseSummaryAlertProps) {
  const healthColors = {
    excellent: {
      bg: "bg-gradient-to-r from-emerald-50 to-teal-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    good: {
      bg: "bg-gradient-to-r from-teal-50 to-cyan-50",
      border: "border-teal-200",
      text: "text-teal-700",
      badge: "bg-teal-100 text-teal-700 border-teal-200",
    },
    fair: {
      bg: "bg-gradient-to-r from-amber-50 to-orange-50",
      border: "border-amber-200",
      text: "text-amber-700",
      badge: "bg-amber-100 text-amber-700 border-amber-200",
    },
    concerning: {
      bg: "bg-gradient-to-r from-rose-50 to-red-50",
      border: "border-rose-200",
      text: "text-rose-700",
      badge: "bg-rose-100 text-rose-700 border-rose-200",
    },
  };

  const colors = healthColors[data.health_status];

  return (
    <Card className={`${colors.bg} ${colors.border} border-2 shadow-lg overflow-hidden`}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 ${colors.badge} rounded-xl shadow-md`}>
              <Lightbulb className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                What You Need to Know
                <Badge variant="outline" className={`${colors.badge} border capitalize text-[10px]`}>
                  {data.health_status}
                </Badge>
              </h3>
              <p className="text-sm text-slate-600">Quick case overview and priority actions</p>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <Shield className={`h-5 w-5 ${colors.text}`} />
              <span className={`text-3xl font-bold ${colors.text}`}>{data.compliance_score}%</span>
              {data.compliance_trend === "up" && (
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              )}
              {data.compliance_trend === "down" && (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">Compliance Score</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Key Insights */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1 w-6 bg-blue-500 rounded-full" />
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Key Insights
              </h4>
            </div>
            <div className="space-y-2">
              {data.key_insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 bg-white/70 backdrop-blur-sm rounded-lg border border-slate-200/50 shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-700 leading-snug">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Items */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-1 w-6 ${data.action_items.length > 0 ? "bg-amber-500" : "bg-emerald-500"} rounded-full`} />
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                {data.action_items.length > 0 ? "Action Required" : "All Clear"}
              </h4>
            </div>
            <div className="space-y-2">
              {data.action_items.length > 0 ? (
                data.action_items.map((action, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 bg-white/70 backdrop-blur-sm rounded-lg border border-amber-200 shadow-sm"
                  >
                    <Clock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-700 leading-snug">{action}</p>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 p-3 bg-white/70 backdrop-blur-sm rounded-lg border border-emerald-200 shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm text-emerald-700 font-medium">
                    No urgent actions required. Case is on track.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Helper to generate sample data for testing
export function generateSampleCaseSummary(
  complianceScore: number = 76
): CaseSummaryData {
  const health_status =
    complianceScore >= 90
      ? "excellent"
      : complianceScore >= 75
      ? "good"
      : complianceScore >= 60
      ? "fair"
      : "concerning";

  return {
    compliance_score: complianceScore,
    compliance_trend: complianceScore >= 75 ? "up" : complianceScore >= 60 ? "stable" : "down",
    priority_level: complianceScore >= 75 ? "low" : complianceScore >= 60 ? "medium" : "high",
    health_status,
    key_insights: [
      "Exchange compliance has improved 12% over the last 30 days",
      "Both parents are responding to ARIA-mediated messages within 4 hours on average",
      "Financial obligations are current with no outstanding arrears",
    ],
    action_items:
      complianceScore < 75
        ? [
            "Follow up on 2 missed custody exchanges from last week",
            "Review recent ARIA flagged messages for escalation patterns",
          ]
        : [],
  };
}
