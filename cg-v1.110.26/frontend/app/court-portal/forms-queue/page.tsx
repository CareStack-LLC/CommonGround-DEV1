"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  ChevronRight,
  Filter,
  Search,
  Scale,
  Calendar,
  User,
} from "lucide-react";
import { useCourtAuth } from "../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCourtAuthToken } from "@/lib/court-api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FormSubmission {
  id: string;
  case_id: string;
  case_name?: string;
  parent_id: string;
  parent_name?: string;
  form_type: string;
  status: string;
  submission_source: string;
  aria_assisted: boolean;
  submitted_at?: string;
  created_at: string;
}

const FORM_LABELS: Record<string, { name: string; color: string }> = {
  "FL-300": { name: "Request for Order", color: "bg-blue-100 text-blue-700" },
  "FL-311": { name: "Child Custody Application", color: "bg-blue-100 text-blue-700" },
  "FL-320": { name: "Responsive Declaration", color: "bg-purple-100 text-purple-700" },
  "FL-340": { name: "Findings and Order", color: "bg-amber-100 text-amber-700" },
  "FL-341": { name: "Custody Order Attachment", color: "bg-green-100 text-green-700" },
  "FL-342": { name: "Child Support Attachment", color: "bg-teal-100 text-teal-700" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "success" | "warning" | "error"; icon: typeof Clock }> = {
  submitted: { label: "Submitted", variant: "default", icon: Clock },
  under_court_review: { label: "Under Review", variant: "warning", icon: Eye },
};

export default function FormsQueuePage() {
  const router = useRouter();
  const { professional, token, isLoading } = useCourtAuth();

  const [forms, setForms] = useState<FormSubmission[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFormType, setFilterFormType] = useState<string>("all");

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    if (professional) {
      loadPendingForms();
    }
  }, [professional]);

  const loadPendingForms = async () => {
    try {
      setIsLoadingData(true);
      setError(null);

      const authToken = token || getCourtAuthToken();
      const headers: HeadersInit = authToken ? { Authorization: `Bearer ${authToken}` } : {};

      // Fetch forms with pending status across all cases
      const response = await fetch(`${API_BASE}/court/forms/pending`, { headers });

      if (response.ok) {
        const data = await response.json();
        setForms(data.forms || []);
      } else {
        // If endpoint doesn't exist, use empty array
        setForms([]);
      }
    } catch (err) {
      console.error("Failed to load pending forms:", err);
      setError("Failed to load pending forms");
    } finally {
      setIsLoadingData(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return "Just now";
  };

  // Filter forms based on search and form type
  const filteredForms = forms.filter((form) => {
    const matchesSearch =
      searchQuery === "" ||
      form.form_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.case_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.parent_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterFormType === "all" || form.form_type === filterFormType;

    return matchesSearch && matchesType;
  });

  // Group by urgency (older = more urgent)
  const urgentForms = filteredForms.filter((f) => {
    const age = Date.now() - new Date(f.submitted_at || f.created_at).getTime();
    return age > 48 * 60 * 60 * 1000; // > 48 hours
  });

  const recentForms = filteredForms.filter((f) => {
    const age = Date.now() - new Date(f.submitted_at || f.created_at).getTime();
    return age <= 48 * 60 * 60 * 1000;
  });

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            Form Review Queue
          </h1>
          <p className="text-muted-foreground">
            {filteredForms.length} form{filteredForms.length !== 1 ? "s" : ""} pending review
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by case, parent, or form type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterFormType}
                onChange={(e) => setFilterFormType(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Form Types</option>
                <option value="FL-300">FL-300 - Request for Order</option>
                <option value="FL-311">FL-311 - Custody Application</option>
                <option value="FL-320">FL-320 - Responsive Declaration</option>
                <option value="FL-340">FL-340 - Findings and Order</option>
                <option value="FL-341">FL-341 - Custody Attachment</option>
                <option value="FL-342">FL-342 - Support Attachment</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-white border-red-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Urgent</p>
                <p className="text-2xl font-bold text-red-700">{urgentForms.length}</p>
                <p className="text-xs text-red-500">Older than 48h</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Recent</p>
                <p className="text-2xl font-bold text-amber-700">{recentForms.length}</p>
                <p className="text-xs text-amber-500">Last 48 hours</p>
              </div>
              <Clock className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Pending</p>
                <p className="text-2xl font-bold text-green-700">{filteredForms.length}</p>
                <p className="text-xs text-green-500">Awaiting review</p>
              </div>
              <FileText className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {isLoadingData && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto" />
              <p className="mt-4 text-muted-foreground">Loading pending forms...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Urgent Forms */}
      {!isLoadingData && urgentForms.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="bg-red-50/50">
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Urgent - Needs Immediate Attention
            </CardTitle>
            <CardDescription className="text-red-600">
              These forms have been waiting more than 48 hours
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {urgentForms.map((form) => (
                <FormCard key={form.id} form={form} formatDate={formatDate} getTimeAgo={getTimeAgo} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Forms */}
      {!isLoadingData && recentForms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              Recent Submissions
            </CardTitle>
            <CardDescription>
              Forms submitted in the last 48 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentForms.map((form) => (
                <FormCard key={form.id} form={form} formatDate={formatDate} getTimeAgo={getTimeAgo} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoadingData && filteredForms.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                All Caught Up!
              </h3>
              <p className="text-muted-foreground">
                {searchQuery || filterFormType !== "all"
                  ? "No forms match your search criteria"
                  : "No forms are currently pending review"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FormCard({
  form,
  formatDate,
  getTimeAgo,
}: {
  form: FormSubmission;
  formatDate: (date: string) => string;
  getTimeAgo: (date: string) => string;
}) {
  const formInfo = FORM_LABELS[form.form_type];
  const statusConfig = STATUS_CONFIG[form.status] || STATUS_CONFIG.submitted;
  const StatusIcon = statusConfig.icon;

  return (
    <Link
      href={`/court-portal/cases/${form.case_id}/forms/${form.id}`}
      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${formInfo?.color || "bg-gray-100"}`}>
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900">{form.form_type}</p>
            <Badge variant={statusConfig.variant} className="text-xs">
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
            {form.aria_assisted && (
              <Badge variant="secondary" className="text-xs">ARIA</Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {formInfo?.name || form.form_type}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
            <span className="flex items-center gap-1">
              <Scale className="h-3 w-3" />
              {form.case_name || `Case ${form.case_id.slice(0, 8)}...`}
            </span>
            {form.parent_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {form.parent_name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {getTimeAgo(form.submitted_at || form.created_at)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
          Review
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:hidden" />
      </div>
    </Link>
  );
}
