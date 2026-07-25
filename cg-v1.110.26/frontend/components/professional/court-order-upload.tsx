"use client";

import { useState } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface CourtOrderUploadProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: ExtractedCourtOrderData) => void;
  token: string;
}

interface ExtractedCourtOrderData {
  parent_a_name?: string;
  parent_b_name?: string;
  children?: Array<{
    name: string;
    birthdate?: string;
    confidence: "high" | "medium" | "low";
  }>;
  case_number?: string;
  jurisdiction?: string;
  custody_split?: string;
  schedule?: any;
  child_support_amount?: number;
  child_support_frequency?: string;
  restrictions?: string[];
  confidence_scores?: Record<string, number>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function CourtOrderUpload({
  open,
  onClose,
  onComplete,
  token,
}: CourtOrderUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedCourtOrderData | null>(null);
  const [step, setStep] = useState<"upload" | "review" | "confirm">("upload");
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Please select a PDF file");
    }
  };

  const handleUploadAndExtract = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Step 1: Upload file
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(
        `${API_BASE}/api/v1/documents/upload-court-order`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload document");
      }

      const uploadData = await uploadResponse.json();
      const documentId = uploadData.document_id;

      setUploading(false);
      setExtracting(true);

      // Step 2: OCR Extraction
      const extractResponse = await fetch(
        `${API_BASE}/api/v1/documents/${documentId}/extract-court-order`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!extractResponse.ok) {
        throw new Error("Failed to extract data from court order");
      }

      const data = await extractResponse.json();
      setExtractedData(data);
      setExtracting(false);
      setStep("review");
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setUploading(false);
      setExtracting(false);
    }
  };

  const handleConfirm = () => {
    if (extractedData) {
      onComplete(extractedData);
      handleReset();
    }
  };

  const handleReset = () => {
    setFile(null);
    setExtractedData(null);
    setStep("upload");
    setError(null);
    setUploading(false);
    setExtracting(false);
    onClose();
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.95) {
      return (
        <Badge className="bg-cg-sage-subtle text-cg-sage-dark border border-cg-sage-tint">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          High Confidence
        </Badge>
      );
    } else if (confidence >= 0.75) {
      return (
        <Badge className="bg-cg-amber-subtle text-cg-amber-deep border border-cg-amber-tint">
          <AlertCircle className="h-3 w-3 mr-1" />
          Medium — Verify
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-cg-error-subtle text-cg-error-dark border border-cg-error-subtle">
          <AlertCircle className="h-3 w-3 mr-1" />
          Low — Review Required
        </Badge>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleReset}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <FileText className="h-6 w-6 text-cg-sage" />
            Import Document
          </DialogTitle>
          <DialogDescription>
            Upload a document (court orders, agreements, etc.) to automatically extract
            custody schedule, support obligations, and case details.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-cg-sage/40 hover:bg-background/30 transition-colors">
              <input
                type="file"
                id="court-order-file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading || extracting}
              />
              <label
                htmlFor="court-order-file"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="p-4 bg-background rounded-2xl">
                  <Upload className="h-8 w-8 text-cg-sage" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-slate-500">PDF files only (max 10MB)</p>
                </div>
              </label>
            </div>

            {file && (
              <Card className="border border-cg-sage/20 bg-background/30 rounded-xl">
                <CardContent className="py-3 flex items-center gap-3">
                  <FileText className="h-5 w-5 text-cg-sage" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setFile(null)}
                    disabled={uploading || extracting}
                  >
                    Remove
                  </Button>
                </CardContent>
              </Card>
            )}

            {(uploading || extracting) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">
                    {uploading ? "Uploading document..." : "Extracting data..."}
                  </span>
                  <span className="text-slate-600">
                    {uploading ? "Step 1 of 2" : "Step 2 of 2"}
                  </span>
                </div>
                <Progress value={uploading ? 50 : 100} className="h-2" />
              </div>
            )}

            {error && (
              <div className="p-3 bg-cg-error-subtle border border-cg-error-subtle rounded-xl flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-cg-error shrink-0 mt-0.5" />
                <p className="text-sm text-cg-error-dark">{error}</p>
              </div>
            )}
          </div>
        )}

        {step === "review" && extractedData && (
          <div className="space-y-4">
            <div className="p-3 bg-background border border-cg-sage/20 rounded-xl">
              <p className="text-sm text-foreground">
                <strong>Review extracted data:</strong> Green highlights indicate high
                confidence. Yellow/red require manual verification.
              </p>
            </div>

            <div className="space-y-3">
              {/* Case Information */}
              <Card>
                <CardContent className="py-4 space-y-3">
                  <h3 className="font-semibold text-sm text-slate-900">Case Information</h3>

                  {extractedData.case_number && (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-600">Case Number</p>
                        <p className="text-sm font-medium text-slate-900">
                          {extractedData.case_number}
                        </p>
                      </div>
                      {getConfidenceBadge(extractedData.confidence_scores?.case_number || 1)}
                    </div>
                  )}

                  {extractedData.jurisdiction && (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-600">Jurisdiction</p>
                        <p className="text-sm font-medium text-slate-900">
                          {extractedData.jurisdiction}
                        </p>
                      </div>
                      {getConfidenceBadge(extractedData.confidence_scores?.jurisdiction || 1)}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Parents */}
              <Card>
                <CardContent className="py-4 space-y-3">
                  <h3 className="font-semibold text-sm text-slate-900">Parents</h3>

                  {extractedData.parent_a_name && (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-600">Parent A (Petitioner)</p>
                        <p className="text-sm font-medium text-slate-900">
                          {extractedData.parent_a_name}
                        </p>
                      </div>
                      {getConfidenceBadge(extractedData.confidence_scores?.parent_a_name || 1)}
                    </div>
                  )}

                  {extractedData.parent_b_name && (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-600">Parent B (Respondent)</p>
                        <p className="text-sm font-medium text-slate-900">
                          {extractedData.parent_b_name}
                        </p>
                      </div>
                      {getConfidenceBadge(extractedData.confidence_scores?.parent_b_name || 1)}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Children */}
              {extractedData.children && extractedData.children.length > 0 && (
                <Card>
                  <CardContent className="py-4 space-y-3">
                    <h3 className="font-semibold text-sm text-slate-900">Children</h3>
                    {extractedData.children.map((child, index) => (
                      <div key={index} className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs text-slate-600">Child {index + 1}</p>
                          <p className="text-sm font-medium text-slate-900">
                            {child.name}
                            {child.birthdate && (
                              <span className="text-slate-600 ml-2">
                                (DOB: {child.birthdate})
                              </span>
                            )}
                          </p>
                        </div>
                        {getConfidenceBadge(
                          child.confidence === "high" ? 0.95 :
                          child.confidence === "medium" ? 0.80 : 0.60
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Court-Ordered Terms */}
              <Card className="border border-cg-slate/20 bg-cg-slate/5 rounded-xl">
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-cg-slate" />
                    <h3 className="font-semibold text-sm text-slate-900">
                      Protected Fields
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    These fields will be locked after creation and can only be updated
                    by importing a new document.
                  </p>

                  {extractedData.custody_split && (
                    <div>
                      <p className="text-xs text-slate-600">Custody Split</p>
                      <p className="text-sm font-medium text-slate-900">
                        {extractedData.custody_split}
                      </p>
                    </div>
                  )}

                  {extractedData.child_support_amount && (
                    <div>
                      <p className="text-xs text-slate-600">Child Support</p>
                      <p className="text-sm font-medium text-slate-900">
                        ${extractedData.child_support_amount}
                        {extractedData.child_support_frequency &&
                          ` / ${extractedData.child_support_frequency}`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleReset} disabled={uploading || extracting}>
            Cancel
          </Button>

          {step === "upload" && (
            <Button aria-label="Upload"
              onClick={handleUploadAndExtract}
              disabled={!file || uploading || extracting}
              className="bg-cg-sage hover:bg-cg-sage-dark text-white rounded-xl shadow-sm font-semibold"
            >
              {uploading || extracting ? (
                <>Processing...</>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Extract
                </>
              )}
            </Button>
          )}

          {step === "review" && (
            <Button
              onClick={handleConfirm}
              className="bg-cg-sage hover:bg-cg-sage-dark text-white rounded-xl shadow-sm font-semibold"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm & Create Case
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
