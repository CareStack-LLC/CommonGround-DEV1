"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    ScanLine,
    Upload,
    FileText,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Eye,
    Loader2,
    ArrowLeft,
    Filter,
    Search,
    Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfessionalAuth } from "../../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface OCRDocument {
    id: string;
    family_file_id: string;
    original_filename: string;
    detected_form_type: string | null;
    extraction_status: string;
    created_at: string | null;
}

interface OCRDocumentDetail {
    id: string;
    family_file_id: string;
    case_assignment_id: string | null;
    file_url: string;
    original_filename: string;
    file_size_bytes: number | null;
    mime_type: string;
    detected_form_type: string | null;
    detection_confidence: number | null;
    extraction_status: string;
    extracted_data: Record<string, any> | null;
    confidence_scores: Record<string, number> | null;
    low_confidence_fields: string[] | null;
    professional_corrections: Record<string, any> | null;
    processing_started_at: string | null;
    processing_completed_at: string | null;
    processing_error: string | null;
    approved_at: string | null;
    rejected_at: string | null;
    rejection_reason: string | null;
    created_agreement_id: string | null;
    created_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: {
        label: "Pending",
        color: "bg-slate-100 text-slate-700 border-slate-200",
        icon: <Clock className="h-3 w-3" />,
    },
    processing: {
        label: "Processing",
        color: "bg-blue-100 text-blue-700 border-blue-200",
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    review: {
        label: "Ready for Review",
        color: "bg-amber-100 text-amber-700 border-amber-200",
        icon: <Eye className="h-3 w-3" />,
    },
    approved: {
        label: "Approved",
        color: "bg-green-100 text-green-700 border-green-200",
        icon: <CheckCircle2 className="h-3 w-3" />,
    },
    rejected: {
        label: "Rejected",
        color: "bg-red-100 text-red-700 border-red-200",
        icon: <XCircle className="h-3 w-3" />,
    },
    failed: {
        label: "Failed",
        color: "bg-red-100 text-red-700 border-red-200",
        icon: <AlertTriangle className="h-3 w-3" />,
    },
};

const FORM_TYPE_LABELS: Record<string, string> = {
    "FL-341": "Child Custody & Visitation",
    "FL-311": "Child Support Information",
    "FL-312": "Spousal Support Declaration",
    "FL-150": "Income & Expense Declaration",
    "FL-342": "Child Support Attachment",
};

export default function OCRDocumentCenterPage() {
    const { token, profile } = useProfessionalAuth();
    const [documents, setDocuments] = useState<OCRDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Upload state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadForm, setUploadForm] = useState({ fileUrl: "", filename: "", familyFileId: "" });
    const [showUploadForm, setShowUploadForm] = useState(false);

    // Detail view
    const [selectedDoc, setSelectedDoc] = useState<OCRDocumentDetail | null>(null);
    const [showDetail, setShowDetail] = useState(false);

