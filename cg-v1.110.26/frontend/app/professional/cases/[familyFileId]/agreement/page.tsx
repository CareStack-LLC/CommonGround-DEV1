"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FileText,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  History,
  Users,
  Scale,
  Shield,
  Handshake,
  Download,
  Sparkles,
  LayoutList,
  List,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { useProfessionalAuth } from "../../../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Agreement {
  id: string;
  agreement_number: string;
  title: string;
  status: "draft" | "pending_approval" | "active" | "superseded";
  version: number;
  effective_date?: string;
  expiration_date?: string;
  court_ordered: boolean;
  court_order_number?: string;
  petitioner_approved: boolean;
  petitioner_approved_at?: string;
  respondent_approved: boolean;
  respondent_approved_at?: string;
  pdf_url?: string;
  sections?: AgreementSection[];
}

interface AgreementSection {
  id: string;
  section_number: number;
  section_title: string;
  section_type: string;
  content: string;
  structured_data?: any;
  is_completed: boolean;
  compliance_score?: number;
}

interface QuickAccord {
  id: string;
  accord_number: string;
  title: string;
  purpose_category: string;
  status: "draft" | "pending_approval" | "active" | "completed" | "revoked" | "expired";
  event_date?: string;
  start_date?: string;
  end_date?: string;
  parent_a_approved: boolean;
  parent_b_approved: boolean;
  child_ids?: string[];
  children_names?: string[];
  created_at: string;
}

interface AgreementVersion {
  id: string;
  version_number: number;
  version_notes?: string;
  created_at: string;
  created_by_name?: string;
  petitioner_approved: boolean;
  respondent_approved: boolean;
}

interface ComplianceMetrics {
  overall_compliance: number;
  parent_a_compliance: number;
  parent_b_compliance: number;
  section_compliance: Record<string, number>;
}

interface QuickSummary {
  summary: string;
  key_points: string[];
  shared_expenses_table?: {
    split: string;
    covered: string[];
    not_covered: string[];
  };
  completion_percentage: number;
  status: string;
}

