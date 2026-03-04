"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, CalendarCheck, DollarSign, MessageSquare, XCircle, Folder, Package, Bot, Search, ChevronLeft, Plus, Download, Shield, CheckCircle, X } from "lucide-react";
import { useCourtAuth } from "../../../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Report {
  id: string;
  case_id: string;
  generated_by: string;
  report_number: string;
  report_type: string;
  title: string;
  date_range_start: string;
  date_range_end: string;
  sections_included: string[];
  page_count: number;
  content_hash: string;
  storage_key?: string;
  download_url?: string;
  download_count: number;
  purpose?: string;
  generated_at: string;
  expires_at?: string;
  is_expired: boolean;
}

interface PredefinedReportType {
  id: string;
  name: string;
  description: string;
  sections_included: string[];
  default_date_range_days: number;
  icon: string;
  color: string;
  requires_date_range: boolean;
}

const REPORT_ICONS: Record<string, React.ReactNode> = {
  "calendar-check": <CalendarCheck className="h-5 w-5" />,
  "dollar-sign": <DollarSign className="h-5 w-5" />,
  "message-square": <MessageSquare className="h-5 w-5" />,
  "x-circle": <XCircle className="h-5 w-5" />,
  "folder": <Folder className="h-5 w-5" />,
  "package": <Package className="h-5 w-5" />,
  "bot": <Bot className="h-5 w-5" />,
  "search": <Search className="h-5 w-5" />,
  "file-text": <FileText className="h-5 w-5" />,
};

const REPORT_COLORS: Record<string, string> = {
  "green": "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
  "blue": "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
  "purple": "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200",
  "red": "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
  "indigo": "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200",
  "amber": "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200",
  "teal": "bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200",
  "gray": "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
};

// Fallback types if API unavailable
const FALLBACK_REPORT_TYPES = [
  {
    id: "communication_summary",
    label: "Communication Summary",
    icon: "💬",
    description: "Message volume, ARIA interventions, tone trends",
  },
  {
    id: "compliance_report",
    label: "Compliance Report",
    icon: "✅",
    description: "Exchange attendance, on-time rates, missed events",
  },
  {
    id: "financial_summary",
    label: "Financial Summary",
    icon: "💰",
    description: "Payments, expenses, outstanding balances",
  },
  {
    id: "timeline_export",
    label: "Timeline Export",
    icon: "📅",
    description: "Chronological event log for investigation",
  },
  {
    id: "full_court_package",
    label: "Full Court Package",
    icon: "📦",
    description: "Complete evidence package for hearings",
  },
];

