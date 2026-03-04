"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  Navigation,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  Calendar,
  User,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useCourtAuth } from "../../../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ExchangeComplianceResponse,
  ExchangeDetail,
  ParentExchangeMetrics,
} from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function ExchangeCompliancePage() {
  const params = useParams();
  const router = useRouter();
  const { professional, token, activeGrant, isLoading } = useCourtAuth();
  const caseId = params.id as string;

  const [compliance, setCompliance] = useState<ExchangeComplianceResponse | null>(null);
  const [details, setDetails] = useState<ExchangeDetail[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<ExchangeDetail | null>(null);

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    if (professional && caseId) {
      loadData();
    }
  }, [professional, caseId]);

  const loadData = async () => {
    setIsLoadingData(true);
    setError(null);

    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [complianceRes, detailsRes] = await Promise.all([
        fetch(`${API_BASE}/court/cases/${caseId}/exchange-compliance`, { headers }),
        fetch(`${API_BASE}/court/cases/${caseId}/exchange-details?include_maps=true`, { headers }),
      ]);

      if (!complianceRes.ok) {
        const errData = await complianceRes.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to load compliance data");
      }

      if (!detailsRes.ok) {
        const errData = await detailsRes.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to load exchange details");
      }

      const [complianceData, detailsData] = await Promise.all([
        complianceRes.json(),
        detailsRes.json(),
      ]);

      setCompliance(complianceData);
      setDetails(detailsData);
    } catch (err: any) {
      console.error("Failed to load exchange data:", err);
      setError(err.message || "Failed to load exchange compliance data");
    } finally {
      setIsLoadingData(false);
    }
  };

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading exchange data...</p>
        </div>
      </div>
    );
  }

  const statusConfig = {
    excellent: { label: "Excellent", color: "bg-green-100 text-green-800 border-green-200", icon: "text-green-600" },
    good: { label: "Good", color: "bg-blue-100 text-blue-800 border-blue-200", icon: "text-blue-600" },
    needs_improvement: { label: "Needs Improvement", color: "bg-amber-100 text-amber-800 border-amber-200", icon: "text-amber-600" },
    concerning: { label: "Concerning", color: "bg-red-100 text-red-800 border-red-200", icon: "text-red-600" },
    no_data: { label: "No Data", color: "bg-gray-100 text-gray-800 border-gray-200", icon: "text-gray-600" },
  };

  const status = compliance?.overall_status || "no_data";
  const statusInfo = statusConfig[status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/court-portal/cases/${caseId}`}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Navigation className="h-6 w-6 text-purple-600" />
              Exchange GPS Verification
            </h1>
            <p className="text-muted-foreground">
              Silent Handoff compliance data for custody exchanges
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={loadData} disabled={isLoadingData}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingData ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {compliance && (
        <>
          {/* Overall Status Card */}
          <Card className={`border-2 ${
            status === "excellent" ? "border-green-200 bg-green-50/50" :
            status === "good" ? "border-blue-200 bg-blue-50/50" :
            status === "needs_improvement" ? "border-amber-200 bg-amber-50/50" :
            status === "concerning" ? "border-red-200 bg-red-50/50" :
            "border-gray-200 bg-gray-50/50"
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    status === "excellent" ? "bg-green-100" :
                    status === "good" ? "bg-blue-100" :
                    status === "needs_improvement" ? "bg-amber-100" :
                    status === "concerning" ? "bg-red-100" :
                    "bg-gray-100"
                  }`}>
                    <Target className={`h-5 w-5 ${statusInfo.icon}`} />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      GPS Verification Overview
                      <Badge className={`${statusInfo.color} border`}>
                        {statusInfo.label}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {compliance.metrics.date_range.start && compliance.metrics.date_range.end
                        ? `${new Date(compliance.metrics.date_range.start).toLocaleDateString()} - ${new Date(compliance.metrics.date_range.end).toLocaleDateString()}`
                        : "Last 30 days"}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Total Exchanges"
                  value={compliance.metrics.total_exchanges}
                  icon={<Calendar className="h-4 w-4" />}
                />
                <MetricCard
                  label="GPS Verified"
                  value={`${compliance.metrics.gps_verified_rate.toFixed(0)}%`}
                  icon={<MapPin className="h-4 w-4" />}
                  color="purple"
                />
                <MetricCard
                  label="Geofence Compliance"
                  value={`${compliance.metrics.geofence_compliance_rate.toFixed(0)}%`}
                  icon={<Target className="h-4 w-4" />}
                  color={compliance.metrics.geofence_compliance_rate >= 90 ? "green" :
                         compliance.metrics.geofence_compliance_rate >= 70 ? "blue" : "amber"}
                />
                <MetricCard
                  label="On-Time Rate"
                  value={`${compliance.metrics.on_time_rate.toFixed(0)}%`}
                  icon={<Clock className="h-4 w-4" />}
                  color={compliance.metrics.on_time_rate >= 90 ? "green" :
                         compliance.metrics.on_time_rate >= 70 ? "blue" : "amber"}
                />
              </div>
            </CardContent>
          </Card>

          {/* Outcome Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <OutcomeCard
              label="Completed"
              count={compliance.metrics.completed}
              icon={<CheckCircle className="h-5 w-5" />}
              color="green"
            />
            <OutcomeCard
              label="Missed"
              count={compliance.metrics.missed}
              icon={<XCircle className="h-5 w-5" />}
              color="red"
            />
            <OutcomeCard
              label="One Party Only"
              count={compliance.metrics.one_party_only}
              icon={<User className="h-5 w-5" />}
              color="amber"
            />
            <OutcomeCard
              label="Disputed"
              count={compliance.metrics.disputed}
              icon={<AlertCircle className="h-5 w-5" />}
              color="orange"
            />
          </div>

          {/* Per-Parent Metrics */}
          <div className="grid md:grid-cols-2 gap-6">
            <ParentMetricsCard
              title="Petitioner Metrics"
              role="petitioner"
              metrics={compliance.metrics.petitioner_metrics}
            />
            <ParentMetricsCard
              title="Respondent Metrics"
              role="respondent"
              metrics={compliance.metrics.respondent_metrics}
            />
          </div>

          {/* Recent Exchanges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                Recent Exchange Instances
              </CardTitle>
              <CardDescription>
                Showing {compliance.recent_exchanges.length} most recent exchanges
              </CardDescription>
            </CardHeader>
            <CardContent>
              {compliance.recent_exchanges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No exchange data available for this period
                </div>
              ) : (
                <div className="space-y-3">
                  {compliance.recent_exchanges.map((exchange) => (
                    <ExchangeRow
                      key={exchange.id}
                      exchange={exchange}
                      onClick={() => {
                        const detail = details.find((d) => d.id === exchange.id);
                        setSelectedExchange(detail || null);
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Exchange List with Maps */}
          {details.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  Exchange Details with GPS Data
                </CardTitle>
                <CardDescription>
                  Detailed GPS verification data with static maps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {details.map((detail) => (
                    <ExchangeDetailCard key={detail.id} detail={detail} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Privacy Notice */}
      <Alert className="bg-blue-50 border-blue-200">
        <MapPin className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <span className="font-medium">Privacy Notice:</span>{" "}
          <span className="text-blue-700">
            GPS coordinates are captured only at the moment of check-in. No continuous tracking is performed.
            This data is provided as objective evidence for court proceedings.
          </span>
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Helper Components

function MetricCard({
  label,
  value,
  icon,
  color = "default",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "default" | "purple" | "green" | "blue" | "amber" | "red";
}) {
  const colorClasses = {
    default: "bg-secondary/50",
    purple: "bg-purple-50 border border-purple-200",
    green: "bg-green-50 border border-green-200",
    blue: "bg-blue-50 border border-blue-200",
    amber: "bg-amber-50 border border-amber-200",
    red: "bg-red-50 border border-red-200",
  };

  const iconColors = {
    default: "text-muted-foreground",
    purple: "text-purple-600",
    green: "text-green-600",
    blue: "text-blue-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };

  return (
    <div className={`p-4 rounded-xl ${colorClasses[color]}`}>
      <div className={`flex items-center gap-2 mb-2 ${iconColors[color]}`}>
        {icon}
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function OutcomeCard({
  label,
  count,
  icon,
  color,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: "green" | "red" | "amber" | "orange";
}) {
  const colorClasses = {
    green: "bg-green-50 border-green-200 text-green-600",
    red: "bg-red-50 border-red-200 text-red-600",
    amber: "bg-amber-50 border-amber-200 text-amber-600",
    orange: "bg-orange-50 border-orange-200 text-orange-600",
  };

  return (
    <Card className={`border ${colorClasses[color].split(" ")[1]}`}>
      <CardContent className={`p-4 ${colorClasses[color].split(" ")[0]}`}>
        <div className="flex items-center justify-between">
          <span className={colorClasses[color].split(" ")[2]}>{icon}</span>
          <span className="text-2xl font-bold text-foreground">{count}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function ParentMetricsCard({
  title,
  role,
  metrics,
}: {
  title: string;
  role: "petitioner" | "respondent";
  metrics: ParentExchangeMetrics;
}) {
  const roleColor = role === "petitioner" ? "indigo" : "purple";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className={`h-5 w-5 text-${roleColor}-600`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-secondary/50 rounded-lg">
            <div className="text-xl font-bold">{metrics.check_ins}</div>
            <div className="text-xs text-muted-foreground">Check-ins</div>
          </div>
          <div className="text-center p-3 bg-secondary/50 rounded-lg">
            <div className="text-xl font-bold">
              {metrics.avg_distance_meters !== null
                ? `${metrics.avg_distance_meters.toFixed(0)}m`
                : "N/A"}
            </div>
            <div className="text-xs text-muted-foreground">Avg Distance</div>
          </div>
          <div className="text-center p-3 bg-secondary/50 rounded-lg">
            <div className={`text-xl font-bold ${
              metrics.geofence_hit_rate >= 90 ? "text-green-600" :
              metrics.geofence_hit_rate >= 70 ? "text-blue-600" : "text-amber-600"
            }`}>
              {metrics.geofence_hit_rate.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Geofence Rate</div>
          </div>
          <div className="text-center p-3 bg-secondary/50 rounded-lg">
            <div className={`text-xl font-bold ${
              metrics.on_time_rate >= 90 ? "text-green-600" :
              metrics.on_time_rate >= 70 ? "text-blue-600" : "text-amber-600"
            }`}>
              {metrics.on_time_rate.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">On-Time Rate</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExchangeRow({
  exchange,
  onClick,
}: {
  exchange: {
    id: string;
    title: string;
    scheduled_time: string;
    status: string;
    outcome: string | null;
    from_parent_checked_in: boolean;
    from_parent_in_geofence: boolean | null;
    to_parent_checked_in: boolean;
    to_parent_in_geofence: boolean | null;
  };
  onClick: () => void;
}) {
  const date = new Date(exchange.scheduled_time);

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="text-center min-w-[50px]">
          <div className="text-sm font-medium">{date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
          <div className="text-xs text-muted-foreground">{date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
        </div>
        <div>
          <p className="font-medium text-foreground">{exchange.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <ParentCheckInBadge
              label="From"
              checkedIn={exchange.from_parent_checked_in}
              inGeofence={exchange.from_parent_in_geofence}
            />
            <ParentCheckInBadge
              label="To"
              checkedIn={exchange.to_parent_checked_in}
              inGeofence={exchange.to_parent_in_geofence}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={exchange.outcome || exchange.status} />
      </div>
    </div>
  );
}

function ParentCheckInBadge({
  label,
  checkedIn,
  inGeofence,
}: {
  label: string;
  checkedIn: boolean;
  inGeofence: boolean | null;
}) {
  if (!checkedIn) {
    return (
      <Badge variant="secondary" className="text-xs">
        {label}: Not checked in
      </Badge>
    );
  }

  if (inGeofence === true) {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
        {label}: In geofence
      </Badge>
    );
  }

  if (inGeofence === false) {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
        {label}: Outside geofence
      </Badge>
    );
  }

  return (
    <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
      {label}: Checked in
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    completed: { color: "bg-green-100 text-green-800", label: "Completed" },
    missed: { color: "bg-red-100 text-red-800", label: "Missed" },
    one_party_present: { color: "bg-amber-100 text-amber-800", label: "One Party" },
    disputed: { color: "bg-orange-100 text-orange-800", label: "Disputed" },
    scheduled: { color: "bg-blue-100 text-blue-800", label: "Scheduled" },
    cancelled: { color: "bg-gray-100 text-gray-800", label: "Cancelled" },
  };

  const { color, label } = config[status] || { color: "bg-gray-100 text-gray-800", label: status };

  return <Badge className={color}>{label}</Badge>;
}

function ExchangeDetailCard({ detail }: { detail: ExchangeDetail }) {
  const date = new Date(detail.scheduled_time);

  return (
    <div className="border rounded-xl p-4 bg-background">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Info Section */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-medium text-foreground">{detail.title}</h4>
              <p className="text-sm text-muted-foreground">
                {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at{" "}
                {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
            <StatusBadge status={detail.outcome || detail.status} />
          </div>

          {detail.location.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <MapPin className="h-4 w-4" />
              {detail.location.address}
              {detail.location.geofence_radius_meters && (
                <span className="text-xs">({detail.location.geofence_radius_meters}m geofence)</span>
              )}
            </div>
          )}

          {/* Parent GPS Data */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <ParentGPSInfo label="From Parent" role={detail.from_parent.role} data={detail.from_parent} />
            <ParentGPSInfo label="To Parent" role={detail.to_parent.role} data={detail.to_parent} />
          </div>
        </div>

        {/* Map Section */}
        {detail.static_map_url && (
          <div className="md:w-64 flex-shrink-0">
            <a href={detail.static_map_url} target="_blank" rel="noopener noreferrer">
              <img
                src={detail.static_map_url}
                alt="Exchange location map"
                className="w-full h-40 object-cover rounded-lg border hover:opacity-90 transition-opacity"
              />
            </a>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Click to view full map
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ParentGPSInfo({
  label,
  role,
  data,
}: {
  label: string;
  role: string;
  data: {
    checked_in: boolean;
    check_in_time: string | null;
    gps: {
      lat: number | null;
      lng: number | null;
      accuracy_meters: number | null;
      distance_meters: number | null;
      in_geofence: boolean | null;
    } | null;
  };
}) {
  const roleLabel = role === "petitioner" ? "Petitioner" : role === "respondent" ? "Respondent" : role;

  return (
    <div className="p-3 bg-secondary/50 rounded-lg">
      <div className="text-sm font-medium mb-2">
        {label} <span className="text-muted-foreground">({roleLabel})</span>
      </div>

      {!data.checked_in ? (
        <p className="text-sm text-muted-foreground">Not checked in</p>
      ) : (
        <div className="space-y-1 text-sm">
          {data.check_in_time && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(data.check_in_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </div>
          )}
          {data.gps && (
            <>
              {data.gps.in_geofence !== null && (
                <div className={`flex items-center gap-1 ${data.gps.in_geofence ? "text-green-600" : "text-amber-600"}`}>
                  <Target className="h-3 w-3" />
                  {data.gps.in_geofence ? "Within geofence" : "Outside geofence"}
                </div>
              )}
              {data.gps.distance_meters !== null && (
                <div className="text-muted-foreground">
                  Distance: {data.gps.distance_meters < 1000
                    ? `${Math.round(data.gps.distance_meters)}m`
                    : `${(data.gps.distance_meters / 1000).toFixed(1)}km`}
                </div>
              )}
              {data.gps.accuracy_meters !== null && (
                <div className="text-xs text-muted-foreground">
                  GPS accuracy: ±{Math.round(data.gps.accuracy_meters)}m
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
