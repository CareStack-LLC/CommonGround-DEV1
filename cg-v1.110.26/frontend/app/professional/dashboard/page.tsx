"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Briefcase,
  UserPlus,
  MessageSquare,
  Calendar,
  FileBarChart,
  Clock,
  ArrowRight,
  Bell,
  CheckCircle2,
  AlertCircle,
  FileText,
  Scale,
  Users,
} from "lucide-react";
import { useProfessionalAuth } from "../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Helpers ---

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function activityIcon(type: string) {
  switch (type) {
    case "message":
    case "message_received":
      return <MessageSquare className="h-4 w-4 text-cg-slate" />;
    case "exchange":
    case "exchange_completed":
      return <ArrowRight className="h-4 w-4 text-cg-sage" />;
    case "aria_flag":
    case "compliance_change":
      return <AlertCircle className="h-4 w-4 text-cg-amber" />;
    case "document":
    case "intake_completed":
    case "intake_updated":
      return <FileText className="h-4 w-4 text-slate-500" />;
    case "agreement":
    case "agreement_update":
      return <Scale className="h-4 w-4 text-foreground" />;
    case "court_event_created":
      return <Calendar className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-slate-400" />;
  }
}

function eventTypeBadge(type: string) {
  const t = (type || "").toLowerCase();
  if (t.includes("court") || t.includes("hearing") || t.includes("trial")) {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
        Court
      </span>
    );
  }
  if (t.includes("filing") || t.includes("deadline")) {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cg-amber-subtle text-cg-amber-deep border border-cg-amber-tint">
        Filing
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
      Meeting
    </span>
  );
}

// --- Main Page ---

