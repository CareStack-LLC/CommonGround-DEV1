"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  FolderOpen,
  Search,
  Filter,
  Calendar,
  Users,
  Bot,
  MessageSquare,
  ChevronRight,
  Building2,
  CheckSquare,
  Square,
  Tag,
  ArrowUpDown,
  ChevronLeft,
  Zap,
  AlertCircle,
  Archive,
  CheckCircle2,
  Briefcase,
  Scale,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfessionalAuth } from "../layout";
import { SavedViews } from "@/components/professional/cases/SavedViews";
import { CourtOrderUpload } from "@/components/professional/court-order-upload";
import { useToast } from "@/hooks/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const PAGE_SIZE = 25;

interface CaseAssignment {
  id: string;
  professional_id: string;
  firm_id?: string;
  family_file_id: string;
  assignment_role: string;
  representing: string;
  access_scopes: string[];
  can_control_aria: boolean;
  can_message_client: boolean;
  status: string;
  assigned_at: string;
  family_file_number?: string;
  firm_name?: string;
  urgency?: "urgent" | "high" | "medium" | "low";
  aria_risk?: "high" | "medium" | "low";
  next_court_date?: string;
  compliance_score?: number;
}

interface SavedView {
  id: string;
  name: string;
  filters: Record<string, string>;
}

const SYSTEM_VIEWS: SavedView[] = [
  { id: "my_cases", name: "My Cases", filters: { status: "active" } },
  { id: "urgent", name: "Urgent", filters: { urgency: "urgent" } },
  { id: "dv_flagged", name: "DV Flagged", filters: { aria_risk: "high" } },
  { id: "court_week", name: "Court This Week", filters: { court_date: "7" } },
];

const URGENCY_COLORS: Record<string, string> = {
  urgent: "text-red-900 bg-red-50 border-2 border-red-900/30",
  high: "text-orange-900 bg-orange-50 border-2 border-orange-900/30",
  medium: "text-blue-900 bg-blue-50 border-2 border-blue-900/30",
  low: "text-slate-600 bg-slate-50 border-2 border-slate-300",
};

const RISK_ICONS: Record<string, React.JSX.Element> = {
  high: <AlertCircle className="h-4 w-4 text-red-700" strokeWidth={2} />,
  medium: <Zap className="h-4 w-4 text-amber-700" strokeWidth={2} />,
  low: <CheckCircle2 className="h-4 w-4 text-emerald-700" strokeWidth={2} />,
};

