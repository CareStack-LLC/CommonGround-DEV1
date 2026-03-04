"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FileText,
  Scale,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Calendar,
  ChevronRight,
  Send,
  Edit,
  FileCheck,
  Plus,
  Gavel,
} from "lucide-react";
import { useCourtAuth } from "../../../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCourtAuthToken } from "@/lib/court-api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CourtFormSubmission {
  id: string;
  case_id: string;
  parent_id: string;
  form_type: string;
  status: string;
  submission_source: string;
  form_data: Record<string, any>;
  pdf_url?: string;
  aria_assisted: boolean;
  court_notes?: string;
  submitted_at?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

interface CaseFormProgress {
  case_id: string;
  activation_status: string;
  total_forms: number;
  pending_forms: number;
  approved_forms: number;
  has_fl300: boolean;
  has_fl300_approved: boolean;
  has_fl311: boolean;
  has_fl320: boolean;
  has_fl340: boolean;
  next_action?: string;
  fl300_id?: string;
}

interface CourtHearing {
  id: string;
  case_id: string;
  hearing_type: string;
  scheduled_date: string;
  scheduled_time?: string;
  department?: string;
  judge_name?: string;
  outcome?: string;
  petitioner_attended?: boolean;
  respondent_attended?: boolean;
}

const FORM_LABELS: Record<string, { name: string; description: string }> = {
  "FL-300": { name: "Request for Order", description: "Initial request to the court" },
  "FL-311": { name: "Child Custody Application", description: "Detailed custody proposal" },
  "FL-320": { name: "Responsive Declaration", description: "Response to FL-300" },
  "FL-340": { name: "Findings and Order", description: "Court order after hearing" },
  "FL-341": { name: "Custody Order Attachment", description: "Custody details" },
  "FL-342": { name: "Child Support Attachment", description: "Support details" },
};

const STATUS_CONFIG: Record<string, {
  label: string;
  variant: "default" | "success" | "warning" | "error" | "secondary";
  icon: typeof Clock;
  actionable: boolean;
}> = {
  draft: { label: "Draft", variant: "secondary", icon: Edit, actionable: false },
  pending_submission: { label: "Pending Submit", variant: "warning", icon: Send, actionable: false },
  submitted: { label: "Submitted", variant: "default", icon: Clock, actionable: true },
  under_court_review: { label: "Under Review", variant: "warning", icon: Eye, actionable: true },
  approved: { label: "Approved", variant: "success", icon: CheckCircle, actionable: false },
  rejected: { label: "Rejected", variant: "error", icon: XCircle, actionable: false },
  resubmit_required: { label: "Resubmit Required", variant: "error", icon: AlertCircle, actionable: false },
  served: { label: "Served", variant: "success", icon: CheckCircle, actionable: false },
  entered: { label: "Entered", variant: "success", icon: Scale, actionable: false },
  withdrawn: { label: "Withdrawn", variant: "secondary", icon: XCircle, actionable: false },
};

export default function CourtPortalFormsPage() {
  const params = useParams();
  const router = useRouter();
  const { professional, token, isLoading } = useCourtAuth();
  const caseId = params.id as string;

  const [forms, setForms] = useState<CourtFormSubmission[]>([]);
  const [progress, setProgress] = useState<CaseFormProgress | null>(null);
  const [hearings, setHearings] = useState<CourtHearing[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    if (professional && caseId) {
      loadData();
    }
  }, [professional, caseId]);

  const loadData = async () => {
    try {
      setIsLoadingData(true);
      setError(null);

      const authToken = token || getCourtAuthToken();
      const headers: HeadersInit = authToken ? { Authorization: `Bearer ${authToken}` } : {};

      const [formsRes, progressRes, hearingsRes] = await Promise.all([
        fetch(`${API_BASE}/court/forms/case/${caseId}`, { headers }),
        fetch(`${API_BASE}/court/forms/case/${caseId}/progress`, { headers }),
        fetch(`${API_BASE}/court/hearings/case/${caseId}`, { headers }),
      ]);

      if (formsRes.ok) {
        const data = await formsRes.json();
        setForms(data.forms || []);
      }

      if (progressRes.ok) {
        setProgress(await progressRes.json());
      }

      if (hearingsRes.ok) {
        setHearings(await hearingsRes.json());
      }
    } catch (err) {
      console.error("Failed to load forms data:", err);
      setError("Failed to load court forms data");
    } finally {
      setIsLoadingData(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getFormsNeedingReview = () => {
    return forms.filter((f) =>
      ["submitted", "under_court_review"].includes(f.status)
    );
  };

  const canScheduleHearing = () => {
    return progress?.has_fl300_approved && progress?.has_fl320;
  };

  const canEnterOrder = () => {
    return hearings.some((h) => h.outcome && !progress?.has_fl340);
  };

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Scale className="h-6 w-6 text-indigo-600" />
            Court Form Workflow
          </h1>
          <p className="text-muted-foreground">
            Review submissions, schedule hearings, and enter orders
          </p>
        </div>
        <div className="flex gap-2">
          {canScheduleHearing() && (
            <Button
              variant="outline"
              onClick={() => router.push(`/court-portal/cases/${caseId}/forms/schedule-hearing`)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Hearing
            </Button>
          )}
          {canEnterOrder() && (
            <Button onClick={() => router.push(`/court-portal/cases/${caseId}/forms/enter-order`)}>
              <Gavel className="h-4 w-4 mr-2" />
              Enter Order (FL-340)
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Progress Overview */}
      {progress && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardHeader>
            <CardTitle>Case Workflow Status</CardTitle>
            <CardDescription>
              Status: {progress.activation_status?.replace(/_/g, " ").toUpperCase() || "Pending"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatusIndicator
                label="FL-300 Filed"
                active={progress.has_fl300}
                approved={progress.has_fl300_approved}
              />
              <StatusIndicator
                label="FL-311 Filed"
                active={progress.has_fl311}
              />
              <StatusIndicator
                label="FL-320 Filed"
                active={progress.has_fl320}
              />
              <StatusIndicator
                label="Hearing Held"
                active={hearings.some((h) => h.outcome)}
              />
              <StatusIndicator
                label="Order Entered"
                active={progress.has_fl340}
              />
            </div>

            {progress.next_action && (
              <Alert className="mt-4 bg-white/70">
                <AlertCircle className="h-4 w-4 text-indigo-600" />
                <AlertDescription className="text-indigo-800">
                  <strong>Next Step:</strong> {progress.next_action}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Forms Needing Review */}
      {getFormsNeedingReview().length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <Clock className="h-5 w-5" />
              Forms Needing Review ({getFormsNeedingReview().length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getFormsNeedingReview().map((form) => {
                const formInfo = FORM_LABELS[form.form_type];
                return (
                  <div
                    key={form.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg hover:shadow-md cursor-pointer transition-all"
                    onClick={() => router.push(`/court-portal/cases/${caseId}/forms/${form.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{form.form_type}</p>
                          {getStatusBadge(form.status)}
                        </div>
                        <p className="text-sm text-gray-500">
                          {formInfo?.name} • Submitted {formatDate(form.submitted_at || form.created_at)}
                        </p>
                      </div>
                    </div>
                    <Button size="sm">
                      Review
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Hearings */}
      {hearings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Court Hearings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hearings.map((hearing) => (
                <div
                  key={hearing.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                      hearing.outcome ? "bg-green-100" : "bg-indigo-100"
                    }`}>
                      {hearing.outcome ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <Calendar className="h-6 w-6 text-indigo-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {hearing.hearing_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(hearing.scheduled_date)}
                        {hearing.scheduled_time && ` at ${hearing.scheduled_time}`}
                        {hearing.department && ` • Dept. ${hearing.department}`}
                      </p>
                      {hearing.outcome && (
                        <p className="text-sm text-green-600 mt-1">
                          Outcome: {hearing.outcome.replace(/_/g, " ")}
                        </p>
                      )}
                    </div>
                  </div>
                  {!hearing.outcome && (
                    <Button variant="outline" size="sm">
                      Record Outcome
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Forms */}
      <Card>
        <CardHeader>
          <CardTitle>All Court Forms</CardTitle>
          <CardDescription>
            {forms.length > 0
              ? `${forms.length} form${forms.length > 1 ? "s" : ""} in this case`
              : "No forms have been filed yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto" />
              <p className="mt-2 text-muted-foreground">Loading forms...</p>
            </div>
          ) : forms.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No court forms have been filed for this case.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {forms.map((form) => {
                const formInfo = FORM_LABELS[form.form_type];
                const config = STATUS_CONFIG[form.status] || STATUS_CONFIG.draft;
                return (
                  <div
                    key={form.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => router.push(`/court-portal/cases/${caseId}/forms/${form.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                        form.status === "approved" || form.status === "entered"
                          ? "bg-green-100"
                          : form.status === "rejected"
                          ? "bg-red-100"
                          : config.actionable
                          ? "bg-amber-100"
                          : "bg-gray-100"
                      }`}>
                        <FileText className={`h-6 w-6 ${
                          form.status === "approved" || form.status === "entered"
                            ? "text-green-600"
                            : form.status === "rejected"
                            ? "text-red-600"
                            : config.actionable
                            ? "text-amber-600"
                            : "text-gray-600"
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{form.form_type}</p>
                          {getStatusBadge(form.status)}
                          {form.aria_assisted && (
                            <Badge variant="secondary" className="text-xs">ARIA</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {formInfo?.name || form.form_type}
                        </p>
                        <p className="text-xs text-gray-400">
                          {form.submitted_at
                            ? `Submitted ${formatDate(form.submitted_at)}`
                            : `Created ${formatDate(form.created_at)}`}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIndicator({
  label,
  active,
  approved,
}: {
  label: string;
  active: boolean;
  approved?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg text-center ${
      approved ? "bg-green-100" : active ? "bg-indigo-100" : "bg-white/50"
    }`}>
      <div className="flex justify-center mb-1">
        {approved ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : active ? (
          <FileCheck className="h-5 w-5 text-indigo-600" />
        ) : (
          <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
        )}
      </div>
      <p className={`text-xs font-medium ${
        approved ? "text-green-700" : active ? "text-indigo-700" : "text-gray-500"
      }`}>
        {label}
      </p>
    </div>
  );
}
