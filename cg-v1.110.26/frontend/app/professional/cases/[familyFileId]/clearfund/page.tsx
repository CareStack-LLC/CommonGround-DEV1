"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  DollarSign,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  Receipt,
  CreditCard,
  Users,
  TrendingUp,
  FileText,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useProfessionalAuth } from "../../../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Obligation {
  id: string;
  title: string;
  description?: string;
  purpose_category: string;
  total_amount: number;
  petitioner_share: number;
  respondent_share: number;
  petitioner_percentage: number;
  amount_funded: number;
  amount_spent: number;
  amount_verified: number;
  status: string;
  due_date?: string;
  verification_required: boolean;
  receipt_required: boolean;
  created_at: string;
  funded_at?: string;
  verified_at?: string;
  child_ids?: string[];
  children_names?: string[];
  source_type: string;
  // Funding records
  funding_records?: FundingRecord[];
  // Verification
  verification_artifacts?: VerificationArtifact[];
}

interface FundingRecord {
  id: string;
  parent_id: string;
  parent_name?: string;
  amount_required: number;
  amount_funded: number;
  is_fully_funded: boolean;
  funded_at?: string;
}

interface VerificationArtifact {
  id: string;
  artifact_type: string;
  vendor_name?: string;
  amount_verified: number;
  receipt_url?: string;
  verified_at?: string;
  verification_method?: string;
}

interface FinancialStats {
  total_obligations: number;
  total_amount: number;
  amount_funded: number;
  amount_verified: number;
  pending_count: number;
  parent_a_contribution: number;
  parent_b_contribution: number;
  parent_a_compliance: number;
  parent_b_compliance: number;
}

