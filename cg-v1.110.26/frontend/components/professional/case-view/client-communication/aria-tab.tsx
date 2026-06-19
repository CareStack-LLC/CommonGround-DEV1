"use client";

import { useState, useEffect } from "react";
import {
    Bot,
    Settings,
    Shield,
    AlertTriangle,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
    Minus,
    MessageSquare,
    RefreshCw,
    Info,
    Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
 * — see backend aria_control_service.get_aria_metrics. All `*_rate` fields
 * are 0-100 per ADR-001, except v2_coaching_acceptance_rate which is 0-1.
 */
interface ARIAMetrics {
    period_days?: number;
    total_messages: number;
    flagged_messages: number;
    flag_rate: number; // 0-100
    sentiment_trend: string;
    good_faith_score: number | null; // 0-100, case-level
    v2_coaching_acceptance_rate?: number | null; // 0-1
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

const SENSITIVITY_LEVELS = [
    { value: "low", label: "Low", description: "Only flag severe issues" },
    { value: "medium", label: "Medium", description: "Balance between intervention and flow" },
    { value: "high", label: "High", description: "Catch subtle issues early" },
];

export function AriaTab({ familyFileId, token }: { familyFileId: string, token: string }) {
    const [settings, setSettings] = useState<ARIASettings | null>(null);
    const [metrics, setMetrics] = useState<ARIAMetrics | null>(null);
    const [interventions, setInterventions] = useState<ARIAIntervention[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
        } catch (error) {
            console.error("Error fetching ARIA data:", error);
        } finally {
            setIsLoading(false);
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
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Bot className="h-5 w-5 text-emerald-600" />
                        ARIA Control Panel
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage AI intervention settings and view safety metrics
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

            {/* Metrics Overview — field names mapped to what the backend
                returns. flag_rate is 0-100 (ADR-001); coaching-acceptance
                is 0-1. */}
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
                        icon={<CheckCircle2 className="h-5 w-5" />}
                        trend={metrics.sentiment_trend}
                    />
                    <MetricCard
                        label="Trend"
                        value={metrics.sentiment_trend === "improving" ? "Improving" : metrics.sentiment_trend === "declining" ? "Needs Attention" : "Stable"}
                        icon={getTrendIcon(metrics.sentiment_trend)}
                        valueColor={
                            metrics.sentiment_trend === "improving"
                                ? "text-emerald-600"
                                : metrics.sentiment_trend === "declining"
                                    ? "text-red-600"
                                    : "text-muted-foreground"
                        }
                    />
                </div>
            )}

            {/* Good Faith Score — case-level. Per-parent scores aren't
                computed by the backend today; refer to the full ARIA page
                at /professional/cases/{id}/aria for V2 Sentinel Shield
                per-parent heat scores. */}
            {metrics && metrics.good_faith_score != null && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Shield className="h-5 w-5 text-emerald-600" />
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
                                            ? "bg-emerald-500"
                                            : metrics.good_faith_score >= 60
                                                ? "bg-amber-500"
                                                : "bg-red-500"
                                    }`}
                                    style={{ width: `${metrics.good_faith_score}%` }}
                                />
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
                        {/* Read-only notice: ARIA (incl. child-safety monitoring)
                            is controlled only by the parents and by court order. */}
                        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
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
                                                        </span>
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

            {/* Category Breakdown — intentionally removed. The simplified
                ARIAMetrics interface used on this case-view tab doesn't carry
                v2_category_breakdown; see /superadmin/aria for full breakdown. */}

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
