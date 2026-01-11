"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Copy, Send, CheckCircle, Clock, AlertCircle, FileText, MessageSquare, Loader2, Eye, RefreshCw } from "lucide-react";
import { useCourtAuth } from "../../../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectOption } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface IntakeSession {
  id: string;
  session_number: string;
  case_id: string;
  parent_id: string;
  target_forms: string[];
  status: string;
  message_count: number;
  parent_confirmed: boolean;
  professional_reviewed: boolean;
  clarification_requested: boolean;
  access_link_expires_at: string;
  created_at: string;
  intake_link?: string;
  aria_summary?: string;
  extracted_data?: Record<string, unknown>;
}

interface CaseParent {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function IntakeManagementPage() {
  const params = useParams();
  const router = useRouter();
  const { professional, token, isLoading } = useCourtAuth();
  const caseId = params.id as string;

  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [parents, setParents] = useState<CaseParent[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New session form
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedParent, setSelectedParent] = useState<string>("");
  const [selectedForms, setSelectedForms] = useState<string[]>(["FL-311"]);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [creating, setCreating] = useState(false);
  const [newSessionLink, setNewSessionLink] = useState<string | null>(null);

  // Selected session for detail view
  const [selectedSession, setSelectedSession] = useState<IntakeSession | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    if (professional && caseId) {
      loadData();
    }
  }, [professional, caseId]);

  const loadData = async () => {
    try {
      setLoadingSessions(true);
      setError(null);

      // Load sessions and case info in parallel
      const [sessionsResponse, caseResponse] = await Promise.all([
        fetch(`${API_BASE}/intake/sessions?case_id=${caseId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
        fetch(`${API_BASE}/court/cases`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      ]);

      if (sessionsResponse.ok) {
        const data = await sessionsResponse.json();
        setSessions(data.items || []);
      }

      if (caseResponse.ok) {
        const cases = await caseResponse.json();
        const foundCase = cases.find((c: { id: string }) => c.id === caseId);
        if (foundCase) {
          // Create parent list from case participants
          const parentList: CaseParent[] = [];
          if (foundCase.petitioner_id) {
            parentList.push({
              id: foundCase.petitioner_id,
              name: foundCase.petitioner_name || "Petitioner",
              email: foundCase.petitioner_email || "",
              role: "petitioner"
            });
          }
          if (foundCase.respondent_id) {
            parentList.push({
              id: foundCase.respondent_id,
              name: foundCase.respondent_name || "Respondent",
              email: foundCase.respondent_email || "",
              role: "respondent"
            });
          }
          setParents(parentList);
        }
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load intake sessions");
    } finally {
      setLoadingSessions(false);
    }
  };

  const createSession = async () => {
    if (!selectedParent || selectedForms.length === 0) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/intake/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          case_id: caseId,
          parent_id: selectedParent,
          target_forms: selectedForms,
          expires_in_days: expiresInDays,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Failed to create intake session");
        return;
      }

      setNewSessionLink(data.intake_link);
      loadData();
    } catch (err) {
      setError("Failed to create intake session");
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      alert("Link copied to clipboard!");
    } catch {
      alert("Failed to copy link");
    }
  };

  const viewSessionDetail = async (sessionId: string) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`${API_BASE}/intake/sessions/${sessionId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedSession(data);
      }
    } catch (err) {
      console.error("Failed to load session detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const toggleForm = (form: string) => {
    setSelectedForms(prev =>
      prev.includes(form)
        ? prev.filter(f => f !== form)
        : [...prev, form]
    );
  };

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/court-portal/cases/${caseId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Case
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">ARIA Paralegal</h1>
            <p className="text-muted-foreground">Send intake requests to parents</p>
          </div>
        </div>
        <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Intake Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Intake Request</DialogTitle>
              <DialogDescription>
                ARIA will conduct a conversational interview with the parent to gather information for court forms.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Parent</Label>
                <Select
                  value={selectedParent}
                  onChange={(e) => setSelectedParent(e.target.value)}
                >
                  <SelectOption value="">Choose parent...</SelectOption>
                  {parents.map((parent) => (
                    <SelectOption key={parent.id} value={parent.id}>
                      {parent.name} ({parent.role})
                    </SelectOption>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Forms</Label>
                <div className="flex flex-wrap gap-2">
                  {["FL-300", "FL-311", "FL-320"].map((form) => (
                    <Badge
                      key={form}
                      variant={selectedForms.includes(form) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleForm(form)}
                    >
                      {form}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  FL-311 (Custody Application) is recommended for most intakes
                </p>
              </div>

              <div className="space-y-2">
                <Label>Link Expires In</Label>
                <Select
                  value={String(expiresInDays)}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                >
                  <SelectOption value="3">3 days</SelectOption>
                  <SelectOption value="7">7 days</SelectOption>
                  <SelectOption value="14">14 days</SelectOption>
                  <SelectOption value="30">30 days</SelectOption>
                </Select>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {newSessionLink ? (
                <div className="space-y-3">
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Intake session created! Send this link to the parent:
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-2">
                    <Input value={newSessionLink} readOnly className="text-sm" />
                    <Button size="sm" onClick={() => copyLink(newSessionLink)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setNewSessionLink(null);
                      setShowNewForm(false);
                      setSelectedParent("");
                    }}
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={createSession}
                  disabled={!selectedParent || selectedForms.length === 0 || creating}
                  className="w-full"
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Create Intake Link
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Banner */}
      <Alert className="bg-blue-50 border-blue-200">
        <MessageSquare className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>How it works:</strong> Create an intake link, send it to the parent, and ARIA will conduct
          a conversational interview. No confusing forms - just natural conversation that gets organized into
          court documents.
        </AlertDescription>
      </Alert>

      {/* Sessions List */}
      {loadingSessions ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Intake Sessions</h3>
            <p className="text-muted-foreground mb-4">
              Create an intake request to get started
            </p>
            <Button onClick={() => setShowNewForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Intake Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{session.session_number}</span>
                      <StatusBadge status={session.status} />
                      {session.parent_confirmed && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Confirmed
                        </Badge>
                      )}
                      {session.clarification_requested && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Clarification Needed
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {session.target_forms.join(", ")}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {session.message_count} messages
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Expires {new Date(session.access_link_expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewSessionDetail(session.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Session Detail Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          {loadingDetail ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedSession.session_number}
                  <StatusBadge status={selectedSession.status} />
                </DialogTitle>
                <DialogDescription>
                  {selectedSession.target_forms.join(", ")} • {selectedSession.message_count} messages
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Status Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Parent Confirmed</Label>
                    <p>{selectedSession.parent_confirmed ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Professional Reviewed</Label>
                    <p>{selectedSession.professional_reviewed ? "Yes" : "No"}</p>
                  </div>
                </div>

                {/* ARIA Summary */}
                {selectedSession.aria_summary && (
                  <div className="space-y-2">
                    <Label>ARIA Summary</Label>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {selectedSession.aria_summary}
                    </div>
                  </div>
                )}

                {/* Extracted Data */}
                {selectedSession.extracted_data && Object.keys(selectedSession.extracted_data).length > 0 && (
                  <div className="space-y-2">
                    <Label>Extracted Form Data</Label>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm max-h-48 overflow-y-auto">
                      <pre className="text-xs">
                        {JSON.stringify(selectedSession.extracted_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link href={`/court-portal/cases/${caseId}/intake/${selectedSession.id}/transcript`}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      View Transcript
                    </Link>
                  </Button>
                  {selectedSession.intake_link && !selectedSession.parent_confirmed && (
                    <Button
                      variant="outline"
                      onClick={() => copyLink(selectedSession.intake_link!)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className: string }> = {
    pending: { label: "Pending", variant: "secondary", className: "bg-gray-100 text-gray-700" },
    in_progress: { label: "In Progress", variant: "default", className: "bg-blue-100 text-blue-700" },
    completed: { label: "Completed", variant: "default", className: "bg-green-100 text-green-700" },
    expired: { label: "Expired", variant: "destructive", className: "bg-red-100 text-red-700" },
    cancelled: { label: "Cancelled", variant: "secondary", className: "bg-gray-100 text-gray-500" },
  };

  const cfg = config[status] || { label: status, variant: "secondary" as const, className: "" };

  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}
