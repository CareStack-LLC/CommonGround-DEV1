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
        } catch (error) {
            console.error("Error fetching ARIA data:", error);
        } finally {
            setIsLoading(false);
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
