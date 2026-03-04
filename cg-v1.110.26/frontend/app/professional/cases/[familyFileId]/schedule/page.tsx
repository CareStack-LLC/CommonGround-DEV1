"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Calendar,
  ArrowLeft,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  ChevronDown,
  Navigation,
  Camera,
  Shield,
  User,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfessionalAuth } from "../../../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CustodyExchange {
  id: string;
  family_file_id: string;
  exchange_type: string;
  scheduled_date: string;
  scheduled_time: string;
  location_name: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  pickup_parent_id: string;
  dropoff_parent_id: string;
  pickup_parent_name?: string;
  dropoff_parent_name?: string;
  status: "scheduled" | "completed" | "missed" | "cancelled";
  child_ids?: string[];
  children_names?: string[];
  is_silent_handoff?: boolean;
  grace_period_minutes?: number;
  notes?: string;
  // Check-in data
  pickup_checkin?: CheckInData;
  dropoff_checkin?: CheckInData;
}

interface CheckInData {
  checked_in_at: string;
  latitude?: number;
  longitude?: number;
  distance_from_location?: number;
  is_within_geofence?: boolean;
  photo_url?: string;
  qr_confirmed?: boolean;
}

interface ExchangeStats {
  total: number;
  completed: number;
  missed: number;
  scheduled: number;
  on_time_rate: number;
  geofence_compliance_rate: number;
}

