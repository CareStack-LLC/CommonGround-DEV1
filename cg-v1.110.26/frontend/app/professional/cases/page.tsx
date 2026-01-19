"use client";

import { useState, useEffect } from "react";
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
import { useProfessionalAuth } from "../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
}

export default function CasesListPage() {
  const { token, activeFirm } = useProfessionalAuth();
  const [cases, setCases] = useState<CaseAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    fetchCases();
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
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCases(data);
      }
    } catch (error) {
      console.error("Error fetching cases:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter cases by search query and role
  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.family_file_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.assignment_role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || c.assignment_role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleLabels: Record<string, string> = {
    lead_attorney: "Lead Attorney",
    associate: "Associate",
    paralegal: "Paralegal",
    mediator: "Mediator",
    parenting_coordinator: "Parenting Coordinator",
    intake_coordinator: "Intake Coordinator",
  };

  const representingLabels: Record<string, string> = {
    parent_a: "Petitioner",
    parent_b: "Respondent",
    both: "Both Parties",
    court: "Court",
  };

  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    on_hold: "bg-amber-100 text-amber-800",
    completed: "bg-blue-100 text-blue-800",
    withdrawn: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cases</h1>
          <p className="text-muted-foreground">
            {cases.length} total case{cases.length !== 1 && "s"} assigned
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by file number or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Role" />
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
          </div>
        </CardContent>
      </Card>

      {/* Cases List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : filteredCases.length > 0 ? (
        <div className="space-y-3">
          {filteredCases.map((caseItem) => (
            <CaseCard key={caseItem.id} caseItem={caseItem} roleLabels={roleLabels} representingLabels={representingLabels} statusColors={statusColors} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No cases found</h3>
            <p className="text-muted-foreground">
              {searchQuery || roleFilter !== "all"
                ? "Try adjusting your filters"
                : "You don't have any assigned cases yet"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Case Card Component
function CaseCard({
  caseItem,
  roleLabels,
  representingLabels,
  statusColors,
}: {
  caseItem: CaseAssignment;
  roleLabels: Record<string, string>;
  representingLabels: Record<string, string>;
  statusColors: Record<string, string>;
}) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Link href={`/professional/cases/${caseItem.family_file_id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                <FolderOpen className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    {caseItem.family_file_number || `Case ${caseItem.family_file_id.slice(0, 8)}`}
                  </h3>
                  <Badge className={statusColors[caseItem.status] || statusColors.active}>
                    {caseItem.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {representingLabels[caseItem.representing] || caseItem.representing}
                  </span>
                  <span>|</span>
                  <span>{roleLabels[caseItem.assignment_role] || caseItem.assignment_role}</span>
                  {caseItem.firm_name && (
                    <>
                      <span>|</span>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {caseItem.firm_name}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Scope Indicators */}
              <div className="hidden md:flex items-center gap-2">
                {caseItem.can_control_aria && (
                  <div
                    className="p-1.5 bg-purple-100 text-purple-600 rounded"
                    title="ARIA Control"
                  >
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                {caseItem.can_message_client && (
                  <div
                    className="p-1.5 bg-blue-100 text-blue-600 rounded"
                    title="Client Messaging"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </div>
                )}
                {caseItem.access_scopes?.includes("schedule") && (
                  <div
                    className="p-1.5 bg-amber-100 text-amber-600 rounded"
                    title="Schedule Access"
                  >
                    <Calendar className="h-4 w-4" />
                  </div>
                )}
              </div>

              <div className="text-right hidden sm:block">
                <p className="text-xs text-muted-foreground">Assigned</p>
                <p className="text-sm font-medium">{formatDate(caseItem.assigned_at)}</p>
              </div>

              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
