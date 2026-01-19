"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Search,
  Filter,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronRight,
  Calendar,
  User,
  Users,
  Bot,
  RefreshCw,
  MoreVertical,
  Eye,
  Send,
  Trash2,
  Building2,
  MapPin,
  Baby,
  Shield,
  UserPlus,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProfessionalAuth } from "../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface IntakeSession {
  id: string;
  client_name: string;
  client_email: string;
  status: string;
  intake_type: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  message_count: number;
  has_summary: boolean;
  family_file_id?: string;
  case_assignment_id?: string;
}

interface FirmInvitation {
  id: string;
  family_file_id: string;
  family_file_number: string | null;
  family_file_title: string | null;
  state: string | null;
  county: string | null;
  children_count: number;
  parent_a_name: string | null;
  parent_b_name: string | null;
  requested_by_user_id: string;
  requested_scopes: string[];
  requested_role: string | null;
  representing: string | null;
  message: string | null;
  status: string;
  parent_a_approved: boolean;
  parent_b_approved: boolean;
  parent_a_approved_at: string | null;
  parent_b_approved_at: string | null;
  professional_id: string | null;
  case_assignment_id: string | null;
  created_at: string;
  expires_at: string | null;
}

interface FirmMember {
  id: string;
  user_id: string;
  display_name: string;
  role: string;
  specializations: string[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    color: "bg-amber-100 text-amber-800",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-800",
    icon: <Bot className="h-3.5 w-3.5" />,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-100 text-emerald-800",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  reviewed: {
    label: "Reviewed",
    color: "bg-purple-100 text-purple-800",
    icon: <Eye className="h-3.5 w-3.5" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-800",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

export default function IntakeCenterPage() {
  const { token, activeFirm } = useProfessionalAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab state from URL
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"intakes" | "invitations">(
    tabFromUrl === "invitations" ? "invitations" : "intakes"
  );

  // Intake state
  const [intakes, setIntakes] = useState<IntakeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewIntakeDialog, setShowNewIntakeDialog] = useState(false);

  // Firm invitation state
  const [invitations, setInvitations] = useState<FirmInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationFilter, setInvitationFilter] = useState("pending");

