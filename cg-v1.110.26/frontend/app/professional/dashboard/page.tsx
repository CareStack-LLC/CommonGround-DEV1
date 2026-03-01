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
  Gavel,
  Briefcase,
  Scale,
  FolderOpen,
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
import { LeadTrackingChart } from "@/components/professional/dashboard/lead-tracking-chart";
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-900" />
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
    year: "numeric",
  });

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');

        .dashboard-wrapper {
          background: linear-gradient(135deg, #fef9f3 0%, #faf5ed 100%);
          min-height: 100vh;
        }

        .serif { font-family: 'Crimson Pro', Georgia, serif; }
        .sans { font-family: 'Outfit', system-ui, sans-serif; }

        .legal-header-seal {
          position: absolute;
          top: -2rem;
          right: -2rem;
          width: 10rem;
          height: 10rem;
          border-radius: 50%;
          border: 2px solid rgba(146, 64, 14, 0.1);
          background: radial-gradient(circle, rgba(217, 119, 6, 0.05) 0%, transparent 70%);
          animation: seal-pulse 3s ease-in-out infinite;
        }

        @keyframes seal-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }

        .metric-card {
          position: relative;
          overflow: hidden;
        }

        .metric-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #92400e, #d97706);
        }

        .legal-divider {
          height: 2px;
          background: linear-gradient(90deg, #92400e 0%, #d97706 20%, transparent 100%);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>

      <div className="dashboard-wrapper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Pending Invitations Banner */}
          {pendingFirmInvitations.length > 0 && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="sans text-xs font-bold text-amber-900 uppercase tracking-[0.15em] flex items-center gap-3">
                  <div className="h-px w-8 bg-amber-900 rounded-full" />
                  Pending Case Invitations ({pendingFirmInvitations.length})
                </h2>
                <Link
                  href="/professional/intake?tab=invitations"
                  className="sans text-xs font-bold text-amber-900 hover:text-amber-950 transition-colors border-b border-amber-900/20 hover:border-amber-900/40"
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
                  <p className="text-center sans text-xs text-slate-500 font-medium">
                    +{pendingFirmInvitations.length - 1} additional case
                    {pendingFirmInvitations.length - 1 !== 1 ? "s" : ""} awaiting review
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Assignment Dialog */}
          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogContent className="sm:max-w-md border-2 border-amber-900/20">
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

          {/* Distinguished Header */}
          <div className="relative overflow-hidden rounded-sm bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 px-8 py-8 shadow-2xl border-2 border-amber-900/40">
            <div className="legal-header-seal" />

            {/* Decorative legal elements */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-950/20 rounded-full -mb-16 -ml-16 blur-2xl" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-700/10 rounded-full -mt-20 -mr-20 blur-3xl" />

            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-start gap-5">
                <div className="p-4 bg-amber-50 border-2 border-amber-900/20 rounded-sm shadow-xl shrink-0">
                  <Scale className="h-8 w-8 text-amber-900" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="sans text-[10px] font-bold text-amber-200 uppercase tracking-[0.2em]">
                      {dateLabel}
                    </span>
                    {pendingFirmInvitations.length > 0 && (
                      <span className="flex items-center gap-1.5 sans text-[10px] font-bold bg-red-500/20 text-red-200 border border-red-400/30 px-2 py-1 rounded-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                        {pendingFirmInvitations.length} New Lead
                        {pendingFirmInvitations.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <h1 className="serif text-3xl lg:text-4xl font-bold text-white leading-tight">
                    {activeFirm?.name || `${profile?.user_first_name || "Professional"}'s Practice`}
                  </h1>
                  <div className="flex items-center gap-3 mt-2 text-sm text-amber-100">
                    <span className="sans flex items-center gap-1.5">
                      <FolderOpen className="h-4 w-4" strokeWidth={2} />
                      {allCases.length} active case{allCases.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-amber-300">•</span>
                    <span className="sans flex items-center gap-1.5">
                      <Gavel className="h-4 w-4" strokeWidth={2} />
                      {courtEventCount} upcoming court date{courtEventCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative z-10">
                <QuickCreateMenu onCreateTask={() => {}} />
              </div>
            </div>
          </div>

          {/* Lead Tracking Chart */}
          <LeadTrackingChart />

          {/* KPI Cards */}
          <KPICards
            caseCount={dashboardData.case_count || 0}
            pendingIntakes={dashboardData.pending_intakes || 0}
            unreadMessages={dashboardData.unread_messages || 0}
            pendingApprovals={dashboardData.pending_approvals || 0}
            upcomingCourtDates={courtEventCount}
          />

          {/* Lead Pipeline Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="sans text-xs font-bold text-amber-900 uppercase tracking-[0.15em] flex items-center gap-3">
                <div className="h-px w-8 bg-amber-900" />
                Lead Pipeline
              </h2>
              <Link
                href="/professional/cases"
                className="sans text-xs font-bold text-amber-900 hover:text-amber-950 transition-colors flex items-center gap-1.5 border-b border-amber-900/20 hover:border-amber-900/40"
              >
                All Cases
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <LeadPipeline cases={allCases} />
          </div>

          {/* Active Alerts */}
          <Card className="border-2 border-red-900/30 bg-white shadow-lg metric-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="sans text-[10px] font-bold text-red-900/60 tracking-[0.2em] uppercase">
                    Urgent Matters
                  </span>
                </div>
                <CardTitle className="serif text-xl font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-900" strokeWidth={2} />
                  Active Alerts
                </CardTitle>
                <CardDescription className="sans text-xs text-slate-600">
                  Items requiring immediate attention
                </CardDescription>
              </div>
              {dashboardData.alerts?.length > 0 && (
                <Badge className="bg-red-50 text-red-900 border-2 border-red-900/30 sans font-bold">
                  {dashboardData.alerts.length}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {dashboardData.alerts?.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.alerts.slice(0, 5).map((alert: any, index: number) => (
                    <AlertItem key={index} alert={alert} />
                  ))}
                  {dashboardData.alerts.length > 5 && (
                    <Button variant="ghost" className="w-full sans text-xs text-slate-600 hover:text-slate-900 font-medium">
                      View {dashboardData.alerts.length - 5} more alerts
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-10">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-200" strokeWidth={1.5} />
                  <p className="serif text-sm italic text-slate-400">All matters current — no alerts pending</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Three Column: Court Events · Tasks · Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Court Events */}
            <Card className="border-2 border-slate-900/30 bg-white shadow-lg metric-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-baseline gap-2">
                    <span className="sans text-[10px] font-bold text-slate-900/60 tracking-[0.2em] uppercase">
                      Docket
                    </span>
                  </div>
                  {courtEventCount > 0 && (
                    <Badge className="bg-slate-50 text-slate-900 border-2 border-slate-900/30 sans font-bold text-xs">
                      {courtEventCount}
                    </Badge>
                  )}
                </div>
                <CardTitle className="serif text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-slate-900" strokeWidth={2} />
                  Court Events
                </CardTitle>
                <CardDescription className="sans text-xs text-slate-600">Next 30 days</CardDescription>
              </CardHeader>
              <CardContent className="pt-1">
                <CourtDatesWidget events={allEvents} />
              </CardContent>
            </Card>

            {/* Tasks */}
            <TasksWidget token={token} />

            {/* Recent Activity */}
            <Card className="border-2 border-slate-300 bg-white shadow-lg metric-card">
              <CardHeader className="pb-3">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="sans text-[10px] font-bold text-slate-900/60 tracking-[0.2em] uppercase">
                    Activity Log
                  </span>
                </div>
                <CardTitle className="serif text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-900" strokeWidth={2} />
                  Recent Activity
                </CardTitle>
                <CardDescription className="sans text-xs text-slate-600">Latest case updates</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.recent_activity?.length > 0 ? (
                  <div className="space-y-1">
                    {dashboardData.recent_activity
                      .slice(0, 8)
                      .map((activity: any, index: number) => (
                        <CompactActivityItem key={index} activity={activity} />
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-10 w-10 mx-auto mb-3 text-slate-200" strokeWidth={1.5} />
                    <p className="serif text-sm italic text-slate-400">No recent activity recorded</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Alert Item - Editorial Style
function AlertItem({ alert }: { alert: any }) {
  const severityColors: Record<string, string> = {
    high: "bg-red-50 text-red-900 border-2 border-red-900/30",
    medium: "bg-amber-50 text-amber-900 border-2 border-amber-900/30",
    low: "bg-blue-50 text-blue-900 border-2 border-blue-900/30",
  };

  const typeIcons: Record<string, React.ReactNode> = {
    intake_pending: <FileText className="h-4 w-4" strokeWidth={2} />,
    access_request: <Users className="h-4 w-4" strokeWidth={2} />,
    court_event: <Calendar className="h-4 w-4" strokeWidth={2} />,
    message_received: <MessageSquare className="h-4 w-4" strokeWidth={2} />,
    exchange_reminder: <Clock className="h-4 w-4" strokeWidth={2} />,
    compliance_alert: <AlertTriangle className="h-4 w-4" strokeWidth={2} />,
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
        className={`flex items-start gap-4 p-4 rounded-sm border cursor-pointer hover:shadow-md transition-all ${
          severityColors[alert.severity] || severityColors.medium
        }`}
      >
        <div className="mt-0.5 shrink-0">
          {typeIcons[alert.type] || <Bell className="h-4 w-4" strokeWidth={2} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="sans font-bold text-sm leading-snug">{alert.title}</p>
          <p className="sans text-xs opacity-80 mt-1 line-clamp-1">{alert.message}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant={alert.severity === "high" ? "error" : "secondary"}
            className="sans text-[10px] font-bold uppercase tracking-wider"
          >
            {alert.severity}
          </Badge>
          <ArrowRight className="h-4 w-4 opacity-60" strokeWidth={2} />
        </div>
      </div>
    </Link>
  );
}

// Compact Activity Item - Editorial Style
function CompactActivityItem({ activity }: { activity: any }) {
  const typeIcons: Record<string, React.ReactNode> = {
    intake_completed: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" strokeWidth={2} />,
    intake_updated: <FileText className="h-3.5 w-3.5 text-blue-700" strokeWidth={2} />,
    message_received: <MessageSquare className="h-3.5 w-3.5 text-purple-700" strokeWidth={2} />,
    agreement_update: <FileText className="h-3.5 w-3.5 text-amber-700" strokeWidth={2} />,
    exchange_completed: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" strokeWidth={2} />,
    exchange_missed: <AlertTriangle className="h-3.5 w-3.5 text-red-700" strokeWidth={2} />,
    compliance_change: <TrendingUp className="h-3.5 w-3.5 text-amber-700" strokeWidth={2} />,
    court_event_created: <Calendar className="h-3.5 w-3.5 text-purple-700" strokeWidth={2} />,
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
      <div className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-sm hover:bg-amber-50/40 transition-colors cursor-pointer border border-transparent hover:border-amber-900/10">
        <div className="shrink-0">
          {typeIcons[activity.activity_type] || (
            <Clock className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
          )}
        </div>
        <p className="sans text-xs text-slate-700 flex-1 min-w-0 truncate font-medium">
          {activity.title}
        </p>
        <span className="sans text-[10px] text-slate-400 shrink-0 font-semibold">
          {formatTime(activity.timestamp)}
        </span>
      </div>
    </Link>
  );
}
