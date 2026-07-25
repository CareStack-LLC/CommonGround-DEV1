"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  MessageCircle,
  RefreshCw,
  DollarSign,
  Download,
  CheckCircle2,
  Calendar,
  Hash,
  ArrowRight,
  Shield,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProfessionalAuth } from "../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Report type configurations
const REPORT_TYPES = [
  {
    id: "full_compliance",
    title: "Full Compliance Report",
    description: "Complete overview of parenting plan adherence across all areas",
    icon: FileText,
    color: "from-cg-sage to-cg-slate",
    bgColor: "bg-background",
    borderColor: "border-cg-sage/20",
    textColor: "text-foreground",
    roles: ["Attorney", "GAL", "Mediator"],
    includes: [
      "Exchange compliance (on-time rates, GPS verification)",
      "Financial compliance (support payments, arrears)",
      "Communication compliance (ARIA interventions)",
      "Overall compliance score and trends",
    ],
  },
  {
    id: "aria_analysis",
    title: "Communication Analysis",
    description: "Detailed communication patterns with before/after ARIA intervention examples",
    icon: MessageCircle,
    color: "from-cg-amber to-[#E09520]",
    bgColor: "bg-cg-amber-subtle",
    borderColor: "border-[#FBE3BF]",
    textColor: "text-[#B8791A]",
    roles: ["Attorney", "GAL", "Parenting Coordinator"],
    includes: [
      "ARIA intervention history with before/after examples",
      "Sentiment analysis and tone trends",
      "Communication pattern analysis (time of day, triggers)",
      "Escalation detection and risk flags",
    ],
  },
  {
    id: "exchange_compliance",
    title: "Exchange Compliance Report",
    description: "Custody exchange patterns, GPS tracking, and schedule adherence",
    icon: RefreshCw,
    color: "from-cg-sage to-cg-sage-light",
    bgColor: "bg-background",
    borderColor: "border-cg-sage/20",
    textColor: "text-foreground",
    roles: ["Attorney", "GAL"],
    includes: [
      "On-time vs late vs missed exchanges",
      "GPS verification tracking",
      "Per-parent compliance breakdown",
      "Pattern analysis (days of week, locations)",
    ],
  },
  {
    id: "financial_compliance",
    title: "Financial Compliance Report",
    description: "Support payment history, arrears tracking, and transaction records",
    icon: DollarSign,
    color: "from-foreground to-cg-slate",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    textColor: "text-foreground",
    roles: ["Attorney", "Mediator"],
    includes: [
      "Payment history (on-time, late, missed)",
      "Arrears calculation",
      "ClearFund transaction log",
      "Per-parent payment breakdown",
    ],
  },
  {
    id: "aria_assessment",
    title: "ARIA Assessment",
    description: "AI-powered good-faith scoring and cooperation analysis per parent",
    icon: Shield,
    color: "from-cg-sage to-cg-slate",
    bgColor: "bg-cg-sage-subtle",
    borderColor: "border-cg-sage/30",
    textColor: "text-foreground",
    roles: ["GAL", "Parenting Coordinator", "Mediator"],
    includes: [
      "Good-faith scores per parent",
      "Communication tone analysis over time",
      "ARIA intervention summary and outcomes",
      "Cooperation vs conflict ratio",
    ],
  },
  {
    id: "monthly_summary",
    title: "Monthly Summary",
    description: "Rolling 30-day snapshot for ongoing case monitoring",
    icon: Calendar,
    color: "from-slate-500 to-slate-700",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    textColor: "text-slate-700",
    roles: ["Attorney", "GAL", "Parenting Coordinator", "Mediator"],
    includes: [
      "Exchange compliance for the period",
      "Message volume and ARIA flags",
      "Financial activity summary",
      "Key events and timeline highlights",
    ],
  },
];

interface RecentReport {
  id: string;
  title: string;
  report_type: string;
  family_file_id: string;
  sha256_hash: string;
  export_format: string;
  created_at: string;
  status: string;
}

