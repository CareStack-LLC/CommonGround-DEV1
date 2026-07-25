"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  FolderOpen,
  ArrowLeft,
  Users,
  Calendar,
  MessageSquare,
  FileText,
  Scale,
  Clock,
  BarChart3,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  History,
  Download,
  DollarSign,
  Files,
  Briefcase,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfessionalAuth } from "../../layout";
import { CaseTimelineTab } from "@/components/professional/case-view/case-timeline-tab";
import { ClientCommunicationTab } from "@/components/professional/case-view/client-communication-tab";
import { CaseOverviewTab } from "@/components/professional/case-view/case-overview-tab";
import { DocumentList } from "@/components/professional/document-list";
import { CaseSummaryAlert, generateSampleCaseSummary } from "@/components/professional/case-summary-alert";
import { CaseDetailSkeleton } from "@/components/professional/case-detail-skeleton";
import { ComplianceReportGenerator } from "@/components/professional/compliance-report-generator";
import { toast } from "@/hooks/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CaseAssignment {
  id: string;
  professional_id: string;
  firm_id?: string;
  family_file_id: string;
  assignment_role: string;
  representing: string;
  access_scopes: string[];
  can_control_aria: boolean;
  can_message_client: boolean;
  status: string;
  assigned_at: string;
  family_file_number?: string;
  family_file_title?: string;
  firm_name?: string;
}

interface TimelineSummary {
  total_events: number;
  messages: number;
  exchanges: number;
  agreements: number;
  court_events: number;
}

