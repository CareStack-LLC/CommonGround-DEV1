"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Scale, Shield, Clock, AlertCircle, CheckCircle, Send, ArrowLeft, FileSearch } from "lucide-react";
import { useCourtAuth } from "../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CaseSearchResult {
  id: string;
  case_name: string;
  case_number?: string;
  state: string;
  county?: string;
  status: string;
}

type CourtRole =
  | 'court_clerk'
  | 'gal'
  | 'attorney_petitioner'
  | 'attorney_respondent'
  | 'mediator'
  | 'judge';

export default function RequestAccessPage() {
  const router = useRouter();
  const { professional, token, isLoading } = useCourtAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CaseSearchResult[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Request form
  const [requestRole, setRequestRole] = useState<CourtRole>("gal");
  const [authorizationType, setAuthorizationType] = useState<string>("appointment");
  const [authorizationRef, setAuthorizationRef] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setSelectedCase(null);

    try {
      // Search for cases - for MVP, we fetch all and filter client-side
      const response = await fetch(`${API_BASE}/court/cases`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const allCases = await response.json();
        // Filter by search query
        const filtered = allCases.filter((c: CaseSearchResult) =>
          c.case_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.case_number && c.case_number.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !professional) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // Create a professional access request
      // Note: In the real flow, this would create a pending grant that parents need to approve
      const response = await fetch(`${API_BASE}/court/access/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          case_id: selectedCase.id,
          role: requestRole,
          access_scope: ["agreement", "schedule", "compliance", "messages"],
          authorization_type: authorizationType,
          authorization_reference: authorizationRef || undefined,
          notes: notes || undefined,
        }),
      });

      if (response.ok) {
        setSubmitSuccess(true);
        // Reset form after short delay
        setTimeout(() => {
          router.push("/court-portal/dashboard");
        }, 2000);
      } else {
        const error = await response.json();
        setSubmitError(error.detail || "Failed to submit access request");
      }
    } catch (err: any) {
      console.error("Submit failed:", err);
      setSubmitError(err.message || "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      gal: "Guardian ad Litem (GAL)",
      attorney_petitioner: "Attorney (Petitioner)",
      attorney_respondent: "Attorney (Respondent)",
      mediator: "Mediator",
      court_clerk: "Court Clerk",
      judge: "Judge",
    };
    return labels[role] || role;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Link */}
      <Link href="/court-portal/dashboard">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileSearch className="h-6 w-6 text-indigo-600" />
          Request Case Access
        </h1>
        <p className="text-muted-foreground mt-1">
          Search for a case and request read-only access
        </p>
      </div>

      {/* Success State */}
      {submitSuccess && (
        <Alert className="bg-cg-success/10 border-cg-success/20">
          <CheckCircle className="h-4 w-4 text-cg-success" />
          <AlertDescription className="text-cg-success font-medium">
            Access request submitted successfully! The case participants will be notified.
            Redirecting to dashboard...
          </AlertDescription>
        </Alert>
      )}

      {!submitSuccess && (
        <>
          {/* Search Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                Find a Case
              </CardTitle>
              <CardDescription>
                Search by case name or case number
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="e.g., Smith v. Smith or FC-2025-00123"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
                  {isSearching ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </form>

              {/* Search Results */}
              {hasSearched && (
                <div className="mt-4">
                  {searchResults.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No cases found matching "{searchQuery}"</p>
                      <p className="text-xs mt-1">Try a different search term</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground mb-2">
                        {searchResults.length} case{searchResults.length !== 1 ? 's' : ''} found
                      </p>
                      {searchResults.map((caseItem) => (
                        <button
                          key={caseItem.id}
                          onClick={() => setSelectedCase(caseItem)}
                          className={`w-full text-left p-4 border rounded-lg transition-all ${
                            selectedCase?.id === caseItem.id
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-border hover:border-indigo-300 hover:bg-secondary/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-foreground">{caseItem.case_name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {caseItem.case_number && `Case #${caseItem.case_number} • `}
                                {caseItem.county && `${caseItem.county}, `}{caseItem.state}
                              </p>
                            </div>
                            <Badge variant={caseItem.status === 'active' ? 'success' : 'secondary'}>
                              {caseItem.status}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Form - Only show when case is selected */}
          {selectedCase && (
            <Card className="border-indigo-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-indigo-600" />
                  Request Access to {selectedCase.case_name}
                </CardTitle>
                <CardDescription>
                  Submit your request for review by the case participants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitRequest} className="space-y-4">
                  {/* Role */}
                  <div>
                    <Label htmlFor="role">Your Role</Label>
                    <select
                      id="role"
                      value={requestRole}
                      onChange={(e) => setRequestRole(e.target.value as CourtRole)}
                      className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="gal">Guardian ad Litem (GAL)</option>
                      <option value="attorney_petitioner">Attorney (Petitioner)</option>
                      <option value="attorney_respondent">Attorney (Respondent)</option>
                      <option value="mediator">Mediator</option>
                      <option value="court_clerk">Court Clerk</option>
                      <option value="judge">Judge</option>
                    </select>
                  </div>

                  {/* Authorization Type */}
                  <div>
                    <Label htmlFor="authType">Authorization Type</Label>
                    <select
                      id="authType"
                      value={authorizationType}
                      onChange={(e) => setAuthorizationType(e.target.value)}
                      className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="appointment">Court Appointment</option>
                      <option value="court_order">Court Order</option>
                      <option value="representation">Legal Representation</option>
                      <option value="parental_consent">Parental Consent</option>
                    </select>
                  </div>

                  {/* Authorization Reference */}
                  <div>
                    <Label htmlFor="authRef">Reference Number (optional)</Label>
                    <Input
                      id="authRef"
                      placeholder="e.g., Court order number or bar number"
                      value={authorizationRef}
                      onChange={(e) => setAuthorizationRef(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <textarea
                      id="notes"
                      placeholder="Any additional information for the case participants..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  {submitError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  )}

                  {/* Info box */}
                  <div className="p-3 bg-indigo-50 rounded-lg text-sm text-indigo-800">
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">What happens next?</p>
                        <ul className="mt-1 text-indigo-700 text-xs space-y-1">
                          <li>• Your request will be sent to the case participants</li>
                          <li>• For GAL/Mediator roles, both parents must approve</li>
                          <li>• Attorney roles need approval from the represented party</li>
                          <li>• You'll be notified when access is granted</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedCase(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Request
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Info Section */}
          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-indigo-600 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">About Access Requests</p>
                  <ul className="mt-2 space-y-1.5">
                    <li>• Access is read-only and time-limited based on your role</li>
                    <li>• All case views and downloads are logged and audited</li>
                    <li>• Exports are watermarked with your identity</li>
                    <li>• Access can be revoked at any time by case participants</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