export default function ReportsPage() {
  const { token } = useProfessionalAuth();
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchRecentReports();
    }
  }, [token]);

  const fetchRecentReports = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/professional/reports?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecentReports(Array.isArray(data) ? data : data.reports || []);
      }
    } catch (e) {
      console.error("Failed to fetch recent reports:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const getReportTypeInfo = (reportType: string) => {
    return REPORT_TYPES.find((t) => t.id === reportType) || REPORT_TYPES[0];
  };

  const downloadReport = async (reportId: string) => {
    if (!token) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/professional/reports/${reportId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to download report:", e);
    }
  };

  return (
    <div className="space-y-8">
      <link
        href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Outfit:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div className="pb-2">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Reports
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Generate verified evidence packages and compliance summaries
        </p>
      </div>

      {/* Report Type Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {REPORT_TYPES.map((reportType) => {
          const Icon = reportType.icon;
          return (
            <Card
              key={reportType.id}
              className="border border-slate-200 bg-white hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden"
            >
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 bg-gradient-to-br ${reportType.color} text-white rounded-xl shadow-sm`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base text-slate-900 font-semibold">
                      {reportType.title}
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {reportType.description}
                    </CardDescription>
                    {reportType.roles && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {reportType.roles.map((role) => (
                          <span key={role} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background text-foreground border border-cg-sage/15">
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* What's Included */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-slate-500">
                    What's Included
                  </p>
                  <ul className="space-y-1.5">
                    {reportType.includes.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-cg-sage" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Generate Button */}
                <div className="flex items-center gap-2">
                  <Link href={`/professional/reports/generate?type=${reportType.id}`} className="flex-1">
                    <Button className="w-full bg-cg-sage hover:bg-[#2D8A6E] text-white rounded-xl shadow-sm font-semibold">
                      Generate Report
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="icon" asChild className="border border-slate-200 rounded-xl">
                    <Link href={`/professional/reports/examples?type=${reportType.id}`}>
                      <FileText className="h-4 w-4 text-slate-500" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Reports Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Reports
          </h2>
          <Button variant="outline" size="sm" onClick={fetchRecentReports} disabled={isLoading} className="border-slate-200 hover:bg-background rounded-xl h-9">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {recentReports.length === 0 ? (
          <Card className="border border-dashed border-slate-200 bg-white rounded-2xl">
            <CardContent className="py-16 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-background rounded-2xl mb-5">
                <FileText className="h-10 w-10 text-cg-sage" />
              </div>
              <p className="text-lg font-semibold text-slate-900 mb-1.5">No reports generated yet</p>
              <p className="text-sm text-slate-500 max-w-sm">
                Select a report type above to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentReports.map((report) => {
              const reportTypeInfo = getReportTypeInfo(report.report_type);
              const Icon = reportTypeInfo.icon;

              return (
                <Card key={report.id} className="border border-slate-200 bg-white hover:shadow-md transition-all rounded-2xl overflow-hidden">
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-2 bg-gradient-to-br ${reportTypeInfo.color} text-white rounded-xl shadow-sm`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 truncate">
                          {report.title || reportTypeInfo.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span className="text-xs text-slate-500">
                            {new Date(report.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SHA-256 Hash */}
                    {report.sha256_hash && (
                      <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                        <Hash className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="text-[10px] font-mono text-slate-500 truncate">
                          {report.sha256_hash.slice(0, 24)}...
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-cg-sage hover:bg-[#2D8A6E] text-white rounded-lg shadow-sm"
                        onClick={() => downloadReport(report.id)}
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Download
                      </Button>
                      <Link href={`/professional/reports/${report.id}/verify`}>
                        <Button size="sm" variant="outline" className="text-xs border-slate-200 rounded-lg">
                          <Shield className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* SHA-256 Info Box */}
        <div className="mt-6 p-4 rounded-2xl bg-background border border-cg-sage/10">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-cg-sage mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">SHA-256 Verification</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Every report is cryptographically signed with a SHA-256 hash. Any modification after export
                invalidates the hash, ensuring tamper-evident documents that can be verified at any time.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .serif {
          font-family: "Crimson Pro", serif;
        }
        .sans {
          font-family: "Outfit", sans-serif;
        }
      `}</style>
    </div>
  );
}