export default function CaseDetailPage() {
  const params = useParams();
  const { token } = useProfessionalAuth();
  const familyFileId = params.familyFileId as string;

  const [caseData, setCaseData] = useState<CaseAssignment | null>(null);
  const [timelineSummary, setTimelineSummary] = useState<TimelineSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showComplianceReport, setShowComplianceReport] = useState(false);

  useEffect(() => {
    fetchCaseData();
  }, [familyFileId, token]);

  const fetchCaseData = async () => {
    if (!token || !familyFileId) return;

    setIsLoading(true);
    try {
      // Fetch case assignment
      const caseResponse = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (caseResponse.ok) {
        const data = await caseResponse.json();
        setCaseData(data);
      }

      // Fetch timeline summary
      const summaryResponse = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/timeline/summary`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setTimelineSummary(summaryData);
      }
    } catch (error) {
      console.error("Error fetching case data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const roleLabels: Record<string, string> = {
    lead_attorney: "Lead Attorney",
    associate: "Associate",
    paralegal: "Paralegal",
    mediator: "Mediator",
    parenting_coordinator: "Parenting Coordinator",
    intake_coordinator: "Intake Coordinator",
  };

  const representingLabels: Record<string, string> = {
    parent_a: "Petitioner",
    parent_b: "Respondent",
    both: "Both Parties",
    court: "Court",
  };

  if (isLoading) {
    return <CaseDetailSkeleton />;
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Case not found</h3>
        <p className="text-muted-foreground mb-4">
          You may not have access to this case or it doesn't exist.
        </p>
        <Button asChild>
          <Link href="/professional/cases">Back to Cases</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');

        .case-page-wrapper {
          background: linear-gradient(135deg, var(--background) 0%, var(--cg-sage-subtle) 100%);
          min-height: 100vh;
        }

        .serif { font-family: 'Crimson Pro', Georgia, serif; }
        .sans { font-family: 'Outfit', system-ui, sans-serif; }

        .legal-border {
          position: relative;
        }

        .legal-border::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--foreground) 0%, #C8A951 50%, var(--foreground) 100%);
        }

        .case-number-seal {
          position: relative;
          overflow: hidden;
        }

        .case-number-seal::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(30,58,74,0.1) 0%, transparent 70%);
          animation: seal-glow 3s ease-in-out infinite;
        }

        @keyframes seal-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .tab-underline {
          position: relative;
        }

        .tab-underline::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--foreground);
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }

        .tab-underline.active::after {
          transform: scaleX(1);
        }

        .parchment-texture {
          background-image:
            radial-gradient(circle at 20% 50%, rgba(30,58,74,0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(61,170,138,0.03) 0%, transparent 50%);
        }
      `}</style>

      <div className="case-page-wrapper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Elegant Back Link */}
          <Link
            href="/professional/cases"
            className="inline-flex items-center gap-2 text-sm sans font-medium text-foreground hover:text-foreground transition-colors mb-8 group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            <span className="border-b border-foreground/20 group-hover:border-foreground/40">Return to Case List</span>
          </Link>

          {/* Distinguished Case Header */}
          <div className="mb-10 legal-border pt-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="flex items-start gap-6">
                <div className="case-number-seal relative p-5 bg-gradient-to-br from-background to-cg-sage-subtle border-2 border-foreground/20 rounded-sm shrink-0 shadow-lg">
                  <Briefcase className="h-10 w-10 text-foreground" strokeWidth={1.5} />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-foreground rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-background sans">
                      {caseData.status.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-xs sans font-semibold text-foreground/60 tracking-widest uppercase">
                      {caseData.family_file_number
                        ? `Case No. ${caseData.family_file_number}`
                        : "Case No."}
                    </span>
                    <div className="h-px w-8 bg-foreground/20"></div>
                  </div>
                  <h1 className="text-4xl lg:text-5xl serif font-bold text-slate-900 mb-3 leading-tight tracking-tight">
                    {caseData.family_file_title || caseData.family_file_number || `${familyFileId.slice(0, 8).toUpperCase()}`}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="bg-foreground text-background hover:bg-foreground sans font-medium px-3 py-1 text-xs rounded-sm">
                      {caseData.status.toUpperCase()}
                    </Badge>
                    <div className="h-4 w-px bg-slate-300"></div>
                    <span className="text-sm sans text-slate-600 flex items-center gap-2">
                      <Users className="h-4 w-4 text-foreground/60" strokeWidth={1.5} />
                      {representingLabels[caseData.representing]}
                    </span>
                    <div className="h-4 w-px bg-slate-300"></div>
                    <span className="text-sm sans text-slate-600 font-medium">
                      {roleLabels[caseData.assignment_role]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions — evidence & reports only */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => setShowComplianceReport(true)}
                  className="bg-[#1B5544] hover:bg-[#123A2E] text-white sans font-semibold px-5 h-11 shadow-lg border-2 border-[#1B5544]/40 gap-2"
                >
                  <Download className="h-4 w-4" strokeWidth={2} />
                  Generate Report
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="sans font-semibold px-5 h-11 border-2 border-foreground/30 text-foreground hover:bg-background gap-2"
                >
                  <Link href={`/professional/cases/${familyFileId}/exports`}>
                    <Files className="h-4 w-4" strokeWidth={2} />
                    Court Package
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Refined Navigation Tabs */}
          <Tabs defaultValue="overview" className="space-y-8">
            <div className="border-b-2 border-slate-200">
              <TabsList className="bg-transparent border-none p-0 h-auto w-full justify-start gap-0 overflow-x-auto">
                <TabsTrigger
                  value="overview"
                  className="tab-underline data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-none pb-4 px-6 sans font-semibold text-slate-500 data-[state=active]:text-foreground hover:text-slate-900 transition-colors text-sm tracking-wide"
                >
                  AT A GLANCE
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className="tab-underline data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-none pb-4 px-6 sans font-semibold text-slate-500 data-[state=active]:text-foreground hover:text-slate-900 transition-colors text-sm tracking-wide"
                >
                  CHRONICLE
                </TabsTrigger>
                <TabsTrigger
                  value="communications"
                  className="tab-underline data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-none pb-4 px-6 sans font-semibold text-slate-500 data-[state=active]:text-foreground hover:text-slate-900 transition-colors text-sm tracking-wide"
                >
                  CLIENT CORRESPONDENCE
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="tab-underline data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-none pb-4 px-6 sans font-semibold text-slate-500 data-[state=active]:text-foreground hover:text-slate-900 transition-colors text-sm tracking-wide"
                >
                  EXHIBITS
                </TabsTrigger>
                <TabsTrigger
                  value="compliance"
                  className="tab-underline data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-none pb-4 px-6 sans font-semibold text-slate-500 data-[state=active]:text-foreground hover:text-slate-900 transition-colors text-sm tracking-wide"
                >
                  PORTALS
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="parchment-texture m-0 outline-none">
              <CaseOverviewTab familyFileId={familyFileId} token={token || ""} />
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="parchment-texture m-0 outline-none">
              <CaseTimelineTab familyFileId={familyFileId} token={token || ""} />
            </TabsContent>

            {/* Client Communication Tab */}
            <TabsContent value="communications" className="parchment-texture m-0 outline-none">
              <ClientCommunicationTab familyFileId={familyFileId} token={token || ""} />
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="parchment-texture m-0 outline-none">
              <DocumentList familyFileId={familyFileId} token={token || ""} />
            </TabsContent>

            {/* Sub-Portals Tab — read-only evidence views */}
            <TabsContent value="compliance" className="parchment-texture m-0 outline-none">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <NavigationCard
                  title="Compliance Analysis"
                  description="Parenting plan adherence metrics — exchange, financial, communication"
                  icon={<BarChart3 className="h-6 w-6" />}
                  href={`/professional/cases/${familyFileId}/compliance`}
                  color="burgundy"
                />
                <NavigationCard
                  title="Financial Record"
                  description="Read-only log of obligations, contributions, and child-support history"
                  icon={<DollarSign className="h-6 w-6" />}
                  href={`/professional/cases/${familyFileId}/clearfund`}
                  color="navy"
                />
                <NavigationCard
                  title="Agreement (Read-Only)"
                  description="Current parenting agreement as filed — not editable from this portal"
                  icon={<FileText className="h-6 w-6" />}
                  href={`/professional/cases/${familyFileId}/agreement`}
                  color="amber"
                />
                <NavigationCard
                  title="Exchange History"
                  description="Custody exchanges with GPS check-ins — past and scheduled"
                  icon={<Calendar className="h-6 w-6" />}
                  href={`/professional/cases/${familyFileId}/schedule`}
                  color="gold"
                />
                <NavigationCard
                  title="Parent Communications"
                  description="Message history between co-parents with ARIA intervention markers"
                  icon={<MessageSquare className="h-6 w-6" />}
                  href={`/professional/cases/${familyFileId}/communications`}
                  color="slate"
                />
                <NavigationCard
                  title="Court Package Export"
                  description="Compile timeline, messages, and exhibits into a SHA-256 signed bundle"
                  icon={<Download className="h-6 w-6" />}
                  href={`/professional/cases/${familyFileId}/exports`}
                  color="navy"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Compliance Report Dialog */}
      <ComplianceReportGenerator
        open={showComplianceReport}
        onClose={() => setShowComplianceReport(false)}
        familyFileId={familyFileId}
        caseName={caseData.family_file_number || familyFileId.slice(0, 8).toUpperCase()}
        token={token || ""}
      />
    </div>
  );
}

