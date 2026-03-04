"use client";

import { useState, useEffect } from "react";
import { useProfessionalAuth } from "../layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus,
  Check,
  X,
  Clock,
  Users,
  FileText,
  Calendar,
  AlertCircle,
  Shield,
  Eye,
  MessageSquare,
  DollarSign,
  CalendarDays,
  Gavel,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SCOPE_ICONS: Record<string, any> = {
  messages: MessageSquare,
  schedule: CalendarDays,
  agreement: FileText,
  compliance: Shield,
  interventions: Eye,
  financials: DollarSign,
};

const SCOPE_LABELS: Record<string, string> = {
  messages: "View Messages",
  schedule: "View Schedule",
  agreement: "View Agreement",
  compliance: "View Compliance",
  interventions: "View ARIA Interventions",
  financials: "View Financials",
};

interface AccessRequest {
  id: string;
  family_file_id: string;
  professional_id: string | null;
  professional_email: string | null;
  firm_id: string | null;
  requested_by: "parent" | "professional";
  requested_by_user_id: string;
  requested_scopes: string[];
  status: "pending" | "approved" | "declined" | "expired";
  parent_a_approved: boolean;
  parent_b_approved: boolean;
  parent_a_approved_at: string | null;
  parent_b_approved_at: string | null;
  approved_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  expires_at: string | null;
  created_at: string;
  // Enriched fields
  family_name?: string;
  parent_a_name?: string;
  parent_b_name?: string;
  children_count?: number;
  case_type?: string;
}

export default function AccessRequestsPage() {
  const { token, profile } = useProfessionalAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (token) {
      fetchRequests();
    }
  }, [token]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/professional/access-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (err) {
      console.error("Error fetching access requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/access-requests/${requestId}/accept`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        toast({
          title: "Invitation accepted",
          description: "You now have access to this case.",
        });
        fetchRequests();
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Failed to accept invitation");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to accept invitation.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/access-requests/${selectedRequest.id}/decline`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: declineReason }),
        }
      );
      if (response.ok) {
        toast({
          title: "Invitation declined",
          description: "The invitation has been declined.",
        });
        setShowDeclineDialog(false);
        setSelectedRequest(null);
        setDeclineReason("");
        fetchRequests();
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Failed to decline invitation");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to decline invitation.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter((r) => r.status !== "pending");

  const formatTimeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "—";
    }
  };

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const expires = new Date(expiresAt);
    const now = new Date();
    const hoursRemaining = (expires.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursRemaining > 0 && hoursRemaining < 24;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <link
        href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Outfit:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div className="relative overflow-hidden rounded-sm bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 px-8 py-8 shadow-2xl border-2 border-amber-900/40 mb-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />
        <div className="flex items-start gap-5">
          <div className="p-4 bg-amber-50 border-2 border-amber-900/20 rounded-sm shadow-xl shrink-0">
            <UserPlus className="h-8 w-8 text-amber-900" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="serif text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
              Access Requests
            </h1>
            <p className="sans text-sm text-amber-100 mt-2">
              Review and respond to case access invitations from parents
            </p>
          </div>
        </div>
      </div>

      {/* Pending Requests */}
      <div className="mb-8">
        <h2 className="serif text-lg font-bold flex items-center gap-2 mb-4 text-slate-900">
          <Clock className="h-5 w-5 text-amber-900" />
          Pending Invitations
          {pendingRequests.length > 0 && (
            <Badge className="bg-amber-50 text-amber-900 border-2 border-amber-900/30 sans font-semibold">{pendingRequests.length}</Badge>
          )}
        </h2>

        {pendingRequests.length === 0 ? (
          <Card className="border-2 border-amber-900/30 bg-gradient-to-br from-white via-amber-50/20 to-white shadow-sm relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
            <CardContent className="p-8 text-center">
              <Check className="h-12 w-12 mx-auto text-emerald-900 mb-4" />
              <h3 className="serif text-lg font-bold mb-2 text-slate-900">All Caught Up</h3>
              <p className="sans text-slate-600">You have no pending invitations to review.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <Card
                key={request.id}
                className={`border-2 border-l-4 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-lg relative ${
                  isExpiringSoon(request.expires_at)
                    ? "border-l-amber-500 border-amber-900/40"
                    : "border-l-blue-500 border-amber-900/30"
                }`}
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="serif font-bold text-lg text-slate-900">
                          {request.family_name || "Family Case"}
                        </h3>
                        {isExpiringSoon(request.expires_at) && (
                          <Badge className="bg-amber-50 text-amber-900 border-2 border-amber-900/30 sans">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Expires soon
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>
                            {request.parent_a_name} & {request.parent_b_name}
                          </span>
                        </div>
                        {request.children_count && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="h-4 w-4" />
                            <span>
                              {request.children_count} child{request.children_count !== 1 ? "ren" : ""}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Invited {formatTimeAgo(request.created_at)}</span>
                        </div>
                        {request.case_type && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Gavel className="h-4 w-4" />
                            <span>{request.case_type}</span>
                          </div>
                        )}
                      </div>

                      {/* Requested Scopes */}
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Access Requested:</p>
                        <div className="flex flex-wrap gap-2">
                          {request.requested_scopes.map((scope) => {
                            const Icon = SCOPE_ICONS[scope] || Shield;
                            return (
                              <Badge key={scope} variant="outline" className="flex items-center gap-1">
                                <Icon className="h-3 w-3" />
                                {SCOPE_LABELS[scope] || scope}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      {/* Parent Approval Status */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          {request.parent_a_approved ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-gray-400" />
                          )}
                          <span className={request.parent_a_approved ? "text-green-700" : "text-gray-500"}>
                            Parent A {request.parent_a_approved ? "approved" : "pending"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {request.parent_b_approved ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-gray-400" />
                          )}
                          <span className={request.parent_b_approved ? "text-green-700" : "text-gray-500"}>
                            Parent B {request.parent_b_approved ? "approved" : "pending"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        onClick={() => handleAccept(request.id)}
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDeclineDialog(true);
                        }}
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-gray-500" />
            History
          </h2>
          <div className="space-y-3">
            {processedRequests.slice(0, 10).map((request) => (
              <Card key={request.id} className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{request.family_name || "Family Case"}</p>
                      <p className="text-sm text-gray-500">
                        {request.status === "approved"
                          ? `Accepted ${formatTimeAgo(request.approved_at!)}`
                          : request.status === "declined"
                          ? `Declined ${formatTimeAgo(request.declined_at!)}`
                          : `Expired`}
                      </p>
                    </div>
                    <Badge
                      className={
                        request.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : request.status === "declined"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {request.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Invitation</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this case access request. This will be
              shared with the parents.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="decline-reason">Reason (optional)</Label>
            <Textarea
              id="decline-reason"
              placeholder="e.g., Conflict of interest, Not accepting new cases, etc."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeclineDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={isProcessing}
            >
              {isProcessing ? "Declining..." : "Decline Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
