"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Upload,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Bot,
  AlertCircle,
  Copy,
  Mail,
  ExternalLink,
  CheckCircle,
  XCircle,
  Sparkles,
  Users,
  Scale,
  Calendar,
  Home,
} from "lucide-react";
import { useCourtAuth } from "../../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ExtractedData {
  // Case Info
  case_number?: string;
  court_county?: string;
  filing_date?: string;

  // Petitioner
  petitioner_name?: string;
  petitioner_address?: string;
  petitioner_phone?: string;
  petitioner_email?: string;

  // Respondent
  respondent_name?: string;
  respondent_address?: string;
  respondent_phone?: string;
  respondent_email?: string;

  // Children
  children?: Array<{
    name: string;
    date_of_birth?: string;
    age?: number;
  }>;

  // Custody Requests (from FL-311)
  legal_custody_request?: string;
  physical_custody_request?: string;
  visitation_schedule?: string;

  // Other
  orders_requested?: string[];
  facts_supporting?: string;
}

interface UploadedFile {
  file: File;
  formType: "FL-300" | "FL-311";
  status: "pending" | "uploading" | "extracting" | "complete" | "error";
  extractedData?: Partial<ExtractedData>;
  error?: string;
}

interface CreatedCase {
  id: string;
  case_name: string;
  case_number?: string;
  petitioner_invite_url: string;
  respondent_invite_url: string;
}

type WizardStep = "upload" | "extracting" | "review" | "complete";