export default function ProfessionalDashboardPage() {
  const { profile, dashboardData, activeFirm, refreshDashboard, token } =
    useProfessionalAuth();

  useEffect(() => {
    refreshDashboard();
  }, [activeFirm]);

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  const firstName = profile?.user_first_name || "there";
  const caseCount = dashboardData.case_count || 0;
  const pendingIntakes = dashboardData.pending_intakes || 0;
  const unreadMessages = dashboardData.unread_messages || 0;
  const upcomingEvents = dashboardData.upcoming_events || [];
  const recentActivity = dashboardData.recent_activity || [];
  const pendingApprovals = dashboardData.pending_approvals || 0;
  const pendingFirmInvitations = dashboardData.pending_firm_invitations || 0;

  const courtEventCount = upcomingEvents.filter((e: any) => {
    const t = (e.event_type || "").toLowerCase();
    return (
      t.includes("court") ||
      t.includes("hearing") ||
      t.includes("trial") ||
      t.includes("mediation") ||
      e.is_mandatory
    );
  }).length;

  const pendingActionCount = unreadMessages + pendingIntakes + pendingFirmInvitations;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ===== Section 1: Header ===== */}
        <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cg-sage via-cg-slate to-cg-sage rounded-t-2xl" />

          <div className="relative z-10">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {getGreeting()}, {firstName}
              </h1>
              <p className="text-sm text-slate-500 mt-1">{formatDate()}</p>
            </div>

            <div className="flex flex-wrap gap-6 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">{caseCount}</span>
                <span className="text-sm text-slate-500">Active Cases</span>
              </div>
              <div className="w-px h-8 bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">{courtEventCount}</span>
                <span className="text-sm text-slate-500">Upcoming Dates</span>
              </div>
              <div className="w-px h-8 bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">{pendingActionCount}</span>
                <span className="text-sm text-slate-500">Pending Actions</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/professional/intake"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cg-sage hover:bg-cg-sage-dark text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <UserPlus className="h-4 w-4" />
                New Intake
              </Link>
              <Link
                href="/professional/reports/generate"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-background text-slate-700 text-sm font-semibold transition-colors border border-slate-200"
              >
                <FileBarChart className="h-4 w-4" />
                Generate Report
              </Link>
              <Link
                href="/professional/cases"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-background text-slate-700 text-sm font-semibold transition-colors border border-slate-200"
              >
                <Briefcase className="h-4 w-4" />
                View Cases
              </Link>
            </div>
          </div>
        </div>

        {/* ===== Section 2: Stats Grid ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Cases */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-cg-sage/10 flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5 text-cg-sage" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{caseCount}</p>
              <p className="text-xs text-slate-500 font-medium">Active Cases</p>
            </div>
          </div>

          {/* Pending Intake */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-cg-slate/10 flex items-center justify-center shrink-0">
              <UserPlus className="h-5 w-5 text-cg-slate" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingIntakes}</p>
              <p className="text-xs text-slate-500 font-medium">Pending Intake</p>
            </div>
          </div>

          {/* Unread Messages */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-cg-amber-subtle flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5 text-cg-amber-dark" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{unreadMessages}</p>
              <p className="text-xs text-slate-500 font-medium">Unread Messages</p>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{upcomingEvents.length}</p>
              <p className="text-xs text-slate-500 font-medium">Upcoming Deadlines</p>
            </div>
          </div>
        </div>

        {/* ===== Section 3: Two-Column Layout ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left Column: Recent Activity (3/5 = ~60%) */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5 text-cg-sage" />
                  Recent Activity
                </h2>
                <Link
                  href="/professional/cases"
                  className="text-xs font-medium text-cg-slate hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {recentActivity.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {recentActivity.slice(0, 10).map((activity: any, index: number) => {
                    const href = activity.family_file_id
                      ? `/professional/cases/${activity.family_file_id}`
                      : "/professional/cases";
                    return (
                      <Link key={index} href={href}>
                        <div className="flex items-start gap-3 py-3 hover:bg-background -mx-3 px-3 rounded-lg transition-colors cursor-pointer">
                          <div className="mt-0.5 shrink-0">
                            {activityIcon(activity.activity_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-800 font-medium leading-snug truncate">
                              {activity.title}
                            </p>
                            {activity.case_name && (
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                {activity.case_name}
                              </p>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 shrink-0 mt-0.5 font-medium">
                            {activity.timestamp ? relativeTime(activity.timestamp) : ""}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-10 w-10 mx-auto mb-3 text-slate-200" />
                  <p className="text-sm text-slate-400">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (2/5 = ~40%) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Upcoming Deadlines */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-cg-sage" />
                  Upcoming Deadlines
                </h2>
                <Link
                  href="/professional/calendar"
                  className="text-xs font-medium text-cg-slate hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  Calendar
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.slice(0, 7).map((event: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {event.title || event.event_title || "Event"}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {event.date || event.event_date
                            ? new Date(event.date || event.event_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : ""}
                        </p>
                      </div>
                      {eventTypeBadge(event.event_type || "")}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                  <p className="text-sm text-slate-400">No upcoming deadlines</p>
                </div>
              )}
            </div>

            {/* Pending Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-5">
                <Bell className="h-5 w-5 text-cg-amber" />
                Pending Actions
              </h2>

              <div className="space-y-1">
                {unreadMessages > 0 && (
                  <Link href="/professional/messages?filter=unread">
                    <div className="flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-background transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-4 w-4 text-cg-amber" />
                        <span className="text-sm text-slate-700 font-medium">Unread messages</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold bg-cg-amber-subtle text-cg-amber-deep px-2 py-0.5 rounded-full">
                          {unreadMessages}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                      </div>
                    </div>
                  </Link>
                )}

                {pendingIntakes > 0 && (
                  <Link href="/professional/intake?tab=aria&status=pending">
                    <div className="flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-background transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <UserPlus className="h-4 w-4 text-cg-slate" />
                        <span className="text-sm text-slate-700 font-medium">Pending intakes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold bg-cg-slate/10 text-cg-slate px-2 py-0.5 rounded-full">
                          {pendingIntakes}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                      </div>
                    </div>
                  </Link>
                )}

                {pendingFirmInvitations > 0 && (
                  <Link href="/professional/intake?tab=invitations">
                    <div className="flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-background transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-cg-sage" />
                        <span className="text-sm text-slate-700 font-medium">Case invitations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold bg-cg-sage/10 text-cg-sage px-2 py-0.5 rounded-full">
                          {pendingFirmInvitations}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                      </div>
                    </div>
                  </Link>
                )}

                {pendingApprovals > 0 && (
                  <Link href="/professional/cases">
                    <div className="flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-background transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-slate-500" />
                        <span className="text-sm text-slate-700 font-medium">Pending approvals</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {pendingApprovals}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                      </div>
                    </div>
                  </Link>
                )}

                {pendingActionCount === 0 && pendingApprovals === 0 && (
                  <div className="text-center py-6">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-cg-sage/40" />
                    <p className="text-sm text-slate-400">All caught up</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
