"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Download,
  Loader2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfessionalAuth } from "../../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const REPORT_TYPE_OPTIONS = [
  { value: "full_compliance", label: "Full Compliance Report" },
  { value: "aria_analysis", label: "Communication Analysis" },
  { value: "exchange_compliance", label: "Exchange Compliance Report" },
  { value: "financial_compliance", label: "Financial Compliance Report" },
  { value: "aria_assessment", label: "ARIA Assessment" },
  { value: "monthly_summary", label: "Monthly Summary" },
];

interface CaseOption {
  family_file_id: string;
  case_name: string;
}

export default function GenerateReportPage() {
  const { token } = useProfessionalAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const reportTypeParam = searchParams.get("type") || "full_compliance";

  const [reportType, setReportType] = useState(reportTypeParam);
  const [familyFileId, setFamilyFileId] = useState("");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const fetchCases = async () => {
      setIsLoadingCases(true);
      try {
        const res = await fetch(`${API_BASE}/api/v1/professional/cases?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.items || data.cases || [];
          const mapped = items.map((c: any) => ({
            family_file_id: c.family_file_id,
            case_name: c.case_name || c.family_name || `Case ${c.family_file_id?.slice(0, 8)}`,
          }));
          setCases(mapped);
          if (mapped.length === 1) setFamilyFileId(mapped[0].family_file_id);
        }
      } catch (e) {
        console.error("Failed to fetch cases:", e);
      } finally {
        setIsLoadingCases(false);
      }
    };
    fetchCases();
  }, [token]);

  const handleGenerate = async () => {
    if (!token || !familyFileId) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedReportId(null);

    try {
      const body: Record<string, string> = { report_type: reportType };
      if (dateRangeStart) body.date_range_start = dateRangeStart;
      if (dateRangeEnd) body.date_range_end = dateRangeEnd;

      const res = await fetch(`${API_BASE}/api/v1/professional/cases/${familyFileId}/reports`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || `Report generation failed (${res.status})`);
      }

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/pdf") || contentType.includes("octet-stream")) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportType}-report.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setGeneratedReportId("downloaded");
      } else {
        const data = await res.json();
        setGeneratedReportId(data.id || data.report_id);
        if (data.download_url) window.open(data.download_url, "_blank");
      }
    } catch (e: any) {
      setError(e.message || "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!token || !generatedReportId || generatedReportId === "downloaded") return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/professional/reports/${generatedReportId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType}-report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || "Failed to download report");
    }
  };

  const selectedReportLabel = REPORT_TYPE_OPTIONS.find((r) => r.value === reportType)?.label || reportType;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back Link */}
      <Link
        href="/professional/reports"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reports
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Generate Report</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure and generate a verified evidence package
        </p>
      </div>

      {/* Form Card */}
      <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {/* Case Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Case</Label>
            {isLoadingCases ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading cases...
              </div>
            ) : cases.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#F4F8F7] border border-[#3DAA8A]/10">
                <p className="text-sm text-slate-600">No active cases found. Create a case first to generate reports.</p>
              </div>
            ) : (
              <Select value={familyFileId} onValueChange={setFamilyFileId}>
                <SelectTrigger className="border-slate-200 focus:border-[#3DAA8A] focus:ring-[#3DAA8A]/20">
                  <SelectValue placeholder="Select a case..." />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.family_file_id} value={c.family_file_id}>
                      {c.case_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Report Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="border-slate-200 focus:border-[#3DAA8A] focus:ring-[#3DAA8A]/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Date Range <span className="text-slate-400 font-normal">(optional)</span></Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">Start</label>
                <Input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="border-slate-200 focus:border-[#3DAA8A]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">End</label>
                <Input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="border-slate-200 focus:border-[#3DAA8A]"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Leave empty to include all available data for this case
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Success */}
          {generatedReportId && (
            <div className="flex items-center gap-3 p-4 bg-[#F4F8F7] border border-[#3DAA8A]/20 rounded-xl">
              <CheckCircle2 className="h-5 w-5 text-[#3DAA8A] shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#1E3A4A]">Report generated successfully</p>
                <p className="text-xs text-slate-500 mt-0.5">Your {selectedReportLabel} is ready</p>
              </div>
              {generatedReportId !== "downloaded" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg border-slate-200"
                  onClick={handleDownload}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download
                </Button>
              )}
            </div>
          )}

          {/* Generate Button */}
          <Button
            className="w-full bg-[#3DAA8A] hover:bg-[#2D8A6E] text-white rounded-xl shadow-sm font-semibold h-11"
            onClick={handleGenerate}
            disabled={isGenerating || !familyFileId}
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Generate Report</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Info tip */}
      <div className="p-4 rounded-xl bg-[#F4F8F7] border border-[#3DAA8A]/10">
        <div className="flex gap-3">
          <FileText className="h-4 w-4 text-[#3DAA8A] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[#1E3A4A]">SHA-256 verified</p>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              Every report is cryptographically signed for tamper-evident verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
