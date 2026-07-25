"use client";

import { AlertTriangle, Clock, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EventConflict {
  event_id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  overlap_minutes: number;
}

interface ConflictWarningProps {
  conflicts: EventConflict[];
  isLoading?: boolean;
}

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const formatOverlap = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  return `${hours}h ${remainingMinutes}m`;
};

export function ConflictWarning({ conflicts, isLoading }: ConflictWarningProps) {
  if (isLoading) {
    return (
      <Alert className="border-[#FBE3BF] bg-cg-amber-subtle">
        <Loader2 className="h-4 w-4 animate-spin text-[#E09520]" />
        <AlertTitle className="text-[#8F5E14]">Checking for conflicts...</AlertTitle>
        <AlertDescription className="text-[#B8791A]">
          Verifying your schedule for overlapping events.
        </AlertDescription>
      </Alert>
    );
  }

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="border-[#F8CE8A] bg-cg-amber-subtle">
      <AlertTriangle className="h-4 w-4 text-[#E09520]" />
      <AlertTitle className="text-[#8F5E14]">
        Schedule Conflict{conflicts.length > 1 ? "s" : ""} Detected
      </AlertTitle>
      <AlertDescription className="text-[#B8791A]">
        <p className="mb-3">
          This event overlaps with {conflicts.length} existing event
          {conflicts.length > 1 ? "s" : ""}. You can still create it, but consider
          rescheduling to avoid conflicts.
        </p>
        <div className="space-y-2">
          {conflicts.map((conflict) => (
            <div
              key={conflict.event_id}
              className="flex items-start gap-3 p-2 bg-white/60 rounded border border-[#FBE3BF]"
            >
              <Clock className="h-4 w-4 mt-0.5 text-[#E09520] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#6B460F] truncate">{conflict.title}</div>
                <div className="text-sm text-[#B8791A]">
                  {formatDate(conflict.start_time)} at {formatTime(conflict.start_time)} -{" "}
                  {formatTime(conflict.end_time)}
                </div>
                <div className="text-xs text-[#E09520] mt-1">
                  Overlaps by {formatOverlap(conflict.overlap_minutes)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}
