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
    description: "Comprehensive evidence package for court submission",
    icon: FileText,
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    includes: [
      "Exchange compliance (on-time rates, GPS verification)",
      "Financial compliance (support payments, arrears)",
      "Communication compliance (ARIA interventions)",
      "Overall compliance score and trends",
    ],
  },
  {
    id: "aria_analysis",
    title: "ARIA Communication Analysis",
    description: "Detailed hostile communication patterns with before/after examples",
    icon: MessageCircle,
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
    includes: [
      "ARIA intervention history with before/after examples",
      "Sentiment analysis and hostility trends",
      "Communication pattern analysis (time of day, triggers)",
      "Threat detection and escalations",
    ],
  },
  {
    id: "exchange_compliance",
    title: "Exchange Compliance Report",
    description: "Focused analysis of custody exchange violations",
    icon: RefreshCw,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    textColor: "text-emerald-700",
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
    description: "Child support payment tracking and arrears calculation",
    icon: DollarSign,
    color: "from-purple-500 to-pink-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
    includes: [
      "Payment history (on-time, late, missed)",
      "Arrears calculation",
      "ClearFund transaction log",
      "Per-parent payment breakdown",
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
    window.open(
      `${API_BASE}/api/v1/professional/reports/${reportId}/download`,
      "_blank"
    );
  };

  return (
    <div className="space-y-8">
      <link
        href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Outfit:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div className="relative overflow-hidden rounded-sm bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 px-8 py-8 shadow-2xl border-2 border-amber-900/40">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />
        <div className="flex items-start gap-5">
          <div className="p-4 bg-amber-50 border-2 border-amber-900/20 rounded-sm shadow-xl shrink-0">
            <FileText className="h-8 w-8 text-amber-900" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="serif text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
              Court-Ready Reports
            </h1>
            <p className="sans text-sm text-amber-100 mt-2">
              Generate SHA-256 verified evidence packages for court submission
            </p>
          </div>
        </div>
      </div>

      {/* Report Type Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {REPORT_TYPES.map((reportType) => {
          const Icon = reportType.icon;
          return (
            <Card
              key={reportType.id}
              className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/30 to-white hover:shadow-2xl transition-all duration-200 relative"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
              <CardHeader className="border-b-2 border-amber-900/10">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 bg-gradient-to-br ${reportType.color} text-white rounded-sm shadow-md border-2 border-white/20`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="serif text-lg text-slate-900 font-bold">
                      {reportType.title}
                    </CardTitle>
                    <CardDescription className="sans text-sm mt-1">
                      {reportType.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* What's Included */}
                <div className={`${reportType.bgColor} border-2 ${reportType.borderColor} rounded-sm p-4 shadow-sm`}>
                  <p className={`sans text-xs font-bold uppercase tracking-wider mb-2 ${reportType.textColor}`}>
                    What's Included
                  </p>
                  <ul className="space-y-1.5">
                    {reportType.includes.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 sans text-sm text-slate-700">
                        <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${reportType.textColor}`} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Generate Button */}
                <div className="flex items-center gap-2">
                  <Link href={`/professional/reports/generate?type=${reportType.id}`} className="flex-1">
                    <Button className="w-full bg-amber-900 hover:bg-amber-800 text-white border-2 border-amber-900/40 shadow-lg sans font-semibold">
                      Generate Report
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="icon" asChild className="border-2 border-slate-300">
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
          <h2 className="serif text-lg font-bold text-slate-900 flex items-center gap-2">
            <div className="h-1 w-6 bg-amber-900 rounded-full" />
            Recent Reports
          </h2>
          <Button variant="outline" size="sm" onClick={fetchRecentReports} disabled={isLoading} className="border-2 border-slate-300 sans">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {recentReports.length === 0 ? (
          <Card className="border-dashed border-2 border-amber-900/30 bg-gradient-to-br from-amber-50/30 to-white shadow-sm">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-amber-900/40 mb-3" />
              <p className="serif text-slate-900 font-bold">No reports generated yet</p>
              <p className="sans text-sm text-slate-600 mt-1">
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
                <Card key={report.id} className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/20 to-white hover:shadow-lg transition-all relative">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-2 bg-gradient-to-br ${reportTypeInfo.color} text-white rounded-sm border-2 border-white/20`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="serif font-bold text-sm text-slate-900 truncate">
                          {report.title || reportTypeInfo.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-amber-900" />
                          <span className="sans text-xs text-slate-600">
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
                      <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 bg-amber-50 rounded-sm border-2 border-amber-900/20">
                        <Hash className="h-3 w-3 text-amber-900 shrink-0" />
                        <span className="text-[10px] font-mono text-slate-600 truncate">
                          {report.sha256_hash.slice(0, 24)}...
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1 sans text-xs bg-amber-900 hover:bg-amber-800 text-white border-2 border-amber-900/40"
                        onClick={() => downloadReport(report.id)}
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Download
                      </Button>
                      <Link href={`/professional/reports/${report.id}/verify`}>
                        <Button size="sm" variant="outline" className="sans text-xs border-2 border-slate-300">
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
        <Card className="mt-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-900/30 shadow-sm relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-900 via-blue-600 to-blue-900"></div>
          <CardContent className="py-4 px-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-900 mt-0.5 shrink-0" />
              <div>
                <p className="serif text-sm font-bold text-blue-900">SHA-256 Cryptographic Verification</p>
                <p className="sans text-xs text-blue-800 mt-1 leading-relaxed">
                  Every report is cryptographically signed with a SHA-256 hash. Any post-export modification
                  invalidates the hash, ensuring tamper-evident court-ready documents. The hash can be verified
                  at any time to prove authenticity.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <style jsx global>{`
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