export default function CaseSchedulePage() {
  const params = useParams();
  const { token } = useProfessionalAuth();
  const familyFileId = params.familyFileId as string;

  const [exchanges, setExchanges] = useState<CustodyExchange[]>([]);
  const [stats, setStats] = useState<ExchangeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [selectedExchange, setSelectedExchange] = useState<CustodyExchange | null>(null);

  useEffect(() => {
    fetchExchanges();
  }, [familyFileId, token, statusFilter, dateRange]);

  const fetchExchanges = async () => {
    if (!token || !familyFileId) return;

    setIsLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("days", dateRange);

      // Fetch exchanges
      const response = await fetch(
        `${API_BASE}/api/v1/exchanges/case/${familyFileId}/history?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setExchanges(data.exchanges || data || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }

      // Fetch stats separately if not included
      if (!stats) {
        const statsResponse = await fetch(
          `${API_BASE}/api/v1/professional/cases/${familyFileId}/compliance/exchanges`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      }
    } catch (error) {
      console.error("Error fetching exchanges:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
      missed: { color: "bg-red-100 text-red-800", icon: XCircle },
      scheduled: { color: "bg-blue-100 text-blue-800", icon: Clock },
      cancelled: { color: "bg-gray-100 text-gray-800", icon: AlertCircle },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDateTime = (date: string, time?: string) => {
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return time ? `${dateStr} at ${time}` : dateStr;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={`/professional/cases/${familyFileId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Case
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-amber-100 text-amber-600 rounded-xl">
            <Calendar className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Custody Schedule</h1>
            <p className="text-muted-foreground">
              Exchange history and check-in verification
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Exchanges"
            value={stats.total}
            icon={<Calendar className="h-5 w-5" />}
            color="blue"
          />
          <StatCard
            label="Completed"
            value={stats.completed}
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="emerald"
          />
          <StatCard
            label="Missed"
            value={stats.missed}
            icon={<XCircle className="h-5 w-5" />}
            color="red"
          />
          <StatCard
            label="On-Time Rate"
            value={`${Math.round(stats.on_time_rate * 100)}%`}
            icon={<Clock className="h-5 w-5" />}
            color="amber"
          />
        </div>
      )}

      {/* Compliance Summary */}
      {stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-500" />
              Compliance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Geofence Compliance</span>
                <span className="font-semibold">
                  {Math.round((stats.geofence_compliance_rate || 0) * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Completion Rate</span>
                <span className="font-semibold">
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[150px]">
            <Clock className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Exchanges List */}
      <div className="space-y-4">
        {exchanges.length > 0 ? (
          exchanges.map((exchange) => (
            <ExchangeCard
              key={exchange.id}
              exchange={exchange}
              onViewDetails={() => setSelectedExchange(exchange)}
            />
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground mb-2">No exchanges found</h3>
              <p className="text-muted-foreground text-sm">
                No custody exchanges match your current filters.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Exchange Detail Modal */}
      {selectedExchange && (
        <ExchangeDetailModal
          exchange={selectedExchange}
          onClose={() => setSelectedExchange(null)}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "red" | "amber";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Exchange Card Component
function ExchangeCard({
  exchange,
  onViewDetails,
}: {
  exchange: CustodyExchange;
  onViewDetails: () => void;
}) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
      missed: { color: "bg-red-100 text-red-800", icon: XCircle },
      scheduled: { color: "bg-blue-100 text-blue-800", icon: Clock },
      cancelled: { color: "bg-gray-100 text-gray-800", icon: AlertCircle },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const hasGPSEvidence = exchange.pickup_checkin?.latitude || exchange.dropoff_checkin?.latitude;
  const hasPhotoEvidence = exchange.pickup_checkin?.photo_url || exchange.dropoff_checkin?.photo_url;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Date and Time */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center justify-center w-14 h-14 bg-amber-100 text-amber-700 rounded-lg">
              <span className="text-xs font-medium">
                {new Date(exchange.scheduled_date).toLocaleDateString("en-US", { month: "short" })}
              </span>
              <span className="text-xl font-bold leading-none">
                {new Date(exchange.scheduled_date).getDate()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                {getStatusBadge(exchange.status)}
                {exchange.is_silent_handoff && (
                  <Badge variant="outline" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Silent Handoff
                  </Badge>
                )}
              </div>
              <p className="font-medium text-foreground">
                {exchange.exchange_type || "Custody Exchange"}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="h-3.5 w-3.5" />
                {exchange.scheduled_time || "Time not set"}
              </p>
            </div>
          </div>

          {/* Center: Location and Participants */}
          <div className="flex-1 lg:px-4">
            <p className="text-sm flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {exchange.location_name || "Location not specified"}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-blue-500" />
                {exchange.pickup_parent_name || "Pickup parent"}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-emerald-500" />
                {exchange.dropoff_parent_name || "Dropoff parent"}
              </span>
            </div>
            {exchange.children_names && exchange.children_names.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Children: {exchange.children_names.join(", ")}
              </p>
            )}
          </div>

          {/* Right: Evidence Indicators and Action */}
          <div className="flex items-center gap-3">
            {/* Evidence Badges */}
            <div className="flex items-center gap-2">
              {hasGPSEvidence && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  <Navigation className="h-3 w-3 mr-1" />
                  GPS
                </Badge>
              )}
              {hasPhotoEvidence && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  <Camera className="h-3 w-3 mr-1" />
                  Photo
                </Badge>
              )}
              {exchange.pickup_checkin?.qr_confirmed && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  QR
                </Badge>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={onViewDetails}>
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Exchange Detail Modal
function ExchangeDetailModal({
  exchange,
  onClose,
}: {
  exchange: CustodyExchange;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Exchange Details</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
          <CardDescription>
            {new Date(exchange.scheduled_date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {exchange.scheduled_time && ` at ${exchange.scheduled_time}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status and Type */}
          <div className="flex items-center gap-4">
            <Badge
              className={
                exchange.status === "completed"
                  ? "bg-emerald-100 text-emerald-800"
                  : exchange.status === "missed"
                  ? "bg-red-100 text-red-800"
                  : "bg-blue-100 text-blue-800"
              }
            >
              {exchange.status.charAt(0).toUpperCase() + exchange.status.slice(1)}
            </Badge>
            {exchange.is_silent_handoff && (
              <Badge variant="outline">
                <Shield className="h-3 w-3 mr-1" />
                Silent Handoff
              </Badge>
            )}
          </div>

          {/* Location */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Location</h4>
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{exchange.location_name}</p>
                {exchange.location_address && (
                  <p className="text-sm text-muted-foreground">{exchange.location_address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Pickup Parent</h4>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium text-blue-800">
                  {exchange.pickup_parent_name || "Not specified"}
                </p>
                {exchange.pickup_checkin && (
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-blue-700">
                      Checked in: {new Date(exchange.pickup_checkin.checked_in_at).toLocaleTimeString()}
                    </p>
                    {exchange.pickup_checkin.is_within_geofence !== undefined && (
                      <p className={exchange.pickup_checkin.is_within_geofence ? "text-green-600" : "text-red-600"}>
                        {exchange.pickup_checkin.is_within_geofence
                          ? "Within geofence"
                          : `${Math.round(exchange.pickup_checkin.distance_from_location || 0)}m away`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Dropoff Parent</h4>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="font-medium text-emerald-800">
                  {exchange.dropoff_parent_name || "Not specified"}
                </p>
                {exchange.dropoff_checkin && (
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-emerald-700">
                      Checked in: {new Date(exchange.dropoff_checkin.checked_in_at).toLocaleTimeString()}
                    </p>
                    {exchange.dropoff_checkin.is_within_geofence !== undefined && (
                      <p className={exchange.dropoff_checkin.is_within_geofence ? "text-green-600" : "text-red-600"}>
                        {exchange.dropoff_checkin.is_within_geofence
                          ? "Within geofence"
                          : `${Math.round(exchange.dropoff_checkin.distance_from_location || 0)}m away`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Photo Evidence */}
          {(exchange.pickup_checkin?.photo_url || exchange.dropoff_checkin?.photo_url) && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Photo Evidence</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {exchange.pickup_checkin?.photo_url && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Pickup Check-in</p>
                    <img
                      src={exchange.pickup_checkin.photo_url}
                      alt="Pickup check-in"
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                  </div>
                )}
                {exchange.dropoff_checkin?.photo_url && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Dropoff Check-in</p>
                    <img
                      src={exchange.dropoff_checkin.photo_url}
                      alt="Dropoff check-in"
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Children */}
          {exchange.children_names && exchange.children_names.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Children</h4>
              <div className="flex flex-wrap gap-2">
                {exchange.children_names.map((name, index) => (
                  <Badge key={index} variant="outline">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {exchange.notes && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Notes</h4>
              <p className="text-sm bg-muted/50 p-3 rounded-lg">{exchange.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