export default function CasesListPage() {
  const { token, activeFirm } = useProfessionalAuth();
  const { toast } = useToast();
  const [showCourtOrderUpload, setShowCourtOrderUpload] = useState(false);
  const [cases, setCases] = useState<CaseAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleCourtOrderComplete = async (data: any) => {
    // Handle extracted court order data - create case with pre-filled data
    toast({
      title: "Court Order Processed",
      description: "Case data extracted successfully. Redirecting to case creation...",
    });
    setShowCourtOrderUpload(false);
    // TODO: Navigate to case creation with pre-filled data
    console.log("Extracted court order data:", data);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [roleFilter, setRoleFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [activeViewId, setActiveViewId] = useState<string | null>("sys_my_cases");
  const [sortBy, setSortBy] = useState<"assigned_at" | "next_court_date" | "compliance_score">("assigned_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchCases();
    setSelectedIds(new Set());
    setPage(1);
  }, [token, activeFirm, statusFilter]);

  const fetchCases = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (activeFirm) params.append("firm_id", activeFirm.id);
      if (statusFilter === "all") params.append("include_inactive", "true");

      const response = await fetch(
        `${API_BASE}/api/v1/professional/cases?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) setCases(await response.json());
    } catch (error) {
      console.error("Error fetching cases:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyView = (filters: Record<string, string>, viewId: string) => {
    setActiveViewId(viewId);
    if (filters.status) setStatusFilter(filters.status);
    else setStatusFilter("all");
    if (filters.urgency) setUrgencyFilter(filters.urgency);
    else setUrgencyFilter("all");
    setPage(1);
  };

  const currentFilters: Record<string, string> = {
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(urgencyFilter !== "all" ? { urgency: urgencyFilter } : {}),
    ...(roleFilter !== "all" ? { role: roleFilter } : {}),
  };

  const filteredCases = useMemo(() => {
    let result = cases.filter((c) => {
      const matchesSearch =
        !searchQuery ||
        c.family_file_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.firm_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.assignment_role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || c.assignment_role === roleFilter;
      const matchesUrgency = urgencyFilter === "all" || c.urgency === urgencyFilter;
      return matchesSearch && matchesRole && matchesUrgency;
    });

    result = [...result].sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortBy === "assigned_at") { aVal = a.assigned_at; bVal = b.assigned_at; }
      else if (sortBy === "compliance_score") { aVal = a.compliance_score ?? 0; bVal = b.compliance_score ?? 0; }
      else { aVal = a.next_court_date ?? ""; bVal = b.next_court_date ?? ""; }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [cases, searchQuery, roleFilter, urgencyFilter, sortBy, sortDir]);

  const totalPages = Math.ceil(filteredCases.length / PAGE_SIZE);
  const pagedCases = filteredCases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allSelected = pagedCases.length > 0 && pagedCases.every((c) => selectedIds.has(c.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => { const s = new Set(prev); pagedCases.forEach((c) => s.delete(c.id)); return s; });
    } else {
      setSelectedIds((prev) => { const s = new Set(prev); pagedCases.forEach((c) => s.add(c.id)); return s; });
    }
  };

  const bulkAction = useCallback(async (action: string, payload: Record<string, any> = {}) => {
    if (selectedIds.size === 0 || !token) return;
    try {
      const res = await fetch("/api/professional/cases/bulk-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, caseIds: Array.from(selectedIds), payload }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: data.message || `${action} applied`, description: `${data.succeeded || selectedIds.size} case(s) updated.` });
        setSelectedIds(new Set());
        fetchCases();
      } else {
        toast({ title: "Action failed", description: data.error || "Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
  }, [selectedIds, token]);

  const roleLabels: Record<string, string> = {
    lead_attorney: "Lead Attorney", associate: "Associate",
    paralegal: "Paralegal", mediator: "Mediator",
    parenting_coordinator: "Parenting Coordinator", intake_coordinator: "Intake Coordinator",
  };

  const representingLabels: Record<string, string> = {
    parent_a: "Petitioner", parent_b: "Respondent", both: "Both Parties", court: "Court",
  };

  const statusColors: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-900 border-2 border-emerald-900/30",
    on_hold: "bg-amber-50 text-amber-900 border-2 border-amber-900/30",
    completed: "bg-blue-50 text-blue-900 border-2 border-blue-900/30",
    withdrawn: "bg-slate-50 text-slate-600 border-2 border-slate-300",
  };

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');

        .cases-wrapper {
          background: linear-gradient(135deg, #fef9f3 0%, #faf5ed 100%);
          min-height: 100vh;
        }

        .serif { font-family: 'Crimson Pro', Georgia, serif; }
        .sans { font-family: 'Outfit', system-ui, sans-serif; }
      `}</style>

      <div className="cases-wrapper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Distinguished Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b-2 border-amber-900/20">
            <div className="flex items-start gap-5">
              <div className="p-4 bg-gradient-to-br from-amber-900 to-amber-800 border-2 border-amber-900/40 rounded-sm shadow-xl shrink-0">
                <Briefcase className="h-8 w-8 text-amber-50" strokeWidth={1.5} />
              </div>
              <div>
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="sans text-xs font-bold text-amber-900/60 tracking-[0.2em] uppercase">
                    Case Docket
                  </span>
                  <div className="h-px w-8 bg-amber-900/30"></div>
                </div>
                <h1 className="serif text-4xl font-bold text-slate-900 leading-tight">
                  Case Files
                </h1>
                <p className="sans text-slate-600 mt-1 text-sm">
                  {isLoading ? "Loading..." : `${filteredCases.length} file${filteredCases.length !== 1 ? "s" : ""} matching current view`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/professional/cases/new">
                <Button className="bg-amber-900 hover:bg-amber-950 text-white sans font-semibold px-6 h-11 shadow-lg border-2 border-amber-900/40">
                  <FolderOpen className="h-4 w-4 mr-2" strokeWidth={2} />
                  New Case
                </Button>
              </Link>
              <Button
                onClick={() => setShowCourtOrderUpload(true)}
                variant="outline"
                className="sans font-semibold px-5 h-11 border-2 border-amber-900/30 text-amber-900 hover:bg-amber-50 gap-2"
              >
                <FileText className="h-4 w-4" strokeWidth={2} />
                From Court Order
              </Button>
            </div>
          </div>

          {/* Saved Views */}
          {token && (
            <SavedViews
              token={token}
              activeFilters={currentFilters}
              onApplyView={applyView}
              activeViewId={activeViewId}
            />
          )}

          {/* Filter Bar */}
          <Card className="border-2 border-slate-300 bg-white shadow-lg">
            <CardContent className="py-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" strokeWidth={2} />
                  <Input
                    placeholder="Search by file number, name, or firm..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    className="pl-10 sans border-2 border-slate-300 focus:border-amber-900"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-40 sans border-2 border-slate-300 font-medium">
                    <Filter className="h-4 w-4 mr-2 text-slate-500" strokeWidth={2} />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={urgencyFilter} onValueChange={(v) => { setUrgencyFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-40 sans border-2 border-slate-300 font-medium">
                    <Zap className="h-4 w-4 mr-2 text-slate-500" strokeWidth={2} />
                    <SelectValue placeholder="Urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Urgency</SelectItem>
                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="medium">🔵 Medium</SelectItem>
                    <SelectItem value="low">⚪ Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-48 sans border-2 border-slate-300 font-medium">
                    <Users className="h-4 w-4 mr-2 text-slate-500" strokeWidth={2} />
                    <SelectValue placeholder="My Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="lead_attorney">Lead Attorney</SelectItem>
                    <SelectItem value="associate">Associate</SelectItem>
                    <SelectItem value="paralegal">Paralegal</SelectItem>
                    <SelectItem value="mediator">Mediator</SelectItem>
                    <SelectItem value="parenting_coordinator">Parenting Coordinator</SelectItem>
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 sans border-2 border-slate-300 font-medium h-11">
                      <ArrowUpDown className="h-4 w-4 text-slate-500" strokeWidth={2} />
                      Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="sans">
                    <DropdownMenuItem onClick={() => setSortBy("assigned_at")}>
                      Date Assigned {sortBy === "assigned_at" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("next_court_date")}>
                      Next Court Date {sortBy === "next_court_date" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("compliance_score")}>
                      Compliance Score {sortBy === "compliance_score" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}>
                      {sortDir === "asc" ? "↓ Descending" : "↑ Ascending"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 border-2 border-amber-900/30 rounded-sm shadow-md">
              <span className="sans text-sm font-bold text-amber-900">
                {selectedIds.size} file{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
              <div className="h-5 w-px bg-amber-900/20" />
              <Button size="sm" variant="outline" className="gap-1.5 sans font-medium border-2" onClick={() => bulkAction("assign")}>
                <Users className="h-3.5 w-3.5" strokeWidth={2} />
                Assign
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 sans font-medium border-2" onClick={() => bulkAction("tag")}>
                <Tag className="h-3.5 w-3.5" strokeWidth={2} />
                Tag
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 sans font-medium border-2" onClick={() => bulkAction("export")}>
                <FolderOpen className="h-3.5 w-3.5" strokeWidth={2} />
                Export
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 sans font-medium border-2 text-slate-600" onClick={() => bulkAction("archive")}>
                <Archive className="h-3.5 w-3.5" strokeWidth={2} />
                Archive
              </Button>
              <Button size="sm" variant="ghost" className="ml-auto sans text-slate-500 hover:text-slate-700" onClick={() => setSelectedIds(new Set())}>
                Clear Selection
              </Button>
            </div>
          )}

          {/* Table Header */}
          {!isLoading && pagedCases.length > 0 && (
            <div className="flex items-center gap-4 px-3 py-2 text-xs sans font-bold text-slate-500 uppercase tracking-[0.15em]">
              <button onClick={toggleAll} className="shrink-0">
                {allSelected
                  ? <CheckSquare className="h-4.5 w-4.5 text-amber-900" strokeWidth={2} />
                  : <Square className="h-4.5 w-4.5 text-slate-400" strokeWidth={2} />}
              </button>
              <span className="flex-1">Case File</span>
              <span className="hidden md:block w-32 text-center">Role</span>
              <span className="hidden lg:block w-28 text-center">Urgency</span>
              <span className="hidden sm:block w-28 text-center">Status</span>
              <span className="w-4" />
            </div>
          )}

          {/* Cases List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-sm animate-pulse border-2 border-slate-200" />
              ))}
            </div>
          ) : pagedCases.length > 0 ? (
            <div className="space-y-3">
              {pagedCases.map((caseItem) => (
                <CaseRow
                  key={caseItem.id}
                  caseItem={caseItem}
                  selected={selectedIds.has(caseItem.id)}
                  onToggleSelect={() => {
                    setSelectedIds((prev) => {
                      const s = new Set(prev);
                      s.has(caseItem.id) ? s.delete(caseItem.id) : s.add(caseItem.id);
                      return s;
                    });
                  }}
                  roleLabels={roleLabels}
                  representingLabels={representingLabels}
                  statusColors={statusColors}
                />
              ))}
            </div>
          ) : (
            <Card className="border-2 border-dashed border-slate-300 bg-slate-50/50">
              <CardContent className="py-20 text-center">
                <div className="p-5 bg-gradient-to-br from-amber-100 to-amber-200 rounded-sm w-fit mx-auto mb-6 border-2 border-amber-900/20">
                  <Briefcase className="h-12 w-12 text-amber-900" strokeWidth={1.5} />
                </div>
                <h3 className="serif text-xl font-bold text-slate-900 mb-2">No cases found</h3>
                <p className="sans text-slate-600 max-w-sm mx-auto">
                  {searchQuery || urgencyFilter !== "all" || roleFilter !== "all"
                    ? "Try adjusting your filters to see more results"
                    : "You don't have any assigned cases yet"}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="gap-2 sans font-medium border-2 border-slate-300"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                Previous
              </Button>
              <span className="sans text-sm text-slate-700 font-semibold px-4 py-2 bg-white border-2 border-slate-300 rounded-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="gap-2 sans font-medium border-2 border-slate-300"
              >
                Next
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Court Order Upload Dialog */}
      <CourtOrderUpload
        open={showCourtOrderUpload}
        onClose={() => setShowCourtOrderUpload(false)}
        onComplete={handleCourtOrderComplete}
        token={token || ""}
      />
    </div>
  );
}

// Case Row - Editorial Legal Style
function CaseRow({
  caseItem,
  selected,
  onToggleSelect,
  roleLabels,
  representingLabels,
  statusColors,
}: {
  caseItem: CaseAssignment;
  selected: boolean;
  onToggleSelect: () => void;
  roleLabels: Record<string, string>;
  representingLabels: Record<string, string>;
  statusColors: Record<string, string>;
}) {
  const statusAccent: Record<string, string> = {
    active: "border-l-emerald-700",
    on_hold: "border-l-amber-700",
    completed: "border-l-blue-700",
    withdrawn: "border-l-slate-400",
  };

  return (
    <div
      className={`group flex items-center gap-4 p-5 bg-white rounded-sm border-2 border-slate-300 border-l-4 transition-all hover:shadow-xl ${
        statusAccent[caseItem.status] || "border-l-slate-300"
      } ${selected ? "ring-2 ring-amber-900/30 border-amber-900/40" : ""}`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleSelect(); }}
        className="shrink-0 transition-colors"
      >
        {selected
          ? <CheckSquare className="h-5 w-5 text-amber-900" strokeWidth={2} />
          : <Square className="h-5 w-5 text-slate-300 hover:text-amber-900" strokeWidth={2} />}
      </button>

      <Link href={`/professional/cases/${caseItem.family_file_id}`} className="flex-1 min-w-0 flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-amber-900 to-amber-800 text-amber-50 rounded-sm shadow-md border border-amber-900/40 shrink-0">
          <Scale className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="serif font-bold text-slate-900 text-lg truncate leading-tight">
            {caseItem.family_file_number || `File ${caseItem.family_file_id.slice(0, 8).toUpperCase()}`}
          </p>
          <div className="flex items-center gap-2.5 mt-1 sans text-xs text-slate-600">
            <span className="font-medium">{representingLabels[caseItem.representing] || caseItem.representing}</span>
            {caseItem.firm_name && (
              <>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" strokeWidth={2} />
                  {caseItem.firm_name}
                </span>
              </>
            )}
          </div>
        </div>
      </Link>

      <div className="hidden md:block w-32 text-center">
        <span className="sans text-xs text-slate-700 font-semibold">
          {roleLabels[caseItem.assignment_role] || caseItem.assignment_role}
        </span>
      </div>

      <div className="hidden lg:flex w-28 justify-center">
        {caseItem.urgency ? (
          <Badge variant="outline" className={`sans text-xs font-bold ${URGENCY_COLORS[caseItem.urgency]}`}>
            {caseItem.urgency}
          </Badge>
        ) : (
          <span className="sans text-xs text-slate-300">—</span>
        )}
      </div>

      <div className="hidden sm:block w-28 text-center">
        <Badge className={`sans text-xs font-bold uppercase ${statusColors[caseItem.status] || statusColors.active}`}>
          {caseItem.status}
        </Badge>
      </div>

      <div className="hidden md:flex items-center gap-2 shrink-0">
        {caseItem.can_control_aria && (
          <div className="p-1.5 bg-purple-100 text-purple-700 rounded-sm border border-purple-900/20" title="ARIA Control">
            <Bot className="h-3.5 w-3.5" strokeWidth={2} />
          </div>
        )}
        {caseItem.can_message_client && (
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-sm border border-blue-900/20" title="Client Messaging">
            <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />
          </div>
        )}
        {caseItem.access_scopes?.includes("schedule") && (
          <div className="p-1.5 bg-amber-100 text-amber-700 rounded-sm border border-amber-900/20" title="Schedule Access">
            <Calendar className="h-3.5 w-3.5" strokeWidth={2} />
          </div>
        )}
      </div>

      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-600 transition-colors shrink-0" strokeWidth={2} />
    </div>
  );
}
