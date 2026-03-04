"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileText,
  RefreshCw,
  Calendar,
  MessageSquare,
  DollarSign,
  Clock,
  CheckCircle2,
  Loader2,
  Shield,
  Scale,
  ArrowRightLeft,
  FileCheck,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProfessionalAuth } from "../../../layout";
import { useToast } from "@/hooks/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
  icon: string;
}

interface ExportHistory {
  id: string;
  export_type: string;
  created_at: string;
  status: "pending" | "processing" | "completed" | "failed";
  download_url?: string;
  file_size?: number;
  sections_included: string[];
  date_range?: {
    start: string;
    end: string;
  };
  integrity_hash?: string;
}

const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: "full_case",
    name: "Full Case Package",
    description: "Complete case documentation for court submission",
    sections: ["messages", "schedule", "exchanges", "financials", "compliance", "agreements"],
    icon: "scale",
  },
  {
    id: "communication_log",
    name: "Communication Log",
    description: "All parent-to-parent messages with ARIA interventions",
    sections: ["messages", "interventions"],
    icon: "message",
  },
  {
    id: "custody_schedule",
    name: "Custody Schedule Report",
    description: "Exchange history, custody time tracking, and compliance",
    sections: ["schedule", "exchanges", "compliance"],
    icon: "calendar",
  },
  {
    id: "financial_summary",
    name: "Financial Summary",
    description: "ClearFund transactions, obligations, and payment history",
    sections: ["financials", "obligations"],
    icon: "dollar",
  },
  {
    id: "compliance_report",
    name: "Compliance Report",
    description: "Agreement adherence metrics and violations",
    sections: ["compliance", "exchanges", "financials"],
    icon: "shield",
  },
];

const SECTION_OPTIONS = [
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "exchanges", label: "Exchanges", icon: ArrowRightLeft },
  { id: "financials", label: "Financials", icon: DollarSign },
  { id: "compliance", label: "Compliance", icon: Shield },
  { id: "agreements", label: "Agreements", icon: FileText },
  { id: "interventions", label: "ARIA Interventions", icon: AlertCircle },
];

export default function ExportsPage() {
  const params = useParams();
  const { token } = useProfessionalAuth();
  const { toast } = useToast();
  const familyFileId = params.familyFileId as string;

  const [history, setHistory] = useState<ExportHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState("30");

  useEffect(() => {
    fetchHistory();
  }, [familyFileId, token]);

  const fetchHistory = async () => {
    if (!token || !familyFileId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/exports`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setHistory(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching export history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateExport = async (templateId: string, sections?: string[]) => {
    if (!token || !familyFileId) return;

    setIsGenerating(true);
    try {
      const template = EXPORT_TEMPLATES.find((t) => t.id === templateId);
      const exportSections = sections || template?.sections || [];

      const response = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/exports`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            export_type: templateId,
            sections: exportSections,
            date_range_days: parseInt(dateRange),
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Export started",
          description: "Your export is being generated. It will appear in the history when ready.",
        });
        fetchHistory();
        setShowCustomDialog(false);
      } else {
        throw new Error("Failed to generate export");
      }
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to generate export. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadExport = async (exportId: string, downloadUrl: string) => {
    window.open(downloadUrl, "_blank");
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getTemplateIcon = (iconName: string) => {
    switch (iconName) {
      case "scale":
        return <Scale className="h-6 w-6" />;
      case "message":
        return <MessageSquare className="h-6 w-6" />;
      case "calendar":
        return <Calendar className="h-6 w-6" />;
      case "dollar":
        return <DollarSign className="h-6 w-6" />;
      case "shield":
        return <Shield className="h-6 w-6" />;
      default:
        return <FileText className="h-6 w-6" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const toggleSection = (sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((s) => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={`/professional/cases/${familyFileId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Case
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <Download className="h-6 w-6" />
            </div>
            Case Exports
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate court-ready documentation packages
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHistory}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Export Templates */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Quick Export Templates</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPORT_TEMPLATES.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
                    {getTemplateIcon(template.icon)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {template.sections.slice(0, 3).map((section) => (
                        <Badge key={section} variant="outline" className="text-xs capitalize">
                          {section}
                        </Badge>
                      ))}
                      {template.sections.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.sections.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full mt-4"
                  onClick={() => generateExport(template.id)}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Generate
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* Custom Export Card */}
          <Card className="border-dashed hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                  <FileCheck className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Custom Export</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select specific sections and date range
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  setSelectedSections([]);
                  setShowCustomDialog(true);
                }}
              >
                <FileCheck className="h-4 w-4 mr-2" />
                Customize
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Export History */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Export History</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        ) : history.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Download className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No exports yet</h3>
              <p className="text-muted-foreground">
                Generate your first export using the templates above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[400px]">
                <div className="divide-y">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium capitalize">
                            {item.export_type.replace("_", " ")}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(item.created_at)}
                            </span>
                            {item.file_size && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatFileSize(item.file_size)}
                                </span>
                              </>
                            )}
                          </div>
                          {item.sections_included && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.sections_included.slice(0, 4).map((section) => (
                                <Badge key={section} variant="outline" className="text-xs capitalize">
                                  {section}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(item.status)}
                        {item.status === "completed" && item.download_url && (
                          <Button
                            size="sm"
                            onClick={() => downloadExport(item.id, item.download_url!)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Integrity Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Court-Ready Documentation</h4>
              <p className="text-sm text-blue-700 mt-1">
                All exports include SHA-256 integrity verification hashes and timestamps.
                Documents are generated in PDF format with professional formatting suitable for
                court submission.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Export Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Custom Export</DialogTitle>
            <DialogDescription>
              Select the sections you want to include in your export.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="180">Last 6 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                  <SelectItem value="0">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sections to Include</Label>
              <div className="grid grid-cols-2 gap-2">
                {SECTION_OPTIONS.map((section) => {
                  const Icon = section.icon;
                  return (
                    <div
                      key={section.id}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSections.includes(section.id)
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-muted hover:bg-muted/50"
                      }`}
                      onClick={() => toggleSection(section.id)}
                    >
                      <Checkbox
                        checked={selectedSections.includes(section.id)}
                        onCheckedChange={() => toggleSection(section.id)}
                      />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{section.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => generateExport("custom", selectedSections)}
              disabled={isGenerating || selectedSections.length === 0}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Generate Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
