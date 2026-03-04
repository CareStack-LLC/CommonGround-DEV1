"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  FolderOpen,
  MessageSquare,
  Calendar,
  FileText,
  Bell,
  Bot,
  Users,
  Shield,
  DollarSign,
  Sparkles,
} from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  variant?: "default" | "minimal" | "dashed";
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  variant = "default",
}: EmptyStateProps) {
  const baseClasses =
    variant === "dashed"
      ? "border-dashed border-2 border-slate-200 bg-slate-50/50"
      : variant === "minimal"
      ? "border-slate-100 bg-white"
      : "border-slate-200 bg-gradient-to-b from-white to-slate-50/50";

  return (
    <Card className={baseClasses}>
      <CardContent className="py-16 text-center">
        <div className="flex flex-col items-center">
          <div className="p-4 bg-slate-100 rounded-2xl mb-4">{icon}</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
          {actionLabel && (actionHref || onAction) && (
            <>
              {actionHref ? (
                <Button asChild variant="default">
                  <Link href={actionHref}>{actionLabel}</Link>
                </Button>
              ) : (
                <Button onClick={onAction} variant="default">
                  {actionLabel}
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Pre-configured empty states for common scenarios
export function NoCasesEmpty() {
  return (
    <EmptyState
      icon={<FolderOpen className="h-12 w-12 text-slate-300" />}
      title="No Cases Yet"
      description="You haven't been assigned to any cases yet. Check your pending invitations or wait for new case assignments."
      actionLabel="View Pending Invitations"
      actionHref="/professional/intake?tab=invitations"
    />
  );
}

export function NoMessagesEmpty() {
  return (
    <EmptyState
      icon={<MessageSquare className="h-12 w-12 text-slate-300" />}
      title="No Messages"
      description="You're all caught up! New messages from clients will appear here."
      variant="minimal"
    />
  );
}

export function NoEventsEmpty() {
  return (
    <EmptyState
      icon={<Calendar className="h-12 w-12 text-slate-300" />}
      title="No Upcoming Events"
      description="There are no scheduled events in the next 7 days."
      variant="minimal"
    />
  );
}

export function NoReportsEmpty() {
  return (
    <EmptyState
      icon={<FileText className="h-12 w-12 text-slate-300" />}
      title="No Reports Generated Yet"
      description="Generate your first court-ready compliance report to get started. All reports are cryptographically signed with SHA-256 verification."
      actionLabel="Generate Report"
      actionHref="/professional/reports"
    />
  );
}

export function NoInvitationsEmpty() {
  return (
    <EmptyState
      icon={<Bell className="h-12 w-12 text-slate-300" />}
      title="No Pending Invitations"
      description="Case invitations from parents will appear here when they request representation through the directory."
      variant="dashed"
    />
  );
}

export function NoIntakesEmpty() {
  return (
    <EmptyState
      icon={<Bot className="h-12 w-12 text-slate-300" />}
      title="No Intake Sessions"
      description="Create your first ARIA-assisted intake session to onboard new clients efficiently."
      actionLabel="New ARIA Intake"
      actionHref="/professional/intake/new"
    />
  );
}

export function NoDataEmpty({ message = "No data available for this period" }: { message?: string }) {
  return (
    <EmptyState
      icon={<Shield className="h-12 w-12 text-slate-300" />}
      title="No Data Available"
      description={message}
      variant="minimal"
    />
  );
}

export function ComingSoonEmpty({
  title = "Coming Soon",
  description = "This feature is currently in development and will be available soon.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      icon={<Sparkles className="h-12 w-12 text-purple-300" />}
      title={title}
      description={description}
      variant="dashed"
    />
  );
}
