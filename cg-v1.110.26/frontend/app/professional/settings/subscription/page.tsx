"use client";

import { useState, useEffect } from "react";
import {
    CreditCard,
    Crown,
    CheckCircle2,
    XCircle,
    ArrowUpRight,
    Zap,
    Shield,
    Users,
    FolderOpen,
    ScanLine,
    BarChart3,
    Building2,
    Star,
    TrendingUp,
    Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProfessionalAuth } from "../../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TierUsage {
    tier: string;
    cases: { active: number; max: number; remaining: number };
    team_members: { max: number };
    subscription_status: string;
    subscription_ends_at: string | null;
    features: Record<string, boolean>;
}

const TIER_INFO: Record<string, { name: string; price: string; color: string; gradient: string; icon: React.ReactNode }> = {
    starter: {
        name: "Starter",
        price: "Free",
        color: "text-slate-700",
        gradient: "from-slate-100 to-slate-200",
        icon: <Zap className="h-6 w-6" />,
    },
    solo: {
        name: "Solo",
        price: "$99/mo",
        color: "text-blue-700",
        gradient: "from-blue-50 to-indigo-100",
        icon: <Star className="h-6 w-6" />,
    },
    small_firm: {
        name: "Small Firm",
        price: "$299/mo",
        color: "text-emerald-700",
        gradient: "from-emerald-50 to-teal-100",
        icon: <Building2 className="h-6 w-6" />,
    },
    mid_size: {
        name: "Mid-Size",
        price: "$799/mo",
        color: "text-purple-700",
        gradient: "from-purple-50 to-violet-100",
        icon: <Crown className="h-6 w-6" />,
    },
    enterprise: {
        name: "Enterprise",
        price: "Custom",
        color: "text-amber-700",
        gradient: "from-amber-50 to-orange-100",
        icon: <Sparkles className="h-6 w-6" />,
    },
};

const FEATURE_ICONS: Record<string, React.ReactNode> = {
    basic_dashboard: <BarChart3 className="h-4 w-4" />,
    case_management: <FolderOpen className="h-4 w-4" />,
    messaging: <Shield className="h-4 w-4" />,
    basic_reporting: <BarChart3 className="h-4 w-4" />,
    calendar: <Shield className="h-4 w-4" />,
    directory_listing: <Users className="h-4 w-4" />,
    ocr_processing: <ScanLine className="h-4 w-4" />,
    advanced_reporting: <BarChart3 className="h-4 w-4" />,
    custom_templates: <Shield className="h-4 w-4" />,
    aria_intake: <Shield className="h-4 w-4" />,
    team_management: <Users className="h-4 w-4" />,
    firm_branding: <Building2 className="h-4 w-4" />,
    case_queue: <FolderOpen className="h-4 w-4" />,
    call_recording: <Shield className="h-4 w-4" />,
    compliance_exports: <BarChart3 className="h-4 w-4" />,
    bulk_operations: <FolderOpen className="h-4 w-4" />,
    multi_firm: <Building2 className="h-4 w-4" />,
    api_access: <Zap className="h-4 w-4" />,
    priority_support: <Star className="h-4 w-4" />,
    featured_listing: <Crown className="h-4 w-4" />,
    white_label: <Sparkles className="h-4 w-4" />,
};

const FEATURE_LABELS: Record<string, string> = {
    basic_dashboard: "Dashboard & Analytics",
    case_management: "Case Management",
    messaging: "Secure Messaging",
    basic_reporting: "Basic Reports",
    calendar: "Calendar & Events",
    directory_listing: "Directory Listing",
    ocr_processing: "Court Order OCR",
    advanced_reporting: "Advanced Reports",
    custom_templates: "Custom Templates",
    aria_intake: "ARIA Intake Tool",
    team_management: "Team Management",
    firm_branding: "Firm Branding",
    case_queue: "Case Queue & Dispatch",
    call_recording: "Call Recording",
    compliance_exports: "Compliance Exports",
    bulk_operations: "Bulk Operations",
    multi_firm: "Multi-Firm Support",
    api_access: "API Access",
    priority_support: "Priority Support",
    featured_listing: "Featured Directory",
    white_label: "White-Label Options",
};

// Tier ordering for comparison
const TIER_ORDER = ["starter", "solo", "small_firm", "mid_size", "enterprise"];