// Quick Stat Component
function QuickStat({
  label,
  value,
  icon,
  href,
  color = "slate",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href: string;
  color?: "blue" | "purple" | "amber" | "teal" | "slate";
}) {
  const colorConfig = {
    blue: "from-blue-500 to-blue-600 shadow-blue-500/20",
    purple: "from-[#3D8DB0] to-cg-slate shadow-[#3D8DB0]/20",
    amber: "from-cg-amber to-[#E09520] shadow-cg-amber/20",
    teal: "from-teal-500 to-teal-600 shadow-teal-500/20",
    slate: "from-slate-500 to-slate-600 shadow-slate-500/20",
  };

  return (
    <Link href={href}>
      <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-full border-slate-200 hover:border-slate-300">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            </div>
            <div className={`p-3 bg-gradient-to-br ${colorConfig[color]} text-white rounded-xl shadow-lg`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Navigation Card Component - Editorial Legal Style
function NavigationCard({
  title,
  description,
  icon,
  href,
  color,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: "burgundy" | "navy" | "amber" | "gold" | "slate";
}) {
  const colorClasses = {
    burgundy: "bg-red-900 text-red-50 shadow-lg shadow-red-900/30",
    navy: "bg-slate-900 text-slate-50 shadow-lg shadow-slate-900/30",
    amber: "bg-foreground text-background shadow-lg shadow-foreground/30",
    gold: "bg-[#B8791A] text-cg-amber-subtle shadow-lg shadow-[#B8791A]/30",
    slate: "bg-slate-700 text-slate-50 shadow-lg shadow-slate-700/30",
  };

  const borderClasses = {
    burgundy: "border-red-900/20 hover:border-red-900/40",
    navy: "border-slate-900/20 hover:border-slate-900/40",
    amber: "border-foreground/20 hover:border-foreground/40",
    gold: "border-[#B8791A]/20 hover:border-[#B8791A]/40",
    slate: "border-slate-700/20 hover:border-slate-700/40",
  };

  return (
    <Link href={href}>
      <Card className={`group hover:shadow-xl transition-all duration-500 cursor-pointer h-full bg-white border-2 ${borderClasses[color]} hover:-translate-y-1`}>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3.5 rounded-sm ${colorClasses[color]} transition-transform duration-300 group-hover:scale-110`}>
              {icon}
            </div>
            <div className="h-6 w-6 border-2 border-foreground/20 rounded-full flex items-center justify-center group-hover:border-foreground/60 transition-colors">
              <ChevronRight className="h-3.5 w-3.5 text-foreground/40 group-hover:text-foreground transition-all group-hover:translate-x-0.5" strokeWidth={2.5} />
            </div>
          </div>
          <h3 className="serif font-bold text-slate-900 text-lg leading-tight mb-2">{title}</h3>
          <p className="sans text-sm text-slate-600 leading-relaxed">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
