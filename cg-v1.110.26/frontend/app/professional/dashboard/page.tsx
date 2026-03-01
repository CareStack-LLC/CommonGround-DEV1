"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ArrowRight,
  FileText,
  Users,
  TrendingUp,
  Bell,
  Plus,
  Gavel,
  FileBarChart2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProfessionalAuth } from "../layout";
import { InvitationSummaryAlert } from "@/components/professional/invitation-summary-alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AssignProfessionalDialog } from "@/components/professional/assign-professional-dialog";
import { TasksWidget } from "@/components/professional/dashboard/tasks-widget";
import { QuickCreateMenu } from "@/components/professional/dashboard/quick-create-menu";
import { KPICards } from "@/components/professional/dashboard/kpi-cards";
import { ComplianceLineChart } from "@/components/professional/dashboard/compliance-line-chart";
import { LeadPipeline } from "@/components/professional/dashboard/lead-pipeline";
import { CourtDatesWidget } from "@/components/professional/dashboard/court-dates-widget";

export default function ProfessionalDashboardPage() {
  const { profile, dashboardData, activeFirm, refreshDashboard, token } =
    useProfessionalAuth();

  useEffect(() => {
    refreshDashboard();
  }, [activeFirm]);

  const [selectedInvitation, setSelectedInvitation] = useState<any>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [openAddTask, setOpenAddTask] = useState(false);

  const handleAccept = (invitation: any) => {
    setSelectedInvitation(invitation);
    setShowAssignDialog(true);
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleAssign = async (professionalId: string) => {
    if (!token || !selectedInvitation || !activeFirm) return;
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/firms/${activeFirm.id}/invitations/${selectedInvitation.id}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ assigned_professional_id: professionalId }),
        }
      );
      if (response.ok) {
        setShowAssignDialog(false);
        setSelectedInvitation(null);
        refreshDashboard();
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
    }
  };

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--portal-primary)]" />
      </div>
    );
  }

  const pendingFirmInvitations = dashboardData?.pending_firm_invitations_data || [];
  const allCases = dashboardData.priority_cases || [];
  const allEvents = dashboardData.upcoming_events || [];
  const courtEventCount = allEvents.filter((e: any) => {
    const type = (e.event_type || "").toLowerCase();
    return (
      type.includes("court") ||
      type.includes("hearing") ||
      type.includes("trial") ||
      type.includes("mediation") ||
      type.includes("judgment") ||
      e.is_mandatory
    );
  }).length;

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-7">
      {/* Pending Invitations Banner */}
      {pendingFirmInvitations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <div className="h-1 w-8 bg-emerald-500 rounded-full" />
              Pending Case Invitations ({pendingFirmInvitations.length})
            </h2>
            <Link
              href="/professional/intake?tab=invitations"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              View All
            </Link>
          </div>
          <div className="grid gap-4">
            {pendingFirmInvitations.slice(0, 1).map((invitation: any) => (
              <InvitationSummaryAlert
                key={invitation.id}
                invitationId={invitation.id}
                firmId={activeFirm?.id || ""}
                token={token}
                onAccept={() => handleAccept(invitation)}
                onDecline={() => refreshDashboard()}
              />
            ))}
            {pendingFirmInvitations.length > 1 && (
              <p className="text-center text-xs text-slate-400 font-medium">
                +{pendingFirmInvitations.length - 1} other case
                {pendingFirmInvitations.length - 1 !== 1 ? "s" : ""} waiting
              </p>
            )}
          </div>
        </div>
      )}

      {/* Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <AssignProfessionalDialog
            token={token}
            firmId={activeFirm?.id || ""}
            invitationId={selectedInvitation?.id || ""}
            onAccept={handleAssign}
            isAccepting={false}
            onCancel={() => setShowAssignDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ─── ZONE 1: Command Header ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-5 shadow-xl border border-slate-700/40">
        {/* Decorative orb */}
        <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-[var(--portal-primary)]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {dateLabel}
              </p>
              {pendingFirmInvitations.length > 0 && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  {pendingFirmInvitations.length} New Lead
                  {pendingFirmInvitations.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">
              {activeFirm?.name
                ? `${activeFirm.name}`
                : `Welcome, ${profile?.user_first_name || "Professional"}`}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {allCases.length} active case{allCases.length !== 1 ? "s" : ""} ·{" "}
              {courtEventCount} upcoming court date
              {courtEventCount !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/professional/intake?tab=invitations">
              <Button
                size="sm"
                className="bg-[var(--portal-primary)] hover:bg-[var(--portal-primary-hover)] text-white shadow-lg shadow-[var(--portal-primary)]/30 gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                New Lead
              </Button>
            </Link>
            <Link href="/professional/reports">
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white gap-1.5 text-xs"
              >
                <FileBarChart2 className="h-3.5 w-3.5" />
                Reports
              </Button>
            </Link>
            <Link href="/professional/calendar">
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white gap-1.5 text-xs"
              >
                <Calendar className="h-3.5 w-3.5" />
                Calendar
              </Button>
            </Link>
            <div className="hidden sm:block">
              <QuickCreateMenu onCreateTask={() => setOpenAddTask(true)} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── ZONE 2: KPI Cards ──────────────────────────────────────────── */}
      <KPICards
        caseCount={dashboardData.case_count || 0}
        pendingIntakes={dashboardData.pending_intakes || 0}
        unreadMessages={dashboardData.unread_messages || 0}
        pendingApprovals={dashboardData.pending_approvals || 0}
        avgCompliance={dashboardData.avg_compliance_score || 0}
        complianceTrend={dashboardData.compliance_trend || 0}
        upcomingCourtDates={courtEventCount}
      />

      {/* ─── ZONE 3: Two-column Intel Grid ──────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Left column — Lead Pipeline + Alerts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lead Pipeline */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <div className="h-1 w-8 bg-[var(--portal-primary)] rounded-full" />
                Lead Pipeline
              </h2>
              <Link
                href="/professional/cases"
                className="text-xs font-semibold text-[var(--portal-primary)] hover:underline flex items-center gap-1"
              >
                All Cases
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <LeadPipeline cases={allCases} />
          </section>

          {/* Active Alerts */}
          <Card className="border-slate-200/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                  Active Alerts
                </CardTitle>
                <CardDescription className="text-xs">
                  Items requiring your attention
                </CardDescription>
              </div>
              {dashboardData.alerts?.length > 0 && (
                <Badge variant="warning">
                  {dashboardData.alerts.length}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {dashboardData.alerts?.length > 0 ? (
                <div className="space-y-2.5">
                  {dashboardData.alerts.slice(0, 5).map((alert: any, index: number) => (
                    <AlertItem key={index} alert={alert} />
                  ))}
                  {dashboardData.alerts.length > 5 && (
                    <Button variant="ghost" className="w-full text-xs text-muted-foreground">
                      View {dashboardData.alerts.length - 5} more alerts
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-[var(--portal-primary)]" />
                  <p className="text-sm">All clear — no active alerts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — Court Dates + Activity Feed */}
        <div className="space-y-6">
          {/* Court Dates */}
          <Card className="border-slate-200/60 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gavel className="h-4 w-4 text-slate-700" />
                  Court Dates
                </CardTitle>
                {courtEventCount > 0 && (
                  <Badge className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                    {courtEventCount} upcoming
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">Next 30 days</CardDescription>
            </CardHeader>
            <CardContent className="pt-1">
              <CourtDatesWidget events={allEvents} />
            </CardContent>
          </Card>

          {/* Compact Activity Feed */}
          <Card className="border-slate-200/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--portal-primary)]" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-xs">Latest case updates</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.recent_activity?.length > 0 ? (
                <div className="space-y-1">
                  {dashboardData.recent_activity
                    .slice(0, 7)
                    .map((activity: any, index: number) => (
                      <CompactActivityItem key={index} activity={activity} />
                    ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── ZONE 4: Analytics Strip ────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <div className="h-1 w-8 bg-blue-400 rounded-full" />
            Compliance Analytics
          </h2>
          <Link href="/professional/reports" className="text-xs font-semibold text-[var(--portal-primary)] hover:underline flex items-center gap-1">
            Full Reports
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <ComplianceLineChart period="30d" />
      </section>

      {/* ─── Tasks Widget ────────────────────────────────────────────────── */}
      <TasksWidget token={token} />
    </div>
  );
}

// ─── Alert Item ─────────────────────────────────────────────────────────────
function AlertItem({ alert }: { alert: any }) {
  const severityColors: Record<string, string> = {
    high: "bg-red-50 text-red-800 border-red-200",
    medium: "bg-amber-50 text-amber-800 border-amber-200",
    low: "bg-blue-50 text-blue-800 border-blue-200",
  };

  const typeIcons: Record<string, React.ReactNode> = {
    intake_pending: <FileText className="h-4 w-4" />,
    access_request: <Users className="h-4 w-4" />,
    court_event: <Calendar className="h-4 w-4" />,
    message_received: <MessageSquare className="h-4 w-4" />,
    exchange_reminder: <Clock className="h-4 w-4" />,
    compliance_alert: <AlertTriangle className="h-4 w-4" />,
  };

  const getAlertHref = () => {
    switch (alert.type) {
      case "intake_pending":
        return alert.session_id
          ? `/professional/intake/${alert.session_id}`
          : "/professional/intake?tab=aria&status=pending";
      case "access_request":
        return "/professional/intake?tab=invitations&status=pending";
      case "court_event":
        return alert.family_file_id
          ? `/professional/cases/${alert.family_file_id}/timeline`
          : "/professional/cases";
      case "message_received":
        return alert.family_file_id
          ? `/professional/cases/${alert.family_file_id}/messages`
          : "/professional/messages?filter=unread";
      default:
        return alert.family_file_id
          ? `/professional/cases/${alert.family_file_id}`
          : "/professional/cases";
    }
  };

  return (
    <Link href={getAlertHref()}>
      <div
        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${severityColors[alert.severity] || severityColors.medium
          }`}
      >
        <div className="mt-0.5 shrink-0">
          {typeIcons[alert.type] || <Bell className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug">{alert.title}</p>
          <p className="text-xs opacity-70 mt-0.5 line-clamp-1">{alert.message}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant={alert.severity === "high" ? "error" : "secondary"}
            className="text-[10px]"
          >
            {alert.severity}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px] font-semibold opacity-60 hover:opacity-100"
            asChild
          >
            <span>Review →</span>
          </Button>
        </div>
      </div>
    </Link>
  );
}

// ─── Compact Activity Item ───────────────────────────────────────────────────
function CompactActivityItem({ activity }: { activity: any }) {
  const typeIcons: Record<string, React.ReactNode> = {
    intake_completed: <CheckCircle2 className="h-3.5 w-3.5 text-[var(--portal-primary)]" />,
    intake_updated: <FileText className="h-3.5 w-3.5 text-blue-500" />,
    message_received: <MessageSquare className="h-3.5 w-3.5 text-purple-500" />,
    agreement_update: <FileText className="h-3.5 w-3.5 text-amber-500" />,
    exchange_completed: <CheckCircle2 className="h-3.5 w-3.5 text-[var(--portal-primary)]" />,
    exchange_missed: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
    compliance_change: <TrendingUp className="h-3.5 w-3.5 text-[var(--portal-primary)]" />,
    court_event_created: <Calendar className="h-3.5 w-3.5 text-purple-500" />,
  };

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d`;
    if (h > 0) return `${h}h`;
    return "now";
  };

  const getHref = () => {
    const fid = activity.family_file_id;
    switch (activity.activity_type) {
      case "intake_completed":
      case "intake_updated":
        return activity.session_id
          ? `/professional/intake/${activity.session_id}`
          : "/professional/intake";
      case "message_received":
        return fid ? `/professional/cases/${fid}/messages` : "/professional/messages";
      default:
        return fid ? `/professional/cases/${fid}` : "/professional/cases";
    }
  };

  return (
    <Link href={getHref()}>
      <div className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
        <div className="shrink-0">
          {typeIcons[activity.activity_type] || (
            <Clock className="h-3.5 w-3.5 text-slate-400" />
          )}
        </div>
        <p className="text-xs text-slate-700 flex-1 min-w-0 truncate">
          {activity.title}
        </p>
        <span className="text-[10px] text-slate-400 shrink-0">
          {formatTime(activity.timestamp)}
        </span>
      </div>
    </Link>
  );
}