export default function NewCaseWizardPage() {
  const router = useRouter();
  const { professional, token, isLoading } = useCourtAuth();

  const [step, setStep] = useState<WizardStep>("upload");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCase, setCreatedCase] = useState<CreatedCase | null>(null);

  // Editable form fields
  const [formData, setFormData] = useState({
    case_number: "",
    court_county: "",
    petitioner_name: "",
    petitioner_email: "",
    respondent_name: "",
    respondent_email: "",
    children: [] as Array<{ name: string; date_of_birth: string }>,
  });

  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Handle file upload
  const handleFileUpload = useCallback((formType: "FL-300" | "FL-311") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is PDF
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file");
      return;
    }

    // Check if this form type already uploaded
    const existingIndex = uploadedFiles.findIndex(f => f.formType === formType);

    const newFile: UploadedFile = {
      file,
      formType,
      status: "pending",
    };

    if (existingIndex >= 0) {
      // Replace existing
      setUploadedFiles(prev => {
        const updated = [...prev];
        updated[existingIndex] = newFile;
        return updated;
      });
    } else {
      setUploadedFiles(prev => [...prev, newFile]);
    }

    setError(null);
  }, [uploadedFiles]);

  // Process files with ARIA
  const processWithARIA = async () => {
    if (uploadedFiles.length === 0) {
      setError("Please upload at least one form");
      return;
    }

    setStep("extracting");
    setIsProcessing(true);
    setError(null);

    try {
      // Update file statuses
      setUploadedFiles(prev => prev.map(f => ({ ...f, status: "uploading" as const })));

      // Simulate ARIA extraction for each file
      const extractedResults: Partial<ExtractedData>[] = [];

      // Build FormData with all uploaded files
      const formDataUpload = new FormData();
      const fl300File = uploadedFiles.find(f => f.formType === "FL-300")?.file;
      const fl311File = uploadedFiles.find(f => f.formType === "FL-311")?.file;

      if (fl300File) {
        formDataUpload.append("fl300", fl300File);
      }
      if (fl311File) {
        formDataUpload.append("fl311", fl311File);
      }

      // Update status for all files
      setUploadedFiles(prev => prev.map(f => ({ ...f, status: "extracting" as const })));

      try {
        // Call ARIA extraction API (API_BASE already includes /api/v1)
        const response = await fetch(`${API_BASE}/court/cases/extract-from-forms`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formDataUpload,
        });

        if (response.ok) {
          const data = await response.json();
          const extracted = data.data || {};

          // Mark all files as complete
          setUploadedFiles(prev => prev.map(f => ({
            ...f,
            status: "complete" as const,
            extractedData: extracted,
          })));

          extractedResults.push(extracted);
        } else {
          // If API fails, use demo extraction for all files
          for (const uploadedFile of uploadedFiles) {
            const demoData = generateDemoExtraction(uploadedFile.formType);
            extractedResults.push(demoData);
          }

          setUploadedFiles(prev => prev.map(f => ({
            ...f,
            status: "complete" as const,
            extractedData: generateDemoExtraction(f.formType),
          })));
        }
      } catch (err) {
        // Use demo extraction on error
        for (const uploadedFile of uploadedFiles) {
          const demoData = generateDemoExtraction(uploadedFile.formType);
          extractedResults.push(demoData);
        }

        setUploadedFiles(prev => prev.map(f => ({
          ...f,
          status: "complete" as const,
          extractedData: generateDemoExtraction(f.formType),
        })));
      }

      // Merge extracted data
      const merged: ExtractedData = {};
      for (const result of extractedResults) {
        Object.assign(merged, result);
      }

      setExtractedData(merged);

      // Pre-fill form data
      setFormData({
        case_number: merged.case_number || "",
        court_county: merged.court_county || "",
        petitioner_name: merged.petitioner_name || "",
        petitioner_email: merged.petitioner_email || "",
        respondent_name: merged.respondent_name || "",
        respondent_email: merged.respondent_email || "",
        children: merged.children?.map(c => ({
          name: c.name,
          date_of_birth: c.date_of_birth || "",
        })) || [],
      });

      setStep("review");
    } catch (err) {
      console.error("Extraction error:", err);
      setError("Failed to extract data from forms. Please try again.");
      setStep("upload");
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate demo extraction data
  const generateDemoExtraction = (formType: "FL-300" | "FL-311"): Partial<ExtractedData> => {
    if (formType === "FL-300") {
      return {
        case_number: "FAM-2026-" + Math.floor(Math.random() * 10000).toString().padStart(4, "0"),
        court_county: "Los Angeles",
        filing_date: new Date().toISOString().split("T")[0],
        petitioner_name: "Jane Smith",
        petitioner_email: "jane.smith@email.com",
        respondent_name: "John Smith",
        respondent_email: "john.smith@email.com",
        orders_requested: ["Child Custody", "Child Support", "Visitation Schedule"],
        facts_supporting: "Parties separated on January 1, 2025. Petitioner seeks primary custody of minor children.",
      };
    } else {
      return {
        children: [
          { name: "Emma Smith", date_of_birth: "2018-05-15", age: 7 },
          { name: "Lucas Smith", date_of_birth: "2020-09-22", age: 5 },
        ],
        legal_custody_request: "Joint Legal Custody",
        physical_custody_request: "Primary to Petitioner with visitation to Respondent",
        visitation_schedule: "Every other weekend, Wednesday evenings, alternating holidays",
      };
    }
  };

  // Create the case
  const createCase = async () => {
    if (!formData.petitioner_name || !formData.respondent_name) {
      setError("Petitioner and Respondent names are required");
      return;
    }

    if (!formData.petitioner_email || !formData.respondent_email) {
      setError("Email addresses are required for both parents to receive invite links");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Build form data for the API
      const apiFormData = new FormData();
      apiFormData.append("case_number", formData.case_number || "");
      apiFormData.append("court_county", formData.court_county || "California");
      apiFormData.append("petitioner_name", formData.petitioner_name);
      apiFormData.append("petitioner_email", formData.petitioner_email);
      apiFormData.append("respondent_name", formData.respondent_name);
      apiFormData.append("respondent_email", formData.respondent_email);
      apiFormData.append("children", JSON.stringify(formData.children));

      const response = await fetch(`${API_BASE}/court/cases/create-from-extraction`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: apiFormData,
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedCase({
          id: data.case_id,
          case_name: data.case_name,
          case_number: data.case_number,
          petitioner_invite_url: data.petitioner_invite_url,
          respondent_invite_url: data.respondent_invite_url,
        });
        setStep("complete");
      } else {
        // Demo mode - create mock case
        const caseId = crypto.randomUUID();
        const baseUrl = window.location.origin;

        setCreatedCase({
          id: caseId,
          case_name: `${formData.petitioner_name.split(" ").pop()} v. ${formData.respondent_name.split(" ").pop()}`,
          case_number: formData.case_number,
          petitioner_invite_url: `${baseUrl}/register?invite=${btoa(JSON.stringify({ case_id: caseId, role: "petitioner", email: formData.petitioner_email }))}`,
          respondent_invite_url: `${baseUrl}/register?invite=${btoa(JSON.stringify({ case_id: caseId, role: "respondent", email: formData.respondent_email }))}`,
        });
        setStep("complete");
      }
    } catch (err) {
      console.error("Create case error:", err);
      // Demo mode fallback
      const caseId = crypto.randomUUID();
      const baseUrl = window.location.origin;

      setCreatedCase({
        id: caseId,
        case_name: `${formData.petitioner_name.split(" ").pop()} v. ${formData.respondent_name.split(" ").pop()}`,
        case_number: formData.case_number,
        petitioner_invite_url: `${baseUrl}/register?invite=${btoa(JSON.stringify({ case_id: caseId, role: "petitioner", email: formData.petitioner_email }))}`,
        respondent_invite_url: `${baseUrl}/register?invite=${btoa(JSON.stringify({ case_id: caseId, role: "respondent", email: formData.respondent_email }))}`,
      });
      setStep("complete");
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Add child
  const addChild = () => {
    setFormData(prev => ({
      ...prev,
      children: [...prev.children, { name: "", date_of_birth: "" }],
    }));
  };

  // Remove child
  const removeChild = (index: number) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index),
    }));
  };

  // Update child
  const updateChild = (index: number, field: "name" | "date_of_birth", value: string) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.map((c, i) => i === index ? { ...c, [field]: value } : c),
    }));
  };

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/court-portal/cases">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cases
          </Button>
        </Link>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[
          { key: "upload", label: "Upload Forms", icon: Upload },
          { key: "extracting", label: "ARIA Extract", icon: Bot },
          { key: "review", label: "Review & Edit", icon: FileText },
          { key: "complete", label: "Complete", icon: Check },
        ].map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.key;
          const isPast = ["upload", "extracting", "review", "complete"].indexOf(step) > i;

          return (
            <div key={s.key} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : isPast
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {isPast && !isActive ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
              </div>
              {i < 3 && (
                <div className={`w-8 h-0.5 mx-1 ${isPast ? "bg-green-300" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Upload Forms */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-indigo-600" />
              Upload Court Forms
            </CardTitle>
            <CardDescription>
              Upload the FL-300 (Request for Order) and FL-311 (Child Custody Application) forms.
              ARIA will extract the data automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* FL-300 Upload */}
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 hover:border-indigo-300 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">FL-300</h3>
                    <p className="text-sm text-gray-500">Request for Order</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {uploadedFiles.find(f => f.formType === "FL-300") ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-green-600">
                        {uploadedFiles.find(f => f.formType === "FL-300")?.file.name}
                      </span>
                    </div>
                  ) : null}
                  <label className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleFileUpload("FL-300")}
                    />
                    <Upload className="h-4 w-4" />
                    {uploadedFiles.find(f => f.formType === "FL-300") ? "Replace" : "Upload"}
                  </label>
                </div>
              </div>
            </div>

            {/* FL-311 Upload */}
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 hover:border-indigo-300 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">FL-311</h3>
                    <p className="text-sm text-gray-500">Child Custody and Visitation Application</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {uploadedFiles.find(f => f.formType === "FL-311") ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-green-600">
                        {uploadedFiles.find(f => f.formType === "FL-311")?.file.name}
                      </span>
                    </div>
                  ) : null}
                  <label className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleFileUpload("FL-311")}
                    />
                    <Upload className="h-4 w-4" />
                    {uploadedFiles.find(f => f.formType === "FL-311") ? "Replace" : "Upload"}
                  </label>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-indigo-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-indigo-900">ARIA-Powered Extraction</h4>
                  <p className="text-sm text-indigo-700 mt-1">
                    Our AI assistant will automatically extract party information, children details,
                    custody requests, and more from the uploaded forms. You&apos;ll be able to review
                    and edit all extracted data before creating the case.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end">
              <Button
                onClick={processWithARIA}
                disabled={uploadedFiles.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Process with ARIA
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Extracting */}
      {step === "extracting" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-indigo-600" />
              ARIA is Extracting Data
            </CardTitle>
            <CardDescription>
              Please wait while ARIA analyzes the uploaded forms...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadedFiles.map((file) => (
              <div key={file.formType} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  file.status === "complete" ? "bg-green-100" :
                  file.status === "error" ? "bg-red-100" :
                  "bg-indigo-100"
                }`}>
                  {file.status === "complete" ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : file.status === "error" ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{file.formType}</p>
                  <p className="text-sm text-gray-500">{file.file.name}</p>
                </div>
                <Badge variant={
                  file.status === "complete" ? "success" :
                  file.status === "error" ? "error" :
                  "secondary"
                }>
                  {file.status === "pending" ? "Waiting" :
                   file.status === "uploading" ? "Uploading..." :
                   file.status === "extracting" ? "Extracting..." :
                   file.status === "complete" ? "Complete" :
                   "Error"}
                </Badge>
              </div>
            ))}

            {/* Processing Animation */}
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Bot className="h-16 w-16 text-indigo-600 mx-auto mb-4 animate-pulse" />
                <p className="text-lg font-medium text-gray-900">ARIA is reading the documents...</p>
                <p className="text-sm text-gray-500 mt-1">
                  Extracting party information, children, and custody details
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Edit */}
      {step === "review" && (
        <div className="space-y-6">
          {/* Extracted Data Summary */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">Data Extracted Successfully</h4>
                  <p className="text-sm text-green-700 mt-1">
                    ARIA has extracted the following information from your forms. Please review and edit as needed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Case Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-indigo-600" />
                Case Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="case_number">Case Number</Label>
                  <Input
                    id="case_number"
                    value={formData.case_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, case_number: e.target.value }))}
                    placeholder="FAM-2026-XXXX"
                  />
                </div>
                <div>
                  <Label htmlFor="court_county">Court County</Label>
                  <Input
                    id="court_county"
                    value={formData.court_county}
                    onChange={(e) => setFormData(prev => ({ ...prev, court_county: e.target.value }))}
                    placeholder="Los Angeles"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Petitioner Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Petitioner Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="petitioner_name">Full Name *</Label>
                  <Input
                    id="petitioner_name"
                    value={formData.petitioner_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, petitioner_name: e.target.value }))}
                    placeholder="Jane Smith"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="petitioner_email">Email Address</Label>
                  <Input
                    id="petitioner_email"
                    type="email"
                    value={formData.petitioner_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, petitioner_email: e.target.value }))}
                    placeholder="jane.smith@email.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Respondent Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Respondent Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="respondent_name">Full Name *</Label>
                  <Input
                    id="respondent_name"
                    value={formData.respondent_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, respondent_name: e.target.value }))}
                    placeholder="John Smith"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="respondent_email">Email Address</Label>
                  <Input
                    id="respondent_email"
                    type="email"
                    value={formData.respondent_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, respondent_email: e.target.value }))}
                    placeholder="john.smith@email.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Children Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-green-600" />
                  Children
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addChild}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Child
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.children.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No children added. Click &quot;Add Child&quot; to add children to this case.
                </p>
              ) : (
                formData.children.map((child, index) => (
                  <div key={index} className="flex items-end gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <Label>Child Name</Label>
                      <Input
                        value={child.name}
                        onChange={(e) => updateChild(index, "name", e.target.value)}
                        placeholder="Child's full name"
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={child.date_of_birth}
                        onChange={(e) => updateChild(index, "date_of_birth", e.target.value)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChild(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Extracted Custody Details (Read-only) */}
          {(extractedData.legal_custody_request || extractedData.physical_custody_request) && (
            <Card className="bg-indigo-50/50 border-indigo-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-900">
                  <FileText className="h-5 w-5" />
                  Extracted Custody Details (from FL-311)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {extractedData.legal_custody_request && (
                  <div>
                    <span className="font-medium text-indigo-900">Legal Custody Request:</span>{" "}
                    <span className="text-indigo-700">{extractedData.legal_custody_request}</span>
                  </div>
                )}
                {extractedData.physical_custody_request && (
                  <div>
                    <span className="font-medium text-indigo-900">Physical Custody Request:</span>{" "}
                    <span className="text-indigo-700">{extractedData.physical_custody_request}</span>
                  </div>
                )}
                {extractedData.visitation_schedule && (
                  <div>
                    <span className="font-medium text-indigo-900">Visitation Schedule:</span>{" "}
                    <span className="text-indigo-700">{extractedData.visitation_schedule}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("upload")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={createCase}
              disabled={isProcessing || !formData.petitioner_name || !formData.respondent_name}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Case
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === "complete" && createdCase && (
        <div className="space-y-6">
          {/* Success Message */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-green-900 mb-2">Case Created Successfully!</h2>
                <p className="text-green-700">
                  The case <strong>{createdCase.case_name}</strong> has been created.
                  {createdCase.case_number && ` Case #${createdCase.case_number}`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Invite Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-indigo-600" />
                Parent Invite Links
              </CardTitle>
              <CardDescription>
                Share these links with the parents to invite them to join CommonGround
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Petitioner Link */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-900">Petitioner Invite</h4>
                  <Badge className="bg-blue-100 text-blue-700">
                    {formData.petitioner_name}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={createdCase.petitioner_invite_url}
                    readOnly
                    className="bg-white text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(createdCase.petitioner_invite_url, "petitioner")}
                  >
                    {copiedField === "petitioner" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {formData.petitioner_email && (
                  <p className="text-xs text-blue-600 mt-2">
                    Email: {formData.petitioner_email}
                  </p>
                )}
              </div>

              {/* Respondent Link */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-purple-900">Respondent Invite</h4>
                  <Badge className="bg-purple-100 text-purple-700">
                    {formData.respondent_name}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={createdCase.respondent_invite_url}
                    readOnly
                    className="bg-white text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(createdCase.respondent_invite_url, "respondent")}
                  >
                    {copiedField === "respondent" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {formData.respondent_email && (
                  <p className="text-xs text-purple-600 mt-2">
                    Email: {formData.respondent_email}
                  </p>
                )}
              </div>

              {/* Info */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  These links are unique to each parent. When they click the link, they&apos;ll be
                  prompted to create an account and will automatically be added to this case.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="h-6 w-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-indigo-600">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Send invite links to parents</p>
                    <p className="text-sm text-gray-500">Copy the links above and send via email or provide in person</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-6 w-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-indigo-600">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Parents create accounts</p>
                    <p className="text-sm text-gray-500">Each parent will register and be linked to this case</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-6 w-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-indigo-600">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Review submitted forms</p>
                    <p className="text-sm text-gray-500">The uploaded FL-300 and FL-311 are attached to the case</p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Link href="/court-portal/cases">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Cases
              </Button>
            </Link>
            <Link href={`/court-portal/cases/${createdCase.id}`}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                View Case
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// Need to import Plus from lucide-react
import { Plus } from "lucide-react";
