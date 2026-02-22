"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
    FileText, Plus, Download, ScanLine, FolderOpen, Scale, FileCheck,
    Search, Upload, Loader2, RefreshCw, Eye, Hash, Calendar,
    MoreVertical, Trash2, FilePlus, Filter, X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useProfessionalAuth } from "../layout";
import { useToast } from "@/hooks/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DOC_TYPES = [
    { value: "all", label: "All Documents", icon: <FolderOpen className="h-4 w-4" /> },
    { value: "court_order", label: "Court Orders", icon: <Scale className="h-4 w-4 text-blue-500" /> },
    { value: "parenting_plan", label: "Parenting Plans", icon: <FileCheck className="h-4 w-4 text-emerald-500" /> },
    { value: "agreement", label: "Agreements", icon: <FileText className="h-4 w-4 text-indigo-500" /> },
    { value: "evidence", label: "Evidence", icon: <FileText className="h-4 w-4 text-amber-500" /> },
    { value: "financial", label: "Financial", icon: <FileText className="h-4 w-4 text-teal-500" /> },
    { value: "other", label: "Other", icon: <FileText className="h-4 w-4 text-slate-400" /> },
];

interface Doc {
    id: string;
    family_file_id?: string;
    family_file_number?: string;
    document_type: string;
    title: string;
    filename: string;
    file_size_bytes?: number;
    sha256_hash?: string;
    uploaded_at: string;
    uploaded_by_name?: string;
    ocr_processed?: boolean;
    url?: string;
}