export default function CaseAgreementPage() {
  const params = useParams();
  const { token } = useProfessionalAuth();
  const familyFileId = params.familyFileId as string;

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [quickAccords, setQuickAccords] = useState<QuickAccord[]>([]);
  const [versions, setVersions] = useState<AgreementVersion[]>([]);
  const [compliance, setCompliance] = useState<ComplianceMetrics | null>(null);
  const [summary, setSummary] = useState<QuickSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("agreement");
  const [viewMode, setViewMode] = useState<"sections" | "full">("sections");

  useEffect(() => {
    fetchAgreementData();
  }, [familyFileId, token]);

  const fetchAgreementData = async () => {
    if (!token || !familyFileId) return;

    setIsLoading(true);
    try {
      // Fetch active agreement for the case
      const agreementResponse = await fetch(
        `${API_BASE}/api/v1/agreements/family-file/${familyFileId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (agreementResponse.ok) {
        const data = await agreementResponse.json();
        // Get the active agreement or the most recent one
        const activeAgreement = Array.isArray(data)
          ? data.find((a: Agreement) => a.status === "active") || data[0]
          : data;
        setAgreement(activeAgreement);

        // Fetch AI Summary
        if (activeAgreement?.id) {
          setIsSummaryLoading(true);
          fetch(`${API_BASE}/api/v1/agreements/${activeAgreement.id}/quick-summary`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then(res => res.json())
            .then(data => setSummary(data))
            .catch(err => console.error("Error fetching summary:", err))
            .finally(() => setIsSummaryLoading(false));

          // Fetch versions
          const versionsResponse = await fetch(
            `${API_BASE}/api/v1/agreements/${activeAgreement.id}/versions`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (versionsResponse.ok) {
            setVersions(await versionsResponse.json());
          }
        }
      }

      // Fetch QuickAccords
      const accordsResponse = await fetch(
        `${API_BASE}/api/v1/quick-accords/family-file/${familyFileId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (accordsResponse.ok) {
        setQuickAccords(await accordsResponse.json());
      }

      // Fetch compliance metrics
      const complianceResponse = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/compliance`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (complianceResponse.ok) {
        const complianceData = await complianceResponse.json();
        setCompliance(complianceData);
      }
    } catch (error) {
      console.error("Error fetching agreement data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
      active: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
      pending_approval: { color: "bg-amber-100 text-amber-800", icon: Clock },
      draft: { color: "bg-gray-100 text-gray-800", icon: FileText },
      superseded: { color: "bg-slate-100 text-slate-800", icon: History },
      completed: { color: "bg-blue-100 text-blue-800", icon: CheckCircle2 },
      revoked: { color: "bg-red-100 text-red-800", icon: AlertCircle },
      expired: { color: "bg-orange-100 text-orange-800", icon: AlertCircle },
    };
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-slate-100 text-slate-600 rounded-xl">
            <FileText className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Custody Agreement</h1>
            <p className="text-muted-foreground">
              Agreement sections, compliance, and QuickAccords
            </p>
          </div>
        </div>
        {agreement?.pdf_url && (
          <Button variant="outline" asChild>
            <a href={agreement.pdf_url} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </a>
          </Button>
        )}
      </div>

      {/* Compliance Overview */}
      {compliance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Overall Compliance</span>
                <span className="text-lg font-bold">
                  {Math.round(compliance.overall_compliance * 100)}%
                </span>
              </div>
              <Progress value={compliance.overall_compliance * 100} className="h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Users className="h-4 w-4" /> Parent A
                </span>
                <span className="text-lg font-bold text-blue-600">
                  {Math.round(compliance.parent_a_compliance * 100)}%
                </span>
              </div>
              <Progress value={compliance.parent_a_compliance * 100} className="h-2 bg-blue-100" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Users className="h-4 w-4" /> Parent B
                </span>
                <span className="text-lg font-bold text-emerald-600">
                  {Math.round(compliance.parent_b_compliance * 100)}%
                </span>
              </div>
              <Progress value={compliance.parent_b_compliance * 100} className="h-2 bg-emerald-100" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="agreement" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            SharedCare Agreement
          </TabsTrigger>
          <TabsTrigger value="quickaccords" className="flex items-center gap-2">
            <Handshake className="h-4 w-4" />
            QuickAccords
            {quickAccords.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {quickAccords.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="versions" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Version History
          </TabsTrigger>
        </TabsList>

        {/* SharedCare Agreement Tab */}
        <TabsContent value="agreement" className="mt-6">
          {agreement ? (
            <div className="space-y-6">
              {/* Agreement Header Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {agreement.title}
                        {getStatusBadge(agreement.status)}
                      </CardTitle>
                      <CardDescription>
                        {agreement.agreement_number} | Version {agreement.version}
                      </CardDescription>
                    </div>
                    {agreement.court_ordered && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        <Scale className="h-3 w-3 mr-1" />
                        Court Ordered
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Approval Status */}
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-1">Petitioner Approval</p>
                      {agreement.petitioner_approved ? (
                        <p className="text-sm text-blue-700 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Approved {agreement.petitioner_approved_at &&
                            `on ${new Date(agreement.petitioner_approved_at).toLocaleDateString()}`}
                        </p>
                      ) : (
                        <p className="text-sm text-blue-700 flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Pending
                        </p>
                      )}
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <p className="text-sm font-medium text-emerald-800 mb-1">Respondent Approval</p>
                      {agreement.respondent_approved ? (
                        <p className="text-sm text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Approved {agreement.respondent_approved_at &&
                            `on ${new Date(agreement.respondent_approved_at).toLocaleDateString()}`}
                        </p>
                      ) : (
                        <p className="text-sm text-emerald-700 flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Pending
                        </p>
                      )}
                    </div>
                  </div>
                  {agreement.effective_date && (
                    <p className="text-sm text-muted-foreground mt-4">
                      Effective: {new Date(agreement.effective_date).toLocaleDateString()}
                      {agreement.expiration_date &&
                        ` - Expires: ${new Date(agreement.expiration_date).toLocaleDateString()}`}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* AI Quick Summary */}
              {(isSummaryLoading || summary) && (
                <Card className="border-indigo-100 bg-indigo-50/30 overflow-hidden mt-6">
                  <CardHeader className="pb-3 border-b border-indigo-100/50 bg-white/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base">AI Agreement Summary</CardTitle>
                          <CardDescription className="text-xs">Plain-English breakdown by ARIA</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {isSummaryLoading ? (
                      <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-indigo-100 rounded w-3/4"></div>
                        <div className="h-4 bg-indigo-100 rounded w-5/6"></div>
                        <div className="h-4 bg-indigo-100 rounded w-1/2"></div>
                      </div>
                    ) : (
                      <>
                        <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {summary?.summary || ""}
                          </ReactMarkdown>
                        </div>

                        {summary?.key_points && summary.key_points.length > 0 && (
                          <div className="grid sm:grid-cols-2 gap-3 pt-4 border-t border-indigo-100/50">
                            {summary.key_points.map((point, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{point}</ReactMarkdown>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Agreement Sections Header with Toggle */}
              <div className="flex items-center justify-between pt-4">
                <h3 className="text-lg font-bold text-slate-900">Agreement Provisions</h3>
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <Button
                    variant={viewMode === "sections" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 px-3 text-xs gap-2"
                    onClick={() => setViewMode("sections")}
                  >
                    <LayoutList className="h-3.5 w-3.5" />
                    Explorer
                  </Button>
                  <Button
                    variant={viewMode === "full" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 px-3 text-xs gap-2"
                    onClick={() => setViewMode("full")}
                  >
                    <List className="h-3.5 w-3.5" />
                    Full Text
                  </Button>
                </div>
              </div>

              {/* Agreement Sections Content */}
              {agreement.sections && agreement.sections.length > 0 ? (
                viewMode === "sections" ? (
                  <Accordion type="multiple" className="space-y-2">
                    {agreement.sections
                      .sort((a, b) => (Number(a.section_number) || 0) - (Number(b.section_number) || 0))
                      .map((section) => (
                        <AccordionItem
                          key={section.id}
                          value={section.id}
                          className="border rounded-lg px-4 bg-white"
                        >
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3 text-left">
                              <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-sm font-medium">
                                {section.section_number}
                              </span>
                              <div>
                                <p className="font-medium text-slate-900">{section.section_title}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {section.section_type.replace("_", " ")}
                                </p>
                              </div>
                              {section.is_completed ? (
                                <Badge className="ml-auto mr-4 bg-emerald-50 text-emerald-700 border-emerald-100">
                                  Complete
                                </Badge>
                              ) : (
                                <Badge className="ml-auto mr-4 bg-amber-50 text-amber-700 border-amber-100">
                                  In Progress
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="pt-4 pb-2">
                              {section.compliance_score !== undefined && (
                                <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-muted-foreground">
                                      Section Compliance
                                    </span>
                                    <span className="text-xs font-bold text-slate-700">
                                      {Math.round(section.compliance_score * 100)}%
                                    </span>
                                  </div>
                                  <Progress value={section.compliance_score * 100} className="h-1.5" />
                                </div>
                              )}
                              <div className="prose prose-sm max-w-none text-slate-700 bg-slate-50/50 p-4 rounded-lg border border-slate-100 whitespace-pre-wrap">
                                {section.content || "No content available for this section."}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                      )}
                  </Accordion>
                ) : (
                  <div className="space-y-4">
                    {agreement.sections
                      .sort((a, b) => (Number(a.section_number) || 0) - (Number(b.section_number) || 0))
                      .map((section) => (
                        <Card key={section.id} className="border-slate-200">
                          <CardHeader className="py-4 bg-slate-50/50 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-full text-sm font-bold text-slate-700 shadow-sm">
                                {section.section_number}
                              </span>
                              <CardTitle className="text-base font-semibold text-slate-900">
                                {section.section_title}
                              </CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-6">
                            <div className="prose prose-slate prose-sm max-w-none whitespace-pre-wrap">
                              {section.content || "No content available for this section."}
                            </div>
                          </CardContent>
                        </Card>
                      )
                      )}
                  </div>
                )
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-slate-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No sections available for this agreement.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">No Active Agreement</h3>
                <p className="text-muted-foreground text-sm">
                  There is no SharedCare Agreement associated with this case yet.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* QuickAccords Tab */}
        <TabsContent value="quickaccords" className="mt-6">
          {quickAccords.length > 0 ? (
            <div className="space-y-4">
              {quickAccords.map((accord) => (
                <Card key={accord.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                          <Handshake className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge(accord.status)}
                            <Badge variant="outline" className="text-xs capitalize">
                              {accord.purpose_category.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="font-medium">{accord.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {accord.accord_number}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-4 text-sm">
                          <span
                            className={`flex items-center gap-1 ${accord.parent_a_approved ? "text-emerald-600" : "text-amber-600"
                              }`}
                          >
                            {accord.parent_a_approved ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                            Parent A
                          </span>
                          <span
                            className={`flex items-center gap-1 ${accord.parent_b_approved ? "text-emerald-600" : "text-amber-600"
                              }`}
                          >
                            {accord.parent_b_approved ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                            Parent B
                          </span>
                        </div>
                        {(accord.event_date || accord.start_date) && (
                          <p className="text-xs text-muted-foreground">
                            {accord.event_date
                              ? `Event: ${new Date(accord.event_date).toLocaleDateString()}`
                              : `${new Date(accord.start_date!).toLocaleDateString()} - ${new Date(accord.end_date!).toLocaleDateString()}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {accord.children_names && accord.children_names.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground">
                          Children: {accord.children_names.join(", ")}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Handshake className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">No QuickAccords</h3>
                <p className="text-muted-foreground text-sm">
                  No situational agreements have been created for this case.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Version History Tab */}
        <TabsContent value="versions" className="mt-6">
          {versions.length > 0 ? (
            <div className="space-y-4">
              {versions.map((version, index) => (
                <Card
                  key={version.id}
                  className={index === 0 ? "border-emerald-200 bg-emerald-50/30" : ""}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${index === 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                            }`}
                        >
                          v{version.version_number}
                        </div>
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            Version {version.version_number}
                            {index === 0 && (
                              <Badge className="bg-emerald-100 text-emerald-800">Current</Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Created {new Date(version.created_at).toLocaleDateString()}
                            {version.created_by_name && ` by ${version.created_by_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span
                          className={`flex items-center gap-1 ${version.petitioner_approved ? "text-emerald-600" : "text-muted-foreground"
                            }`}
                        >
                          {version.petitioner_approved ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                          Petitioner
                        </span>
                        <span
                          className={`flex items-center gap-1 ${version.respondent_approved ? "text-emerald-600" : "text-muted-foreground"
                            }`}
                        >
                          {version.respondent_approved ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                          Respondent
                        </span>
                      </div>
                    </div>
                    {version.version_notes && (
                      <p className="mt-3 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {version.version_notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">No Version History</h3>
                <p className="text-muted-foreground text-sm">
                  Version history will appear here once an agreement is created.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div >
  );
}
