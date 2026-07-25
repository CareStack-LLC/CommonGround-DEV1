"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  RefreshCw,
  Lock,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  FileSearch,
  Zap,
  History,
  Flame,
  Scale,
  Lightbulb,
  Gavel,
  ShieldCheck,
  BarChart3,
  Eye,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useProfessionalAuth } from "../../../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ARIASettings {
  is_enabled: boolean;
  sensitivity_level: string;
  auto_rewrite: boolean;
  notify_on_flag: boolean;
  blocked_topics: string[];
  custom_rules: Record<string, any>;
}

/**
 * Shape returned by GET /api/v1/professional/cases/{id}/aria/metrics
 * (see backend/app/services/professional/aria_control_service.py::get_aria_metrics).
 *
 * All `*_rate` fields are 0-100 per ADR-001, except v2_coaching_acceptance_rate
 * which stays 0-1 because it's used inline in a per-category chart.
 */
interface ARIAMetrics {
  period_days?: number;
  total_messages: number;
  flagged_messages: number;
  flag_rate: number; // 0-100
  sentiment_by_sender?: Record<string, number | null>;
  average_sentiment?: number | null;
  sentiment_trend: string; // "improving" | "declining" | "stable"
  good_faith_score: number | null; // 0-100, overall (case-level)
  // V2 Sentinel Shield
  v2_avg_heat?: number | null;
  v2_heat_parent_a?: number | null;
  v2_heat_parent_b?: number | null;
  v2_domain_breakdown?: Record<string, { count: number; avg_score: number }>;
  v2_session_pattern_frequency?: Record<string, number>;
  v2_coaching_acceptance_rate?: number | null; // 0-1
  v2_time_signal_distribution?: Record<string, number>;
  v2_legal_flag_count?: number;
  v2_category_breakdown?: Record<string, { count: number; avg_score: number }>;
}

interface ARIAIntervention {
  id: string;
  message_id: string;
  intervention_type: string;
  trigger_text: string;
  original_text: string;
  suggested_text: string;
  action_taken: string;
  sender_role: string;
  created_at: string;
  // V2 enrichment
  domain_scores?: Record<string, number>;
  window_heat?: number;
  category_confidence?: Record<string, number>;
  legal_flags?: string[];
}

interface ARIAAnalysis {
  narrative_summary: string;
  tone_analysis: string;
  resolution_score: number;
  facts_for_professional: string[];
  conflict_points: string[];
  professional_recommendation: string;
  lags: Record<string, any>;
  message_count: number;
  analyzed_at: string;
  // V2 AI enrichment
  v2_domain_analysis?: {
    primary_concerns: string[];
    domain_trend: string;
    domain_summary: string;
  };
  v2_heat_trajectory?: {
    trend: string;
    summary: string;
  };
  v2_pattern_insights?: string[];
  v2_risk_assessment?: {
    level: string;
    factors: string[];
    summary: string;
  };
  v2_legal_observations?: string[];
  // V2 computed data for charts
  v2_heat_timeline?: { date: string; parent_a?: number; parent_b?: number }[];
  v2_domain_summary?: Record<string, { count: number; avg_score: number }>;
  v2_category_summary?: Record<string, { count: number; avg_confidence: number | null }>;
  v2_legal_flags?: { date: string; category: string; severity: string; parent: string }[];
  v2_time_signal_distribution?: Record<string, number>;
  v2_session_patterns?: Record<string, number>;
  // Verification
  verification?: {
    data_hash: string;
    message_count: number;
    date_range: { start: string; end: string };
    generated_at: string;
  };
}

const SENSITIVITY_LEVELS = [
  { value: "low", label: "Low", description: "Only flag severe issues" },
  { value: "medium", label: "Medium", description: "Balance between intervention and flow" },
  { value: "high", label: "High", description: "Catch subtle issues early" },
];

