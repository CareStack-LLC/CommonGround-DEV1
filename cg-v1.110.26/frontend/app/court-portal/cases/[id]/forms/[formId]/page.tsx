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
  ArrowLeft,
  Send,
  Eye,
  Edit,
  MessageSquare,
  Calendar,
  User,
  Download,
  ExternalLink,
  Sparkles,
  Users,
  Gavel,
  BookOpen,
  FileCheck,
  Printer,
} from "lucide-react";
import { useCourtAuth } from "../../../../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getCourtAuthToken } from "@/lib/court-api";

// Import Summary components for rich form display
import FL300Summary from "@/components/court-forms/FL300Summary";
import FL311Summary from "@/components/court-forms/FL311Summary";
import FL320Summary from "@/components/court-forms/FL320Summary";
import FL340Summary from "@/components/court-forms/FL340Summary";
import FL341Summary from "@/components/court-forms/FL341Summary";
import FL342Summary from "@/components/court-forms/FL342Summary";

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
  resubmission_issues?: string[];
  submitted_at?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  // Edit permission fields
  edits_allowed: boolean;
  edits_allowed_by?: string;
  edits_allowed_at?: string;
  edits_allowed_notes?: string;
  edits_allowed_sections?: string[];
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
}> = {
  draft: { label: "Draft", variant: "secondary", icon: Edit },
  pending_submission: { label: "Pending Submit", variant: "warning", icon: Send },
  submitted: { label: "Submitted", variant: "default", icon: Clock },
  under_court_review: { label: "Under Review", variant: "warning", icon: Eye },
  approved: { label: "Approved", variant: "success", icon: CheckCircle },
  rejected: { label: "Rejected", variant: "error", icon: XCircle },
  resubmit_required: { label: "Resubmit Required", variant: "error", icon: AlertCircle },
  served: { label: "Served", variant: "success", icon: CheckCircle },
  entered: { label: "Entered", variant: "success", icon: Scale },
  withdrawn: { label: "Withdrawn", variant: "secondary", icon: XCircle },
};

// Form sections by form type - used for requesting changes
const FORM_SECTIONS: Record<string, { id: string; label: string }[]> = {
  "FL-300": [
    { id: "case_info", label: "Case Information" },
    { id: "party_info", label: "Party Information" },
    { id: "request_type", label: "Request Type" },
    { id: "facts", label: "Facts Supporting Request" },
    { id: "requested_orders", label: "Requested Orders" },
    { id: "attachments", label: "Attachments" },
  ],
  "FL-311": [
    { id: "children", label: "Children Information" },
    { id: "legal_custody", label: "Legal Custody" },
    { id: "physical_custody", label: "Physical Custody" },
    { id: "visitation_schedule", label: "Visitation Schedule" },
    { id: "holiday_schedule", label: "Holiday Schedule" },
    { id: "transportation", label: "Transportation & Exchange" },
    { id: "communication", label: "Communication" },
    { id: "other_orders", label: "Other Orders" },
  ],
  "FL-320": [
    { id: "response_to_request", label: "Response to Request" },
    { id: "consent_orders", label: "Consent to Orders" },
    { id: "counter_proposal", label: "Counter-Proposal" },
    { id: "facts_response", label: "Response to Facts" },
    { id: "attachments", label: "Attachments" },
  ],
  "FL-340": [
    { id: "hearing_info", label: "Hearing Information" },
    { id: "attendance", label: "Attendance" },
    { id: "findings", label: "Findings" },
    { id: "orders", label: "Orders" },
  ],
  "FL-341": [
    { id: "legal_custody", label: "Legal Custody" },
    { id: "physical_custody", label: "Physical Custody" },
    { id: "visitation", label: "Visitation Schedule" },
    { id: "holidays", label: "Holiday Schedule" },
    { id: "transportation", label: "Transportation" },
  ],
  "FL-342": [
    { id: "income", label: "Income Information" },
    { id: "support_amount", label: "Support Amount" },
    { id: "healthcare", label: "Healthcare" },
    { id: "earnings_assignment", label: "Earnings Assignment" },
  ],
};