export default function ProfessionalDocumentsPage() {
    const { token } = useProfessionalAuth();
    const { toast } = useToast();
    const [docs, setDocs] = useState<Doc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [showUpload, setShowUpload] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadMeta, setUploadMeta] = useState({ document_type: "other", title: "" });
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    const fetchDocs = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ limit: "200" });
            if (typeFilter !== "all") params.set("document_type", typeFilter);
            const res = await fetch(`${API_BASE}/api/v1/professional/documents?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setDocs(Array.isArray(data) ? data : data.items || []);
            }
        } catch (e) {
            console.error("Error fetching documents:", e);
        } finally {
            setIsLoading(false);
        }
    }, [token, typeFilter]);

    useEffect(() => { fetchDocs(); }, [fetchDocs]);

    const handleUpload = async () => {
        if (!token || !uploadFile) return;
        setUploading(true);
        try {
            const form = new FormData();
            form.append("file", uploadFile);
            form.append("document_type", uploadMeta.document_type);
            form.append("title", uploadMeta.title || uploadFile.name);
            const res = await fetch(`${API_BASE}/api/v1/professional/documents`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: form,
            });
            if (!res.ok) throw new Error("Upload failed");
            toast({ title: "Document uploaded", description: `${uploadFile.name} added to your library.` });
            setShowUpload(false);
            setUploadFile(null);
            setUploadMeta({ document_type: "other", title: "" });
            fetchDocs();
        } catch (e: any) {
            toast({ title: "Upload failed", description: e.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (docId: string, title: string) => {
        if (!token || !confirm(`Delete "${title}"?`)) return;
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/documents/${docId}`, {
                method: "DELETE", headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setDocs((prev) => prev.filter((d) => d.id !== docId));
                toast({ title: "Document deleted" });
            }
        } catch (e) {
            toast({ title: "Delete failed", variant: "destructive" });
        }
    };

    const handleBatchExport = async () => {
        if (!token) return;
        window.open(`${API_BASE}/api/v1/professional/documents/export?token=${token}`, "_blank");
    };

    const filtered = docs.filter((d) =>
        !searchQuery ||
        d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.family_file_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const typeCounts = DOC_TYPES.reduce((acc, t) => {
        acc[t.value] = t.value === "all" ? docs.length : docs.filter((d) => d.document_type === t.value).length;
        return acc;
    }, {} as Record<string, number>);

    const formatBytes = (b?: number) => {
        if (!b) return "-";
        if (b < 1024) return `${b} B`;
        if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
        return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                            <FileText className="h-6 w-6" />
                        </div>
                        Document Library
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Central repository for all case documents — court orders, agreements, evidence.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchDocs}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleBatchExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Batch Export
                    </Button>
                    <Link href="/professional/documents/ocr">
                        <Button variant="outline" size="sm" className="text-violet-700 border-violet-200 hover:bg-violet-50">
                            <ScanLine className="h-4 w-4 mr-2" />
                            OCR Court Order
                        </Button>
                    </Link>
                    <Button onClick={() => setShowUpload(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                        <Upload className="h-4 w-4" />
                        Upload
                    </Button>
                </div>
            </div>

            {/* Type filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
                {DOC_TYPES.map((t) => (
                    <button
                        key={t.value}
                        onClick={() => setTypeFilter(t.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${typeFilter === t.value
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                            }`}
                    >
                        {t.icon}
                        {t.label}
                        <span className={`text-xs font-bold ${typeFilter === t.value ? "text-indigo-200" : "text-slate-400"}`}>
                            {typeCounts[t.value] ?? 0}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search documents, case numbers..."
                    className="pl-9 border-slate-200"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                    </button>
                )}
            </div>

            {/* Document Grid */}
            {isLoading ? (
                <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <Card className="border-dashed border-slate-200 bg-slate-50">
                    <CardContent className="py-16 text-center">
                        <FilePlus className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 mb-2">
                            {searchQuery ? "No documents match your search." : "No documents yet."}
                        </p>
                        <Button onClick={() => setShowUpload(true)} variant="outline">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload your first document
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="text-left px-4 py-3 text-slate-500 font-semibold">Title</th>
                                <th className="text-left px-4 py-3 text-slate-500 font-semibold hidden md:table-cell">Type</th>
                                <th className="text-left px-4 py-3 text-slate-500 font-semibold hidden lg:table-cell">Case</th>
                                <th className="text-left px-4 py-3 text-slate-500 font-semibold hidden lg:table-cell">Size</th>
                                <th className="text-left px-4 py-3 text-slate-500 font-semibold hidden xl:table-cell">Date</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((doc) => (
                                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-slate-100 rounded-lg shrink-0">
                                                <FileText className="h-4 w-4 text-slate-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-slate-900 truncate">{doc.title || doc.filename}</p>
                                                {doc.sha256_hash && (
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <Hash className="h-3 w-3 text-slate-300" />
                                                        <span className="text-[10px] text-slate-400 font-mono">{doc.sha256_hash.slice(0, 12)}…</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        <Badge variant="outline" className="text-xs capitalize">
                                            {(doc.document_type || "other").replace(/_/g, " ")}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 hidden lg:table-cell">
                                        {doc.family_file_id ? (
                                            <Link
                                                href={`/professional/cases/${doc.family_file_id}`}
                                                className="text-indigo-600 hover:underline text-xs"
                                            >
                                                {doc.family_file_number || doc.family_file_id.slice(0, 8)}
                                            </Link>
                                        ) : (
                                            <span className="text-slate-400 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 hidden lg:table-cell text-slate-400">
                                        {formatBytes(doc.file_size_bytes)}
                                    </td>
                                    <td className="px-4 py-3 hidden xl:table-cell text-slate-400">
                                        {new Date(doc.uploaded_at).toLocaleDateString("en-US", {
                                            month: "short", day: "numeric", year: "numeric",
                                        })}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {doc.url && (
                                                    <DropdownMenuItem asChild>
                                                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            View
                                                        </a>
                                                    </DropdownMenuItem>
                                                )}
                                                {doc.url && (
                                                    <DropdownMenuItem asChild>
                                                        <a href={doc.url} download={doc.filename}>
                                                            <Download className="h-4 w-4 mr-2" />
                                                            Download
                                                        </a>
                                                    </DropdownMenuItem>
                                                )}
                                                {doc.family_file_id && (
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/professional/cases/${doc.family_file_id}`}>
                                                            <FolderOpen className="h-4 w-4 mr-2" />
                                                            Open Case
                                                        </Link>
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-red-600"
                                                    onClick={() => handleDelete(doc.id, doc.title || doc.filename)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {/* Upload Dialog */}
            <Dialog open={showUpload} onOpenChange={setShowUpload}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-indigo-500" />
                            Upload Document
                        </DialogTitle>
                        <DialogDescription>
                            Upload a PDF, image, or document to your library.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Document Type</Label>
                            <Select
                                value={uploadMeta.document_type}
                                onValueChange={(v) => setUploadMeta((p) => ({ ...p, document_type: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOC_TYPES.filter((t) => t.value !== "all").map((t) => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Title (optional)</Label>
                            <Input
                                placeholder="Document title..."
                                value={uploadMeta.title}
                                onChange={(e) => setUploadMeta((p) => ({ ...p, title: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>File *</Label>
                            <div
                                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${uploadFile ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
                                    }`}
                                onClick={() => fileRef.current?.click()}
                            >
                                {uploadFile ? (
                                    <div className="flex items-center justify-center gap-2 text-indigo-700">
                                        <FileText className="h-5 w-5" />
                                        <span className="font-medium">{uploadFile.name}</span>
                                        <span className="text-sm text-indigo-500">({formatBytes(uploadFile.size)})</span>
                                    </div>
                                ) : (
                                    <div className="text-slate-400">
                                        <Upload className="h-8 w-8 mx-auto mb-2" />
                                        <p className="text-sm">Click to choose file or drag & drop</p>
                                        <p className="text-xs mt-1">PDF, DOCX, PNG, JPG up to 50MB</p>
                                    </div>
                                )}
                                <input
                                    ref={fileRef}
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUpload(false)} disabled={uploading}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={!uploadFile || uploading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                        >
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {uploading ? "Uploading..." : "Upload"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
