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
        <Badge className="bg-emerald-50 text-emerald-900 border-emerald-900/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          High Confidence
        </Badge>
      );
    } else if (confidence >= 0.75) {
      return (
        <Badge className="bg-amber-50 text-amber-900 border-amber-900/30">
          <AlertCircle className="h-3 w-3 mr-1" />
          Medium - Please Verify
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-50 text-red-900 border-red-900/30">
          <AlertCircle className="h-3 w-3 mr-1" />
          Low - Manual Review Required
        </Badge>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleReset}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-amber-900/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <FileText className="h-6 w-6 text-amber-900" />
            Upload Court Order
          </DialogTitle>
          <DialogDescription>
            Upload a court order (FL-341, FL-311, etc.) to automatically extract
            custody schedule, support obligations, and case details.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-amber-900 hover:bg-amber-50/30 transition-colors">
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
                <div className="p-4 bg-amber-100 rounded-full">
                  <Upload className="h-8 w-8 text-amber-900" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-slate-600">PDF files only (max 10MB)</p>
                </div>
              </label>
            </div>

            {file && (
              <Card className="border-2 border-emerald-900/30 bg-emerald-50/30">
                <CardContent className="py-3 flex items-center gap-3">
                  <FileText className="h-5 w-5 text-emerald-900" />
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
              <div className="p-3 bg-red-50 border border-red-900/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-900 shrink-0 mt-0.5" />
                <p className="text-sm text-red-900">{error}</p>
              </div>
            )}
          </div>
        )}

        {step === "review" && extractedData && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-900/30 rounded-lg">
              <p className="text-sm text-blue-900">
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
              <Card className="border-2 border-amber-900/30 bg-amber-50/20">
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-900" />
                    <h3 className="font-semibold text-sm text-slate-900">
                      Court-Locked Fields
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    These fields will be locked after creation and can only be changed
                    by uploading a new court order.
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
            <Button
              onClick={handleUploadAndExtract}
              disabled={!file || uploading || extracting}
              className="bg-amber-900 hover:bg-amber-950 text-white"
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
              className="bg-emerald-900 hover:bg-emerald-950 text-white"
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
