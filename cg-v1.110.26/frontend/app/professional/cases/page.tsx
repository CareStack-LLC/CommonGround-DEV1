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
  // Optional enriched fields
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

// Built-in quick views that match the spec
const SYSTEM_VIEWS: SavedView[] = [
  { id: "my_cases", name: "My Cases", filters: { status: "active" } },
  { id: "urgent", name: "Urgent", filters: { urgency: "urgent" } },
  { id: "dv_flagged", name: "DV Flagged", filters: { aria_risk: "high" } },
  { id: "court_week", name: "Court This Week", filters: { court_date: "7" } },
];

const URGENCY_COLORS: Record<string, string> = {
  urgent: "text-red-600 bg-red-50 border-red-200",
  high: "text-orange-600 bg-orange-50 border-orange-200",
  medium: "text-blue-600 bg-blue-50 border-blue-200",
  low: "text-slate-500 bg-slate-50 border-slate-200",
};

const RISK_ICONS: Record<string, React.JSX.Element> = {
  high: <AlertCircle className="h-4 w-4 text-red-500" />,
  medium: <Zap className="h-4 w-4 text-amber-500" />,
  low: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
};

export default function CasesListPage() {
  const { token, activeFirm } = useProfessionalAuth();
  const { toast } = useToast();
  const [cases, setCases] = useState<CaseAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [roleFilter, setRoleFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [activeViewId, setActiveViewId] = useState<string | null>("sys_my_cases");
  const [sortBy, setSortBy] = useState<"assigned_at" | "next_court_date" | "compliance_score">("assigned_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination
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

  // Apply a saved view's filters
  const applyView = (filters: Record<string, string>, viewId: string) => {
    setActiveViewId(viewId);
    if (filters.status) setStatusFilter(filters.status);
    else setStatusFilter("all");
    if (filters.urgency) setUrgencyFilter(filters.urgency);
    else setUrgencyFilter("all");
    setPage(1);
  };

  // Current filters for saving
  const currentFilters: Record<string, string> = {
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(urgencyFilter !== "all" ? { urgency: urgencyFilter } : {}),
    ...(roleFilter !== "all" ? { role: roleFilter } : {}),
  };

  // Filtered + sorted cases
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

    // Sort
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

  // Multi-select helpers
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
        fetchCases(); // Refresh
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
    active: "bg-teal-100 text-teal-800 border border-teal-200",
    on_hold: "bg-amber-100 text-amber-800 border border-amber-200",
    completed: "bg-blue-100 text-blue-800 border border-blue-200",
    withdrawn: "bg-slate-100 text-slate-600 border border-slate-200",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-xl shadow-lg shadow-teal-500/20">
              <FolderOpen className="h-6 w-6" />
            </div>
            Cases
          </h1>
          <p className="text-slate-500 mt-1">
            {isLoading ? "Loading..." : `${filteredCases.length} case${filteredCases.length !== 1 ? "s" : ""} matching filters`}
          </p>
        </div>
        <Link href="/professional/cases/new">
          <Button className="bg-[var(--portal-primary)] hover:bg-[var(--portal-primary-hover)] text-white gap-2">
            <FolderOpen className="h-4 w-4" />
            New Case
          </Button>
        </Link>
      </div>

      {/* Saved Views (now DB-backed) */}
      {token && (
        <SavedViews
          token={token}
          activeFilters={currentFilters}
          onApplyView={applyView}
          activeViewId={activeViewId}
        />
      )}

      {/* Filter Bar */}
      <Card className="border-slate-200">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by file number, name, or firm..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9 border-slate-200 focus:border-teal-500 focus:ring-teal-500"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36 border-slate-200">
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
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
              <SelectTrigger className="w-full sm:w-36 border-slate-200">
                <Zap className="h-4 w-4 mr-2 text-slate-400" />
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
              <SelectTrigger className="w-full sm:w-44 border-slate-200">
                <Users className="h-4 w-4 mr-2 text-slate-400" />
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
            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-slate-200">
                  <ArrowUpDown className="h-4 w-4 text-slate-400" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
        <div className="flex items-center gap-3 px-4 py-3 bg-[var(--portal-primary)]/5 border border-[var(--portal-primary)]/20 rounded-xl">
          <span className="text-sm font-semibold text-[var(--portal-primary)]">
            {selectedIds.size} case{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="h-4 w-px bg-slate-200" />
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => bulkAction("assign")}>
            <Users className="h-3.5 w-3.5" />
            Assign
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => bulkAction("tag")}>
            <Tag className="h-3.5 w-3.5" />
            Tag
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => bulkAction("export")}>
            <FolderOpen className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-slate-500" onClick={() => bulkAction("archive")}>
            <Archive className="h-3.5 w-3.5" />
            Archive
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-slate-500" onClick={() => bulkAction("status", { status: "on_hold" })}>
            Hold
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto text-slate-400 hover:text-slate-600" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Cases Table Header */}
      {!isLoading && pagedCases.length > 0 && (
        <div className="flex items-center gap-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
          <button onClick={toggleAll} className="shrink-0">
            {allSelected
              ? <CheckSquare className="h-4 w-4 text-[var(--portal-primary)]" />
              : <Square className="h-4 w-4 text-slate-300" />}
          </button>
          <span className="flex-1">Case / File</span>
          <span className="hidden md:block w-28 text-center">Role</span>
          <span className="hidden lg:block w-28 text-center">Urgency</span>
          <span className="hidden sm:block w-24 text-center">Status</span>
          <span className="w-4" />
        </div>
      )}

      {/* Cases List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : pagedCases.length > 0 ? (
        <div className="space-y-2">
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
        <Card className="border-slate-200 border-dashed bg-slate-50/50">
          <CardContent className="py-16 text-center">
            <div className="p-4 bg-gradient-to-br from-teal-100 to-teal-200 rounded-2xl w-fit mx-auto mb-6">
              <FolderOpen className="h-10 w-10 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No cases found</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              {searchQuery || urgencyFilter !== "all" || roleFilter !== "all"
                ? "Try adjusting your filters"
                : "You don't have any assigned cases yet"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-slate-600 font-medium">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Case Row with checkbox
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
    active: "border-l-teal-500",
    on_hold: "border-l-amber-500",
    completed: "border-l-blue-500",
    withdrawn: "border-l-slate-300",
  };

  return (
    <div
      className={`group flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 border-l-4 transition-all hover:shadow-md ${statusAccent[caseItem.status] || "border-l-slate-200"
        } ${selected ? "ring-2 ring-[var(--portal-primary)]/30 border-[var(--portal-primary)]/20" : ""}`}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleSelect(); }}
        className="shrink-0 text-slate-300 hover:text-[var(--portal-primary)] transition-colors"
      >
        {selected
          ? <CheckSquare className="h-4 w-4 text-[var(--portal-primary)]" />
          : <Square className="h-4 w-4" />}
      </button>

      {/* Main Info */}
      <Link href={`/professional/cases/${caseItem.family_file_id}`} className="flex-1 min-w-0 flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-xl shadow-sm shadow-teal-500/20 shrink-0">
          <FolderOpen className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">
            {caseItem.family_file_number || `Case ${caseItem.family_file_id.slice(0, 8).toUpperCase()}`}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
            <span>{representingLabels[caseItem.representing] || caseItem.representing}</span>
            {caseItem.firm_name && (
              <>
                <span className="text-slate-300">·</span>
                <span className="flex items-center gap-0.5">
                  <Building2 className="h-3 w-3" />
                  {caseItem.firm_name}
                </span>
              </>
            )}
          </div>
        </div>
      </Link>

      {/* Role */}
      <div className="hidden md:block w-28 text-center">
        <span className="text-xs text-slate-600 font-medium">
          {roleLabels[caseItem.assignment_role] || caseItem.assignment_role}
        </span>
      </div>

      {/* Urgency */}
      <div className="hidden lg:flex w-28 justify-center">
        {caseItem.urgency ? (
          <Badge variant="outline" className={`text-xs border ${URGENCY_COLORS[caseItem.urgency]}`}>
            {caseItem.urgency}
          </Badge>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </div>

      {/* Status */}
      <div className="hidden sm:block w-24 text-center">
        <Badge className={`text-xs ${statusColors[caseItem.status] || statusColors.active}`}>
          {caseItem.status}
        </Badge>
      </div>

      {/* Scope Icons */}
      <div className="hidden md:flex items-center gap-1.5 shrink-0">
        {caseItem.can_control_aria && (
          <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg" title="ARIA Control">
            <Bot className="h-3.5 w-3.5" />
          </div>
        )}
        {caseItem.can_message_client && (
          <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg" title="Client Messaging">
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
        )}
        {caseItem.access_scopes?.includes("schedule") && (
          <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg" title="Schedule Access">
            <Calendar className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
    </div>
  );
}


