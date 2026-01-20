"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderOpen,
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
  Bot,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProfessionalAuth } from "../layout";

export default function ProfessionalDashboardPage() {
  const { profile, dashboardData, activeFirm, refreshDashboard } = useProfessionalAuth();

  // Refresh dashboard on mount
  useEffect(() => {
    refreshDashboard();
  }, [activeFirm]);

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {profile?.user_first_name || "Professional"}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your cases today.
          </p>
        </div>
        <Button asChild>
          <Link href="/professional/cases">
            View All Cases
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Cases"
          value={dashboardData.case_count || 0}
          icon={<FolderOpen className="h-5 w-5" />}
          color="teal"
          href="/professional/cases"
        />
        <StatCard
          title="Pending Intakes"
          value={dashboardData.pending_intakes || 0}
          icon={<FileText className="h-5 w-5" />}
          color="amber"
          href="/professional/intake?tab=aria&status=pending"
        />
        <StatCard
          title="Unread Messages"
          value={dashboardData.unread_messages || 0}
          icon={<MessageSquare className="h-5 w-5" />}
          color="blue"
          href="/professional/messages?filter=unread"
        />
        <StatCard
          title="Pending Approvals"
          value={dashboardData.pending_approvals || 0}
          icon={<Clock className="h-5 w-5" />}
          color="purple"
          href="/professional/intake?tab=invitations&status=pending"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Alerts Section */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Active Alerts
              </CardTitle>
              <CardDescription>Items requiring your attention</CardDescription>
            </div>
            {dashboardData.alerts?.length > 0 && (
              <Badge variant="warning">{dashboardData.alerts.length} alerts</Badge>
            )}
          </CardHeader>
          <CardContent>
            {dashboardData.alerts?.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.alerts.slice(0, 5).map((alert: any, index: number) => (
                  <AlertItem key={index} alert={alert} />
                ))}
                {dashboardData.alerts.length > 5 && (
                  <Button variant="ghost" className="w-full text-muted-foreground">
                    View {dashboardData.alerts.length - 5} more alerts
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-teal-500" />
                <p>No active alerts. You're all caught up!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Upcoming Events
            </CardTitle>
            <CardDescription>Next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.upcoming_events?.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.upcoming_events.slice(0, 5).map((event: any, index: number) => (
                  <EventItem key={index} event={event} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming events</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal-500" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest updates across your cases</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardData.recent_activity?.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.recent_activity.slice(0, 10).map((activity: any, index: number) => (
                <ActivityItem key={index} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon,
  color,
  href,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "teal" | "amber" | "blue" | "purple";
  href: string;
}) {
  const colorClasses = {
    teal: {
      card: "bg-gradient-to-br from-teal-50 to-white border-teal-200/70 hover:border-teal-300",
      icon: "bg-teal-100 text-teal-600",
      value: "text-slate-900",
    },
    amber: {
      card: "bg-gradient-to-br from-amber-50 to-white border-amber-200/70 hover:border-amber-300",
      icon: "bg-amber-100 text-amber-600",
      value: "text-slate-900",
    },
    blue: {
      card: "bg-gradient-to-br from-blue-50 to-white border-blue-200/70 hover:border-blue-300",
      icon: "bg-blue-100 text-blue-600",
      value: "text-slate-900",
    },
    purple: {
      card: "bg-gradient-to-br from-purple-50 to-white border-purple-200/70 hover:border-purple-300",
      icon: "bg-purple-100 text-purple-600",
      value: "text-slate-900",
    },
  };

  const styles = colorClasses[color];

  return (
    <Link href={href}>
      <Card className={`hover:shadow-lg transition-all duration-200 cursor-pointer border ${styles.card}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{title}</p>
              <p className={`text-3xl font-bold mt-1 ${styles.value}`}>{value}</p>
            </div>
            <div className={`p-3 rounded-xl shadow-sm ${styles.icon}`}>{icon}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Alert Item Component
function AlertItem({ alert }: { alert: any }) {
  const severityColors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-blue-100 text-blue-800 border-blue-200",
  };

  const typeIcons: Record<string, React.ReactNode> = {
    intake_pending: <FileText className="h-4 w-4" />,
    access_request: <Users className="h-4 w-4" />,
    court_event: <Calendar className="h-4 w-4" />,
    message_received: <MessageSquare className="h-4 w-4" />,
    exchange_reminder: <Clock className="h-4 w-4" />,
    compliance_alert: <AlertTriangle className="h-4 w-4" />,
  };

  // Determine the navigation URL based on alert type and data
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
      case "exchange_reminder":
        return alert.family_file_id
          ? `/professional/cases/${alert.family_file_id}/schedule`
          : "/professional/cases";
      case "compliance_alert":
        return alert.family_file_id
          ? `/professional/cases/${alert.family_file_id}/compliance`
          : "/professional/cases";
      default:
        return alert.family_file_id
          ? `/professional/cases/${alert.family_file_id}`
          : "/professional/cases";
    }
  };

  return (
    <Link href={getAlertHref()}>
      <div
        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
          severityColors[alert.severity as keyof typeof severityColors] || severityColors.medium
        }`}
      >
        <div className="mt-0.5">{typeIcons[alert.type] || <Bell className="h-4 w-4" />}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{alert.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={alert.severity === "high" ? "error" : "secondary"} className="text-xs">
            {alert.severity}
          </Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}

// Event Item Component
function EventItem({ event }: { event: any }) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Determine the navigation URL based on event type and data
  const getEventHref = () => {
    if (event.family_file_id) {
      // If it's a case-related event, go to that case's timeline
      return `/professional/cases/${event.family_file_id}/timeline`;
    }
    // Otherwise, go to the professional calendar (to be created)
    return "/professional/calendar";
  };

  return (
    <Link href={getEventHref()}>
      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 hover:shadow-sm cursor-pointer transition-all">
        <div className="flex flex-col items-center justify-center w-12 h-12 bg-blue-100 text-blue-700 rounded-lg">
          <span className="text-xs font-medium">
            {new Date(event.event_date).toLocaleDateString("en-US", { month: "short" })}
          </span>
          <span className="text-lg font-bold leading-none">
            {new Date(event.event_date).getDate()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{event.title}</p>
          <p className="text-xs text-muted-foreground">
            {event.event_type} {event.start_time && `at ${event.start_time}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {event.is_mandatory && (
            <Badge variant="warning" className="text-xs">
              Required
            </Badge>
          )}
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}

// Activity Item Component
function ActivityItem({ activity }: { activity: any }) {
  const typeIcons: Record<string, React.ReactNode> = {
    intake_completed: <CheckCircle2 className="h-4 w-4 text-teal-500" />,
    intake_updated: <FileText className="h-4 w-4 text-blue-500" />,
    message_received: <MessageSquare className="h-4 w-4 text-purple-500" />,
    agreement_update: <FileText className="h-4 w-4 text-amber-500" />,
    exchange_completed: <CheckCircle2 className="h-4 w-4 text-teal-500" />,
    exchange_missed: <AlertTriangle className="h-4 w-4 text-red-500" />,
    compliance_change: <TrendingUp className="h-4 w-4 text-teal-500" />,
    court_event_created: <Calendar className="h-4 w-4 text-purple-500" />,
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  // Determine navigation URL based on activity type
  const getActivityHref = () => {
    const familyFileId = activity.family_file_id;

    switch (activity.activity_type) {
      case "intake_completed":
      case "intake_updated":
        return activity.session_id
          ? `/professional/intake/${activity.session_id}`
          : "/professional/intake";
      case "message_received":
        return familyFileId
          ? `/professional/cases/${familyFileId}/messages`
          : "/professional/messages";
      case "agreement_update":
        return familyFileId
          ? `/professional/cases/${familyFileId}/agreement`
          : "/professional/cases";
      case "exchange_completed":
      case "exchange_missed":
        return familyFileId
          ? `/professional/cases/${familyFileId}/schedule`
          : "/professional/cases";
      case "compliance_change":
        return familyFileId
          ? `/professional/cases/${familyFileId}/compliance`
          : "/professional/cases";
      case "court_event_created":
        return familyFileId
          ? `/professional/cases/${familyFileId}/timeline`
          : "/professional/cases";
      default:
        return familyFileId
          ? `/professional/cases/${familyFileId}`
          : "/professional/cases";
    }
  };

  return (
    <Link href={getActivityHref()}>
      <div className="flex items-center gap-3 py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors">
        <div className="shrink-0">{typeIcons[activity.activity_type] || <Clock className="h-4 w-4" />}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{activity.title}</p>
          <p className="text-xs text-muted-foreground">{activity.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">{formatTime(activity.timestamp)}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}
