"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCourtAuth } from "../../../../../layout";
import { getCourtAuthToken } from "@/lib/court-api";

// Import form wizards
import FL300Wizard from "@/components/court-forms/FL300Wizard";
import FL311Wizard from "@/components/court-forms/FL311Wizard";
import FL320Wizard from "@/components/court-forms/FL320Wizard";
import FL340Wizard from "@/components/court-forms/FL340Wizard";
import FL341Wizard from "@/components/court-forms/FL341Wizard";
import FL342Wizard from "@/components/court-forms/FL342Wizard";

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
  created_at: string;
  updated_at: string;
}

interface CaseData {
  id: string;
  case_name: string;
  case_number?: string;
  petitioner_name?: string;
  respondent_name?: string;
  children?: { first_name: string; last_name: string; date_of_birth: string }[];
}

const FORM_LABELS: Record<string, { name: string; description: string }> = {
  "FL-300": { name: "Request for Order", description: "Initial request to the court" },
  "FL-311": { name: "Child Custody Application", description: "Detailed custody proposal" },
  "FL-320": { name: "Responsive Declaration", description: "Response to FL-300" },
  "FL-340": { name: "Findings and Order", description: "Court order after hearing" },
  "FL-341": { name: "Custody Order Attachment", description: "Custody details" },
  "FL-342": { name: "Child Support Attachment", description: "Support details" },
};

function FormEditContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { professional, token, isLoading } = useCourtAuth();

  const caseId = params.id as string;
  const formId = params.formId as string;
  const initialSection = searchParams.get("section")
    ? parseInt(searchParams.get("section")!, 10)
    : 0;

  const [form, setForm] = useState<CourtFormSubmission | null>(null);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    if (professional && formId) {
      loadFormAndCase();
    }
  }, [professional, formId]);

  const loadFormAndCase = async () => {
    try {
      setIsLoadingData(true);
      setError(null);

      const authToken = token || getCourtAuthToken();
      const headers: HeadersInit = authToken ? { Authorization: `Bearer ${authToken}` } : {};

      // Load form and case data in parallel
      const [formRes, caseRes] = await Promise.all([
        fetch(`${API_BASE}/court/forms/${formId}`, { headers }),
        fetch(`${API_BASE}/court/cases/${caseId}`, { headers }),
      ]);

      if (!formRes.ok) {
        throw new Error("Failed to load form");
      }

      const formData = await formRes.json();
      setForm(formData);

      // Case data might fail if endpoint doesn't exist, handle gracefully
      if (caseRes.ok) {
        const caseDataResult = await caseRes.json();
        setCaseData(caseDataResult);
      } else {
        // Create minimal case data from form
        setCaseData({
          id: caseId,
          case_name: "Case",
          petitioner_name: formData.form_data?.petitioner_name,
          respondent_name: formData.form_data?.respondent_name,
          case_number: formData.form_data?.case_number,
          children: formData.form_data?.children || [],
        });
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load form data");
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSave = async (data: Record<string, any>) => {
    try {
      setIsSaving(true);
      setError(null);

      const authToken = token || getCourtAuthToken();
      const response = await fetch(`${API_BASE}/court/forms/${formId}/court-update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ form_data: data }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to save form");
      }

      const updated = await response.json();
      setForm(updated);
      setSuccess("Form saved successfully");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Failed to save form:", err);
      setError(err.message || "Failed to save form");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (data: Record<string, any>) => {
    // For court portal, submit just saves and returns to form view
    await handleSave(data);
    router.push(`/court-portal/cases/${caseId}/forms/${formId}`);
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
  const wizardCaseData = {
    petitioner_name: caseData?.petitioner_name || form.form_data?.petitioner_name || "",
    respondent_name: caseData?.respondent_name || form.form_data?.respondent_name || "",
    case_number: caseData?.case_number || form.form_data?.case_number || "",
    children: caseData?.children || form.form_data?.children || [],
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link href={`/court-portal/cases/${caseId}/forms/${formId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Form
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Edit {form.form_type}
        </h1>
        <p className="text-muted-foreground">
          {formInfo?.name} - {formInfo?.description}
        </p>
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
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* Form Wizard */}
      <div className="bg-white rounded-lg border shadow-sm">
        <FormWizardDisplay
          formType={form.form_type}
          formData={form.form_data}
          caseData={wizardCaseData}
          initialSection={initialSection}
          onSave={handleSave}
          onSubmit={handleSubmit}
          isLoading={isSaving}
        />
      </div>
    </div>
  );
}

interface FormWizardDisplayProps {
  formType: string;
  formData: Record<string, any>;
  caseData: {
    petitioner_name?: string;
    respondent_name?: string;
    case_number?: string;
    children?: { first_name: string; last_name: string; date_of_birth: string }[];
  };
  initialSection: number;
  onSave: (data: Record<string, any>) => Promise<void>;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  isLoading: boolean;
}

function FormWizardDisplay({
  formType,
  formData,
  caseData,
  initialSection,
  onSave,
  onSubmit,
  isLoading,
}: FormWizardDisplayProps) {
  switch (formType) {
    case "FL-300":
      return (
        <FL300Wizard
          initialData={formData}
          caseData={caseData}
          onSave={onSave}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      );

    case "FL-311":
      return (
        <FL311Wizard
          initialData={formData}
          caseData={caseData}
          onSave={onSave}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      );

    case "FL-320":
      return (
        <FL320Wizard
          initialData={formData}
          caseData={caseData}
          onSave={onSave}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      );

    case "FL-340":
      return (
        <FL340Wizard
          initialData={formData}
          caseData={caseData}
          onSave={onSave}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      );

    case "FL-341":
      return (
        <FL341Wizard
          initialData={formData}
          caseData={caseData}
          onSave={onSave}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      );

    case "FL-342":
      return (
        <FL342Wizard
          initialData={formData}
          caseData={caseData}
          onSave={onSave}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      );

    default:
      return (
        <div className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Unknown Form Type</h3>
          <p className="text-muted-foreground mt-2">
            No editor available for form type: {formType}
          </p>
        </div>
      );
  }
}

export default function CourtPortalFormEditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        </div>
      }
    >
      <FormEditContent />
    </Suspense>
  );
}
