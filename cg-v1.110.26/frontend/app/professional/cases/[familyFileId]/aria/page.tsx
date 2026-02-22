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
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  FileSearch,
  Zap,
  History,
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

interface ARIAMetrics {
  total_messages_analyzed: number;
  total_interventions: number;
  intervention_rate: number;
  acceptance_rate: number;
  trend: string;
  by_category: Record<string, number>;
  good_faith_score_a: number;
  good_faith_score_b: number;
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
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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
      // We call the same endpoint, it triggers fresh AI analysis on backend
      await fetchAnalysis();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateSettings = (updates: Partial<ARIASettings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...updates });
    setHasChanges(true);
  };

  const saveSettings = async () => {
    if (!token || !familyFileId || !settings) return;

    setIsSaving(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/aria`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settings),
        }
      );

      if (response.ok) {
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Error saving ARIA settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "improving") return <TrendingDown className="h-4 w-4 text-emerald-500" />;
    if (trend === "declining") return <TrendingUp className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getGoodFaithColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
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
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Bot className="h-6 w-6" />
            </div>
            ARIA Control Panel
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage AI intervention settings and deep thread analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="warning" className="mr-2">
              Unsaved changes
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={fetchARIAData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={saveSettings}
            disabled={!hasChanges || isSaving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="controls" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="controls" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Controls
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <FileSearch className="h-4 w-4" />
            Analysis Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="controls" className="space-y-6 mt-6">
          {/* Metrics Overview */}
          {metrics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Messages Analyzed"
                value={metrics.total_messages_analyzed}
                icon={<MessageSquare className="h-5 w-5" />}
              />
              <MetricCard
                label="Interventions"
                value={metrics.total_interventions}
                subtitle={`${(metrics.intervention_rate * 100).toFixed(1)}% rate`}
                icon={<AlertTriangle className="h-5 w-5" />}
              />
              <MetricCard
                label="Acceptance Rate"
                value={`${(metrics.acceptance_rate * 100).toFixed(0)}%`}
                icon={<CheckCircle2 className="h-5 w-5" />}
                trend={metrics.trend}
              />
              <MetricCard
                label="Trend"
                value={metrics.trend === "improving" ? "Improving" : metrics.trend === "declining" ? "Needs Attention" : "Stable"}
                icon={getTrendIcon(metrics.trend)}
                valueColor={
                  metrics.trend === "improving"
                    ? "text-emerald-600"
                    : metrics.trend === "declining"
                      ? "text-red-600"
                      : "text-muted-foreground"
                }
              />
            </div>
          )}

          {/* Good Faith Scores */}
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  Good Faith Scores
                </CardTitle>
                <CardDescription>
                  Communication quality metrics for each parent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Parent A (Petitioner)</span>
                      <span className={`text-2xl font-bold ${getGoodFaithColor(metrics.good_faith_score_a)}`}>
                        {metrics.good_faith_score_a}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${metrics.good_faith_score_a >= 80
                          ? "bg-emerald-500"
                          : metrics.good_faith_score_a >= 60
                            ? "bg-amber-500"
                            : "bg-red-500"
                          }`}
                        style={{ width: `${metrics.good_faith_score_a}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Parent B (Respondent)</span>
                      <span className={`text-2xl font-bold ${getGoodFaithColor(metrics.good_faith_score_b)}`}>
                        {metrics.good_faith_score_b}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${metrics.good_faith_score_b >= 80
                          ? "bg-emerald-500"
                          : metrics.good_faith_score_b >= 60
                            ? "bg-amber-500"
                            : "bg-red-500"
                          }`}
                        style={{ width: `${metrics.good_faith_score_b}%` }}
                      />
                    </div>
                  </div>
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
                    onCheckedChange={(checked) => updateSettings({ is_enabled: checked })}
                  />
                </div>

                {settings.is_enabled && (
                  <>
                    {/* Sensitivity Level */}
                    <div className="space-y-3">
                      <Label className="font-medium">Sensitivity Level</Label>
                      <Select
                        value={settings.sensitivity_level}
                        onValueChange={(value) => updateSettings({ sensitivity_level: value })}
                      >
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
                        onCheckedChange={(checked) => updateSettings({ auto_rewrite: checked })}
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
                        onCheckedChange={(checked) => updateSettings({ notify_on_flag: checked })}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Category Breakdown */}
          {metrics?.by_category && Object.keys(metrics.by_category).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Intervention Categories</CardTitle>
                <CardDescription>
                  Breakdown of issues flagged by ARIA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(metrics.by_category)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {category.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{
                                width: `${(count / metrics.total_interventions) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Interventions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
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
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                              <p className="text-xs font-medium text-emerald-600 mb-1">
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
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                  <p>No recent interventions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6 mt-6">
          <Card className="border-emerald-100 bg-emerald-50/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-emerald-600" />
                    Deep Thread Analysis
                  </CardTitle>
                  <CardDescription>
                    AI-powered summary and resolution fact-finding
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={runNewAnalysis}
                  disabled={isAnalyzing}
                  className="bg-emerald-600 hover:bg-emerald-700"
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
                  <p className="text-sm">Click the button above to have Aria analyze the thread history.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary & Tone */}
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                          <History className="h-4 w-4" />
                          Narrative Summary
                        </h3>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {analysis.narrative_summary}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                          <Layers className="h-4 w-4" />
                          Emotional Climate (Tone)
                        </h3>
                        <Badge variant="secondary" className="bg-white border text-slate-600 px-3 py-1 text-sm">
                          {analysis.tone_analysis}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 bg-white rounded-xl border flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-bold text-slate-400 uppercase">Resolution Score</span>
                        <div className={`text-4xl font-extrabold my-2 ${analysis.resolution_score >= 80 ? "text-emerald-600" :
                          analysis.resolution_score >= 60 ? "text-amber-600" : "text-red-600"
                          }`}>
                          {analysis.resolution_score}
                        </div>
                        <p className="text-[10px] text-slate-500">Likelihood of self-resolution</p>
                      </div>

                      {/* Lags */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Avg Response Times</span>
                        {Object.entries(analysis.lags).map(([uid, stats]: [string, any]) => (
                          <div key={uid} className="p-3 bg-white rounded-lg border flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-500">
                              {uid === profile?.user_id ? "You" :
                                uid === analysis.lags[Object.keys(analysis.lags)[0]] ? "Parent A" : "Parent B"}
                            </span>
                            <span className="font-bold text-slate-800">{stats.average_response_time_hours} hrs</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Facts & Conflict */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="bg-white border-slate-100">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          Resolution Facts
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <ul className="space-y-2">
                          {analysis.facts_for_professional.map((fact, i) => (
                            <li key={i} className="text-xs text-slate-600 flex gap-2">
                              <span className="text-slate-300">•</span>
                              {fact}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-100">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          Conflict Points
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <ul className="space-y-2">
                          {analysis.conflict_points.map((point, i) => (
                            <li key={i} className="text-xs text-slate-600 flex gap-2">
                              <span className="text-slate-300">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recommendation */}
                  <div className="p-4 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-200/50">
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-1 opacity-80">Aria's Recommendation</h4>
                    <p className="text-sm font-medium italic">
                      "{analysis.professional_recommendation}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2">
                    <span>Analyzed {analysis.message_count} messages</span>
                    <span>Last updated: {new Date(analysis.analyzed_at).toLocaleString()}</span>
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
