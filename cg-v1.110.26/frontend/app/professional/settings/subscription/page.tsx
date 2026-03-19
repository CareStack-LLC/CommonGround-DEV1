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
    Mail,
    Loader2,
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

type BillingCycle = "monthly" | "annual";

interface PlanInfo {
    name: string;
    monthlyPrice: string;
    annualPrice: string;
    monthlyPriceId: string | null;
    annualPriceId: string | null;
    icon: React.ReactNode;
    cases: number | string;
    team: number | string;
    featureCount: number;
    isEnterprise?: boolean;
}

const PLANS: Record<string, PlanInfo> = {
    starter: {
        name: "Starter",
        monthlyPrice: "Free",
        annualPrice: "Free",
        monthlyPriceId: null,
        annualPriceId: null,
        icon: <Zap className="h-6 w-6" />,
        cases: 3,
        team: 0,
        featureCount: 6,
    },
    solo: {
        name: "Solo",
        monthlyPrice: "$99/mo",
        annualPrice: "$79/mo",
        monthlyPriceId: "price_1T7WgpB3EXvvERPfbXPqXJjK",
        annualPriceId: "price_1T7WgpB3EXvvERPfaYzRkMnL",
        icon: <Star className="h-6 w-6" />,
        cases: 15,
        team: 0,
        featureCount: 10,
    },
    small_firm: {
        name: "Small Firm",
        monthlyPrice: "$299/mo",
        annualPrice: "$249/mo",
        monthlyPriceId: "price_1T7WgpB3EXvvERPfcDeFgHiJ",
        annualPriceId: "price_1T7WgpB3EXvvERPfdKlMnOpQ",
        icon: <Building2 className="h-6 w-6" />,
        cases: 50,
        team: 5,
        featureCount: 15,
    },
    mid_size: {
        name: "Mid-Size",
        monthlyPrice: "$799/mo",
        annualPrice: "$649/mo",
        monthlyPriceId: "price_1T7WgpB3EXvvERPfeRsTuVwX",
        annualPriceId: "price_1T7WgpB3EXvvERPffYzAbCdE",
        icon: <Crown className="h-6 w-6" />,
        cases: 150,
        team: 15,
        featureCount: 18,
    },
    enterprise: {
        name: "Enterprise",
        monthlyPrice: "Custom",
        annualPrice: "Custom",
        monthlyPriceId: null,
        annualPriceId: null,
        icon: <Sparkles className="h-6 w-6" />,
        cases: "\u221E",
        team: 50,
        featureCount: 21,
        isEnterprise: true,
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
    const { token, profile } = useProfessionalAuth();
    const [usage, setUsage] = useState<TierUsage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

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

    const handleCheckout = async (priceId: string) => {
        if (!token) return;
        setCheckoutLoading(priceId);
        try {
            const response = await fetch(`${API_BASE}/api/v1/subscriptions/checkout`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    price_id: priceId,
                    success_url: window.location.href,
                    cancel_url: window.location.href,
                }),
            });
            const data = await response.json();
            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            }
        } catch (err) {
            console.error("Checkout error:", err);
        } finally {
            setCheckoutLoading(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3DAA8A]" />
            </div>
        );
    }

    if (!usage) return null;

    const currentTierIndex = TIER_ORDER.indexOf(usage.tier);
    const currentPlan = PLANS[usage.tier] || PLANS.starter;
    const casePercent = usage.cases.max > 0 ? Math.min(100, (usage.cases.active / usage.cases.max) * 100) : 0;
    const isNearLimit = casePercent >= 80;

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-[#3DAA8A] to-[#1E3A4A] text-white rounded-xl shadow-lg shadow-[#3DAA8A]/20">
                        <CreditCard className="h-6 w-6" />
                    </div>
                    Subscription & Billing
                </h1>
                <p className="text-slate-500 mt-1">
                    Manage your plan, view usage, and explore upgrade options.
                </p>
            </div>

            {/* Current Plan Card */}
            <Card className="bg-gradient-to-br from-[#F4F8F7] to-[#E0F0EC] border-0 shadow-lg">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/80 rounded-xl shadow-sm text-[#3DAA8A]">
                                {currentPlan.icon}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-bold text-slate-900">{currentPlan.name}</h2>
                                    <Badge className="bg-[#3DAA8A]/15 text-[#1E3A4A] border-0">Current Plan</Badge>
                                </div>
                                <p className="text-lg font-semibold text-slate-700 mt-0.5">
                                    {billingCycle === "monthly" ? currentPlan.monthlyPrice : currentPlan.annualPrice}
                                </p>
                                <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                                    <span className="flex items-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${usage.subscription_status === "active" ? "bg-green-500" : "bg-amber-500"}`} />
                                        {usage.subscription_status === "active" ? "Active" : "Inactive"}
                                    </span>
                                    {usage.subscription_ends_at && (
                                        <span>Renews {new Date(usage.subscription_ends_at).toLocaleDateString()}</span>
                                    )}
                                    {(profile as any)?.subscription_tier && (
                                        <span className="text-xs text-slate-500">
                                            Tier: {(profile as any).subscription_tier}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {currentTierIndex < TIER_ORDER.length - 1 && (
                            <Button className="bg-gradient-to-r from-[#3DAA8A] to-[#1E3A4A] hover:from-[#2D8A6E] hover:to-[#162E3C] text-white gap-2 shadow-lg shadow-[#3DAA8A]/20">
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
                                {usage.cases.active} / {usage.cases.max >= 999999 ? "\u221E" : usage.cases.max}
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
                        Your {currentPlan.name} plan includes {Object.values(usage.features).filter(Boolean).length} of{" "}
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

            {/* Billing Cycle Toggle + Plan Cards */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-[#3DAA8A]" />
                            Choose Your Plan
                        </CardTitle>
                        <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
                            <button
                                onClick={() => setBillingCycle("monthly")}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                                    billingCycle === "monthly"
                                        ? "bg-[#3DAA8A] text-white shadow-sm"
                                        : "text-slate-600 hover:text-slate-800"
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingCycle("annual")}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                                    billingCycle === "annual"
                                        ? "bg-[#3DAA8A] text-white shadow-sm"
                                        : "text-slate-600 hover:text-slate-800"
                                }`}
                            >
                                Annual
                                <span className="ml-1.5 text-xs opacity-75">Save 20%</span>
                            </button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {TIER_ORDER.map((tierKey) => {
                            const plan = PLANS[tierKey];
                            const isCurrentTier = tierKey === usage.tier;
                            const priceId = billingCycle === "monthly" ? plan.monthlyPriceId : plan.annualPriceId;
                            const displayPrice = billingCycle === "monthly" ? plan.monthlyPrice : plan.annualPrice;
                            const isLoadingThis = checkoutLoading === priceId;

                            return (
                                <div
                                    key={tierKey}
                                    className={`relative rounded-xl border p-5 flex flex-col transition-all ${
                                        isCurrentTier
                                            ? "border-[#3DAA8A] bg-[#F4F8F7] shadow-md ring-1 ring-[#3DAA8A]/20"
                                            : "border-slate-200 bg-white hover:border-[#3DAA8A]/40 hover:shadow-sm"
                                    }`}
                                >
                                    {isCurrentTier && (
                                        <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#3DAA8A] text-white border-0 text-xs px-3">
                                            Current Plan
                                        </Badge>
                                    )}
                                    <div className="text-[#3DAA8A] mb-3">{plan.icon}</div>
                                    <h3 className="text-lg font-bold text-[#1E3A4A]">{plan.name}</h3>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">{displayPrice}</p>
                                    {billingCycle === "annual" && plan.annualPrice !== "Free" && plan.annualPrice !== "Custom" && (
                                        <p className="text-xs text-slate-500">billed annually</p>
                                    )}
                                    <div className="mt-4 space-y-2 text-sm text-slate-600 flex-1">
                                        <div className="flex items-center gap-2">
                                            <FolderOpen className="h-3.5 w-3.5 text-[#3DAA8A]" />
                                            <span>{plan.cases} cases</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="h-3.5 w-3.5 text-[#3DAA8A]" />
                                            <span>{plan.team === 0 ? "Solo" : `${plan.team} members`}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-[#3DAA8A]" />
                                            <span>{plan.featureCount}/21 features</span>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        {isCurrentTier ? (
                                            <Button
                                                disabled
                                                className="w-full bg-slate-100 text-slate-500 border border-slate-200"
                                                variant="outline"
                                                size="sm"
                                            >
                                                Current Plan
                                            </Button>
                                        ) : plan.isEnterprise ? (
                                            <Button
                                                asChild
                                                className="w-full bg-[#1E3A4A] hover:bg-[#162E3C] text-white"
                                                size="sm"
                                            >
                                                <a href="mailto:sales@commonground.co?subject=Enterprise%20Plan%20Inquiry">
                                                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                                                    Contact Sales
                                                </a>
                                            </Button>
                                        ) : priceId ? (
                                            <Button
                                                onClick={() => handleCheckout(priceId)}
                                                disabled={isLoadingThis}
                                                className="w-full bg-[#3DAA8A] hover:bg-[#2D8A6E] text-white"
                                                size="sm"
                                            >
                                                {isLoadingThis ? (
                                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                                ) : (
                                                    <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
                                                )}
                                                Switch Plan
                                            </Button>
                                        ) : (
                                            <Button
                                                disabled
                                                className="w-full"
                                                variant="outline"
                                                size="sm"
                                            >
                                                Free Tier
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