    const fetchDocuments = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const statusFilter = activeTab !== "all" ? `&status=${activeTab}` : "";
            const res = await fetch(
                `${API_BASE}/api/v1/professional/ocr/documents?limit=100${statusFilter}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setDocuments(data.items || []);
            }
        } catch (err) {
            console.error("Error fetching OCR documents:", err);
        } finally {
            setIsLoading(false);
        }
    }, [token, activeTab]);

    useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

    const handleUpload = async () => {
        if (!token || !uploadForm.fileUrl || !uploadForm.filename || !uploadForm.familyFileId) return;
        setIsUploading(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/ocr/upload`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    file_url: uploadForm.fileUrl,
                    original_filename: uploadForm.filename,
                    family_file_id: uploadForm.familyFileId,
                    mime_type: "application/pdf",
                }),
            });
            if (res.ok) {
                setShowUploadForm(false);
                setUploadForm({ fileUrl: "", filename: "", familyFileId: "" });
                fetchDocuments();
            }
        } catch (err) {
            console.error("Error uploading:", err);
        } finally {
            setIsUploading(false);
        }
    };

    const fetchDocumentDetail = async (docId: string) => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/ocr/documents/${docId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedDoc(data);
                setShowDetail(true);
            }
        } catch (err) {
            console.error("Error fetching detail:", err);
        }
    };

    const handleApprove = async (docId: string, caseNumber: string) => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/ocr/documents/${docId}/approve`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ case_number: caseNumber }),
            });
            if (res.ok) {
                fetchDocuments();
                setShowDetail(false);
            }
        } catch (err) {
            console.error("Error approving:", err);
        }
    };

    const handleReject = async (docId: string, reason: string) => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/ocr/documents/${docId}/reject`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ reason }),
            });
            if (res.ok) {
                fetchDocuments();
                setShowDetail(false);
            }
        } catch (err) {
            console.error("Error rejecting:", err);
        }
    };

    const filteredDocs = documents.filter(
        (d) =>
            !searchQuery ||
            d.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.detected_form_type?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const statusCounts = documents.reduce((acc, d) => {
        acc[d.extraction_status] = (acc[d.extraction_status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-6">
            {/* Back Link */}
            <Link
                href="/professional/documents"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Documents
            </Link>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl shadow-lg shadow-violet-500/20">
                            <ScanLine className="h-6 w-6" />
                        </div>
                        Court Order OCR
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Upload court orders for automatic data extraction via OCR
                    </p>
                </div>
                <Button
                    onClick={() => setShowUploadForm(!showUploadForm)}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/20"
                >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Court Order
                </Button>
            </div>

            {/* Upload Form */}
            {showUploadForm && (
                <Card className="border-violet-200 bg-gradient-to-br from-violet-50/50 to-purple-50/50">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-violet-600" />
                            Upload New Court Order
                        </CardTitle>
                        <CardDescription>
                            Supported California forms: FL-341, FL-311, FL-312, FL-150, FL-342
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid sm:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1.5">Family File ID</label>
                                <Input
                                    placeholder="family-file-uuid"
                                    value={uploadForm.familyFileId}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setUploadForm((p) => ({ ...p, familyFileId: e.target.value }))
                                    }
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1.5">File URL</label>
                                <Input
                                    placeholder="https://storage.example.com/order.pdf"
                                    value={uploadForm.fileUrl}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setUploadForm((p) => ({ ...p, fileUrl: e.target.value }))
                                    }
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1.5">Filename</label>
                                <Input
                                    placeholder="court-order.pdf"
                                    value={uploadForm.filename}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setUploadForm((p) => ({ ...p, filename: e.target.value }))
                                    }
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setShowUploadForm(false)}>Cancel</Button>
                            <Button
                                onClick={handleUpload}
                                disabled={isUploading || !uploadForm.fileUrl || !uploadForm.filename || !uploadForm.familyFileId}
                                className="bg-violet-600 hover:bg-violet-700"
                            >
                                {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                {isUploading ? "Uploading..." : "Upload & Process"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Status Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <Card
                        key={key}
                        className={`cursor-pointer transition-all hover:shadow-md ${activeTab === key ? "ring-2 ring-violet-500" : ""}`}
                        onClick={() => setActiveTab(activeTab === key ? "all" : key)}
                    >
                        <CardContent className="pt-4 pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {config.icon}
                                    <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
                                </div>
                                <span className="text-lg font-bold">{statusCounts[key] || 0}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by filename or form type..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Document List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                </div>
            ) : filteredDocs.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <ScanLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No OCR documents</h3>
                        <p className="text-muted-foreground">
                            Upload a court order PDF to get started with automatic data extraction.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredDocs.map((doc) => {
                        const statusInfo = STATUS_CONFIG[doc.extraction_status] || STATUS_CONFIG.pending;
                        return (
                            <Card
                                key={doc.id}
                                className="group hover:shadow-md transition-all cursor-pointer border-l-4"
                                style={{
                                    borderLeftColor:
                                        doc.extraction_status === "approved"
                                            ? "#22c55e"
                                            : doc.extraction_status === "review"
                                                ? "#f59e0b"
                                                : doc.extraction_status === "rejected" || doc.extraction_status === "failed"
                                                    ? "#ef4444"
                                                    : doc.extraction_status === "processing"
                                                        ? "#3b82f6"
                                                        : "#94a3b8",
                                }}
                                onClick={() => fetchDocumentDetail(doc.id)}
                            >
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-slate-100 rounded-lg group-hover:bg-violet-100 transition-colors">
                                                <FileText className="h-5 w-5 text-slate-600 group-hover:text-violet-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{doc.original_filename}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {doc.detected_form_type && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {doc.detected_form_type}
                                                            {FORM_TYPE_LABELS[doc.detected_form_type] && (
                                                                <span className="ml-1 text-muted-foreground">
                                                                    — {FORM_TYPE_LABELS[doc.detected_form_type]}
                                                                </span>
                                                            )}
                                                        </Badge>
                                                    )}
                                                    {doc.created_at && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(doc.created_at).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge className={`${statusInfo.color} border flex items-center gap-1.5`}>
                                            {statusInfo.icon}
                                            {statusInfo.label}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Detail Modal (simplified inline panel) */}
            {showDetail && selectedDoc && (
                <OCRDetailPanel
                    doc={selectedDoc}
                    onClose={() => setShowDetail(false)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    token={token}
                />
            )}
        </div>
    );
}

// ---- OCR Detail Panel ----
function OCRDetailPanel({
    doc,
    onClose,
    onApprove,
    onReject,
    token,
}: {
    doc: OCRDocumentDetail;
    onClose: () => void;
    onApprove: (docId: string, caseNumber: string) => void;
    onReject: (docId: string, reason: string) => void;
    token: string | null;
}) {
    const [caseNumber, setCaseNumber] = useState("");
    const [rejectReason, setRejectReason] = useState("");
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [corrections, setCorrections] = useState<Record<string, string>>({});
    const [isSavingCorrections, setIsSavingCorrections] = useState(false);

    const submitCorrections = async () => {
        if (!token || Object.keys(corrections).length === 0) return;
        setIsSavingCorrections(true);
        try {
            await fetch(`${API_BASE}/api/v1/professional/ocr/documents/${doc.id}/corrections`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(corrections),
            });
            setCorrections({});
        } catch (err) {
            console.error("Error saving corrections:", err);
        } finally {
            setIsSavingCorrections(false);
        }
    };

    const confidenceColor = (score: number) => {
        if (score >= 0.85) return "text-green-600 bg-green-50";
        if (score >= 0.5) return "text-amber-600 bg-amber-50";
        return "text-red-600 bg-red-50";
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mb-10 mx-4">
                {/* Header */}
                <div className="p-6 border-b bg-gradient-to-r from-violet-50 to-purple-50 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <ScanLine className="h-5 w-5 text-violet-600" />
                                {doc.original_filename}
                            </h2>
                            <div className="flex items-center gap-3 mt-2">
                                {doc.detected_form_type && (
                                    <Badge variant="outline">{doc.detected_form_type}</Badge>
                                )}
                                {doc.detection_confidence !== null && (
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${confidenceColor(doc.detection_confidence)}`}>
                                        {(doc.detection_confidence * 100).toFixed(0)}% confidence
                                    </span>
                                )}
                                <Badge className={STATUS_CONFIG[doc.extraction_status]?.color || ""}>
                                    {STATUS_CONFIG[doc.extraction_status]?.label || doc.extraction_status}
                                </Badge>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Extraction Results */}
                    {doc.extracted_data && Object.keys(doc.extracted_data).length > 0 ? (
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">Extracted Fields</h3>
                            <div className="border rounded-xl overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50 text-xs text-slate-500">
                                            <th className="text-left px-4 py-2 font-medium">Field</th>
                                            <th className="text-left px-4 py-2 font-medium">Value</th>
                                            <th className="text-center px-4 py-2 font-medium">Confidence</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {Object.entries(doc.extracted_data).map(([field, value]) => {
                                            const confidence = doc.confidence_scores?.[field];
                                            const isLowConfidence = doc.low_confidence_fields?.includes(field);
                                            return (
                                                <tr key={field} className={isLowConfidence ? "bg-amber-50/50" : ""}>
                                                    <td className="px-4 py-2.5 text-sm font-medium text-slate-700">
                                                        {isLowConfidence && <AlertTriangle className="h-3 w-3 text-amber-500 inline mr-1.5" />}
                                                        {field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-sm text-slate-600">
                                                        {doc.extraction_status === "review" ? (
                                                            <Input
                                                                className="h-8 text-sm"
                                                                defaultValue={String(value)}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                                    setCorrections((prev) => ({ ...prev, [field]: e.target.value }))
                                                                }
                                                            />
                                                        ) : (
                                                            String(value)
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        {confidence !== undefined && (
                                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${confidenceColor(confidence)}`}>
                                                                {(confidence * 100).toFixed(0)}%
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : doc.extraction_status === "pending" || doc.extraction_status === "processing" ? (
                        <div className="text-center py-8">
                            <Loader2 className="h-10 w-10 mx-auto text-violet-500 animate-spin mb-3" />
                            <p className="text-sm text-muted-foreground">
                                {doc.extraction_status === "pending"
                                    ? "Document queued for processing..."
                                    : "Extracting data from document..."}
                            </p>
                        </div>
                    ) : doc.processing_error ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <p className="text-sm text-red-700 font-medium">Processing Error</p>
                            <p className="text-sm text-red-600 mt-1">{doc.processing_error}</p>
                        </div>
                    ) : null}

                    {/* Rejection reason */}
                    {doc.rejection_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <p className="text-sm text-red-700 font-medium">Rejection Reason</p>
                            <p className="text-sm text-red-600 mt-1">{doc.rejection_reason}</p>
                        </div>
                    )}

                    {/* Meta info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">File Size</p>
                            <p className="font-medium">{doc.file_size_bytes ? `${(doc.file_size_bytes / 1024).toFixed(0)} KB` : "—"}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Type</p>
                            <p className="font-medium">{doc.mime_type}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Uploaded</p>
                            <p className="font-medium">{doc.created_at ? new Date(doc.created_at).toLocaleString() : "—"}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Processed</p>
                            <p className="font-medium">{doc.processing_completed_at ? new Date(doc.processing_completed_at).toLocaleString() : "—"}</p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    {doc.extraction_status === "review" && (
                        <div className="flex items-center gap-3 pt-2 border-t">
                            {Object.keys(corrections).length > 0 && (
                                <Button
                                    onClick={submitCorrections}
                                    disabled={isSavingCorrections}
                                    variant="outline"
                                    className="border-violet-200 text-violet-700 hover:bg-violet-50"
                                >
                                    {isSavingCorrections ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    Save Corrections ({Object.keys(corrections).length})
                                </Button>
                            )}
                            <div className="flex-1" />
                            {showRejectForm ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="Reason for rejection..."
                                        className="w-64"
                                        value={rejectReason}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRejectReason(e.target.value)}
                                    />
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => onReject(doc.id, rejectReason)}
                                        disabled={!rejectReason}
                                    >
                                        Confirm Reject
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setShowRejectForm(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <Button
                                        variant="outline"
                                        className="border-red-200 text-red-700 hover:bg-red-50"
                                        onClick={() => setShowRejectForm(true)}
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                    </Button>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            placeholder="Case number"
                                            className="w-40"
                                            value={caseNumber}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCaseNumber(e.target.value)}
                                        />
                                        <Button
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => onApprove(doc.id, caseNumber)}
                                            disabled={!caseNumber}
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Approve & Lock Fields
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