export default function CaseClearFundPage() {
  const params = useParams();
  const { token } = useProfessionalAuth();
  const familyFileId = params.familyFileId as string;

  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedObligation, setSelectedObligation] = useState<Obligation | null>(null);

  useEffect(() => {
    fetchObligations();
  }, [familyFileId, token, statusFilter, categoryFilter]);

  const fetchObligations = async () => {
    if (!token || !familyFileId) return;

    setIsLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      params.append("case_id", familyFileId);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);

      // Fetch obligations
      const response = await fetch(
        `${API_BASE}/api/v1/clearfund/obligations?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setObligations(data.obligations || data || []);
      }

      // Fetch financial stats
      const statsResponse = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/compliance/financials`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (statsResponse.ok) {
        setStats(await statsResponse.json());
      }
    } catch (error) {
      console.error("Error fetching obligations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
      open: { color: "bg-blue-100 text-blue-800", icon: Clock },
      partially_funded: { color: "bg-amber-100 text-amber-800", icon: TrendingUp },
      funded: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
      authorized: { color: "bg-purple-100 text-purple-800", icon: CreditCard },
      pending_verification: { color: "bg-orange-100 text-orange-800", icon: Receipt },
      verified: { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
      completed: { color: "bg-slate-100 text-slate-800", icon: CheckCircle2 },
      expired: { color: "bg-red-100 text-red-800", icon: AlertCircle },
      cancelled: { color: "bg-gray-100 text-gray-800", icon: XCircle },
    };
    const config = statusConfig[status] || statusConfig.open;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
      </Badge>
    );
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      medical: "Medical",
      education: "Education",
      sports: "Sports",
      device: "Device",
      camp: "Camp",
      clothing: "Clothing",
      transportation: "Transportation",
      child_support: "Child Support",
      extracurricular: "Extracurricular",
      childcare: "Childcare",
      other: "Other",
    };
    return labels[category] || category;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={`/professional/cases/${familyFileId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Case
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-100 text-emerald-600 rounded-xl">
            <DollarSign className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ClearFund</h1>
            <p className="text-muted-foreground">
              Shared expenses, funding status, and verification
            </p>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(stats.total_amount)}</p>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Amount Funded</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(stats.amount_funded)}</p>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Verified</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(stats.amount_verified)}</p>
                </div>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Receipt className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold mt-1">{stats.pending_count}</p>
                </div>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Parent Compliance */}
      {stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Financial Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Parent A (Petitioner)</span>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(stats.parent_a_contribution)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={stats.parent_a_compliance * 100} className="flex-1 h-3" />
                  <span className="text-sm font-medium w-12 text-right">
                    {Math.round(stats.parent_a_compliance * 100)}%
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Parent B (Respondent)</span>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(stats.parent_b_contribution)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={stats.parent_b_compliance * 100} className="flex-1 h-3" />
                  <span className="text-sm font-medium w-12 text-right">
                    {Math.round(stats.parent_b_compliance * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="partially_funded">Partially Funded</SelectItem>
            <SelectItem value="funded">Funded</SelectItem>
            <SelectItem value="pending_verification">Pending Verification</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <FileText className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="medical">Medical</SelectItem>
            <SelectItem value="education">Education</SelectItem>
            <SelectItem value="sports">Sports</SelectItem>
            <SelectItem value="extracurricular">Extracurricular</SelectItem>
            <SelectItem value="childcare">Childcare</SelectItem>
            <SelectItem value="transportation">Transportation</SelectItem>
            <SelectItem value="clothing">Clothing</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Obligations List */}
      <div className="space-y-4">
        {obligations.length > 0 ? (
          obligations.map((obligation) => (
            <ObligationCard
              key={obligation.id}
              obligation={obligation}
              onViewDetails={() => setSelectedObligation(obligation)}
              formatCurrency={formatCurrency}
              getStatusBadge={getStatusBadge}
              getCategoryLabel={getCategoryLabel}
            />
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground mb-2">No obligations found</h3>
              <p className="text-muted-foreground text-sm">
                No shared expenses match your current filters.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Obligation Detail Modal */}
      {selectedObligation && (
        <ObligationDetailModal
          obligation={selectedObligation}
          onClose={() => setSelectedObligation(null)}
          formatCurrency={formatCurrency}
          getStatusBadge={getStatusBadge}
          getCategoryLabel={getCategoryLabel}
        />
      )}
    </div>
  );
}

// Obligation Card Component
function ObligationCard({
  obligation,
  onViewDetails,
  formatCurrency,
  getStatusBadge,
  getCategoryLabel,
}: {
  obligation: Obligation;
  onViewDetails: () => void;
  formatCurrency: (amount: number) => string;
  getStatusBadge: (status: string) => ReactNode;
  getCategoryLabel: (category: string) => string;
}) {
  const fundingProgress =
    obligation.total_amount > 0
      ? (obligation.amount_funded / obligation.total_amount) * 100
      : 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Info */}
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {getStatusBadge(obligation.status)}
                <Badge variant="outline" className="text-xs">
                  {getCategoryLabel(obligation.purpose_category)}
                </Badge>
                {obligation.verification_required && (
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                    <Receipt className="h-3 w-3 mr-1" />
                    Receipt Required
                  </Badge>
                )}
              </div>
              <p className="font-medium">{obligation.title}</p>
              {obligation.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {obligation.description}
                </p>
              )}
              {obligation.children_names && obligation.children_names.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  For: {obligation.children_names.join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* Center: Funding Progress */}
          <div className="lg:w-48">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Funded</span>
              <span className="font-medium">
                {formatCurrency(obligation.amount_funded)} / {formatCurrency(obligation.total_amount)}
              </span>
            </div>
            <Progress value={fundingProgress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
              <span>
                {Math.round(obligation.petitioner_percentage)}% / {Math.round(100 - obligation.petitioner_percentage)}%
              </span>
              <span>{Math.round(fundingProgress)}%</span>
            </div>
          </div>

          {/* Right: Amount and Action */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-lg font-bold">{formatCurrency(obligation.total_amount)}</p>
              {obligation.due_date && (
                <p className="text-xs text-muted-foreground">
                  Due: {new Date(obligation.due_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Obligation Detail Modal
function ObligationDetailModal({
  obligation,
  onClose,
  formatCurrency,
  getStatusBadge,
  getCategoryLabel,
}: {
  obligation: Obligation;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
  getStatusBadge: (status: string) => ReactNode;
  getCategoryLabel: (category: string) => string;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{obligation.title}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
          <CardDescription>{obligation.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status and Category */}
          <div className="flex items-center gap-3 flex-wrap">
            {getStatusBadge(obligation.status)}
            <Badge variant="outline">{getCategoryLabel(obligation.purpose_category)}</Badge>
            <Badge variant="outline" className="capitalize">
              {obligation.source_type.replace("_", " ")}
            </Badge>
          </div>

          {/* Amount Breakdown */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">{formatCurrency(obligation.total_amount)}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg text-center">
              <p className="text-sm text-emerald-600">Amount Funded</p>
              <p className="text-2xl font-bold text-emerald-700">
                {formatCurrency(obligation.amount_funded)}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <p className="text-sm text-purple-600">Amount Verified</p>
              <p className="text-2xl font-bold text-purple-700">
                {formatCurrency(obligation.amount_verified)}
              </p>
            </div>
          </div>

          {/* Split Breakdown */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Responsibility Split
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-blue-800">
                    Petitioner ({Math.round(obligation.petitioner_percentage)}%)
                  </span>
                  <span className="font-bold text-blue-800">
                    {formatCurrency(obligation.petitioner_share)}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-emerald-800">
                    Respondent ({Math.round(100 - obligation.petitioner_percentage)}%)
                  </span>
                  <span className="font-bold text-emerald-800">
                    {formatCurrency(obligation.respondent_share)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Funding Records */}
          {obligation.funding_records && obligation.funding_records.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Funding Records
              </h4>
              <div className="space-y-2">
                {obligation.funding_records.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {record.is_fully_funded ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-500" />
                      )}
                      <span className="text-sm">{record.parent_name || "Parent"}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium">
                        {formatCurrency(record.amount_funded)} / {formatCurrency(record.amount_required)}
                      </span>
                      {record.funded_at && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(record.funded_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verification Artifacts */}
          {obligation.verification_artifacts && obligation.verification_artifacts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Verification Evidence
              </h4>
              <div className="space-y-2">
                {obligation.verification_artifacts.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="flex items-center justify-between p-3 bg-purple-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Receipt className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium">{artifact.vendor_name || "Receipt"}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {artifact.artifact_type.replace("_", " ")}
                          {artifact.verification_method &&
                            ` - ${artifact.verification_method.replace("_", " ")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {formatCurrency(artifact.amount_verified)}
                      </span>
                      {artifact.receipt_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={artifact.receipt_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Children */}
          {obligation.children_names && obligation.children_names.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Children</h4>
              <div className="flex flex-wrap gap-2">
                {obligation.children_names.map((name, index) => (
                  <Badge key={index} variant="outline">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(obligation.created_at).toLocaleDateString()}
              </p>
            </div>
            {obligation.due_date && (
              <div>
                <p className="text-muted-foreground">Due Date</p>
                <p className="font-medium">
                  {new Date(obligation.due_date).toLocaleDateString()}
                </p>
              </div>
            )}
            {obligation.verified_at && (
              <div>
                <p className="text-muted-foreground">Verified</p>
                <p className="font-medium">
                  {new Date(obligation.verified_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