export default function ARIAControlPage() {
  const params = useParams();
  const { token, profile } = useProfessionalAuth();
  const familyFileId = params.familyFileId as string;

  const [settings, setSettings] = useState<ARIASettings | null>(null);
  const [metrics, setMetrics] = useState<ARIAMetrics | null>(null);
  const [interventions, setInterventions] = useState<ARIAIntervention[]>([]);
  const [analysis, setAnalysis] = useState<ARIAAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    fetchARIAData();
  }, [familyFileId, token]);

  const fetchARIAData = async () => {
    if (!token || !familyFileId) return;

    setIsLoading(true);
    try {
      // Fetch settings
      const settingsResponse = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/aria`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (settingsResponse.ok) {
        const data = await settingsResponse.json();
        setSettings(data);
      }

      // Fetch metrics
      const metricsResponse = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/aria/metrics`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }

      // Fetch recent interventions
      const interventionsResponse = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/aria/interventions?limit=10`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (interventionsResponse.ok) {
        const interventionsData = await interventionsResponse.json();
        setInterventions(interventionsData.items || []);
      }

      // Fetch latest analysis
      fetchAnalysis();

    } catch (error) {
      console.error("Error fetching ARIA data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalysis = async () => {
    if (!token || !familyFileId) return;
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/aria/analysis`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      }
    } catch (error) {
      console.error("Error fetching analysis:", error);
    }
  };

  const runNewAnalysis = async () => {
    if (!token || !familyFileId) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/aria/analyze`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
      } else {
        console.error("Analysis request failed:", res.status);
        // Fall back to fetching latest analysis
        await fetchAnalysis();
      }
    } catch (error) {
      console.error("Error running analysis:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "improving") return <TrendingDown className="h-4 w-4 text-cg-sage" />;
    if (trend === "declining") return <TrendingUp className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getGoodFaithColor = (score: number) => {
    if (score >= 80) return "text-cg-sage-dark";
    if (score >= 60) return "text-cg-amber-dark";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cg-sage-dark" />
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
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-cg-sage-subtle text-cg-sage-dark rounded-lg">
              <Bot className="h-6 w-6" />
            </div>
            ARIA Control Panel
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage AI intervention settings and deep thread analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="mr-2 gap-1">
            <Lock className="h-3 w-3" />
            Read-only
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchARIAData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="controls" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
          <TabsTrigger value="controls" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Controls
          </TabsTrigger>
          <TabsTrigger value="sentinel" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sentinel Shield
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <FileSearch className="h-4 w-4" />
            Analysis Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="controls" className="space-y-6 mt-6">
          {/* Metrics Overview — fields mapped to what the backend actually
              returns (see ARIAMetrics interface). flag_rate is already 0-100
              per ADR-001; v2_coaching_acceptance_rate is still 0-1. */}
          {metrics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Messages Analyzed"
                value={metrics.total_messages ?? 0}
                icon={<MessageSquare className="h-5 w-5" />}
              />
              <MetricCard
                label="Flagged Messages"
                value={metrics.flagged_messages ?? 0}
                subtitle={`${(metrics.flag_rate ?? 0).toFixed(1)}% flag rate`}
                icon={<AlertTriangle className="h-5 w-5" />}
              />
              <MetricCard
                label="Coaching Acceptance"
                value={
                  metrics.v2_coaching_acceptance_rate != null
                    ? `${Math.round(metrics.v2_coaching_acceptance_rate * 100)}%`
                    : '—'
                }
                subtitle="Messages rewritten after ARIA suggestion"
                icon={<CheckCircle2 className="h-5 w-5" />}
                trend={metrics.sentiment_trend}
              />
              <MetricCard
                label="Trend"
                value={metrics.sentiment_trend === "improving" ? "Improving" : metrics.sentiment_trend === "declining" ? "Needs Attention" : "Stable"}
                icon={getTrendIcon(metrics.sentiment_trend)}
                valueColor={
                  metrics.sentiment_trend === "improving"
                    ? "text-cg-sage-dark"
                    : metrics.sentiment_trend === "declining"
                      ? "text-red-600"
                      : "text-muted-foreground"
                }
              />
            </div>
          )}

          {/* Good Faith Score — case-level. Per-parent scores aren't
              computed by the backend today; per-parent HEAT scores appear
              in the V2 Sentinel Shield section below and give a
              comparable at-a-glance read. */}
          {metrics && metrics.good_faith_score != null && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-5 w-5 text-cg-sage-dark" />
                  Good Faith Score
                </CardTitle>
                <CardDescription>
                  Case-level communication quality over the last {metrics.period_days ?? 30} days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall</span>
                    <span className={`text-3xl font-bold ${getGoodFaithColor(metrics.good_faith_score)}`}>
                      {Math.round(metrics.good_faith_score)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        metrics.good_faith_score >= 80
                          ? "bg-cg-sage"
                          : metrics.good_faith_score >= 60
                            ? "bg-cg-amber"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${metrics.good_faith_score}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Scores reflect flag rate, sentiment trends, heat, legal flags, and severe-domain presence.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Settings */}
          {settings && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  ARIA Settings
                </CardTitle>
                <CardDescription>
                  Configure how ARIA monitors and intervenes in communications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Read-only notice: ARIA (incl. child-safety monitoring) is
                    controlled only by the parents and by court order. */}
                <div className="flex items-start gap-2 rounded-md border border-cg-amber-tint bg-cg-amber-subtle p-3 text-sm text-cg-amber-deep">
                  <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>
                    These settings are <span className="font-semibold">read-only</span> for
                    professionals. ARIA — including child-safety monitoring — is controlled
                    by the parents and by court order. To request a change, contact the
                    family or the court.
                  </p>
                </div>

                {/* Enable/Disable */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="aria-enabled" className="font-medium">
                      Enable ARIA Monitoring
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, ARIA analyzes all messages for potential issues
                    </p>
                  </div>
                  <Switch
                    id="aria-enabled"
                    checked={settings.is_enabled}
                    disabled
                  />
                </div>

                {settings.is_enabled && (
                  <>
                    {/* Sensitivity Level */}
                    <div className="space-y-3">
                      <Label className="font-medium">Sensitivity Level</Label>
                      <Select value={settings.sensitivity_level} disabled>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SENSITIVITY_LEVELS.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              <div>
                                <span className="font-medium">{level.label}</span>
                                <span className="text-muted-foreground ml-2">
                                  - {level.description}
                                </span >
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Auto Rewrite */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-rewrite" className="font-medium">
                          Auto-Suggest Rewrites
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically suggest alternative wording for flagged messages
                        </p>
                      </div>
                      <Switch
                        id="auto-rewrite"
                        checked={settings.auto_rewrite}
                        disabled
                      />
                    </div>

                    {/* Notify on Flag */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="notify-flag" className="font-medium">
                          Notify on Intervention
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive alerts when ARIA flags a message
                        </p>
                      </div>
                      <Switch
                        id="notify-flag"
                        checked={settings.notify_on_flag}
                        disabled
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Category Breakdown — sourced from v2_category_breakdown
              which has shape {cat: {count, avg_score}}. Normalize to counts
              for display; width proportional to the max count in the set
              so the largest bar fills the row. */}
          {metrics?.v2_category_breakdown && Object.keys(metrics.v2_category_breakdown).length > 0 && (() => {
            const entries = Object.entries(metrics.v2_category_breakdown);
            const maxCount = entries.reduce((m, [, v]) => Math.max(m, v.count), 0) || 1;
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Intervention Categories</CardTitle>
                  <CardDescription>
                    Breakdown of issues flagged by ARIA (V2 Sentinel Shield)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {entries
                      .sort(([, a], [, b]) => b.count - a.count)
                      .map(([category, data]) => (
                        <div key={category} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {category.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cg-sage rounded-full"
                                style={{
                                  width: `${(data.count / maxCount) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8 text-right">{data.count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Recent Interventions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-cg-amber" />
                Recent Interventions
              </CardTitle>
              <CardDescription>Latest ARIA flags and suggestions</CardDescription>
            </CardHeader>
            <CardContent>
              {interventions.length > 0 ? (
                <Accordion type="single" collapsible className="space-y-2">
                  {interventions.map((intervention) => (
                    <AccordionItem
                      key={intervention.id}
                      value={intervention.id}
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-3 text-left">
                          <Badge
                            variant={
                              intervention.action_taken === "accepted"
                                ? "success"
                                : intervention.action_taken === "rejected"
                                  ? "error"
                                  : "secondary"
                            }
                            className="shrink-0"
                          >
                            {intervention.action_taken}
                          </Badge>
                          <div className="min-w-0">
                            <p className="font-medium text-sm capitalize">
                              {intervention.intervention_type.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(intervention.created_at).toLocaleString()} •{" "}
                              {intervention.sender_role === "parent_a" ? "Parent A" : "Parent B"}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="space-y-3 pt-2">
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-xs font-medium text-red-600 mb-1">Original Text</p>
                            <p className="text-sm">{intervention.original_text}</p>
                          </div>
                          {intervention.suggested_text && (
                            <div className="p-3 bg-cg-sage-subtle border border-cg-sage-tint rounded-lg">
                              <p className="text-xs font-medium text-cg-sage-dark mb-1">
                                Suggested Rewrite
                              </p>
                              <p className="text-sm">{intervention.suggested_text}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Info className="h-3.5 w-3.5" />
                            <span>Trigger: {intervention.trigger_text}</span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-cg-sage" />
                  <p>No recent interventions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================
            SENTINEL SHIELD TAB — V2 Analytics
           ============================================================ */}
        <TabsContent value="sentinel" className="space-y-6 mt-6">
          {/* Per-Parent Heat Cards */}
          {metrics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Parent A Heat"
                value={metrics.v2_heat_parent_a != null ? metrics.v2_heat_parent_a.toFixed(1) : '—'}
                subtitle="Rolling window score"
                icon={<Flame className="h-5 w-5" />}
                valueColor={
                  (metrics.v2_heat_parent_a ?? 0) >= 3.5
                    ? "text-cg-error"
                    : (metrics.v2_heat_parent_a ?? 0) > 1.5
                      ? "text-cg-warning"
                      : "text-cg-success"
                }
              />
              <MetricCard
                label="Parent B Heat"
                value={metrics.v2_heat_parent_b != null ? metrics.v2_heat_parent_b.toFixed(1) : '—'}
                subtitle="Rolling window score"
                icon={<Flame className="h-5 w-5" />}
                valueColor={
                  (metrics.v2_heat_parent_b ?? 0) >= 3.5
                    ? "text-cg-error"
                    : (metrics.v2_heat_parent_b ?? 0) > 1.5
                      ? "text-cg-warning"
                      : "text-cg-success"
                }
              />
              <MetricCard
                label="Avg Heat"
                value={metrics.v2_avg_heat != null ? metrics.v2_avg_heat.toFixed(1) : '—'}
                subtitle="Across all sessions"
                icon={<TrendingUp className="h-5 w-5" />}
              />
              {metrics.v2_legal_flag_count != null && metrics.v2_legal_flag_count > 0 && (
                <MetricCard
                  label="Legal Flags"
                  value={metrics.v2_legal_flag_count}
                  icon={<Scale className="h-5 w-5" />}
                  valueColor="text-cg-error"
                />
              )}
            </div>
          )}

          {/* Domain Breakdown */}
          {metrics?.v2_domain_breakdown && Object.keys(metrics.v2_domain_breakdown).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-5 w-5 text-cg-coaching" />
                  Domain Breakdown
                </CardTitle>
                <CardDescription>V2 Sentinel Shield pattern domains detected across all messages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(metrics.v2_domain_breakdown)
                    .sort(([, a], [, b]) => b.count - a.count)
                    .map(([domain, data]) => {
                      const domainLabels: Record<string, string> = {
                        CTRL: 'Coercive Control', THRT: 'Threats', PSYB: 'Psychological',
                        CONT: 'Contempt', ALNT: 'Alienation', ESCP: 'Escalation',
                        PAGG: 'Passive Aggression', MNIP: 'Manipulation',
                      };
                      return (
                        <div key={domain} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground w-36 truncate">
                            {domainLabels[domain] || domain}
                          </span>
                          <div
                            className="flex-1 h-2 bg-[var(--portal-border)] rounded-full overflow-hidden"
                            role="progressbar"
                            aria-valuenow={data.avg_score}
                            aria-valuemin={0}
                            aria-valuemax={1}
                            aria-label={`${domainLabels[domain] || domain}: ${Math.round(data.avg_score * 100)}% average`}
                          >
                            <div
                              className={`h-full rounded-full ${data.avg_score >= 0.7 ? 'bg-cg-heat-high' : 'bg-cg-heat'}`}
                              style={{ width: `${Math.min(data.avg_score * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold tabular-nums text-muted-foreground w-16 text-right">
                            {data.count} flags
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-muted-foreground w-12 text-right">
                            {Math.round(data.avg_score * 100)}%
                          </span>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Session Pattern Frequency */}
          {metrics?.v2_session_pattern_frequency && Object.keys(metrics.v2_session_pattern_frequency).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-5 w-5 text-cg-pattern" />
                  Recurring Patterns
                </CardTitle>
                <CardDescription>Cross-session patterns detected over the last 90 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(metrics.v2_session_pattern_frequency)
                    .sort(([, a], [, b]) => b - a)
                    .map(([pattern, count]) => (
                      <div key={pattern} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span className="text-sm text-foreground capitalize">{pattern.replace(/_/g, ' ')}</span>
                        <Badge variant="secondary" className="tabular-nums">
                          {count} sessions
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Time Signal + Coaching Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Time Signal Distribution */}
            {metrics?.v2_time_signal_distribution && Object.keys(metrics.v2_time_signal_distribution).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-5 w-5 text-cg-time-signal" />
                    Time Signals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(metrics.v2_time_signal_distribution).map(([signal, count]) => {
                      const icons: Record<string, string> = {
                        late_night: '🌙', message_storm: '⚡', silence_to_flood: '🌊', sustained_campaign: '📈',
                      };
                      const labels: Record<string, string> = {
                        late_night: 'Late Night', message_storm: 'Rapid Messages',
                        silence_to_flood: 'Silence then Flood', sustained_campaign: 'Sustained Campaign',
                      };
                      return (
                        <div
                          key={signal}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cg-time-signal-subtle border border-cg-time-signal/20"
                        >
                          <span>{icons[signal] || '?'}</span>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{labels[signal] || signal}</p>
                            <p className="text-[10px] text-muted-foreground">{count} occurrences</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Coaching Effectiveness */}
            {metrics?.v2_coaching_acceptance_rate != null && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-cg-coaching" />
                    Coaching Effectiveness
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <p className="text-4xl font-bold text-cg-coaching">
                      {Math.round(metrics.v2_coaching_acceptance_rate! * 100)}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      of coaching suggestions were accepted
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Empty state */}
          {metrics && !metrics.v2_avg_heat && !metrics.v2_domain_breakdown && (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Sentinel Shield V2 Analytics</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  V2 analytics will appear here once ARIA V2 is enabled and messages have been analyzed with the new pipeline.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6 mt-6">
          {/* Header Card */}
          <Card className="border-[var(--portal-border)] bg-[var(--portal-surface)]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-[var(--portal-accent)]" />
                    Deep Thread Analysis
                  </CardTitle>
                  <CardDescription>
                    AI-powered communication analysis with V2 Sentinel Shield enrichment
                  </CardDescription>
                </div>
                <Button aria-label="Refresh"
                  size="sm"
                  onClick={runNewAnalysis}
                  disabled={isAnalyzing}
                  className="bg-[var(--portal-accent)] hover:opacity-90 text-white"
                >
                  {isAnalyzing ? (
                    <>
                      <Bot className="h-4 w-4 mr-2 animate-bounce" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate New Report
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!analysis ? (
                <div className="py-12 text-center text-muted-foreground">
                  <FileSearch className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No report generated yet.</p>
                  <p className="text-sm">Click the button above to have ARIA analyze the thread history.</p>
                </div>
              ) : (
                <div className="space-y-6">

                  {/* Section 1: Executive Summary */}
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2 mb-2">
                          <History className="h-4 w-4" />
                          Narrative Summary
                        </h3>
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {analysis.narrative_summary}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2 mb-2">
                          <Layers className="h-4 w-4" />
                          Emotional Climate
                        </h3>
                        <Badge variant="secondary" className="bg-[var(--portal-surface)] border-[var(--portal-border)] text-foreground px-3 py-1 text-sm">
                          {analysis.tone_analysis}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {/* Resolution Score */}
                      <div className="p-4 bg-[var(--portal-surface)] rounded-xl border border-[var(--portal-border)] flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Resolution Score</span>
                        <div className={`text-4xl font-extrabold my-2 ${
                          analysis.resolution_score >= 80 ? "text-cg-success" :
                          analysis.resolution_score >= 60 ? "text-cg-warning" : "text-cg-error"
                        }`}>
                          {analysis.resolution_score}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Likelihood of self-resolution</p>
                      </div>

                      {/* Risk Assessment */}
                      {analysis.v2_risk_assessment && (
                        <div className={`p-4 rounded-xl border flex flex-col items-center text-center ${
                          analysis.v2_risk_assessment.level === "critical" || analysis.v2_risk_assessment.level === "high"
                            ? "bg-cg-error-subtle border-cg-error/20"
                            : analysis.v2_risk_assessment.level === "elevated"
                            ? "bg-cg-warning-subtle border-cg-warning/20"
                            : "bg-[var(--portal-surface)] border-[var(--portal-border)]"
                        }`}>
                          <span className="text-xs font-bold text-muted-foreground uppercase">Risk Level</span>
                          <Badge className={`mt-2 text-sm font-bold uppercase ${
                            analysis.v2_risk_assessment.level === "critical" || analysis.v2_risk_assessment.level === "high"
                              ? "bg-cg-error text-white"
                              : analysis.v2_risk_assessment.level === "elevated"
                              ? "bg-cg-warning text-white"
                              : "bg-[var(--portal-accent)] text-white"
                          }`}>
                            {analysis.v2_risk_assessment.level}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground mt-2">{analysis.v2_risk_assessment.summary}</p>
                        </div>
                      )}

                      {/* Response Times */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Avg Response Times</span>
                        {Object.entries(analysis.lags).map(([uid, stats]: [string, any]) => (
                          <div key={uid} className="p-3 bg-[var(--portal-surface)] rounded-lg border border-[var(--portal-border)] flex items-center justify-between text-xs">
                            <span className="font-medium text-muted-foreground">
                              {uid === profile?.user_id ? "You" :
                                uid === Object.keys(analysis.lags)[0] ? "Parent A" : "Parent B"}
                            </span>
                            <span className="font-bold text-foreground">{stats.average_response_time_hours} hrs</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Heat Trajectory */}
                  {analysis.v2_heat_trajectory && (
                    <Card className="border-cg-heat/20 bg-cg-heat-subtle">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm flex items-center gap-2 text-cg-heat">
                          <Flame className="h-4 w-4" />
                          Conversation Heat Trend
                          <Badge variant="outline" className={`text-[10px] ml-auto ${
                            analysis.v2_heat_trajectory.trend === "escalating"
                              ? "border-cg-error/40 text-cg-error"
                              : analysis.v2_heat_trajectory.trend === "cooling"
                              ? "border-cg-success/40 text-cg-success"
                              : "border-[var(--portal-border)] text-muted-foreground"
                          }`}>
                            {analysis.v2_heat_trajectory.trend === "escalating" ? "↑ Escalating" :
                             analysis.v2_heat_trajectory.trend === "cooling" ? "↓ Cooling" : "→ Stable"}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-3">
                        <p className="text-sm text-foreground leading-relaxed">
                          {analysis.v2_heat_trajectory.summary}
                        </p>
                        {/* Heat timeline mini-bars */}
                        {analysis.v2_heat_timeline && analysis.v2_heat_timeline.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--portal-accent)]" /> Parent A</span>
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cg-heat" /> Parent B</span>
                            </div>
                            <div className="flex gap-0.5 items-end h-12">
                              {analysis.v2_heat_timeline.slice(-30).map((point, i) => {
                                const val = point.parent_a ?? point.parent_b ?? 0;
                                const heightPct = Math.min((val / 5) * 100, 100);
                                const isParentA = point.parent_a != null;
                                return (
                                  <div
                                    key={i}
                                    className={`flex-1 rounded-t-sm min-w-[2px] ${
                                      val >= 4 ? "bg-cg-heat-high" :
                                      val >= 3 ? "bg-cg-heat" :
                                      isParentA ? "bg-[var(--portal-accent)]" : "bg-cg-heat/60"
                                    }`}
                                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                                    title={`${isParentA ? "Parent A" : "Parent B"}: ${val.toFixed(1)}`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-4 text-[9px] text-muted-foreground pt-1">
                          <span>Low (0-1.5)</span>
                          <span>Moderate (1.5-3.0)</span>
                          <span className="text-cg-heat">High (3.0-4.0)</span>
                          <span className="text-cg-heat-high font-semibold">Critical (4.0-5.0)</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Section 3: Domain Analysis */}
                  {analysis.v2_domain_analysis && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Communication Domain Breakdown
                        <Badge variant="outline" className={`text-[10px] ml-2 ${
                          analysis.v2_domain_analysis.domain_trend === "escalating"
                            ? "border-cg-error/40 text-cg-error"
                            : "border-[var(--portal-border)] text-muted-foreground"
                        }`}>
                          {analysis.v2_domain_analysis.domain_trend}
                        </Badge>
                      </h3>
                      {analysis.v2_domain_analysis.domain_summary && (
                        <p className="text-sm text-muted-foreground">{analysis.v2_domain_analysis.domain_summary}</p>
                      )}
                      {analysis.v2_domain_summary && Object.keys(analysis.v2_domain_summary).length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {Object.entries(analysis.v2_domain_summary)
                            .sort(([, a], [, b]) => b.count - a.count)
                            .map(([domain, data]) => {
                              const isSevere = ["CTRL", "THRT"].includes(domain);
                              const isModerate = ["PSYB", "CONT", "ALNT", "ESCP"].includes(domain);
                              return (
                                <div key={domain} className={`p-3 rounded-xl border ${
                                  isSevere ? "bg-cg-error-subtle border-cg-error/20" :
                                  isModerate ? "bg-cg-warning-subtle border-cg-warning/20" :
                                  "bg-[var(--portal-accent)]/5 border-[var(--portal-accent)]/20"
                                }`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`text-xs font-bold ${
                                      isSevere ? "text-cg-error" : isModerate ? "text-cg-warning" : "text-[var(--portal-accent)]"
                                    }`}>{domain}</span>
                                    <span className="text-[10px] text-muted-foreground">{data.count}×</span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-[var(--portal-border)]">
                                    <div
                                      className={`h-full rounded-full ${
                                        isSevere ? "bg-cg-error" : isModerate ? "bg-cg-warning" : "bg-[var(--portal-accent)]"
                                      }`}
                                      style={{ width: `${Math.min(data.avg_score * 100, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] text-muted-foreground">avg {(data.avg_score * 100).toFixed(0)}%</span>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 4: Facts, Conflicts & Pattern Insights */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="bg-[var(--portal-surface)] border-[var(--portal-border)]">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-cg-success" />
                          Resolution Facts
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <ul className="space-y-2">
                          {analysis.facts_for_professional.map((fact, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex gap-2">
                              <span className="text-[var(--portal-border)]">•</span>
                              <span className="text-foreground">{fact}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="bg-[var(--portal-surface)] border-[var(--portal-border)]">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-cg-warning" />
                          Conflict Points
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <ul className="space-y-2">
                          {analysis.conflict_points.map((point, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex gap-2">
                              <span className="text-[var(--portal-border)]">•</span>
                              <span className="text-foreground">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {/* V2 Pattern Insights */}
                  {analysis.v2_pattern_insights && analysis.v2_pattern_insights.length > 0 && (
                    <Card className="bg-cg-pattern-subtle border-cg-pattern/20">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm flex items-center gap-2 text-cg-pattern">
                          <Eye className="h-4 w-4" />
                          Pattern Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <ul className="space-y-2">
                          {analysis.v2_pattern_insights.map((insight, i) => (
                            <li key={i} className="text-xs flex gap-2">
                              <span className="text-cg-pattern font-bold">{i + 1}.</span>
                              <span className="text-foreground">{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Section 5: Legal Observations & Flags */}
                  {((analysis.v2_legal_observations && analysis.v2_legal_observations.length > 0) ||
                    (analysis.v2_legal_flags && analysis.v2_legal_flags.length > 0)) && (
                    <Card className="bg-cg-legal-subtle border-cg-legal/20">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm flex items-center gap-2 text-cg-legal">
                          <Gavel className="h-4 w-4" />
                          Legal Observations
                          {analysis.v2_legal_flags && (
                            <Badge className="bg-cg-legal text-white text-[10px] ml-auto">
                              {analysis.v2_legal_flags.length} flag{analysis.v2_legal_flags.length !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-3">
                        {analysis.v2_legal_observations && analysis.v2_legal_observations.length > 0 && (
                          <ul className="space-y-2">
                            {analysis.v2_legal_observations.map((obs, i) => (
                              <li key={i} className="text-xs flex gap-2">
                                <span className="text-cg-legal font-bold">{i + 1}.</span>
                                <span className="text-foreground">{obs}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {analysis.v2_legal_flags && analysis.v2_legal_flags.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-cg-legal/20">
                                  <th className="text-left py-1.5 text-cg-legal font-semibold">Date</th>
                                  <th className="text-left py-1.5 text-cg-legal font-semibold">Category</th>
                                  <th className="text-left py-1.5 text-cg-legal font-semibold">Severity</th>
                                  <th className="text-left py-1.5 text-cg-legal font-semibold">Parent</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analysis.v2_legal_flags.map((flag, i) => (
                                  <tr key={i} className="border-b border-cg-legal/10">
                                    <td className="py-1.5 text-muted-foreground">{new Date(flag.date).toLocaleDateString()}</td>
                                    <td className="py-1.5 text-foreground font-medium">{flag.category.replace(/_/g, " ")}</td>
                                    <td className="py-1.5">
                                      <Badge variant="outline" className={`text-[9px] ${
                                        flag.severity === "severe" ? "border-cg-error/40 text-cg-error" :
                                        flag.severity === "high" ? "border-cg-warning/40 text-cg-warning" :
                                        "border-[var(--portal-border)] text-muted-foreground"
                                      }`}>{flag.severity}</Badge>
                                    </td>
                                    <td className="py-1.5 text-foreground">{flag.parent}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        <p className="text-[9px] text-cg-legal/70 italic pt-1">
                          These observations are generated from verified message analysis with SHA-256 integrity hashing.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Section 6: Category & Coaching Analysis */}
                  {analysis.v2_category_summary && Object.keys(analysis.v2_category_summary).length > 0 && (
                    <Card className="bg-[var(--portal-surface)] border-[var(--portal-border)]">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-[var(--portal-accent)]" />
                          Category Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-2">
                        {Object.entries(analysis.v2_category_summary)
                          .sort(([, a], [, b]) => b.count - a.count)
                          .slice(0, 10)
                          .map(([cat, data]) => (
                            <div key={cat} className="flex items-center gap-3">
                              <span className="text-xs text-foreground w-40 truncate font-medium">
                                {cat.replace(/_/g, " ")}
                              </span>
                              <div className="flex-1 h-2 rounded-full bg-[var(--portal-border)]">
                                <div
                                  className="h-full rounded-full bg-[var(--portal-accent)]"
                                  style={{
                                    width: `${Math.min(
                                      (data.count / Math.max(...Object.values(analysis.v2_category_summary!).map(d => d.count))) * 100,
                                      100
                                    )}%`,
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground w-8 text-right">{data.count}</span>
                              {data.avg_confidence != null && (
                                <span className="text-[9px] text-muted-foreground w-12 text-right">
                                  {(data.avg_confidence * 100).toFixed(0)}%
                                </span>
                              )}
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Section 7: ARIA Recommendation */}
                  <div className="p-4 bg-[var(--portal-accent)] rounded-xl text-white shadow-lg">
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-1 opacity-80">ARIA&apos;s Recommendation</h4>
                    <p className="text-sm font-medium italic">
                      &ldquo;{analysis.professional_recommendation}&rdquo;
                    </p>
                    {analysis.v2_risk_assessment?.factors && analysis.v2_risk_assessment.factors.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {analysis.v2_risk_assessment.factors.map((factor, i) => (
                          <Badge key={i} variant="outline" className="border-white/30 text-white/90 text-[9px]">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer: Metadata & Verification */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Analyzed {analysis.message_count} messages</span>
                      <span>Last updated: {new Date(analysis.analyzed_at).toLocaleString()}</span>
                    </div>
                    {analysis.verification && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--portal-surface)] border border-[var(--portal-border)]">
                        <ShieldCheck className="h-3.5 w-3.5 text-cg-success flex-shrink-0" />
                        <span className="text-[10px] text-muted-foreground">
                          Report Integrity: SHA-256{" "}
                          <code className="font-mono text-foreground">{analysis.verification.data_hash.slice(0, 12)}...</code>
                        </span>
                        <Badge variant="outline" className="text-[9px] border-cg-success/40 text-cg-success ml-auto">
                          Verified
                        </Badge>
                      </div>
                    )}
                    {/* Legend */}
                    <div className="px-3 py-2 rounded-lg bg-[var(--portal-surface)] border border-[var(--portal-border)]">
                      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Legend</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-muted-foreground">
                        <span><span className="inline-block w-2 h-2 rounded-full bg-cg-error mr-1" />Severe (CTRL, THRT)</span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-cg-warning mr-1" />Moderate (PSYB, CONT, ALNT, ESCP)</span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--portal-accent)] mr-1" />Mild (PAGG, MNIP)</span>
                        <span>Heat: 0-5 scale</span>
                        <span>Confidence: 0-100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  valueColor,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  valueColor?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${valueColor || ""}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className="p-2 bg-muted rounded-lg text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