export default function CourtPortalFormDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { professional, token, isLoading } = useCourtAuth();
  const caseId = params.id as string;
  const formId = params.formId as string;

  const [form, setForm] = useState<CourtFormSubmission | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Action states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [showServedModal, setShowServedModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [courtNotes, setCourtNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [resubmitIssues, setResubmitIssues] = useState("");
  const [serviceType, setServiceType] = useState("electronic");
  const [servedDate, setServedDate] = useState("");
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    if (professional && formId) {
      loadForm();
    }
  }, [professional, formId]);

  const loadForm = async () => {
    try {
      setIsLoadingData(true);
      setError(null);

      const authToken = token || getCourtAuthToken();
      if (!authToken) {
        setError("Session expired. Please log in again.");
        router.push("/court-portal");
        return;
      }

      const headers: HeadersInit = { Authorization: `Bearer ${authToken}` };

      const response = await fetch(`${API_BASE}/court/forms/${formId}`, { headers });

      if (response.status === 401) {
        setError("Session expired. Please log in again.");
        router.push("/court-portal");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load form");
      }

      setForm(await response.json());
    } catch (err) {
      console.error("Failed to load form:", err);
      setError("Failed to load form data");
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const authToken = token || getCourtAuthToken();
      if (!authToken) {
        setError("Session expired. Please log in again.");
        router.push("/court-portal");
        return;
      }

      const response = await fetch(`${API_BASE}/court/forms/${formId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ notes: courtNotes || undefined }),
      });

      if (response.status === 401) {
        setError("Session expired. Please log in again.");
        router.push("/court-portal");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to approve form");
      }

      setForm(await response.json());
      setSuccess("Form approved successfully");
      setShowApproveModal(false);
      setCourtNotes("");
    } catch (err: any) {
      setError(err.message || "Failed to approve form");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const authToken = token || getCourtAuthToken();
      if (!authToken) {
        setError("Session expired. Please log in again.");
        router.push("/court-portal");
        return;
      }

      const response = await fetch(`${API_BASE}/court/forms/${formId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (response.status === 401) {
        setError("Session expired. Please log in again.");
        router.push("/court-portal");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to reject form");
      }

      setForm(await response.json());
      setSuccess("Form rejected");
      setShowRejectModal(false);
      setRejectReason("");
    } catch (err: any) {
      setError(err.message || "Failed to reject form");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestResubmission = async () => {
    if (!resubmitIssues.trim()) {
      setError("Please specify the issues to address");
      return;
    }

    if (selectedSections.length === 0) {
      setError("Please select at least one section that needs changes");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const issues = resubmitIssues.split("\n").filter((i) => i.trim());
      const authToken = token || getCourtAuthToken();

      // Check if we have a valid token
      if (!authToken) {
        setError("Session expired. Please log in again.");
        router.push("/court-portal");
        return;
      }

      // First, request resubmission with the issues
      const resubmitResponse = await fetch(`${API_BASE}/court/forms/${formId}/request-resubmission`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ issues, notes: courtNotes || undefined }),
      });

      if (resubmitResponse.status === 401) {
        setError("Session expired. Please log in again.");
        router.push("/court-portal");
        return;
      }

      if (!resubmitResponse.ok) {
        const errorData = await resubmitResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to request resubmission");
      }

      // Then, allow parent edits for the selected sections
      const allowEditsResponse = await fetch(`${API_BASE}/court/forms/${formId}/allow-edits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          notes: resubmitIssues,
          sections: selectedSections,
        }),
      });

      if (allowEditsResponse.status === 401) {
        setError("Session expired. Please log in again.");
        router.push("/court-portal");
        return;
      }

      if (!allowEditsResponse.ok) {
        const errorData = await allowEditsResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to enable parent edits");
      }

      setForm(await allowEditsResponse.json());
      setSuccess("Changes requested - parent can now edit the selected sections");
      setShowResubmitModal(false);
      setResubmitIssues("");
      setCourtNotes("");
      setSelectedSections([]);
    } catch (err: any) {
      setError(err.message || "Failed to request resubmission");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkServed = async () => {
    if (!servedDate) {
      setError("Please specify the service date");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const authToken = token || getCourtAuthToken();
      if (!authToken) {
        setError("Session expired. Please log in again.");
        router.push("/court-portal");
        return;
      }

      const response = await fetch(`${API_BASE}/court/forms/${formId}/mark-served`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          service_type: serviceType,
          served_on_date: servedDate,
          notes: courtNotes || undefined,
        }),
      });

      if (response.status === 401) {
        setError("Session expired. Please log in again.");
        router.push("/court-portal");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to mark as served");
      }

      setForm(await response.json());
      setSuccess("Form marked as served");
      setShowServedModal(false);
      setServiceType("electronic");
      setServedDate("");
      setCourtNotes("");
    } catch (err: any) {
      setError(err.message || "Failed to mark as served");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeEdits = async () => {
    if (!confirm("Are you sure you want to revoke the parent's edit permission?")) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const authToken = token || getCourtAuthToken();
      if (!authToken) {
        setError("Session expired. Please log in again.");
        router.push("/court-portal");
        return;
      }

      const response = await fetch(`${API_BASE}/court/forms/${formId}/revoke-edits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({}),
      });

      if (response.status === 401) {
        setError("Session expired. Please log in again.");
        router.push("/court-portal");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to revoke edit permission");
      }

      setForm(await response.json());
      setSuccess("Edit permission revoked");
    } catch (err: any) {
      setError(err.message || "Failed to revoke edit permission");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canTakeAction = () => {
    return form && ["submitted", "under_court_review"].includes(form.status);
  };

  const canMarkServed = () => {
    return form && form.status === "approved" && form.form_type === "FL-300";
  };

  // Generate a PDF report of the form data using browser print functionality
  const generateFormPDF = () => {
    if (!form) return;

    const formInfo = FORM_LABELS[form.form_type] || { name: form.form_type, description: "" };
    const statusConfig = STATUS_CONFIG[form.status] || STATUS_CONFIG.draft;

    // Format form data for display
    const formatValue = (value: any): string => {
      if (value === null || value === undefined) return "Not provided";
      if (typeof value === "boolean") return value ? "Yes" : "No";
      if (Array.isArray(value)) {
        if (value.length === 0) return "None";
        return value.map(item => typeof item === "object" ? JSON.stringify(item) : String(item)).join(", ");
      }
      if (typeof value === "object") {
        return Object.entries(value)
          .map(([k, v]) => `${k.replace(/_/g, " ")}: ${formatValue(v)}`)
          .join("; ");
      }
      // Check if it looks like a date
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return new Date(value).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
      return String(value);
    };

    const formatLabel = (key: string) => {
      return key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    };

    // Build form fields HTML
    let formFieldsHtml = "";
    if (form.form_data && Object.keys(form.form_data).length > 0) {
      formFieldsHtml = Object.entries(form.form_data)
        .map(([key, value]) => `
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #ddd; font-weight: 500; background: #f9fafb; width: 200px;">
              ${formatLabel(key)}
            </td>
            <td style="padding: 8px 12px; border: 1px solid #ddd;">
              ${formatValue(value)}
            </td>
          </tr>
        `)
        .join("");
    } else {
      formFieldsHtml = `<tr><td colspan="2" style="padding: 12px; text-align: center; color: #6b7280;">No form data available</td></tr>`;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${form.form_type} - Court Form Report</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none; }
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.6;
            color: #1f2937;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #1e40af;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .court-title {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #1e40af;
            margin-bottom: 10px;
          }
          .form-type {
            font-size: 28px;
            font-weight: bold;
            margin: 10px 0;
          }
          .form-name {
            font-size: 18px;
            color: #4b5563;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e40af;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
            margin-bottom: 15px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 20px;
          }
          .info-item {
            margin-bottom: 8px;
          }
          .info-label {
            font-weight: 600;
            color: #374151;
          }
          .info-value {
            color: #1f2937;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .status-approved { background: #d1fae5; color: #065f46; }
          .status-submitted { background: #dbeafe; color: #1e40af; }
          .status-draft { background: #f3f4f6; color: #374151; }
          .status-rejected { background: #fee2e2; color: #991b1b; }
          .status-under_court_review { background: #fef3c7; color: #92400e; }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .data-table th, .data-table td {
            border: 1px solid #d1d5db;
            padding: 8px 12px;
            text-align: left;
          }
          .data-table th {
            background: #f3f4f6;
            font-weight: 600;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
          }
          .generated-info {
            margin-top: 10px;
            font-style: italic;
          }
          .court-notes {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 15px;
            margin-top: 10px;
          }
          .court-notes-label {
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="court-title">California Superior Court - Court Portal</div>
          <div class="form-type">${form.form_type}</div>
          <div class="form-name">${formInfo.name}</div>
          <div style="margin-top: 10px;">
            <span class="status-badge status-${form.status.replace(/_/g, "_")}">${statusConfig.label}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Submission Information</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Form ID:</span>
              <span class="info-value">${form.id}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Case ID:</span>
              <span class="info-value">${form.case_id}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Submission Source:</span>
              <span class="info-value">${form.submission_source?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "Platform"}${form.aria_assisted ? " (ARIA Assisted)" : ""}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Status:</span>
              <span class="info-value">${statusConfig.label}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Created:</span>
              <span class="info-value">${formatDate(form.created_at)}</span>
            </div>
            ${form.submitted_at ? `
            <div class="info-item">
              <span class="info-label">Submitted:</span>
              <span class="info-value">${formatDate(form.submitted_at)}</span>
            </div>
            ` : ""}
            ${form.approved_at ? `
            <div class="info-item">
              <span class="info-label">Approved:</span>
              <span class="info-value">${formatDate(form.approved_at)}</span>
            </div>
            ` : ""}
          </div>
        </div>

        ${form.court_notes ? `
        <div class="section">
          <div class="section-title">Court Notes</div>
          <div class="court-notes">
            <div class="court-notes-label">Notes:</div>
            <div>${form.court_notes}</div>
          </div>
        </div>
        ` : ""}

        ${form.resubmission_issues && form.resubmission_issues.length > 0 ? `
        <div class="section">
          <div class="section-title">Resubmission Issues</div>
          <ul style="margin: 0; padding-left: 20px;">
            ${form.resubmission_issues.map(issue => `<li>${issue}</li>`).join("")}
          </ul>
        </div>
        ` : ""}

        <div class="section">
          <div class="section-title">Form Data</div>
          <table class="data-table">
            <tbody>
              ${formFieldsHtml}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <div><strong>CommonGround</strong> - California Family Court Form System</div>
          <div class="generated-info">
            Generated on ${new Date().toLocaleString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div style="margin-top: 5px;">This document is generated from the CommonGround Court Portal for official court review.</div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Form not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/court-portal/cases/${caseId}/forms`)}
        >
          Back to Forms
        </Button>
      </div>
    );
  }

  const formInfo = FORM_LABELS[form.form_type];
  const statusConfig = STATUS_CONFIG[form.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link href={`/court-portal/cases/${caseId}/forms`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forms
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{form.form_type}</h1>
            <Badge variant={statusConfig.variant} className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {formInfo?.name} - {formInfo?.description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {canTakeAction() && (
            <>
              <Button
                variant="outline"
                className="text-amber-600 hover:bg-amber-50 border-amber-200"
                onClick={() => setShowResubmitModal(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Request Changes
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:bg-red-50"
                onClick={() => setShowRejectModal(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button onClick={() => setShowApproveModal(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </>
          )}

          {canMarkServed() && (
            <Button onClick={() => setShowServedModal(true)}>
              <Send className="h-4 w-4 mr-2" />
              Mark as Served
            </Button>
          )}

          {/* PDF Report Button - Always Available in Header */}
          <Button variant="outline" onClick={generateFormPDF}>
            <Printer className="h-4 w-4 mr-2" />
            Generate PDF Report
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* Form Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Submission Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Form ID</dt>
              <dd className="font-mono text-foreground">{form.id.slice(0, 8)}...</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Form Type</dt>
              <dd className="text-foreground">{form.form_type}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Source</dt>
              <dd className="text-foreground">
                {form.submission_source?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Platform"}
                {form.aria_assisted && " (ARIA)"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="text-foreground">{formatDate(form.created_at)}</dd>
            </div>
            {form.submitted_at && (
              <div>
                <dt className="text-muted-foreground">Submitted</dt>
                <dd className="text-foreground">{formatDate(form.submitted_at)}</dd>
              </div>
            )}
            {form.approved_at && (
              <div>
                <dt className="text-muted-foreground">Approved</dt>
                <dd className="text-foreground">{formatDate(form.approved_at)}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Court Notes */}
      {form.court_notes && (
        <Card className="bg-indigo-50 border-indigo-200">
          <CardHeader>
            <CardTitle className="text-indigo-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Court Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-indigo-800">{form.court_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Resubmission Issues */}
      {form.resubmission_issues && form.resubmission_issues.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Issues Requiring Resubmission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-red-800">
              {form.resubmission_issues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Edits Allowed Indicator */}
      {form.edits_allowed && (
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-amber-900 flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Parent Edits Allowed
            </CardTitle>
            <CardDescription className="text-amber-700">
              The parent has been granted permission to make corrections to this form.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {form.edits_allowed_notes && (
              <div>
                <span className="font-medium text-amber-800">Notes to parent: </span>
                <span className="text-amber-700">{form.edits_allowed_notes}</span>
              </div>
            )}
            {form.edits_allowed_at && (
              <div className="text-sm text-amber-600">
                Granted on {formatDate(form.edits_allowed_at)}
              </div>
            )}
            {form.edits_allowed_sections && form.edits_allowed_sections.length > 0 && (
              <div className="text-sm">
                <span className="font-medium text-amber-800">Sections allowed: </span>
                <span className="text-amber-700">
                  {form.edits_allowed_sections.map((s: string) => {
                    const section = (FORM_SECTIONS[form.form_type] || []).find((fs) => fs.id === s);
                    return section ? section.label : s;
                  }).join(", ")}
                </span>
              </div>
            )}
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-amber-700 border-amber-300 hover:bg-amber-100"
                onClick={handleRevokeEdits}
                disabled={isSubmitting}
              >
                <XCircle className="h-4 w-4 mr-2" />
                {isSubmitting ? "Revoking..." : "Revoke Edit Permission"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PDF Document (if available) */}
      {form.pdf_url && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Court Document PDF
            </CardTitle>
            <CardDescription>
              Official PDF document filed with the court
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg overflow-hidden bg-gray-100">
              <iframe
                src={form.pdf_url}
                className="w-full h-[400px]"
                title="Court Document PDF"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => window.open(form.pdf_url!, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
              <Button
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = form.pdf_url!;
                  link.download = `${form.form_type}-${form.id}.pdf`;
                  link.click();
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Data - Enhanced Display with Summary Components */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Form Content
          </CardTitle>
          <CardDescription>
            Review the submitted form data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {form.form_data && Object.keys(form.form_data).length > 0 ? (
            <FormContentDisplay
              formData={form.form_data}
              formType={form.form_type}
              formStatus={form.status}
              caseId={caseId}
              formId={formId}
            />
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No form data available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Approve Modal */}
      {showApproveModal && (
        <Modal onClose={() => setShowApproveModal(false)}>
          <h2 className="text-xl font-bold mb-4">Approve Form</h2>
          <p className="text-muted-foreground mb-4">
            Approve this {form.form_type} submission?
          </p>
          <div className="mb-4">
            <Label htmlFor="approveNotes">Court Notes (Optional)</Label>
            <Textarea
              id="approveNotes"
              value={courtNotes}
              onChange={(e) => setCourtNotes(e.target.value)}
              placeholder="Add any notes for the record..."
              rows={3}
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isSubmitting}>
              {isSubmitting ? "Approving..." : "Approve"}
            </Button>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <Modal onClose={() => setShowRejectModal(false)}>
          <h2 className="text-xl font-bold mb-4">Reject Form</h2>
          <p className="text-muted-foreground mb-4">
            Reject this {form.form_type} submission? This action cannot be undone.
          </p>
          <div className="mb-4">
            <Label htmlFor="rejectReason">Reason for Rejection *</Label>
            <Textarea
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this form is being rejected..."
              rows={3}
              className="mt-1"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isSubmitting || !rejectReason.trim()}
            >
              {isSubmitting ? "Rejecting..." : "Reject Form"}
            </Button>
          </div>
        </Modal>
      )}

      {/* Request Changes Modal */}
      {showResubmitModal && (
        <Modal onClose={() => { setShowResubmitModal(false); setSelectedSections([]); }} size="large">
          <h2 className="text-xl font-bold mb-4">Request Changes</h2>
          <Alert className="mb-4 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              This will allow the parent to edit <strong>only</strong> the sections you select below.
              You cannot edit the form directly - only request corrections from the parent.
            </AlertDescription>
          </Alert>

          {/* Section Selection */}
          <div className="mb-4">
            <Label className="text-base font-semibold">Select Sections to Edit *</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Choose which sections the parent should correct
            </p>
            <div className="grid grid-cols-2 gap-2 border rounded-md p-3 bg-gray-50">
              {(FORM_SECTIONS[form.form_type] || []).map((section) => (
                <label
                  key={section.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-white cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(section.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSections([...selectedSections, section.id]);
                      } else {
                        setSelectedSections(selectedSections.filter((s) => s !== section.id));
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm">{section.label}</span>
                </label>
              ))}
            </div>
            {selectedSections.length > 0 && (
              <p className="text-xs text-indigo-600 mt-2">
                {selectedSections.length} section(s) selected
              </p>
            )}
          </div>

          {/* Issues Description */}
          <div className="mb-4">
            <Label htmlFor="resubmitIssues">What Needs to be Corrected? *</Label>
            <Textarea
              id="resubmitIssues"
              value={resubmitIssues}
              onChange={(e) => setResubmitIssues(e.target.value)}
              placeholder="Describe what the parent needs to fix in each section..."
              rows={3}
              className="mt-1"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Be specific so the parent knows exactly what to correct
            </p>
          </div>

          {/* Additional Notes */}
          <div className="mb-4">
            <Label htmlFor="resubmitNotes">Additional Notes (Optional)</Label>
            <Textarea
              id="resubmitNotes"
              value={courtNotes}
              onChange={(e) => setCourtNotes(e.target.value)}
              placeholder="Any additional guidance or context..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => { setShowResubmitModal(false); setSelectedSections([]); }}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestResubmission}
              disabled={isSubmitting || !resubmitIssues.trim() || selectedSections.length === 0}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? "Requesting..." : "Request Changes"}
            </Button>
          </div>
        </Modal>
      )}

      {/* Mark Served Modal */}
      {showServedModal && (
        <Modal onClose={() => setShowServedModal(false)}>
          <h2 className="text-xl font-bold mb-4">Mark as Served</h2>
          <p className="text-muted-foreground mb-4">
            Record service of this {form.form_type} to the respondent.
          </p>
          <div className="mb-4">
            <Label htmlFor="serviceType">Service Type</Label>
            <select
              id="serviceType"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="electronic">Electronic (Platform)</option>
              <option value="personal">Personal Service</option>
              <option value="substituted">Substituted Service</option>
              <option value="mail">Mail Service</option>
            </select>
          </div>
          <div className="mb-4">
            <Label htmlFor="servedDate">Date Served *</Label>
            <Input
              id="servedDate"
              type="date"
              value={servedDate}
              onChange={(e) => setServedDate(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div className="mb-4">
            <Label htmlFor="servedNotes">Notes (Optional)</Label>
            <Textarea
              id="servedNotes"
              value={courtNotes}
              onChange={(e) => setCourtNotes(e.target.value)}
              placeholder="Any notes about service..."
              rows={2}
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowServedModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkServed}
              disabled={isSubmitting || !servedDate}
            >
              {isSubmitting ? "Recording..." : "Mark as Served"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  children,
  onClose,
  size = "default",
}: {
  children: React.ReactNode;
  onClose: () => void;
  size?: "default" | "large";
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className={`w-full max-h-[90vh] flex flex-col ${size === "large" ? "max-w-2xl" : "max-w-lg"}`}>
        <CardContent className="pt-6 overflow-y-auto">{children}</CardContent>
      </Card>
    </div>
  );
}

// Form content display using dedicated Summary components
function FormContentDisplay({
  formData,
  formType,
}: {
  formData: Record<string, any>;
  formType: string;
  formStatus: string;
  caseId: string;
  formId: string;
}) {
  // Court staff CANNOT edit forms directly - they can only "Allow Edits" to let the parent make corrections
  // This prevents clerks from fabricating or altering court documents
  const canEdit = false;

  // No edit handler needed - court staff cannot edit
  const handleEditSection = () => {
    // Not used - court staff cannot edit
  };

  // Render the appropriate Summary component based on form type
  // Edit buttons will not be shown since canEdit is always false
  switch (formType) {
    case "FL-300":
      return (
        <FL300Summary
          formData={formData}
          canEdit={canEdit}
          onEditSection={handleEditSection}
        />
      );

    case "FL-311":
      return (
        <FL311Summary
          formData={formData}
          canEdit={canEdit}
          onEditSection={handleEditSection}
        />
      );

    case "FL-320":
      return (
        <FL320Summary
          formData={formData}
          canEdit={canEdit}
          onEditSection={handleEditSection}
        />
      );

    case "FL-340":
      return (
        <FL340Summary
          formData={formData}
          canEdit={canEdit}
          onEditSection={handleEditSection}
        />
      );

    case "FL-341":
      return (
        <FL341Summary
          formData={formData}
          canEdit={canEdit}
          onEditSection={handleEditSection}
        />
      );

    case "FL-342":
      return (
        <FL342Summary
          formData={formData}
          canEdit={canEdit}
          onEditSection={handleEditSection}
        />
      );

    default:
      // Fallback to generic display for unknown form types
      return <FormDataDisplay data={formData} formType={formType} />;
  }
}

// Generic form data display component with AI-style summary (fallback)
function FormDataDisplay({ data, formType }: { data: Record<string, any>; formType: string }) {
  // Generate AI-style summary based on form type and data
  const generateSummary = () => {
    const parts: string[] = [];

    // Common fields across form types
    if (data.case_number) {
      parts.push(`**Case Number:** ${data.case_number}`);
    }

    if (formType === "FL-300") {
      // Request for Order
      if (data.requesting_order_type) {
        parts.push(`The petitioner is requesting a court order regarding **${data.requesting_order_type}**.`);
      }
      if (data.facts_supporting_request) {
        parts.push(`**Supporting Facts:** ${data.facts_supporting_request.substring(0, 200)}${data.facts_supporting_request.length > 200 ? '...' : ''}`);
      }
      if (data.requested_orders) {
        parts.push(`**Requested Orders:** ${data.requested_orders}`);
      }
    } else if (formType === "FL-311") {
      // Child Custody Application
      if (data.custody_type) {
        parts.push(`Petitioner proposes **${data.custody_type}** custody arrangement.`);
      }
      if (data.visitation_schedule) {
        parts.push(`**Proposed Visitation:** ${data.visitation_schedule}`);
      }
      if (data.children && Array.isArray(data.children)) {
        parts.push(`**Children Covered:** ${data.children.length} child(ren)`);
      }
    } else if (formType === "FL-320") {
      // Responsive Declaration
      if (data.consent_to_request) {
        parts.push(`Respondent **${data.consent_to_request ? 'consents' : 'does not consent'}** to the request.`);
      }
      if (data.counter_proposal) {
        parts.push(`**Counter-Proposal:** ${data.counter_proposal}`);
      }
      if (data.response_to_facts) {
        parts.push(`**Response to Facts:** ${data.response_to_facts.substring(0, 200)}${data.response_to_facts.length > 200 ? '...' : ''}`);
      }
    } else if (formType === "FL-340") {
      // Findings and Order After Hearing
      if (data.hearing_date) {
        parts.push(`Following a hearing on **${new Date(data.hearing_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**, the court has entered the following orders.`);
      }
      if (data.petitioner_present !== undefined) {
        parts.push(`**Petitioner:** ${data.petitioner_present ? 'Present' : 'Not Present'}`);
      }
      if (data.respondent_present !== undefined) {
        parts.push(`**Respondent:** ${data.respondent_present ? 'Present' : 'Not Present'}`);
      }
      if (data.custody_orders) {
        parts.push(`**Custody Orders:** ${data.custody_orders}`);
      }
    } else if (formType === "FL-341") {
      // Custody Order Attachment
      if (data.legal_custody) {
        parts.push(`**Legal Custody:** ${data.legal_custody}`);
      }
      if (data.physical_custody) {
        parts.push(`**Physical Custody:** ${data.physical_custody}`);
      }
      if (data.visitation_schedule) {
        parts.push(`**Visitation Schedule:** ${data.visitation_schedule}`);
      }
    } else if (formType === "FL-342") {
      // Child Support Attachment
      if (data.support_amount) {
        parts.push(`**Monthly Support Amount:** $${Number(data.support_amount).toLocaleString()}`);
      }
      if (data.payor) {
        parts.push(`**Payor:** ${data.payor}`);
      }
      if (data.effective_date) {
        parts.push(`**Effective Date:** ${new Date(data.effective_date).toLocaleDateString()}`);
      }
    }

    return parts.length > 0
      ? parts.join('\n\n')
      : 'No detailed summary available for this form type.';
  };

  // Format field label for display
  const formatLabel = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Render a value based on its type
  const renderValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">Not provided</span>;
    }
    if (typeof value === 'boolean') {
      return value ? (
        <span className="text-green-600">Yes</span>
      ) : (
        <span className="text-red-600">No</span>
      );
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground italic">None</span>;
      }
      return (
        <ul className="list-disc list-inside mt-1">
          {value.map((item, idx) => (
            <li key={idx}>
              {typeof item === 'object' ? JSON.stringify(item) : String(item)}
            </li>
          ))}
        </ul>
      );
    }
    if (typeof value === 'object') {
      return (
        <div className="ml-4 mt-1 border-l-2 border-gray-200 pl-4 space-y-1">
          {Object.entries(value).map(([k, v]) => (
            <div key={k}>
              <span className="font-medium text-muted-foreground">{formatLabel(k)}:</span>{' '}
              {renderValue(v)}
            </div>
          ))}
        </div>
      );
    }
    // Check if it looks like a date
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return String(value);
  };

  const summary = generateSummary();

  return (
    <div className="space-y-6">
      {/* AI-style Summary */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <h4 className="font-semibold text-indigo-900">Form Summary</h4>
        </div>
        <div className="prose prose-sm max-w-none text-indigo-800">
          {summary.split('\n\n').map((paragraph, idx) => (
            <p key={idx} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{
              __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            }} />
          ))}
        </div>
      </div>

      {/* Detailed Form Fields */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b">
          <h4 className="font-medium text-gray-700 flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            All Form Fields
          </h4>
        </div>
        <div className="p-4">
          <dl className="space-y-3">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                <dt className="font-medium text-gray-600">
                  {formatLabel(key)}
                </dt>
                <dd className="sm:col-span-2 text-gray-900">
                  {renderValue(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
