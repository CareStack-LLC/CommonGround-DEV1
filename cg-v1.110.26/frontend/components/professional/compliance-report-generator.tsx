"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ComplianceReportGeneratorProps {
  open: boolean;
  onClose: () => void;
  familyFileId: string;
  caseName: string;
  token: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ReportSection = "exchange" | "support" | "communication" | "messages" | "data";

export function ComplianceReportGenerator({
  open,
  onClose,
  familyFileId,
  caseName,
  token,
}: ComplianceReportGeneratorProps) {
  const [dateRange, setDateRange] = useState("30");
  const [format, setFormat] = useState("pdf");
  const [includeSections, setIncludeSections] = useState<Set<ReportSection>>(
    new Set(["exchange", "support", "communication"])
  );
  const [includeSHA256, setIncludeSHA256] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleSection = (section: ReportSection) => {
    setIncludeSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const response = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/reports/compliance`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date_range_start: startDate.toISOString().split("T")[0],
            date_range_end: new Date().toISOString().split("T")[0],
            format: format,
            include_exchange: includeSections.has("exchange"),
            include_support: includeSections.has("support"),
            include_communication: includeSections.has("communication"),
            include_messages: includeSections.has("messages"),
            include_raw_data: includeSections.has("data"),
            include_sha256: includeSHA256,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const data = await response.json();
      setGeneratedReport(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while generating the report");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedReport?.report_url) return;

    try {
      const response = await fetch(generatedReport.report_url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = generatedReport.file_name || `compliance-report-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError("Failed to download report");
    }
  };

  const handleReset = () => {
    setGeneratedReport(null);
    setError(null);
    setGenerating(false);
    onClose();
  };

  const reportSections = [
    {
      id: "exchange" as ReportSection,
      label: "Exchange Compliance",
      description: "On-time pickups, dropoffs, missed exchanges",
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      id: "support" as ReportSection,
      label: "Financial Compliance",
      description: "Child support payments, arrears, disputed amounts",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    {
      id: "communication" as ReportSection,
      label: "Communication Compliance",
      description: "ARIA interventions, conflict patterns, escalations",
      icon: <AlertCircle className="h-4 w-4" />,
    },
    {
      id: "messages" as ReportSection,
      label: "Message History",
      description: "Flagged messages only (before/after ARIA)",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "data" as ReportSection,
      label: "Raw Data Appendix",
      description: "Detailed logs and timestamps",
      icon: <Shield className="h-4 w-4" />,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleReset}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-amber-900/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <FileText className="h-6 w-6 text-amber-900" />
            Generate Compliance Report
          </DialogTitle>
          <DialogDescription>
            Create a court-ready compliance report for <strong>{caseName}</strong>
          </DialogDescription>
        </DialogHeader>

        {!generatedReport ? (
          <div className="space-y-6">
            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="border-2 border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="180">Last 6 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Report Sections */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-900">Include Sections</Label>
              <div className="space-y-2">
                {reportSections.map((section) => (
                  <Card
                    key={section.id}
                    className={`cursor-pointer transition-all ${
                      includeSections.has(section.id)
                        ? "border-2 border-amber-900/40 bg-amber-50/30"
                        : "border-2 border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => toggleSection(section.id)}
                  >
                    <CardContent className="py-3 flex items-start gap-3">
                      <Checkbox
                        checked={includeSections.has(section.id)}
                        onCheckedChange={() => toggleSection(section.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {section.icon}
                          <p className="text-sm font-semibold text-slate-900">
                            {section.label}
                          </p>
                        </div>
                        <p className="text-xs text-slate-600">{section.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Format */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900">Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="border-2 border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF (Recommended for court)</SelectItem>
                  <SelectItem value="docx">Word Document</SelectItem>
                  <SelectItem value="xlsx">Excel Spreadsheet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* SHA-256 Verification */}
            <Card className="border-2 border-emerald-900/30 bg-emerald-50/30">
              <CardContent className="py-3 flex items-start gap-3">
                <Checkbox
                  checked={includeSHA256}
                  onCheckedChange={(checked) => setIncludeSHA256(!!checked)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-emerald-900" />
                    <p className="text-sm font-semibold text-slate-900">
                      Include SHA-256 Verification
                    </p>
                  </div>
                  <p className="text-xs text-slate-600">
                    Adds cryptographic hash for court authentication. Recommended for all
                    court submissions.
                  </p>
                </div>
              </CardContent>
            </Card>

            {generating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">Generating report...</span>
                  <Clock className="h-4 w-4 text-amber-900 animate-spin" />
                </div>
                <Progress value={66} className="h-2" />
                <p className="text-xs text-slate-600 text-center">
                  This may take up to 30 seconds for detailed reports
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-900/30 rounded-lg flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-900 shrink-0 mt-0.5" />
                <p className="text-sm text-red-900">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Success Message */}
            <Card className="border-2 border-emerald-900/30 bg-emerald-50/30">
              <CardContent className="py-6 text-center space-y-3">
                <div className="p-4 bg-emerald-100 rounded-full w-fit mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-emerald-900" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900 mb-1">
                    Report Generated Successfully
                  </h3>
                  <p className="text-sm text-slate-600">
                    Your compliance report is ready for download
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Report Details */}
            <Card>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-600">File Name</p>
                    <p className="text-sm font-medium text-slate-900">
                      {generatedReport.file_name}
                    </p>
                  </div>
                  <Badge className="bg-amber-50 text-amber-900 border-amber-900/30">
                    {format.toUpperCase()}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs text-slate-600">Date Range</p>
                  <p className="text-sm font-medium text-slate-900">
                    {generatedReport.date_range_start} to {generatedReport.date_range_end}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-600">Sections Included</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Array.from(includeSections).map((section) => (
                      <Badge key={section} variant="outline" className="text-xs">
                        {reportSections.find((s) => s.id === section)?.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {includeSHA256 && generatedReport.sha256_hash && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-600 mb-1">SHA-256 Hash</p>
                    <p className="text-xs font-mono text-slate-900 break-all">
                      {generatedReport.sha256_hash}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-2">
                      This cryptographic hash can be used to verify the report's integrity
                      in court.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            {generatedReport ? "Close" : "Cancel"}
          </Button>

          {!generatedReport ? (
            <Button
              onClick={handleGenerate}
              disabled={generating || includeSections.size === 0}
              className="bg-amber-900 hover:bg-amber-950 text-white"
            >
              {generating ? (
                <>Generating...</>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleDownload}
              className="bg-emerald-900 hover:bg-emerald-950 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
