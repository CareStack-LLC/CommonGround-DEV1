"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCourtAuth } from "../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FolderOpen, AlertCircle, Plus, FileText, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CourtCase {
  id: string;
  case_name: string;
  case_number?: string;
  state: string;
  county?: string;
  status: string;
  grant?: {
    role: string;
    status: string;
    days_remaining: number;
    access_count: number;
  };
  quick_stats?: {
    compliance_gap: number;
    flagged_messages: number;
    upcoming_events: number;
  };
}

export default function CasesListPage() {
  const router = useRouter();
  const { professional, token, setActiveGrant, isLoading } = useCourtAuth();
  const [cases, setCases] = useState<CourtCase[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    if (professional && token) {
      loadCases();
    }
  }, [professional, token]);

  const loadCases = async () => {
    try {
      setIsLoadingCases(true);
      setError(null);

      const response = await fetch(`${API_BASE}/court/cases`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error("Failed to load cases");
      }

      const data = await response.json();

      // Transform the API response to match our interface
      const transformedCases = data.map((c: any) => ({
        id: c.id,
        case_name: c.case_name,
        case_number: c.case_number,
        state: c.state,
        county: c.county,
        status: c.status,
        grant: {
          role: professional?.role || "court_clerk",
          status: "active",
          days_remaining: 90,
          access_count: 1,
        },
        quick_stats: {
          compliance_gap: 0,
          flagged_messages: 0,
          upcoming_events: 0,
        },
      }));

      setCases(transformedCases);
    } catch (err) {
      console.error("Failed to load cases:", err);
      setError("Failed to load cases. Please try again.");
    } finally {
      setIsLoadingCases(false);
    }
  };

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto" />
      </div>
    );
  }

  if (isLoadingCases) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading cases...</p>
        </div>
      </div>
    );
  }

  const filteredCases = cases.filter(
    (c) =>
      c.case_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.case_number || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roleLabels: Record<string, string> = {
    gal: "Guardian ad Litem",
    attorney_petitioner: "Attorney (Petitioner)",
    attorney_respondent: "Attorney (Respondent)",
    mediator: "Mediator",
    court_clerk: "Court Clerk",
    judge: "Judge",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cases</h1>
          <p className="text-slate-600">Your active case access grants</p>
        </div>
        <Link href="/court-portal/cases/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Button>
        </Link>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search cases..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Cases Grid */}
      <div className="grid gap-4">
        {filteredCases.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No cases found matching your search" : "No cases with access grants found"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCases.map((caseItem) => (
            <Link key={caseItem.id} href={`/court-portal/cases/${caseItem.id}`}>
              <Card className="hover:bg-secondary/50 transition cursor-pointer border-indigo-100">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-foreground text-lg">
                          {caseItem.case_name}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          caseItem.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {caseItem.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {caseItem.case_number && `Case #${caseItem.case_number} | `}
                        {caseItem.county && `${caseItem.county} County, `}{caseItem.state}
                      </div>
                      {caseItem.grant && (
                        <div className="flex items-center space-x-4 mt-3">
                          <span className="text-sm text-muted-foreground">
                            Role: <strong className="text-foreground">{roleLabels[caseItem.grant.role] || caseItem.grant.role}</strong>
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Accessed: {caseItem.grant.access_count} times
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right space-y-2">
                      {caseItem.grant && (
                        <div className={`text-sm font-medium ${
                          caseItem.grant.days_remaining <= 7 ? "text-orange-600" : "text-muted-foreground"
                        }`}>
                          {caseItem.grant.days_remaining} days remaining
                        </div>
                      )}
                      {caseItem.quick_stats && (
                        <div className="flex space-x-3 text-xs">
                          {caseItem.quick_stats.compliance_gap > 10 && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                              Compliance gap: {caseItem.quick_stats.compliance_gap}%
                            </span>
                          )}
                          {caseItem.quick_stats.flagged_messages > 20 && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                              {caseItem.quick_stats.flagged_messages} flags
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Access Info */}
      <Card className="bg-slate-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <span className="text-xl">ℹ️</span>
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-700">About Case Access</p>
              <p className="mt-1">
                You can only view cases where you have been granted access by case participants or court order.
                Access is time-limited based on your role and all actions are logged.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
