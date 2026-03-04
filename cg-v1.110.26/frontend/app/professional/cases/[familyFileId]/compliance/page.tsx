"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  RefreshCw,
  Calendar,
  DollarSign,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  MapPin,
  ArrowRightLeft,
  FileText,
  BarChart3,
  Download,
  Hash,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfessionalAuth } from "../../../layout";
import { ExchangeBreakdownChart } from "@/components/professional/charts/exchange-breakdown-chart";
import { CaseHealthGauge } from "@/components/professional/charts/case-health-gauge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ComplianceDashboard {
  overall_score: number;
  exchange_compliance: ExchangeCompliance;
  financial_compliance: FinancialCompliance;
  communication_compliance: CommunicationCompliance;
  period_days: number;
}

interface ExchangeCompliance {
  total_exchanges: number;
  completed_on_time: number;
  completed_late: number;
  missed: number;
  on_time_rate: number;
  gps_verified_rate: number;
  avg_delay_minutes: number;
  by_parent: {
    parent_a: { on_time: number; late: number; missed: number };
    parent_b: { on_time: number; late: number; missed: number };
  };
}

interface FinancialCompliance {
  total_obligations: number;
  paid_on_time: number;
  paid_late: number;
  outstanding: number;
  total_amount_due: number;
  total_amount_paid: number;
  payment_rate: number;
  by_parent: {
    parent_a: { paid: number; outstanding: number };
    parent_b: { paid: number; outstanding: number };
  };
}

interface CommunicationCompliance {
  total_messages: number;
  flagged_messages: number;
  intervention_rate: number;
  avg_response_time_hours: number;
  good_faith_score: number;
  by_parent: {
    parent_a: { messages: number; flagged: number };
    parent_b: { messages: number; flagged: number };
  };
}

