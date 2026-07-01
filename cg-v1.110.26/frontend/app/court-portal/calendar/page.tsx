"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Gavel,
  CheckCircle,
  AlertCircle,
  Scale,
  Plus,
  Filter,
} from "lucide-react";
import { useCourtAuth } from "../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCourtAuthToken } from "@/lib/court-api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CourtHearing {
  id: string;
  case_id: string;
  case_name?: string;
  hearing_type: string;
  scheduled_date: string;
  scheduled_time?: string;
  department?: string;
  room?: string;
  judge_name?: string;
  outcome?: string;
  petitioner_attended?: boolean;
  respondent_attended?: boolean;
  notes?: string;
}

const HEARING_TYPES: Record<string, { label: string; color: string; icon: typeof Gavel }> = {
  rfo_hearing: { label: "RFO Hearing", color: "bg-[#E0EFF8] text-[#1E4E6B]", icon: Gavel },
  status_conference: { label: "Status Conference", color: "bg-[#E0EFF8] text-[#1E4E6B]", icon: Users },
  trial: { label: "Trial", color: "bg-[#FEE2E2] text-[#9B2C2C]", icon: Scale },
  settlement_conference: { label: "Settlement Conference", color: "bg-[#E8F4F0] text-[#2D8A70]", icon: Users },
  mediation: { label: "Mediation", color: "bg-[#FEF7ED] text-[#E09520]", icon: Users },
  other: { label: "Other Hearing", color: "bg-gray-100 text-gray-700", icon: CalendarIcon },
};

export default function CourtCalendarPage() {
  const router = useRouter();
  const { professional, token, isLoading } = useCourtAuth();

  const [hearings, setHearings] = useState<CourtHearing[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("list");

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    if (professional) {
      loadHearings();
    }
  }, [professional, currentDate]);

  const loadHearings = async () => {
    try {
      setIsLoadingData(true);
      setError(null);

      const authToken = token || getCourtAuthToken();
      const headers: HeadersInit = authToken ? { Authorization: `Bearer ${authToken}` } : {};

      // Fetch hearings for current month
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const response = await fetch(
        `${API_BASE}/court/hearings?start_date=${startDate.toISOString().split("T")[0]}&end_date=${endDate.toISOString().split("T")[0]}`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        setHearings(data || []);
      } else {
        setHearings([]);
      }
    } catch (err) {
      console.error("Failed to load hearings:", err);
      setError("Failed to load court hearings");
    } finally {
      setIsLoadingData(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Group hearings by date
  const hearingsByDate = hearings.reduce((acc, hearing) => {
    const date = hearing.scheduled_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(hearing);
    return acc;
  }, {} as Record<string, CourtHearing[]>);

  // Get upcoming hearings (next 7 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const upcomingHearings = hearings.filter((h) => {
    const hearingDate = new Date(h.scheduled_date);
    return hearingDate >= today && hearingDate <= nextWeek && !h.outcome;
  });

  // Get today's hearings
  const todaysHearings = hearings.filter((h) => {
    const hearingDate = new Date(h.scheduled_date);
    hearingDate.setHours(0, 0, 0, 0);
    return hearingDate.getTime() === today.getTime();
  });

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2D6A8F] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-[#2D6A8F]" />
            Court Calendar
          </h1>
          <p className="text-muted-foreground">
            Manage hearings and court events across all cases
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-[#E0EFF8] to-white border-[#E0EFF8]">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#2D6A8F] font-medium">Today</p>
                <p className="text-2xl font-bold text-[#1E4E6B]">{todaysHearings.length}</p>
                <p className="text-xs text-[#2D6A8F]">
                  {todaysHearings.length === 1 ? "hearing" : "hearings"}
                </p>
              </div>
              <CalendarIcon className="h-8 w-8 text-[#4BA8C8]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#FEF7ED] to-white border-[#FEF7ED]">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#E09520] font-medium">Next 7 Days</p>
                <p className="text-2xl font-bold text-[#E09520]">{upcomingHearings.length}</p>
                <p className="text-xs text-[#F5A623]">upcoming</p>
              </div>
              <Clock className="h-8 w-8 text-[#F5A623]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#E8F4F0] to-white border-[#E8F4F0]">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#2D8A70] font-medium">This Month</p>
                <p className="text-2xl font-bold text-[#2D8A70]">{hearings.length}</p>
                <p className="text-xs text-[#3DAA8A]">total scheduled</p>
              </div>
              <Gavel className="h-8 w-8 text-[#5BC4A0]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month Navigation */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <h2 className="text-lg font-semibold">
              {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Hearings */}
      {todaysHearings.length > 0 && (
        <Card className="border-[#E0EFF8] bg-[#E0EFF8]/30">
          <CardHeader>
            <CardTitle className="text-[#1E3A4A] flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Today&apos;s Hearings
            </CardTitle>
            <CardDescription className="text-[#2D6A8F]">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaysHearings.map((hearing) => (
                <HearingCard key={hearing.id} hearing={hearing} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoadingData && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2D6A8F] border-t-transparent mx-auto" />
              <p className="mt-4 text-muted-foreground">Loading calendar...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hearings List */}
      {!isLoadingData && (
        <Card>
          <CardHeader>
            <CardTitle>All Hearings This Month</CardTitle>
            <CardDescription>
              {hearings.length} hearing{hearings.length !== 1 ? "s" : ""} scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hearings.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No hearings scheduled for this month</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(hearingsByDate)
                  .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                  .map(([date, dateHearings]) => (
                    <div key={date}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                        {formatDate(date)}
                      </h3>
                      <div className="space-y-2">
                        {dateHearings.map((hearing) => (
                          <HearingCard key={hearing.id} hearing={hearing} />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HearingCard({ hearing }: { hearing: CourtHearing }) {
  const typeInfo = HEARING_TYPES[hearing.hearing_type] || HEARING_TYPES.other;
  const TypeIcon = typeInfo.icon;

  const formatTime = (timeString?: string) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <Link
      href={`/court-portal/cases/${hearing.case_id}/events`}
      className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-md transition-shadow group"
    >
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${typeInfo.color}`}>
          <TypeIcon className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900">{typeInfo.label}</p>
            {hearing.outcome ? (
              <Badge variant="success" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Scheduled
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {hearing.case_name || `Case ${hearing.case_id.slice(0, 8)}...`}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
            {hearing.scheduled_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(hearing.scheduled_time)}
              </span>
            )}
            {hearing.department && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Dept. {hearing.department}
                {hearing.room && `, Room ${hearing.room}`}
              </span>
            )}
            {hearing.judge_name && (
              <span className="flex items-center gap-1">
                <Gavel className="h-3 w-3" />
                {hearing.judge_name}
              </span>
            )}
          </div>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
    </Link>
  );
}
