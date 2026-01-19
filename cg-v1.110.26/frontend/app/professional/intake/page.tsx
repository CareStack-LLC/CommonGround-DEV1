"use client";

import { useState, useEffect } from "react";
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
  Bot,
  RefreshCw,
  MoreVertical,
  Eye,
  Send,
  Trash2,
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
  const [intakes, setIntakes] = useState<IntakeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewIntakeDialog, setShowNewIntakeDialog] = useState(false);

  useEffect(() => {
    fetchIntakes();
  }, [token, activeFirm, statusFilter]);

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

  const filteredIntakes = intakes.filter(
    (intake) =>
      !searchQuery ||
      intake.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intake.client_email?.toLowerCase().includes(searchQuery.toLowerCase())
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

  // Stats
  const stats = {
    total: intakes.length,
    pending: intakes.filter((i) => i.status === "pending").length,
    inProgress: intakes.filter((i) => i.status === "in_progress").length,
    completed: intakes.filter((i) => i.status === "completed").length,
    needsReview: intakes.filter((i) => i.status === "completed" && !i.has_summary).length,
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
            Manage AI-powered client intake sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchIntakes}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="Total Intakes"
          value={stats.total}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          color="amber"
          active={statusFilter === "pending"}
          onClick={() => setStatusFilter("pending")}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          color="blue"
          active={statusFilter === "in_progress"}
          onClick={() => setStatusFilter("in_progress")}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          color="emerald"
          active={statusFilter === "completed"}
          onClick={() => setStatusFilter("completed")}
        />
        <StatCard
          label="Needs Review"
          value={stats.needsReview}
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
