"use client";

import { useState, useEffect } from "react";
import {
    FileText,
    Search,
    Filter,
    Download,
    Eye,
    Scale,
    Briefcase,
    Video,
    FileWarning,
    ChevronRight,
    MoreVertical,
    Calendar,
    Layers,
    Upload,
    Loader2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ProfessionalDocument {
    id: string;
    title: string;
    type: string;
    status: string;
    created_at: string;
    family_file_id: string;
    file_url: string;
    description?: string;
}

const DOC_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    agreement: { label: "Agreement", icon: FileText, color: "text-blue-600 bg-blue-50 border-blue-200" },
    quick_accord: { label: "Quick Accord", icon: Scale, color: "text-amber-600 bg-amber-50 border-amber-200" },
    report: { label: "Report", icon: Scale, color: "text-teal-600 bg-teal-50 border-teal-200" },
    recording: { label: "Recording", icon: Video, color: "text-purple-600 bg-purple-50 border-purple-200" },
    attachment: { label: "Evidence", icon: FileWarning, color: "text-red-600 bg-red-50 border-red-200" },
    court_order: { label: "Court Order", icon: Scale, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
};

export function DocumentList({
    familyFileId,
    token
}: {
    familyFileId?: string;
    token: string
}) {
    const [documents, setDocuments] = useState<ProfessionalDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const { toast } = useToast();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !token || !familyFileId) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("family_file_id", familyFileId);
        formData.append("document_type", "court_order"); // Defaulting to court order based on button label

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/professional/ocr/upload`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (response.ok) {
                toast({
                    title: "Upload Successful",
                    description: "The court order has been uploaded and queued for processing.",
                });
                // Refresh list
                fetchDocuments();
            } else {
                const error = await response.json();
                throw new Error(error.detail || "Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast({
                title: "Upload Failed",
                description: "There was an error uploading the document. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
            // Reset input
            e.target.value = "";
        }
    };

    const fetchDocuments = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (familyFileId) params.append("family_file_id", familyFileId);
            if (typeFilter !== "all") params.append("doc_type", typeFilter);
            if (searchQuery) params.append("search", searchQuery);

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/professional/documents?${params.toString()}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setDocuments(data.items || []);
            }
        } catch (error) {
            console.error("Error fetching documents:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, [familyFileId, typeFilter, token]);

    // Handle search with debounce in real-world, but simple here
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDocuments();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 border-slate-200"
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-48 h-10 border-slate-200">
                        <Filter className="h-4 w-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="agreement">Agreements</SelectItem>
                        <SelectItem value="quick_accord">Quick Accords</SelectItem>
                        <SelectItem value="report">Reports</SelectItem>
                        <SelectItem value="recording">Recordings</SelectItem>
                        <SelectItem value="attachment">Evidence</SelectItem>
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        id="court-order-upload"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                    />
                    <Button
                        onClick={() => document.getElementById('court-order-upload')?.click()}
                        disabled={isUploading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap"
                    >
                        {isUploading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Upload className="h-4 w-4 mr-2" />
                        )}
                        {isUploading ? "Uploading..." : "Upload Court Order"}
                    </Button>
                </div>
            </div>

            {/* Grid view */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
                </div>
            ) : documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map((doc) => {
                        const config = DOC_TYPE_CONFIG[doc.type] || DOC_TYPE_CONFIG.agreement;
                        return (
                            <Card key={doc.id} className="group hover:shadow-md transition-all border-slate-200 overflow-hidden">
                                <div className={`h-1.5 w-full ${config.color.split(' ')[0].replace('text', 'bg')}`} />
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className={`p-2 rounded-lg ${config.color.split(' ').slice(1).join(' ')}`}>
                                            <config.icon className={`h-5 w-5 ${config.color.split(' ')[0]}`} />
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View Document
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Download PDF
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem>
                                                    <Layers className="h-4 w-4 mr-2" />
                                                    Compare Versions
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors line-clamp-1 mb-1" title={doc.title}>
                                            {doc.title}
                                        </h3>
                                        <p className="text-xs text-slate-500 line-clamp-2 mb-4 h-8">
                                            {doc.description || "No description provided."}
                                        </p>

                                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(doc.created_at)}
                                            </div>
                                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 uppercase tracking-wider font-bold ${config.color}`}>
                                                {config.label}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="p-4 bg-teal-50 rounded-full w-fit mx-auto mb-4">
                        <FileText className="h-10 w-10 text-teal-600/50" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">No documents found</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mt-2">
                        Try adjusting your search or filters to find what you're looking for.
                    </p>
                </div>
            )}
        </div>
    );
}