export default function CompliancePage() {
  const params = useParams();
  const { token } = useProfessionalAuth();
  const familyFileId = params.familyFileId as string;

  const [dashboard, setDashboard] = useState<ComplianceDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState("30");

  useEffect(() => {
    fetchCompliance();
  }, [familyFileId, token, periodDays]);

  const fetchCompliance = async () => {
    if (!token || !familyFileId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/compliance?days=${periodDays}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error("Error fetching compliance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-amber-100";
    return "bg-red-100";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Shield className="h-6 w-6" />
            </div>
            Compliance Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Track agreement adherence and parenting plan compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchCompliance}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : dashboard ? (
        <>
          {/* Health Gauge */}
          <CaseHealthGauge
            score={Math.round(dashboard.overall_score)}
            trend={dashboard.overall_score >= 75 ? "up" : dashboard.overall_score >= 60 ? "stable" : "down"}
          />

          {/* Overall Score Card (keep for additional details) */}
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Compliance Score</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-5xl font-bold ${getScoreColor(dashboard.overall_score)}`}>
                      {dashboard.overall_score}
                    </span>
                    <span className="text-2xl text-muted-foreground">/ 100</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Based on last {dashboard.period_days} days of activity
                  </p>
                </div>
                <div className={`p-6 rounded-full ${getScoreBgColor(dashboard.overall_score)}`}>
                  {dashboard.overall_score >= 80 ? (
                    <CheckCircle2 className={`h-12 w-12 ${getScoreColor(dashboard.overall_score)}`} />
                  ) : dashboard.overall_score >= 60 ? (
                    <AlertTriangle className={`h-12 w-12 ${getScoreColor(dashboard.overall_score)}`} />
                  ) : (
                    <XCircle className={`h-12 w-12 ${getScoreColor(dashboard.overall_score)}`} />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Different Compliance Areas */}
          <Tabs defaultValue="exchanges" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="exchanges" className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Exchanges
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Financial
              </TabsTrigger>
              <TabsTrigger value="communication" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Communication
              </TabsTrigger>
            </TabsList>

            {/* Exchange Compliance */}
            <TabsContent value="exchanges" className="space-y-4">
              {/* Exchange Breakdown Chart */}
              <ExchangeBreakdownChart
                data={{
                  on_time: dashboard.exchange_compliance.completed_on_time,
                  late: dashboard.exchange_compliance.completed_late,
                  missed: dashboard.exchange_compliance.missed,
                  total: dashboard.exchange_compliance.total_exchanges,
                }}
              />

              <div className="grid md:grid-cols-4 gap-4">
                <MetricCard
                  label="On-Time Rate"
                  value={`${(dashboard.exchange_compliance.on_time_rate * 100).toFixed(0)}%`}
                  icon={<Clock className="h-5 w-5" />}
                  color={dashboard.exchange_compliance.on_time_rate >= 0.8 ? "green" : "amber"}
                />
                <MetricCard
                  label="GPS Verified"
                  value={`${(dashboard.exchange_compliance.gps_verified_rate * 100).toFixed(0)}%`}
                  icon={<MapPin className="h-5 w-5" />}
                  color="blue"
                />
                <MetricCard
                  label="Avg Delay"
                  value={`${dashboard.exchange_compliance.avg_delay_minutes} min`}
                  icon={<Clock className="h-5 w-5" />}
                  color={dashboard.exchange_compliance.avg_delay_minutes <= 10 ? "green" : "red"}
                />
                <MetricCard
                  label="Total Exchanges"
                  value={dashboard.exchange_compliance.total_exchanges.toString()}
                  icon={<ArrowRightLeft className="h-5 w-5" />}
                  color="slate"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Exchange Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            On Time
                          </span>
                          <span className="font-medium">{dashboard.exchange_compliance.completed_on_time}</span>
                        </div>
                        <Progress
                          value={
                            (dashboard.exchange_compliance.completed_on_time /
                              dashboard.exchange_compliance.total_exchanges) *
                            100
                          }
                          className="h-2"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-500" />
                            Late
                          </span>
                          <span className="font-medium">{dashboard.exchange_compliance.completed_late}</span>
                        </div>
                        <Progress
                          value={
                            (dashboard.exchange_compliance.completed_late /
                              dashboard.exchange_compliance.total_exchanges) *
                            100
                          }
                          className="h-2 [&>div]:bg-amber-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            Missed
                          </span>
                          <span className="font-medium">{dashboard.exchange_compliance.missed}</span>
                        </div>
                        <Progress
                          value={
                            (dashboard.exchange_compliance.missed /
                              dashboard.exchange_compliance.total_exchanges) *
                            100
                          }
                          className="h-2 [&>div]:bg-red-500"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* By Parent */}
              <div className="grid md:grid-cols-2 gap-4">
                <ParentComplianceCard
                  title="Parent A"
                  data={dashboard.exchange_compliance.by_parent.parent_a}
                  type="exchange"
                  color="blue"
                />
                <ParentComplianceCard
                  title="Parent B"
                  data={dashboard.exchange_compliance.by_parent.parent_b}
                  type="exchange"
                  color="purple"
                />
              </div>
            </TabsContent>

            {/* Financial Compliance */}
            <TabsContent value="financial" className="space-y-4">
              <div className="grid md:grid-cols-4 gap-4">
                <MetricCard
                  label="Payment Rate"
                  value={`${(dashboard.financial_compliance.payment_rate * 100).toFixed(0)}%`}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  color={dashboard.financial_compliance.payment_rate >= 0.9 ? "green" : "amber"}
                />
                <MetricCard
                  label="Total Paid"
                  value={formatCurrency(dashboard.financial_compliance.total_amount_paid)}
                  icon={<DollarSign className="h-5 w-5" />}
                  color="green"
                />
                <MetricCard
                  label="Outstanding"
                  value={formatCurrency(
                    dashboard.financial_compliance.total_amount_due -
                    dashboard.financial_compliance.total_amount_paid
                  )}
                  icon={<DollarSign className="h-5 w-5" />}
                  color={
                    dashboard.financial_compliance.outstanding > 0 ? "red" : "green"
                  }
                />
                <MetricCard
                  label="Total Obligations"
                  value={dashboard.financial_compliance.total_obligations.toString()}
                  icon={<FileText className="h-5 w-5" />}
                  color="slate"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            Paid On Time
                          </span>
                          <span className="font-medium">{dashboard.financial_compliance.paid_on_time}</span>
                        </div>
                        <Progress
                          value={
                            (dashboard.financial_compliance.paid_on_time /
                              dashboard.financial_compliance.total_obligations) *
                            100
                          }
                          className="h-2"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-500" />
                            Paid Late
                          </span>
                          <span className="font-medium">{dashboard.financial_compliance.paid_late}</span>
                        </div>
                        <Progress
                          value={
                            (dashboard.financial_compliance.paid_late /
                              dashboard.financial_compliance.total_obligations) *
                            100
                          }
                          className="h-2 [&>div]:bg-amber-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            Outstanding
                          </span>
                          <span className="font-medium">{dashboard.financial_compliance.outstanding}</span>
                        </div>
                        <Progress
                          value={
                            (dashboard.financial_compliance.outstanding /
                              dashboard.financial_compliance.total_obligations) *
                            100
                          }
                          className="h-2 [&>div]:bg-red-500"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* By Parent */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                      Parent A
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="text-lg font-bold text-green-600">
                          {dashboard.financial_compliance.by_parent.parent_a.paid}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Outstanding</p>
                        <p className="text-lg font-bold text-red-600">
                          {dashboard.financial_compliance.by_parent.parent_a.outstanding}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-purple-500" />
                      Parent B
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="text-lg font-bold text-green-600">
                          {dashboard.financial_compliance.by_parent.parent_b.paid}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Outstanding</p>
                        <p className="text-lg font-bold text-red-600">
                          {dashboard.financial_compliance.by_parent.parent_b.outstanding}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Communication Compliance */}
            <TabsContent value="communication" className="space-y-4">
              <div className="grid md:grid-cols-4 gap-4">
                <MetricCard
                  label="Good Faith Score"
                  value={`${(dashboard.communication_compliance.good_faith_score * 100).toFixed(0)}%`}
                  icon={<TrendingUp className="h-5 w-5" />}
                  color={dashboard.communication_compliance.good_faith_score >= 0.7 ? "green" : "amber"}
                />
                <MetricCard
                  label="Intervention Rate"
                  value={`${(dashboard.communication_compliance.intervention_rate * 100).toFixed(1)}%`}
                  icon={<AlertTriangle className="h-5 w-5" />}
                  color={dashboard.communication_compliance.intervention_rate <= 0.1 ? "green" : "red"}
                />
                <MetricCard
                  label="Avg Response Time"
                  value={`${dashboard.communication_compliance.avg_response_time_hours.toFixed(1)}h`}
                  icon={<Clock className="h-5 w-5" />}
                  color={dashboard.communication_compliance.avg_response_time_hours <= 24 ? "green" : "amber"}
                />
                <MetricCard
                  label="Total Messages"
                  value={dashboard.communication_compliance.total_messages.toString()}
                  icon={<MessageSquare className="h-5 w-5" />}
                  color="slate"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Communication Quality</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-8">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-2">Good Faith Score</p>
                      <Progress
                        value={dashboard.communication_compliance.good_faith_score * 100}
                        className="h-3"
                      />
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-2xl font-bold ${getScoreColor(
                          dashboard.communication_compliance.good_faith_score * 100
                        )}`}
                      >
                        {(dashboard.communication_compliance.good_faith_score * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* By Parent */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                      Parent A
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Messages Sent</span>
                        <span className="font-medium">
                          {dashboard.communication_compliance.by_parent.parent_a.messages}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Flagged</span>
                        <span className="font-medium text-amber-600">
                          {dashboard.communication_compliance.by_parent.parent_a.flagged}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Flag Rate</span>
                        <span className="font-medium">
                          {dashboard.communication_compliance.by_parent.parent_a.messages > 0
                            ? (
                              (dashboard.communication_compliance.by_parent.parent_a.flagged /
                                dashboard.communication_compliance.by_parent.parent_a.messages) *
                              100
                            ).toFixed(1)
                            : 0}
                          %
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-purple-500" />
                      Parent B
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Messages Sent</span>
                        <span className="font-medium">
                          {dashboard.communication_compliance.by_parent.parent_b.messages}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Flagged</span>
                        <span className="font-medium text-amber-600">
                          {dashboard.communication_compliance.by_parent.parent_b.flagged}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Flag Rate</span>
                        <span className="font-medium">
                          {dashboard.communication_compliance.by_parent.parent_b.messages > 0
                            ? (
                              (dashboard.communication_compliance.by_parent.parent_b.flagged /
                                dashboard.communication_compliance.by_parent.parent_b.messages) *
                              100
                            ).toFixed(1)
                            : 0}
                          %
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Report Generation & Export */}
          <ReportGenerationSection familyFileId={familyFileId} token={token} periodDays={periodDays} />
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No compliance data</h3>
            <p className="text-muted-foreground">
              Compliance metrics will appear once there is case activity to analyze.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "green" | "amber" | "red" | "blue" | "slate";
}) {
  const colorClasses = {
    green: "bg-green-100 text-green-600",
    amber: "bg-amber-100 text-amber-600",
    red: "bg-red-100 text-red-600",
    blue: "bg-blue-100 text-blue-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Parent Compliance Card for Exchanges
function ParentComplianceCard({
  title,
  data,
  type,
  color,
}: {
  title: string;
  data: { on_time: number; late: number; missed: number };
  type: "exchange";
  color: "blue" | "purple";
}) {
  const total = data.on_time + data.late + data.missed;
  const onTimeRate = total > 0 ? (data.on_time / total) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${color === "blue" ? "bg-blue-500" : "bg-purple-500"}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">On-Time Rate</span>
            <span className={`font-bold ${onTimeRate >= 80 ? "text-green-600" : "text-amber-600"}`}>
              {onTimeRate.toFixed(0)}%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-green-50 rounded">
              <p className="text-lg font-bold text-green-600">{data.on_time}</p>
              <p className="text-xs text-muted-foreground">On Time</p>
            </div>
            <div className="p-2 bg-amber-50 rounded">
              <p className="text-lg font-bold text-amber-600">{data.late}</p>
              <p className="text-xs text-muted-foreground">Late</p>
            </div>
            <div className="p-2 bg-red-50 rounded">
              <p className="text-lg font-bold text-red-600">{data.missed}</p>
              <p className="text-xs text-muted-foreground">Missed</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Report Generation & Export Section
function ReportGenerationSection({
  familyFileId,
  token,
  periodDays,
}: {
  familyFileId: string;
  token: string | null;
  periodDays: string;
}) {
  const [exportFormat, setExportFormat] = useState("pdf");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(null);
  const [verificationHash, setVerificationHash] = useState<string | null>(null);
  const [downloadCount, setDownloadCount] = useState(0);

  const generateReport = async () => {
    if (!token) return;
    setIsGenerating(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/compliance/report`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ period_days: parseInt(periodDays), export_format: exportFormat }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setGeneratedReportId(data.id);
        setVerificationHash(data.content_hash);
      }
    } catch (err) {
      console.error("Error generating report:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const trackDownload = async () => {
    if (!token || !generatedReportId) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/professional/reports/${generatedReportId}/download`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setDownloadCount(data.download_count || downloadCount + 1);
      }
    } catch (err) {
      console.error("Error tracking download:", err);
    }
  };

  const verifyReport = async () => {
    if (!token || !generatedReportId) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/professional/reports/${generatedReportId}/verify`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setVerificationHash(data.content_hash);
        setDownloadCount(data.download_count || 0);
      }
    } catch (err) {
      console.error("Error verifying report:", err);
    }
  };

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/30 to-teal-50/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-600" />
          Generate Compliance Report
        </CardTitle>
        <CardDescription>
          Export a court-ready compliance report with SHA-256 verification hash
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">
              Export Format
            </label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Report</SelectItem>
                <SelectItem value="csv">CSV Export</SelectItem>
                <SelectItem value="json">JSON Data</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={generateReport}
            disabled={isGenerating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4 mr-2" />
            )}
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>

          {generatedReportId && (
            <>
              <Button variant="outline" onClick={trackDownload} className="border-emerald-200">
                <Download className="h-4 w-4 mr-2" />
                Download ({downloadCount})
              </Button>
              <Button variant="outline" onClick={verifyReport} className="border-slate-200">
                <ShieldCheck className="h-4 w-4 mr-2" />
                Verify
              </Button>
            </>
          )}
        </div>

        {/* Verification Hash */}
        {verificationHash && (
          <div className="mt-4 p-3 bg-white border border-emerald-100 rounded-lg">
            <div className="flex items-center gap-2 mb-1.5">
              <Hash className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-700">
                SHA-256 Verification Hash
              </span>
              <Badge variant="outline" className="text-[10px]">
                Tamper-proof
              </Badge>
            </div>
            <code className="text-xs text-slate-500 font-mono break-all leading-relaxed">
              {verificationHash}
            </code>
            {downloadCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Downloaded {downloadCount} time{downloadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

