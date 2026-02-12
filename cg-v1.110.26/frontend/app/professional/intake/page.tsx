"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
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
    color: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: <Bot className="h-3.5 w-3.5" />,
  },
  completed: {
    label: "Completed",
    color: "bg-teal-50 text-teal-700 border border-teal-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  needs_review: {
    label: "Needs Review",
    color: "bg-orange-50 text-orange-700 border border-orange-200",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  reviewed: {
    label: "Reviewed",
    color: "bg-purple-50 text-purple-700 border border-purple-200",
    icon: <Eye className="h-3.5 w-3.5" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-slate-50 text-slate-600 border border-slate-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

export default function IntakeCenterPage() {
  const { token, activeFirm } = useProfessionalAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab and status state from URL
  const tabFromUrl = searchParams.get("tab");
  const statusFromUrl = searchParams.get("status");
  const [activeTab, setActiveTab] = useState<"intakes" | "invitations">(
    tabFromUrl === "invitations" ? "invitations" : "intakes"
  );

  // Intake state - read initial status from URL if provided
  const [intakes, setIntakes] = useState<IntakeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    tabFromUrl !== "invitations" && statusFromUrl ? statusFromUrl : "all"
  );
  const [showNewIntakeDialog, setShowNewIntakeDialog] = useState(false);

  // Firm invitation state - read initial status from URL if provided
  const [invitations, setInvitations] = useState<FirmInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationFilter, setInvitationFilter] = useState(
    tabFromUrl === "invitations" && statusFromUrl ? statusFromUrl : "pending"
  );

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
    if (!token) {
      setIntakes([]);
      setIsLoading(false);
      return;
    }

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
      } else {
        // Handle non-OK responses gracefully
        console.warn("Intakes fetch returned:", response.status);
        setIntakes([]);
      }
    } catch (error) {
      console.error("Error fetching intakes:", error);
      setIntakes([]);
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
        setInvitations(data.items || data || []);
      } else {
        console.warn("Invitations fetch returned:", response.status);
        setInvitations([]);
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
      setInvitations([]);
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
    completed: intakes.filter((i) => i.status === "completed" || i.status === "needs_review").length,
    needsReview: intakes.filter((i) => i.status === "needs_review" || (i.status === "completed" && !i.has_summary)).length,
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
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg shadow-purple-500/20">
              <Bot className="h-6 w-6" />
            </div>
            ARIA Pro Intake Center
          </h1>
          <p className="text-slate-500 mt-1">
            Manage AI-powered intakes and case invitations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={activeTab === "intakes" ? fetchIntakes : fetchInvitations}
            className="border-slate-300 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {activeTab === "intakes" && (
            <Dialog open={showNewIntakeDialog} onOpenChange={setShowNewIntakeDialog}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/20">
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
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => handleTabChange("intakes")}
          className={`px-5 py-3 font-medium text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === "intakes"
            ? "border-teal-600 text-teal-700 bg-teal-50/50"
            : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
        >
          <Bot className="h-4 w-4" />
          ARIA Intakes
          {intakeStats.total > 0 && (
            <Badge variant="secondary" className="ml-1 bg-slate-100 text-slate-600">
              {intakeStats.total}
            </Badge>
          )}
        </button>
        <button
          onClick={() => handleTabChange("invitations")}
          className={`px-5 py-3 font-medium text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === "invitations"
            ? "border-teal-600 text-teal-700 bg-teal-50/50"
            : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
        >
          <Users className="h-4 w-4" />
          Case Invitations
          {invitationStats.pending > 0 && (
            <Badge className="ml-1 bg-amber-100 text-amber-700 border border-amber-200">
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
              color="teal"
              active={statusFilter === "completed"}
              onClick={() => setStatusFilter("completed")}
            />
            <StatCard
              label="Needs Review"
              value={intakeStats.needsReview}
              color="orange"
              active={statusFilter === "needs_review"}
              onClick={() => setStatusFilter("needs_review")}
            />
          </div>

          {/* Filters */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by client name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-44 border-slate-200">
                    <Filter className="h-4 w-4 mr-2 text-slate-400" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="needs_review">Needs Review</SelectItem>
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            </div>
          ) : filteredIntakes.length > 0 ? (
            <div className="space-y-3">
              {filteredIntakes.map((intake) => (
                <IntakeCard key={intake.id} intake={intake} onRefresh={fetchIntakes} />
              ))}
            </div>
          ) : (
            <Card className="border-slate-200 border-dashed bg-slate-50/50">
              <CardContent className="py-16 text-center">
                <div className="p-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl w-fit mx-auto mb-6">
                  <FileText className="h-10 w-10 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No intake sessions</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== "all"
                    ? "No results match your filters. Try adjusting your search criteria."
                    : "Create your first intake session to get started with AI-powered client onboarding."}
                </p>
                {!(searchQuery || statusFilter !== "all") && (
                  <Button
                    onClick={() => setShowNewIntakeDialog(true)}
                    className="bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/20"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Intake
                  </Button>
                )}
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
              color="teal"
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
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by parent name or case..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                  />
                </div>
                <Select value={invitationFilter} onValueChange={setInvitationFilter}>
                  <SelectTrigger className="w-full sm:w-44 border-slate-200">
                    <Filter className="h-4 w-4 mr-2 text-slate-400" />
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
            <Card className="border-slate-200 border-dashed bg-slate-50/50">
              <CardContent className="py-16 text-center">
                <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl w-fit mx-auto mb-6">
                  <Building2 className="h-10 w-10 text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Firm Selected</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                  Select a firm from your profile to view and manage case invitations.
                </p>
                <Button variant="outline" asChild>
                  <Link href="/professional/profile">Go to Profile</Link>
                </Button>
              </CardContent>
            </Card>
          ) : invitationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
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
            <Card className="border-slate-200 border-dashed bg-slate-50/50">
              <CardContent className="py-16 text-center">
                <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl w-fit mx-auto mb-6">
                  <Users className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No case invitations</h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  {searchQuery || invitationFilter !== "all"
                    ? "No results match your filters. Try adjusting your search criteria."
                    : "When parents invite your firm from the professional directory, case invitations will appear here."}
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
  color?: "amber" | "blue" | "teal" | "purple" | "orange";
  active: boolean;
  onClick: () => void;
}) {
  const colorConfig = {
    amber: {
      text: "text-amber-600",
      activeBg: "bg-gradient-to-br from-amber-50 to-amber-100/50",
      activeBorder: "border-amber-300",
      activeRing: "ring-amber-500/20",
      icon: "bg-amber-100 text-amber-600",
    },
    blue: {
      text: "text-blue-600",
      activeBg: "bg-gradient-to-br from-blue-50 to-blue-100/50",
      activeBorder: "border-blue-300",
      activeRing: "ring-blue-500/20",
      icon: "bg-blue-100 text-blue-600",
    },
    teal: {
      text: "text-teal-600",
      activeBg: "bg-gradient-to-br from-teal-50 to-teal-100/50",
      activeBorder: "border-teal-300",
      activeRing: "ring-teal-500/20",
      icon: "bg-teal-100 text-teal-600",
    },
    purple: {
      text: "text-purple-600",
      activeBg: "bg-gradient-to-br from-purple-50 to-purple-100/50",
      activeBorder: "border-purple-300",
      activeRing: "ring-purple-500/20",
      icon: "bg-purple-100 text-purple-600",
    },
    orange: {
      text: "text-orange-600",
      activeBg: "bg-gradient-to-br from-orange-50 to-orange-100/50",
      activeBorder: "border-orange-300",
      activeRing: "ring-orange-500/20",
      icon: "bg-orange-100 text-orange-600",
    },
  };

  const config = color ? colorConfig[color] : null;

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border text-left transition-all duration-200 w-full ${active
        ? `${config?.activeBg || "bg-gradient-to-br from-slate-50 to-slate-100/50"} ${config?.activeBorder || "border-slate-300"} ring-2 ${config?.activeRing || "ring-slate-500/20"} shadow-sm`
        : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
        }`}
    >
      <p className={`text-2xl font-bold ${config?.text || "text-slate-900"}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
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

  // Determine status accent color for top bar
  const statusAccent = () => {
    switch (intake.status) {
      case "pending":
        return "bg-gradient-to-r from-amber-400 to-amber-500";
      case "in_progress":
        return "bg-gradient-to-r from-blue-400 to-blue-500";
      case "completed":
        return "bg-gradient-to-r from-teal-400 to-teal-500";
      case "needs_review":
        return "bg-gradient-to-r from-orange-400 to-orange-500";
      case "reviewed":
        return "bg-gradient-to-r from-purple-400 to-purple-500";
      default:
        return "bg-slate-300";
    }
  };

  return (
    <Link href={`/professional/intake/${intake.id}`}>
      <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-slate-200 hover:border-slate-300 overflow-hidden">
        {/* Top accent bar based on status */}
        <div className={`h-1 ${statusAccent()}`} />

        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              {/* Icon with gradient */}
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg shadow-purple-500/20 shrink-0">
                <Bot className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                {/* Header with name and status */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h3 className="font-semibold text-slate-900 text-base">
                    {intake.client_name || "Unnamed Client"}
                  </h3>
                  <Badge className={statusConfig.color}>
                    {statusConfig.icon}
                    <span className="ml-1">{statusConfig.label}</span>
                  </Badge>
                </div>

                {/* Client info row */}
                <div className="bg-slate-50 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white rounded-md shadow-sm">
                        <User className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <span className="text-slate-700">{intake.client_email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white rounded-md shadow-sm">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <span className="text-slate-600">{formatRelativeTime(intake.created_at)}</span>
                    </div>
                    {intake.message_count > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white rounded-md shadow-sm">
                          <FileText className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <span className="text-slate-600">{intake.message_count} messages</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status indicators */}
                <div className="flex items-center gap-2 flex-wrap">
                  {intake.status === "completed" && !intake.has_summary && (
                    <Badge className="bg-orange-50 text-orange-700 border border-orange-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Needs Review
                    </Badge>
                  )}
                  {intake.has_summary && (
                    <Badge className="bg-teal-50 text-teal-700 border border-teal-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Summary Ready
                    </Badge>
                  )}
                  {intake.family_file_id && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <Users className="h-3 w-3 mr-1" />
                      Linked to Case
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
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
              <div className="p-1.5 rounded-full bg-slate-100 group-hover:bg-teal-100 transition-colors">
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
              </div>
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
          className="bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/20"
        >
          {isSubmitting ? "Creating..." : "Create & Send Link"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Case Preview Types
interface CasePreview {
  family_file_id: string;
  family_file_number: string | null;
  family_file_title: string | null;
  state: string | null;
  county: string | null;
  created_at: string | null;
  parent_a_name: string | null;
  parent_b_name: string | null;
  children: Array<{
    id: string;
    first_name: string;
    age: number | null;
    has_special_needs: boolean;
  }>;
  agreement: {
    has_active_agreement: boolean;
    agreement_title: string | null;
    total_sections: number;
    completed_sections: number;
    last_updated: string | null;
    key_sections: string[];
    quick_facts: string[];
  };
  compliance: {
    exchange_completion_rate: number | null;
    on_time_rate: number | null;
    total_exchanges_30d: number;
    completed_exchanges_30d: number;
    communication_flag_rate: number | null;
    overall_health: string;
  };
  messages: {
    total_messages_30d: number;
    flagged_messages_30d: number;
    flag_rate: number;
    top_flagged_category: string | null;
    parent_a_messages: number;
    parent_b_messages: number;
    last_message_at: string | null;
  };
  clearfund: {
    total_obligations: number;
    pending_obligations: number;
    total_amount: number;
    paid_amount: number;
    overdue_amount: number;
    categories: string[];
  };
  requested_role: string | null;
  requested_scopes: string[];
  representing: string | null;
  message: string | null;
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
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
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

  const handleAccept = async (professionalId: string) => {
    if (!token || !professionalId) return;

    setIsAccepting(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/firms/${firmId}/invitations/${invitation.id}/accept`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ assigned_professional_id: professionalId }),
        }
      );

      if (response.ok) {
        setShowAssignDialog(false);
        onRefresh();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Accept invitation error:", response.status, errorData);
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
          <Badge className="bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-teal-50 text-teal-700 border border-teal-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "declined":
        return (
          <Badge className="bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="h-3 w-3 mr-1" />
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

  const scopeIcons: Record<string, React.ReactNode> = {
    schedule: <Calendar className="h-3 w-3" />,
    messages: <FileText className="h-3 w-3" />,
    agreement: <FileText className="h-3 w-3" />,
    financials: <Shield className="h-3 w-3" />,
    full: <Shield className="h-3 w-3" />,
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-slate-200 hover:border-slate-300 overflow-hidden">
      {/* Top accent bar based on status */}
      <div className={`h-1 ${invitation.status === "pending"
        ? "bg-gradient-to-r from-amber-400 to-amber-500"
        : invitation.status === "approved"
          ? "bg-gradient-to-r from-teal-400 to-teal-500"
          : "bg-slate-300"
        }`} />

      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            {/* Icon with gradient background */}
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 shrink-0">
              <Users className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Header with title and status */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h3 className="font-semibold text-slate-900 text-base">
                  {invitation.family_file_title || `Case ${invitation.family_file_number || invitation.family_file_id.slice(0, 8)}`}
                </h3>
                {statusBadge()}
              </div>

              {/* Parents and children info - in a cleaner card */}
              <div className="bg-slate-50 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  {invitation.parent_a_name && invitation.parent_b_name ? (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white rounded-md shadow-sm">
                        <User className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <span className="text-slate-700 font-medium">
                        {invitation.parent_a_name} & {invitation.parent_b_name}
                      </span>
                    </div>
                  ) : invitation.parent_a_name || invitation.parent_b_name ? (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white rounded-md shadow-sm">
                        <User className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <span className="text-slate-700 font-medium">
                        {invitation.parent_a_name || invitation.parent_b_name}
                      </span>
                    </div>
                  ) : null}

                  {invitation.children_count > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white rounded-md shadow-sm">
                        <Baby className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <span className="text-slate-600">
                        {invitation.children_count} {invitation.children_count === 1 ? "child" : "children"}
                      </span>
                    </div>
                  )}

                  {(invitation.state || invitation.county) && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white rounded-md shadow-sm">
                        <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <span className="text-slate-600">
                        {[invitation.county, invitation.state].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Message from parent */}
              {invitation.message && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 mb-3">
                  <p className="text-sm text-slate-600 italic line-clamp-2">
                    "{invitation.message}"
                  </p>
                </div>
              )}

              {/* Requested scopes as pills */}
              {invitation.requested_scopes && invitation.requested_scopes.length > 0 && (
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Access Requested:</span>
                  {invitation.requested_scopes.map((scope) => (
                    <Badge
                      key={scope}
                      variant="outline"
                      className="text-xs bg-white border-slate-200 text-slate-600 gap-1"
                    >
                      {scopeIcons[scope]}
                      {scopeLabels[scope] || scope}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Approval status indicator - only one parent needs to approve */}
              <div className="flex items-center gap-4 text-xs">
                {(invitation.parent_a_approved || invitation.parent_b_approved) && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-teal-50 text-teal-700">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>
                      {invitation.parent_a_approved && invitation.parent_b_approved
                        ? "Both Parents Approved"
                        : invitation.parent_a_approved
                          ? `${invitation.parent_a_name?.split(" ")[0] || "Parent A"} Approved`
                          : `${invitation.parent_b_name?.split(" ")[0] || "Parent B"} Approved`}
                    </span>
                  </div>
                )}

                {invitation.representing && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                    <User className="h-3 w-3" />
                    <span>Representing {invitation.representing === "parent_a" ? "Parent A" : "Parent B"}</span>
                  </div>
                )}

                {expiryDays !== null && expiryDays <= 7 && (
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${expiryDays <= 2
                    ? "bg-red-50 text-red-600"
                    : "bg-amber-50 text-amber-600"
                    }`}>
                    <AlertCircle className="h-3 w-3" />
                    <span>Expires in {expiryDays} {expiryDays === 1 ? "day" : "days"}</span>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                <Calendar className="h-3 w-3" />
                Received {formatRelativeTime(invitation.created_at)}
              </div>
            </div>
          </div>

          {/* Actions - stacked for better visual hierarchy */}
          <div className="flex flex-col items-stretch gap-2 shrink-0 min-w-[120px]">
            {/* View Details Button - always show */}
            <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200">
                  <Eye className="h-4 w-4 mr-1.5" />
                  View Details
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <InvitationPreviewModal
                  invitation={invitation}
                  token={token}
                  firmId={firmId}
                  onClose={() => setShowPreviewDialog(false)}
                />
              </DialogContent>
            </Dialog>

            {/* Accept/Decline buttons for pending invitations */}
            {invitation.status === "pending" && (
              <>
                <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/20 transition-all" size="sm">
                      <UserPlus className="h-4 w-4 mr-1.5" />
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

                <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-700">
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
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Invitation Preview Modal Component
function InvitationPreviewModal({
  invitation,
  token,
  firmId,
  onClose,
}: {
  invitation: FirmInvitation;
  token: string | null;
  firmId: string;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<CasePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPreview();
  }, [invitation.id]);

  const fetchPreview = async () => {
    if (!token || !firmId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/firms/${firmId}/invitations/${invitation.id}/preview`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPreview(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || "Failed to load case preview");
      }
    } catch (err) {
      console.error("Error fetching preview:", err);
      setError("Failed to load case preview");
    } finally {
      setLoading(false);
    }
  };

  const healthColor = (health: string) => {
    switch (health) {
      case "good":
        return "text-teal-600 bg-teal-50 border-teal-200";
      case "moderate":
        return "text-amber-600 bg-amber-50 border-amber-200";
      case "concerning":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-slate-600 bg-slate-50 border-slate-200";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return "N/A";
    return `${Math.round(value * 100)}%`;
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg">
            <Eye className="h-4 w-4" />
          </div>
          Case Preview
        </DialogTitle>
        <DialogDescription>
          {preview?.family_file_title || invitation.family_file_title || "Family File"} overview
        </DialogDescription>
      </DialogHeader>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <div className="p-3 bg-red-50 rounded-full w-fit mx-auto mb-4">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <p className="text-sm text-slate-600">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchPreview}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      ) : preview ? (
        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
          {/* Case Info Header */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Parents</p>
                <p className="text-sm font-semibold text-slate-900">
                  {preview.parent_a_name && preview.parent_b_name
                    ? `${preview.parent_a_name} & ${preview.parent_b_name}`
                    : preview.parent_a_name || preview.parent_b_name || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Location</p>
                <p className="text-sm font-semibold text-slate-900">
                  {[preview.county, preview.state].filter(Boolean).join(", ") || "Not specified"}
                </p>
              </div>
            </div>

            {preview.children.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Children</p>
                <div className="flex flex-wrap gap-2">
                  {preview.children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                    >
                      <Baby className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-sm text-slate-700">{child.first_name}</span>
                      {child.age !== null && (
                        <span className="text-xs text-slate-500">({child.age}y)</span>
                      )}
                      {child.has_special_needs && (
                        <Badge className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                          Special Needs
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Overall Health Indicator */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Overall Case Health:</span>
            <Badge className={`${healthColor(preview.compliance.overall_health)} capitalize`}>
              {preview.compliance.overall_health}
            </Badge>
          </div>

          {/* Agreement Summary */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              SharedCare Agreement
            </h4>
            <Card className="border-slate-200">
              <CardContent className="p-4">
                {preview.agreement.has_active_agreement ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">
                        {preview.agreement.agreement_title || "Active Agreement"}
                      </span>
                      <Badge className="bg-teal-50 text-teal-600 border-teal-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all"
                          style={{
                            width: `${preview.agreement.total_sections > 0
                              ? (preview.agreement.completed_sections / preview.agreement.total_sections) * 100
                              : 0
                              }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {preview.agreement.completed_sections}/{preview.agreement.total_sections} sections
                      </span>
                    </div>
                    {preview.agreement.quick_facts && preview.agreement.quick_facts.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {preview.agreement.quick_facts.map((fact, i) => (
                          <div key={i} className="text-sm text-slate-700 bg-slate-50 p-2 rounded-md border border-slate-100">
                            <ReactMarkdown className="prose prose-sm max-w-none prose-p:my-0 prose-strong:text-slate-900">
                              {fact}
                            </ReactMarkdown>
                          </div>
                        ))}
                      </div>
                    ) : (
                      preview.agreement.key_sections.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {preview.agreement.key_sections.slice(0, 5).map((section) => (
                            <Badge key={section} variant="outline" className="text-xs bg-white">
                              {section}
                            </Badge>
                          ))}
                          {preview.agreement.key_sections.length > 5 && (
                            <Badge variant="outline" className="text-xs bg-white text-slate-500">
                              +{preview.agreement.key_sections.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-sm text-slate-500">No active agreement</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Compliance Overview */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-500" />
              Compliance (Last 30 Days)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-slate-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">
                    {formatPercent(preview.compliance.exchange_completion_rate)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Exchange Completion</p>
                  <p className="text-xs text-slate-400">
                    {preview.compliance.completed_exchanges_30d}/{preview.compliance.total_exchanges_30d} exchanges
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">
                    {formatPercent(preview.compliance.on_time_rate)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">On-Time Rate</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Message Trends */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              Communication (Last 30 Days)
            </h4>
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold text-slate-900">{preview.messages.total_messages_30d}</p>
                    <p className="text-xs text-slate-500">Total Messages</p>
                  </div>
                  <div>
                    <p className={`text-xl font-bold ${preview.messages.flag_rate > 0.3 ? "text-red-600" :
                      preview.messages.flag_rate > 0.15 ? "text-amber-600" : "text-teal-600"
                      }`}>
                      {preview.messages.flagged_messages_30d}
                    </p>
                    <p className="text-xs text-slate-500">Flagged</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900 capitalize">
                      {preview.messages.top_flagged_category || "N/A"}
                    </p>
                    <p className="text-xs text-slate-500">Top Toxic Category</p>
                  </div>
                </div>
                {preview.messages.total_messages_30d > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Parent A: {preview.messages.parent_a_messages} msgs</span>
                      <span>Parent B: {preview.messages.parent_b_messages} msgs</span>
                    </div>
                    <div className="flex h-2 mt-2 rounded-full overflow-hidden bg-slate-100">
                      <div
                        className="bg-blue-400"
                        style={{
                          width: `${preview.messages.total_messages_30d > 0
                            ? (preview.messages.parent_a_messages / preview.messages.total_messages_30d) * 100
                            : 50
                            }%`,
                        }}
                      />
                      <div
                        className="bg-purple-400"
                        style={{
                          width: `${preview.messages.total_messages_30d > 0
                            ? (preview.messages.parent_b_messages / preview.messages.total_messages_30d) * 100
                            : 50
                            }%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ClearFund Overview */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              ClearFund Financial Overview
            </h4>
            <Card className="border-slate-200">
              <CardContent className="p-4">
                {preview.clearfund.total_obligations > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-xl font-bold text-slate-900">
                          {preview.clearfund.total_obligations}
                        </p>
                        <p className="text-xs text-slate-500">Total Obligations</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-amber-600">
                          {preview.clearfund.pending_obligations}
                        </p>
                        <p className="text-xs text-slate-500">Pending</p>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Total Amount</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(preview.clearfund.total_amount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Paid</span>
                        <span className="font-medium text-teal-600">
                          {formatCurrency(preview.clearfund.paid_amount)}
                        </span>
                      </div>
                      {preview.clearfund.overdue_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Overdue</span>
                          <span className="font-medium text-red-600">
                            {formatCurrency(preview.clearfund.overdue_amount)}
                          </span>
                        </div>
                      )}
                    </div>
                    {preview.clearfund.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {preview.clearfund.categories.map((category) => (
                          <Badge key={category} variant="outline" className="text-xs capitalize">
                            {category.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-sm text-slate-500">No financial obligations recorded</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Request Details */}
          {(preview.requested_role || preview.representing || preview.message) && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-slate-500" />
                Invitation Details
              </h4>
              <Card className="border-slate-200">
                <CardContent className="p-4 space-y-3">
                  {preview.requested_role && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Requested Role</span>
                      <Badge variant="outline" className="capitalize">
                        {preview.requested_role.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  )}
                  {preview.representing && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Representing</span>
                      <span className="text-sm font-medium text-slate-900 capitalize">
                        {preview.representing.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                  {preview.message && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                        Message from Parent
                      </p>
                      <p className="text-sm text-slate-700 italic">"{preview.message}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </>
  );
}

// Assign Professional Dialog
export function AssignProfessionalDialog({
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
  onAccept: (professionalId: string) => void;
  isAccepting: boolean;
  onCancel: () => void;
}) {
  const [members, setMembers] = useState<FirmMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentProfessionalId, setCurrentProfessionalId] = useState<string>("");
  const [selectedProfessional, setSelectedProfessional] = useState<string>("self");

  useEffect(() => {
    fetchFirmMembers();
    fetchCurrentProfessionalId();
  }, [token, firmId]);

  const fetchCurrentProfessionalId = async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/profile`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCurrentProfessionalId(data.id || "");
      }
    } catch (error) {
      console.error("Error fetching professional profile:", error);
    }
  };

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
      onAccept(currentProfessionalId);
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
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
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
          disabled={isAccepting || loading || (selectedProfessional === "self" && !currentProfessionalId)}
          className="bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/20"
        >
          {isAccepting ? "Accepting..." : "Accept & Assign"}
        </Button>
      </DialogFooter>
    </>
  );
}
