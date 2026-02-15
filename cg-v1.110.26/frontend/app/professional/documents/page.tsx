"use client";

import { useState } from "react";
import Link from "next/link";
import {
    FileText,
    Plus,
    Download,
    ScanLine,
    FolderOpen,
    Scale,
    FileCheck,
    Search,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useProfessionalAuth } from "../layout";
import { DocumentList } from "@/components/professional/document-list";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ProfessionalDocumentsPage() {
    const { token, profile } = useProfessionalAuth();
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                            <FileText className="h-6 w-6" />
                        </div>
                        Case Documents
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Central repository for agreements, court orders, and evidence across all cases.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/professional/documents/ocr">
                        <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/20">
                            <ScanLine className="h-4 w-4 mr-2" />
                            Upload Court Order (OCR)
                        </Button>
                    </Link>
                    <Button variant="outline" className="border-slate-200">
                        <Download className="h-4 w-4 mr-2" />
                        Batch Export
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link href="/professional/documents/ocr">
                    <Card className="hover:shadow-md transition-all cursor-pointer group">
                        <CardContent className="pt-4 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-violet-100 rounded-lg group-hover:bg-violet-200 transition-colors">
                                    <ScanLine className="h-4 w-4 text-violet-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">OCR Processing</p>
                                    <p className="text-sm font-semibold text-slate-900">Court Orders</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <FileCheck className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Agreements</p>
                                <p className="text-sm font-semibold text-slate-900">Active Docs</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Scale className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Evidence</p>
                                <p className="text-sm font-semibold text-slate-900">Filed Items</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <FolderOpen className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">All Files</p>
                                <p className="text-sm font-semibold text-slate-900">Repository</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for different document types */}
            <Tabs defaultValue="all" className="space-y-4">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="all" className="flex items-center gap-1.5">
                            <FolderOpen className="h-3.5 w-3.5" />
                            All
                        </TabsTrigger>
                        <TabsTrigger value="court_orders" className="flex items-center gap-1.5">
                            <Scale className="h-3.5 w-3.5" />
                            Court Orders
                        </TabsTrigger>
                        <TabsTrigger value="agreements" className="flex items-center gap-1.5">
                            <FileCheck className="h-3.5 w-3.5" />
                            Agreements
                        </TabsTrigger>
                        <TabsTrigger value="evidence" className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            Evidence
                        </TabsTrigger>
                    </TabsList>
                    <div className="relative hidden sm:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search documents..."
                            className="pl-10 w-64"
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <TabsContent value="all">
                    <DocumentList token={token || ""} />
                </TabsContent>
                <TabsContent value="court_orders">
                    <Card>
                        <CardContent className="py-8 text-center">
                            <ScanLine className="h-10 w-10 mx-auto text-violet-300 mb-3" />
                            <h3 className="font-medium text-slate-900 mb-1">Court Orders</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Upload and process court orders using OCR for automatic data extraction.
                            </p>
                            <Link href="/professional/documents/ocr">
                                <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                                    <ScanLine className="h-4 w-4 mr-2" />
                                    Go to OCR Center
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="agreements">
                    <DocumentList token={token || ""} />
                </TabsContent>
                <TabsContent value="evidence">
                    <DocumentList token={token || ""} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
