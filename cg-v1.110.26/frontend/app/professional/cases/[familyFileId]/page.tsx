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
  Bot,
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
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfessionalAuth } from "../../layout";
import { CaseTimelineTab } from "@/components/professional/case-view/case-timeline-tab";
import { ClientCommunicationTab } from "@/components/professional/case-view/client-communication-tab";
import { DocumentList } from "@/components/professional/document-list";
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
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
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
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/professional/cases"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Cases
      </Link>

      {/* Case Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-teal-100 text-teal-600 rounded-xl shrink-0">
            <FolderOpen className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {caseData.family_file_number || `Case ${familyFileId.slice(0, 8)}`}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge className="bg-teal-100 text-teal-800">{caseData.status}</Badge>
              <span className="text-slate-300">|</span>
              <span className="text-sm text-slate-500 flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {representingLabels[caseData.representing]}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-sm text-slate-500">
                {roleLabels[caseData.assignment_role]}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Removed ARIA and Message Client buttons */}
        </div>
      </div>

      {/* Tabbed Case View */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
          <TabsList className="bg-white border border-slate-200 p-1 h-12 w-full justify-start overflow-x-auto no-scrollbar">
            <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none h-10 px-6">
              Overview
            </TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none h-10 px-6">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="communications" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none h-10 px-6">
              Client Communication
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none h-10 px-6">
              Documents
            </TabsTrigger>
            <TabsTrigger value="compliance" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none h-10 px-6">
              Sub-Portals
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 m-0 outline-none">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickStat
              label="Timeline Events"
              value={timelineSummary?.total_events || 0}
              icon={<Clock className="h-5 w-5" />}
              href="#"
              color="blue"
            />
            <QuickStat
              label="Messages"
              value={timelineSummary?.messages || 0}
              icon={<MessageSquare className="h-5 w-5" />}
              href="#"
              color="purple"
            />
            <QuickStat
              label="Exchanges"
              value={timelineSummary?.exchanges || 0}
              icon={<Calendar className="h-5 w-5" />}
              href="#"
              color="amber"
            />
            <QuickStat
              label="Court Events"
              value={timelineSummary?.court_events || 0}
              icon={<Scale className="h-5 w-5" />}
              href="#"
              color="teal"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <History className="h-4 w-4 text-indigo-500" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {/* Placeholder for activity stream */}
                    <div className="p-4 flex items-center justify-between text-sm text-slate-500 italic">
                      Recent case activity will stream here...
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-slate-200 bg-indigo-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start text-xs h-9 bg-white" asChild>
                    <Link href={`/professional/cases/${familyFileId}/aria`}>
                      <Bot className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                      Review ARIA Rules
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-xs h-9 bg-white" asChild>
                    <Link href={`/professional/cases/${familyFileId}/exports`}>
                      <Download className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                      Export Discovery File
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-xs h-9 bg-white">
                    <Scale className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                    Add Court Deadline
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">Case Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {caseData.access_scopes?.map((scope) => (
                      <Badge key={scope} variant="outline" className="capitalize bg-slate-50 text-slate-700 border-slate-200 text-[10px]">
                        {scope.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="m-0 outline-none">
          <CaseTimelineTab familyFileId={familyFileId} token={token || ""} />
        </TabsContent>


        {/* Client Communication Tab */}
        <TabsContent value="communications" className="m-0 outline-none">
          <ClientCommunicationTab familyFileId={familyFileId} token={token || ""} />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="m-0 outline-none">
          <DocumentList familyFileId={familyFileId} token={token || ""} />
        </TabsContent>

        {/* Sub-Portals Tab */}
        <TabsContent value="compliance" className="m-0 outline-none">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <NavigationCard
              title="Compliance Dashboard"
              description="Analysis of parenting plan adherence"
              icon={<BarChart3 className="h-6 w-6" />}
              href={`/professional/cases/${familyFileId}/compliance`}
              color="teal"
            />
            <NavigationCard
              title="ClearFund"
              description="Financial obligations and payment tracking"
              icon={<DollarSign className="h-6 w-6" />}
              href={`/professional/cases/${familyFileId}/clearfund`}
              color="blue"
            />
            <NavigationCard
              title="Agreement Review"
              description="Current version of the parenting agreement"
              icon={<FileText className="h-6 w-6" />}
              href={`/professional/cases/${familyFileId}/agreement`}
              color="purple"
            />
            <NavigationCard
              title="Exchange Schedule"
              description="Detailed calendar of past and future swaps"
              icon={<Calendar className="h-6 w-6" />}
              href={`/professional/cases/${familyFileId}/schedule`}
              color="amber"
            />
          </div>
        </TabsContent>
      </Tabs>
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
    purple: "from-purple-500 to-purple-600 shadow-purple-500/20",
    amber: "from-amber-500 to-amber-600 shadow-amber-500/20",
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

// Navigation Card Component
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
  color: "blue" | "purple" | "teal" | "amber" | "slate" | "cyan";
}) {
  const colorClasses = {
    blue: "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20",
    purple: "bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/20",
    teal: "bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/20",
    amber: "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20",
    slate: "bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-lg shadow-slate-500/20",
    cyan: "bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/20",
  };

  return (
    <Link href={href}>
      <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-full border-slate-200 hover:border-slate-300">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className={`p-3 rounded-xl ${colorClasses[color]}`}>{icon}</div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </div>
          <h3 className="font-semibold text-slate-900 mt-4">{title}</h3>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
