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
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
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

  // Fetch the professional's cases for the dropdown
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
          if (mapped.length === 1) {
            setFamilyFileId(mapped[0].family_file_id);
          }
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

      const res = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/reports`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || `Report generation failed (${res.status})`);
      }

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/pdf") || contentType.includes("octet-stream")) {
        // Response is the PDF blob directly
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
        // Response is JSON with report metadata
        const data = await res.json();
        setGeneratedReportId(data.id || data.report_id);

        // If there's a download_url, trigger download immediately
        if (data.download_url) {
          window.open(data.download_url, "_blank");
        }
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
      const res = await fetch(
        `${API_BASE}/api/v1/professional/reports/${generatedReportId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <link
        href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Outfit:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Back Link */}
      <Link
        href="/professional/reports"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground sans"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reports
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-sm bg-gradient-to-br from-[#1E3A4A] via-[#2D6A8F] to-[#1E3A4A] px-8 py-6 shadow-2xl border-2 border-[#1E3A4A]/40">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#3DAA8A] via-[#D4A853] to-[#3DAA8A]" />
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#F4F8F7] border-2 border-[#1E3A4A]/20 rounded-sm shadow-xl shrink-0">
            <FileText className="h-6 w-6 text-[#1E3A4A]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="serif text-2xl font-bold text-white leading-tight tracking-tight">
              Generate Report
            </h1>
            <p className="sans text-sm text-[#E8F4F0] mt-1">
              Configure and generate a court-ready evidence package
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card className="border-2 border-[#1E3A4A]/30">
        <CardHeader>
          <CardTitle className="serif text-lg">Report Configuration</CardTitle>
          <CardDescription className="sans">
            Select the case and date range for your report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Case Selection */}
          <div className="space-y-2">
            <Label className="sans font-medium">Case</Label>
            {isLoadingCases ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading cases...
              </div>
            ) : cases.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cases found</p>
            ) : (
              <Select value={familyFileId} onValueChange={setFamilyFileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a case" />
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
            <Label className="sans font-medium">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_compliance">Full Compliance Report</SelectItem>
                <SelectItem value="aria_analysis">ARIA Communication Analysis</SelectItem>
                <SelectItem value="exchange_compliance">Exchange Compliance Report</SelectItem>
                <SelectItem value="financial_compliance">Financial Compliance Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="sans font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Start Date
              </Label>
              <Input
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="sans font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                End Date
              </Label>
              <Input
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground sans">
            Leave dates empty to include all available data
          </p>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-sm text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Success */}
          {generatedReportId && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-sm text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Report generated successfully!
              {generatedReportId !== "downloaded" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
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
            className="w-full bg-[#1E3A4A] hover:bg-[#2D6A8F] text-white border-2 border-[#1E3A4A]/40 shadow-lg sans font-semibold"
            onClick={handleGenerate}
            disabled={isGenerating || !familyFileId}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

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