export default function ReportsPage() {
  const params = useParams();
  const router = useRouter();
  const { professional, token, isLoading } = useCourtAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [reportTypes, setReportTypes] = useState<PredefinedReportType[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showQuickSelect, setShowQuickSelect] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PredefinedReportType | null>(null);
  const [selectedType, setSelectedType] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifyNumber, setVerifyNumber] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ is_valid: boolean; message: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const caseId = params.id as string;

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    if (professional && caseId) {
      loadReports();
      loadReportTypes();
    }
  }, [professional, caseId]);

  const loadReportTypes = async () => {
    try {
      const response = await fetch(`${API_BASE}/court/templates/reports`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setReportTypes(data.report_types || []);
      }
    } catch (err) {
      console.error("Failed to load report types:", err);
    }
  };

  const applyReportTemplate = (template: PredefinedReportType) => {
    setSelectedTemplate(template);
    setSelectedType(template.id);

    // Calculate default date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - template.default_date_range_days);

    setDateEnd(endDate.toISOString().split('T')[0]);
    setDateStart(startDate.toISOString().split('T')[0]);

    setShowQuickSelect(false);
    setShowGenerator(true);
  };

  const loadReports = async () => {
    try {
      setIsLoadingReports(true);
      setError(null);
      const response = await fetch(`${API_BASE}/court/reports/case/${caseId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to load reports");
      }
    } catch (err) {
      setError("Failed to load reports");
    } finally {
      setIsLoadingReports(false);
    }
  };

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!selectedType || !dateStart || !dateEnd) return;

    setIsGenerating(true);
    setError(null);

    // Get title and sections from template or fallback
    let title = "Report";
    let sections = ["agreement", "compliance", "schedule", "messages"];

    if (selectedTemplate) {
      title = selectedTemplate.name;
      sections = selectedTemplate.sections_included;
    } else {
      const apiType = reportTypes.find((t) => t.id === selectedType);
      const fallbackType = FALLBACK_REPORT_TYPES.find((t) => t.id === selectedType);
      if (apiType) {
        title = apiType.name;
        sections = apiType.sections_included;
      } else if (fallbackType) {
        title = fallbackType.label;
      }
    }

    try {
      const response = await fetch(`${API_BASE}/court/reports/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          case_id: caseId,
          report_type: selectedType,
          title: title,
          date_range_start: dateStart,
          date_range_end: dateEnd,
          sections_included: sections,
          purpose: purpose || undefined,
        }),
      });

      if (response.ok) {
        const newReport = await response.json();
        setReports([newReport, ...reports]);
        setShowGenerator(false);
        setSelectedType("");
        setDateStart("");
        setDateEnd("");
        setPurpose("");
        setSelectedTemplate(null);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to generate report");
      }
    } catch (err) {
      setError("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (reportId: string) => {
    try {
      // Record the download
      await fetch(`${API_BASE}/court/reports/${reportId}/download`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // Refresh reports to update download count
      loadReports();

      // In a real implementation, this would trigger the actual file download
      alert("Download initiated. In production, this would download the PDF file.");
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  const handleVerify = async () => {
    if (!verifyNumber) return;

    setIsVerifying(true);
    setVerifyResult(null);

    try {
      const response = await fetch(`${API_BASE}/court/reports/verify/${verifyNumber}`);
      if (response.ok) {
        const data = await response.json();
        setVerifyResult({
          is_valid: data.is_valid,
          message: data.is_valid
            ? `Report verified! Generated on ${new Date(data.generated_at).toLocaleDateString()} by ${data.generated_by}`
            : "Report could not be verified",
        });
      } else {
        setVerifyResult({ is_valid: false, message: "Report not found in system" });
      }
    } catch (err) {
      setVerifyResult({ is_valid: false, message: "Verification failed" });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/court-portal/cases/${params.id}`}
              className="text-slate-500 hover:text-slate-700"
            >
              ← Back to Case
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Investigation Reports</h1>
          <p className="text-slate-600">
            Generate court-ready evidence packages
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowQuickSelect(true);
              setShowGenerator(false);
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Quick Select
          </Button>
          <Button onClick={() => {
            setSelectedTemplate(null);
            setSelectedType("");
            setDateStart("");
            setDateEnd("");
            setShowQuickSelect(false);
            setShowGenerator(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Custom Report
          </Button>
        </div>
      </div>

      {/* Quick Select Template Selector */}
      {showQuickSelect && (
        <Card className="border-2 border-indigo-200 bg-indigo-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  Quick Select Report
                </CardTitle>
                <CardDescription>
                  Choose a predefined report type with optimized settings
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuickSelect(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {reportTypes.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                {reportTypes.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => applyReportTemplate(template)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${REPORT_COLORS[template.color] || REPORT_COLORS.indigo}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {REPORT_ICONS[template.icon] || <FileText className="h-5 w-5" />}
                      <span className="font-semibold text-sm">{template.name}</span>
                    </div>
                    <p className="text-xs opacity-80 mb-2">{template.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {template.default_date_range_days} days
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {template.sections_included.length} sections
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {FALLBACK_REPORT_TYPES.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => {
                      setSelectedType(type.id);
                      setShowQuickSelect(false);
                      setShowGenerator(true);
                    }}
                    className="p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md bg-white border-slate-200 hover:border-blue-300"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{type.icon}</span>
                      <span className="font-semibold text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs text-slate-600">{type.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report Generator */}
      {showGenerator && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {selectedTemplate ? (
                    <>
                      {REPORT_ICONS[selectedTemplate.icon] || <FileText className="h-5 w-5" />}
                      {selectedTemplate.name}
                    </>
                  ) : (
                    "Generate Custom Report"
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedTemplate
                    ? selectedTemplate.description
                    : "Select report type and date range"}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowGenerator(false);
                  setSelectedTemplate(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {selectedTemplate && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className={REPORT_COLORS[selectedTemplate.color] || ""}>
                  Template Applied
                </Badge>
                <Badge variant="outline">
                  {selectedTemplate.default_date_range_days} day range
                </Badge>
                <Badge variant="outline">
                  {selectedTemplate.sections_included.length} sections included
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Report Type - only show if no template selected */}
            {!selectedTemplate && (
              <div className="space-y-3">
                <Label>Report Type</Label>
                <div className="grid md:grid-cols-2 gap-3">
                  {(reportTypes.length > 0 ? reportTypes : FALLBACK_REPORT_TYPES.map(t => ({
                    id: t.id,
                    name: t.label,
                    description: t.description,
                    icon: "file-text",
                    color: "gray",
                    sections_included: [],
                    default_date_range_days: 30,
                    requires_date_range: true
                  }))).map((type) => (
                    <div
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition ${
                        selectedType === type.id
                          ? "border-blue-500 bg-blue-100"
                          : "border-slate-200 bg-white hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {REPORT_ICONS[type.icon] || <FileText className="h-5 w-5" />}
                        <span className="font-medium text-slate-900">{type.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{type.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date Range */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label>Purpose (optional)</Label>
              <Input
                placeholder="e.g., Prepared for hearing on January 15, 2026"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowGenerator(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!selectedType || !dateStart || !dateEnd || isGenerating}
              >
                {isGenerating ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingReports ? (
            <div className="text-center py-8 text-slate-500">
              Loading reports...
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <span className="text-4xl">📄</span>
              <p className="mt-4">No reports generated yet</p>
              <p className="text-sm mt-2">Generate your first report to create court-ready evidence packages</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const apiType = reportTypes.find((t) => t.id === report.report_type);
                const fallbackType = FALLBACK_REPORT_TYPES.find((t) => t.id === report.report_type);
                const reportIcon = apiType?.icon || "file-text";
                const reportColor = apiType?.color || "gray";

                return (
                <div
                  key={report.id}
                  className={`border rounded-lg p-4 hover:bg-slate-50 transition ${report.is_expired ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`p-1.5 rounded ${REPORT_COLORS[reportColor]?.split(' ')[0] || 'bg-gray-100'}`}>
                          {REPORT_ICONS[reportIcon] || <FileText className="h-4 w-4" />}
                        </span>
                        <h3 className="font-semibold text-slate-900">{report.title}</h3>
                        {report.is_expired && (
                          <Badge variant="error" className="text-xs">Expired</Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        {report.report_number} | {report.date_range_start} to {report.date_range_end}
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                        <span>{report.page_count} pages</span>
                        <span>Downloaded {report.download_count} times</span>
                        <span>Generated {new Date(report.generated_at).toLocaleDateString()}</span>
                      </div>
                      {report.content_hash && (
                        <div className="mt-2 text-xs text-slate-400 font-mono">
                          SHA-256: {report.content_hash.slice(0, 16)}...
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setVerifyNumber(report.report_number);
                          handleVerify();
                        }}
                      >
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownload(report.id)}
                        disabled={report.is_expired}
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verify Report Section */}
      <Card>
        <CardHeader>
          <CardTitle>Verify Report</CardTitle>
          <CardDescription>Check authenticity of a report by its number</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Enter report number (e.g., RPT-20251230-A7B2)"
              value={verifyNumber}
              onChange={(e) => setVerifyNumber(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleVerify} disabled={!verifyNumber || isVerifying}>
              {isVerifying ? "Verifying..." : "Verify"}
            </Button>
          </div>
          {verifyResult && (
            <div className={`mt-3 p-3 rounded ${verifyResult.is_valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <div className="flex items-center gap-2">
                <span>{verifyResult.is_valid ? '✅' : '❌'}</span>
                <span>{verifyResult.message}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Info */}
      <Card className="bg-slate-50">
        <CardContent className="p-4">
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start space-x-2">
              <span>🔒</span>
              <div>
                <p className="font-medium text-slate-700">SHA-256 Verified</p>
                <p className="text-slate-500 text-xs">Each report includes integrity hash</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span>🏷️</span>
              <div>
                <p className="font-medium text-slate-700">Watermarked</p>
                <p className="text-slate-500 text-xs">Your identity on every page</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span>✅</span>
              <div>
                <p className="font-medium text-slate-700">Court-Ready</p>
                <p className="text-slate-500 text-xs">Formatted for legal proceedings</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