export default function SubscriptionPage() {
    const { token } = useProfessionalAuth();
    const [usage, setUsage] = useState<TierUsage | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/v1/professional/tier/usage`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) setUsage(await res.json());
            } catch (err) {
                console.error("Error fetching usage:", err);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [token]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--portal-primary)]" />
            </div>
        );
    }

    if (!usage) return null;

    const currentTier = TIER_INFO[usage.tier] || TIER_INFO.starter;
    const currentTierIndex = TIER_ORDER.indexOf(usage.tier);
    const casePercent = usage.cases.max > 0 ? Math.min(100, (usage.cases.active / usage.cases.max) * 100) : 0;
    const isNearLimit = casePercent >= 80;

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                        <CreditCard className="h-6 w-6" />
                    </div>
                    Subscription & Billing
                </h1>
                <p className="text-slate-500 mt-1">
                    Manage your plan, view usage, and explore upgrade options.
                </p>
            </div>

            {/* Current Plan Card */}
            <Card className={`bg-gradient-to-br ${currentTier.gradient} border-0 shadow-lg`}>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 bg-white/80 rounded-xl shadow-sm ${currentTier.color}`}>
                                {currentTier.icon}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-bold text-slate-900">{currentTier.name}</h2>
                                    <Badge className="bg-white/60 text-slate-700 border-0">Current Plan</Badge>
                                </div>
                                <p className="text-lg font-semibold text-slate-700 mt-0.5">{currentTier.price}</p>
                                <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                                    <span className="flex items-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${usage.subscription_status === "active" ? "bg-green-500" : "bg-amber-500"}`} />
                                        {usage.subscription_status === "active" ? "Active" : "Inactive"}
                                    </span>
                                    {usage.subscription_ends_at && (
                                        <span>Renews {new Date(usage.subscription_ends_at).toLocaleDateString()}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {currentTierIndex < TIER_ORDER.length - 1 && (
                            <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white gap-2 shadow-lg shadow-indigo-500/20">
                                <ArrowUpRight className="h-4 w-4" />
                                Upgrade Plan
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Usage Cards */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* Cases */}
                <Card className={isNearLimit ? "border-amber-200" : ""}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 text-slate-500" />
                                Active Cases
                            </CardTitle>
                            <span className="text-sm font-semibold">
                                {usage.cases.active} / {usage.cases.max >= 999999 ? "∞" : usage.cases.max}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Progress value={casePercent} className={`h-2.5 ${isNearLimit ? "[&>div]:bg-amber-500" : ""}`} />
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                                {usage.cases.remaining >= 999999 ? "Unlimited" : `${usage.cases.remaining} remaining`}
                            </span>
                            {isNearLimit && (
                                <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs">
                                    Near Limit
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Team Members */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Users className="h-4 w-4 text-slate-500" />
                                Team Members
                            </CardTitle>
                            <span className="text-sm font-semibold">
                                {usage.team_members.max >= 999999 ? "Unlimited" : `Max ${usage.team_members.max}`}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {usage.team_members.max === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Team features require Small Firm tier or higher.
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                You can invite up to {usage.team_members.max >= 999999 ? "unlimited" : usage.team_members.max} team members.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Feature List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Features Included</CardTitle>
                    <CardDescription>
                        Your {currentTier.name} plan includes {Object.values(usage.features).filter(Boolean).length} of{" "}
                        {Object.keys(usage.features).length} features
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {Object.entries(usage.features).map(([feature, enabled]) => (
                            <div
                                key={feature}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${enabled
                                        ? "bg-green-50/60 text-slate-700"
                                        : "bg-slate-50 text-slate-400"
                                    }`}
                            >
                                {enabled ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-slate-300 flex-shrink-0" />
                                )}
                                <span className="text-sm font-medium">
                                    {FEATURE_LABELS[feature] || feature.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Tier Comparison */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-indigo-500" />
                        Plan Comparison
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto -mx-2">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-3 font-medium text-slate-500">Plan</th>
                                    <th className="text-center py-3 px-3 font-medium text-slate-500">Price</th>
                                    <th className="text-center py-3 px-3 font-medium text-slate-500">Cases</th>
                                    <th className="text-center py-3 px-3 font-medium text-slate-500">Team</th>
                                    <th className="text-center py-3 px-3 font-medium text-slate-500">Features</th>
                                    <th className="py-3 px-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {TIER_ORDER.map((tierKey) => {
                                    const tier = TIER_INFO[tierKey];
                                    const isCurrentTier = tierKey === usage.tier;
                                    const cases = tierKey === "starter" ? 3 : tierKey === "solo" ? 15 : tierKey === "small_firm" ? 50 : tierKey === "mid_size" ? 150 : "∞";
                                    const team = tierKey === "starter" || tierKey === "solo" ? 0 : tierKey === "small_firm" ? 5 : tierKey === "mid_size" ? 15 : 50;
                                    const featureCount = tierKey === "starter" ? 6 : tierKey === "solo" ? 10 : tierKey === "small_firm" ? 15 : tierKey === "mid_size" ? 18 : 21;

                                    return (
                                        <tr
                                            key={tierKey}
                                            className={isCurrentTier ? "bg-indigo-50/50" : ""}
                                        >
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-semibold ${tier.color}`}>{tier.name}</span>
                                                    {isCurrentTier && (
                                                        <Badge className="text-[10px] bg-indigo-100 text-indigo-700 border-0">
                                                            Current
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-center py-3 px-3 font-medium">{tier.price}</td>
                                            <td className="text-center py-3 px-3">{cases}</td>
                                            <td className="text-center py-3 px-3">{team}</td>
                                            <td className="text-center py-3 px-3">{featureCount}/21</td>
                                            <td className="py-3 px-3 text-right">
                                                {!isCurrentTier && TIER_ORDER.indexOf(tierKey) > currentTierIndex && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                    >
                                                        Upgrade
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