  // Update URL when tab changes
  const handleTabChange = (tab: "intakes" | "invitations") => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams.toString());
    if (tab === "invitations") {
      newParams.set("tab", "invitations");
    } else {
      newParams.delete("tab");
    }
    router.replace(`/professional/intake?${newParams.toString()}`);
  };

  useEffect(() => {
    if (activeTab === "intakes") {
      fetchIntakes();
    } else {
      fetchInvitations();
    }
  }, [token, activeFirm, statusFilter, activeTab, invitationFilter]);

  const fetchIntakes = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (activeFirm) params.append("firm_id", activeFirm.id);

      const response = await fetch(
        `${API_BASE}/api/v1/professional/intake/sessions?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setIntakes(data.items || data || []);
      }
    } catch (error) {
      console.error("Error fetching intakes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvitations = async () => {
    if (!token || !activeFirm) {
      setInvitations([]);
      setInvitationsLoading(false);
      return;
    }

    setInvitationsLoading(true);
    try {
      const params = new URLSearchParams();
      if (invitationFilter !== "all") params.append("status", invitationFilter);

      const response = await fetch(
        `${API_BASE}/api/v1/professional/firms/${activeFirm.id}/invitations?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setInvitations(data || []);
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setInvitationsLoading(false);
    }
  };

  const filteredIntakes = intakes.filter(
    (intake) =>
      !searchQuery ||
      intake.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intake.client_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInvitations = invitations.filter(
    (inv) =>
      !searchQuery ||
      inv.parent_a_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.parent_b_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.family_file_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 7) return formatDate(dateStr);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  // Stats for intakes
  const intakeStats = {
    total: intakes.length,
    pending: intakes.filter((i) => i.status === "pending").length,
    inProgress: intakes.filter((i) => i.status === "in_progress").length,
    completed: intakes.filter((i) => i.status === "completed").length,
    needsReview: intakes.filter((i) => i.status === "completed" && !i.has_summary).length,
  };

  // Stats for invitations
  const invitationStats = {
    total: invitations.length,
    pending: invitations.filter((i) => i.status === "pending").length,
    approved: invitations.filter((i) => i.status === "approved").length,
    declined: invitations.filter((i) => i.status === "declined").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <Bot className="h-6 w-6" />
            </div>
            ARIA Pro Intake Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage AI-powered intakes and case invitations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={activeTab === "intakes" ? fetchIntakes : fetchInvitations}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {activeTab === "intakes" && (
            <Dialog open={showNewIntakeDialog} onOpenChange={setShowNewIntakeDialog}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Intake
                </Button>
              </DialogTrigger>
              <DialogContent>
                <NewIntakeForm
                  token={token}
                  firmId={activeFirm?.id}
                  onSuccess={() => {
                    setShowNewIntakeDialog(false);
                    fetchIntakes();
                  }}
                  onCancel={() => setShowNewIntakeDialog(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => handleTabChange("intakes")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "intakes"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bot className="h-4 w-4 inline-block mr-2" />
          ARIA Intakes
          {intakeStats.total > 0 && (
            <Badge variant="secondary" className="ml-2">
              {intakeStats.total}
            </Badge>
          )}
        </button>
        <button
          onClick={() => handleTabChange("invitations")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "invitations"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4 inline-block mr-2" />
          Case Invitations
          {invitationStats.pending > 0 && (
            <Badge className="ml-2 bg-amber-100 text-amber-800">
              {invitationStats.pending}
            </Badge>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "intakes" ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard
              label="Total Intakes"
              value={intakeStats.total}
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            />
            <StatCard
              label="Pending"
              value={intakeStats.pending}
              color="amber"
              active={statusFilter === "pending"}
              onClick={() => setStatusFilter("pending")}
            />
            <StatCard
              label="In Progress"
              value={intakeStats.inProgress}
              color="blue"
              active={statusFilter === "in_progress"}
              onClick={() => setStatusFilter("in_progress")}
            />
            <StatCard
              label="Completed"
              value={intakeStats.completed}
              color="emerald"
              active={statusFilter === "completed"}
              onClick={() => setStatusFilter("completed")}
            />
            <StatCard
              label="Needs Review"
              value={intakeStats.needsReview}
              color="purple"
              active={statusFilter === "reviewed"}
              onClick={() => setStatusFilter("reviewed")}
            />
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="py-3">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by client name or email..."
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
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Intake List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : filteredIntakes.length > 0 ? (
            <div className="space-y-3">
              {filteredIntakes.map((intake) => (
                <IntakeCard key={intake.id} intake={intake} onRefresh={fetchIntakes} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No intake sessions</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first intake session to get started"}
                </p>
                <Button
                  onClick={() => setShowNewIntakeDialog(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Intake
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <>
          {/* Invitation Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="All Invitations"
              value={invitationStats.total}
              active={invitationFilter === "all"}
              onClick={() => setInvitationFilter("all")}
            />
            <StatCard
              label="Pending"
              value={invitationStats.pending}
              color="amber"
              active={invitationFilter === "pending"}
              onClick={() => setInvitationFilter("pending")}
            />
            <StatCard
              label="Approved"
              value={invitationStats.approved}
              color="emerald"
              active={invitationFilter === "approved"}
              onClick={() => setInvitationFilter("approved")}
            />
            <StatCard
              label="Declined"
              value={invitationStats.declined}
              color="purple"
              active={invitationFilter === "declined"}
              onClick={() => setInvitationFilter("declined")}
            />
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="py-3">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by parent name or case..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={invitationFilter} onValueChange={setInvitationFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* No Firm Selected Warning */}
          {!activeFirm ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Firm Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a firm from your profile to view case invitations
                </p>
              </CardContent>
            </Card>
          ) : invitationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : filteredInvitations.length > 0 ? (
            <div className="space-y-3">
              {filteredInvitations.map((invitation) => (
                <FirmInvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  token={token}
                  firmId={activeFirm.id}
                  onRefresh={fetchInvitations}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No case invitations</h3>
                <p className="text-muted-foreground">
                  {searchQuery || invitationFilter !== "all"
                    ? "Try adjusting your filters"
                    : "When parents invite your firm from the directory, invitations will appear here"}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  color,
  active,
  onClick,
}: {
  label: string;
  value: number;
  color?: "amber" | "blue" | "emerald" | "purple";
  active: boolean;
  onClick: () => void;
}) {
  const colorClasses = {
    amber: "text-amber-600",
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    purple: "text-purple-600",
  };

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border text-left transition-all ${
        active
          ? "bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500/20"
          : "bg-card border-border hover:bg-muted/50"
      }`}
    >
      <p className={`text-2xl font-bold ${color ? colorClasses[color] : ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </button>
  );
}

// Intake Card Component
function IntakeCard({
  intake,
  onRefresh,
}: {
  intake: IntakeSession;
  onRefresh: () => void;
}) {
  const statusConfig = STATUS_CONFIG[intake.status] || STATUS_CONFIG.pending;

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  return (
    <Link href={`/professional/intake/${intake.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    {intake.client_name || "Unnamed Client"}
                  </h3>
                  <Badge className={statusConfig.color}>
                    {statusConfig.icon}
                    <span className="ml-1">{statusConfig.label}</span>
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {intake.client_email}
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatRelativeTime(intake.created_at)}
                  </span>
                  {intake.message_count > 0 && (
                    <>
                      <span>|</span>
                      <span>{intake.message_count} messages</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {intake.status === "completed" && !intake.has_summary && (
                <Badge variant="warning" className="shrink-0">
                  Needs Review
                </Badge>
              )}
              {intake.has_summary && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Summary Ready
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Send className="h-4 w-4 mr-2" />
                    Resend Link
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Cancel Intake
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// New Intake Form Component
function NewIntakeForm({
  token,
  firmId,
  onSuccess,
  onCancel,
}: {
  token: string | null;
  firmId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    intake_type: "custody",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/intake/sessions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            firm_id: firmId,
          }),
        }
      );

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating intake:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Create New Intake Session</DialogTitle>
        <DialogDescription>
          Send an ARIA Pro intake link to a prospective client
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="client_name">Client Name</Label>
          <Input
            id="client_name"
            value={formData.client_name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, client_name: e.target.value }))
            }
            placeholder="John Smith"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_email">Client Email</Label>
          <Input
            id="client_email"
            type="email"
            value={formData.client_email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, client_email: e.target.value }))
            }
            placeholder="john@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="intake_type">Intake Type</Label>
          <Select
            value={formData.intake_type}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, intake_type: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custody">Custody Case</SelectItem>
              <SelectItem value="divorce">Divorce</SelectItem>
              <SelectItem value="mediation">Mediation</SelectItem>
              <SelectItem value="modification">Modification</SelectItem>
              <SelectItem value="general">General Consultation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Internal Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Any notes for your team..."
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !formData.client_name || !formData.client_email}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isSubmitting ? "Creating..." : "Create & Send Link"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Firm Invitation Card Component
function FirmInvitationCard({
  invitation,
  token,
  firmId,
  onRefresh,
}: {
  invitation: FirmInvitation;
  token: string | null;
  firmId: string;
  onRefresh: () => void;
}) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  const daysUntilExpiry = () => {
    if (!invitation.expires_at) return null;
    const expiry = new Date(invitation.expires_at);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const handleAccept = async (professionalId?: string) => {
    if (!token) return;

    setIsAccepting(true);
    try {
      const body: Record<string, string> = {};
      if (professionalId) {
        body.professional_id = professionalId;
      }

      const response = await fetch(
        `${API_BASE}/api/v1/professional/firms/${firmId}/invitations/${invitation.id}/accept`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (response.ok) {
        setShowAssignDialog(false);
        onRefresh();
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;

    setIsDeclining(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/firms/${firmId}/invitations/${invitation.id}/decline`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: declineReason || null }),
        }
      );

      if (response.ok) {
        setShowDeclineDialog(false);
        onRefresh();
      }
    } catch (error) {
      console.error("Error declining invitation:", error);
    } finally {
      setIsDeclining(false);
    }
  };

  const expiryDays = daysUntilExpiry();

  const statusBadge = () => {
    switch (invitation.status) {
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-800">
            <Clock className="h-3.5 w-3.5 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Approved
          </Badge>
        );
      case "declined":
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Declined
          </Badge>
        );
      default:
        return null;
    }
  };

  const scopeLabels: Record<string, string> = {
    schedule: "Schedule",
    messages: "Messages",
    agreement: "Agreement",
    financials: "Financials",
    full: "Full Access",
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">
                  {invitation.family_file_title || `Case ${invitation.family_file_number || invitation.family_file_id.slice(0, 8)}`}
                </h3>
                {statusBadge()}
              </div>

              {/* Parents and children info */}
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                {invitation.parent_a_name && invitation.parent_b_name ? (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {invitation.parent_a_name} & {invitation.parent_b_name}
                  </span>
                ) : invitation.parent_a_name || invitation.parent_b_name ? (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {invitation.parent_a_name || invitation.parent_b_name}
                  </span>
                ) : null}
                {invitation.children_count > 0 && (
                  <>
                    <span className="hidden sm:inline">|</span>
                    <span className="flex items-center gap-1">
                      <Baby className="h-3.5 w-3.5" />
                      {invitation.children_count} {invitation.children_count === 1 ? "child" : "children"}
                    </span>
                  </>
                )}
                {(invitation.state || invitation.county) && (
                  <>
                    <span className="hidden sm:inline">|</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {[invitation.county, invitation.state].filter(Boolean).join(", ")}
                    </span>
                  </>
                )}
              </div>

              {/* Message from parent */}
              {invitation.message && (
                <p className="mt-2 text-sm text-muted-foreground italic line-clamp-2">
                  "{invitation.message}"
                </p>
              )}

              {/* Requested scopes */}
              {invitation.requested_scopes && invitation.requested_scopes.length > 0 && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Scopes:</span>
                  {invitation.requested_scopes.map((scope) => (
                    <Badge key={scope} variant="outline" className="text-xs">
                      {scopeLabels[scope] || scope}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Approval status */}
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className={invitation.parent_a_approved ? "text-emerald-600" : "text-muted-foreground"}>
                  Parent A: {invitation.parent_a_approved ? "Approved" : "Pending"}
                </span>
                <span className={invitation.parent_b_approved ? "text-emerald-600" : "text-muted-foreground"}>
                  Parent B: {invitation.parent_b_approved ? "Approved" : "Pending"}
                </span>
                {expiryDays !== null && expiryDays <= 7 && (
                  <span className={`${expiryDays <= 2 ? "text-red-600" : "text-amber-600"}`}>
                    Expires in {expiryDays} {expiryDays === 1 ? "day" : "days"}
                  </span>
                )}
              </div>

              {/* Timestamps */}
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Received {formatRelativeTime(invitation.created_at)}
              </div>
            </div>
          </div>

          {/* Actions */}
          {invitation.status === "pending" && (
            <div className="flex items-center gap-2 shrink-0">
              <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Decline
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Decline Case Invitation</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to decline this case invitation? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="decline_reason">Reason (Optional)</Label>
                      <Textarea
                        id="decline_reason"
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        placeholder="Provide an optional reason for declining..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDeclineDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDecline}
                      disabled={isDeclining}
                      variant="destructive"
                    >
                      {isDeclining ? "Declining..." : "Decline Invitation"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-700" size="sm">
                    <UserPlus className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <AssignProfessionalDialog
                    token={token}
                    firmId={firmId}
                    invitationId={invitation.id}
                    onAccept={handleAccept}
                    isAccepting={isAccepting}
                    onCancel={() => setShowAssignDialog(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Assign Professional Dialog
function AssignProfessionalDialog({
  token,
  firmId,
  invitationId,
  onAccept,
  isAccepting,
  onCancel,
}: {
  token: string | null;
  firmId: string;
  invitationId: string;
  onAccept: (professionalId?: string) => void;
  isAccepting: boolean;
  onCancel: () => void;
}) {
  const [members, setMembers] = useState<FirmMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfessional, setSelectedProfessional] = useState<string>("self");

  useEffect(() => {
    fetchFirmMembers();
  }, [token, firmId]);

  const fetchFirmMembers = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/firms/${firmId}/members`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMembers(data || []);
      }
    } catch (error) {
      console.error("Error fetching firm members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (selectedProfessional === "self") {
      onAccept();
    } else {
      onAccept(selectedProfessional);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Accept & Assign Case</DialogTitle>
        <DialogDescription>
          Accept this case invitation and assign it to a professional in your firm
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Assign To</Label>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" />
            </div>
          ) : (
            <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
              <SelectTrigger>
                <SelectValue placeholder="Select professional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self">Assign to Myself</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.display_name} ({member.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="font-medium text-foreground mb-1">What happens next:</p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside">
            <li>The selected professional will be assigned to this case</li>
            <li>They will have access based on the requested scopes</li>
            <li>The family will be notified of the acceptance</li>
          </ul>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isAccepting || loading}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isAccepting ? "Accepting..." : "Accept & Assign"}
        </Button>
      </DialogFooter>
    </>
  );
}
