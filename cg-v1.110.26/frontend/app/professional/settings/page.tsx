"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  CreditCard,
  Building2,
  Plug,
  ChevronRight,
  Mail,
  Globe,
  Phone,
  MapPin,
  Shield,
  Bell,
  Key,
  Clock,
  Users,
  FolderOpen,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Zap,
  Star,
  Crown,
  Sparkles,
  Loader2,
  UserPlus,
  ExternalLink,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfessionalAuth } from "../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TierUsage {
  tier: string;
  cases: { active: number; max: number; remaining: number };
  team_members: { max: number };
  subscription_status: string;
  subscription_ends_at: string | null;
  features: Record<string, boolean>;
}

interface FirmData {
  id: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  website: string;
  address_line1: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  directory_listed: boolean;
}

interface TeamMember {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  professional_type: string;
  joined_at: string;
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "account", label: "Account", icon: User },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "firm", label: "Firm & Team", icon: Building2 },
  { id: "integrations", label: "Integrations", icon: Plug },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Plan Data ───────────────────────────────────────────────────────────────

const TIER_ORDER = ["starter", "solo", "small_firm", "mid_size", "enterprise"];
const PLANS: Record<string, { name: string; monthlyPrice: string; annualPrice: string; cases: number | string; team: number | string; featureCount: number; isEnterprise?: boolean }> = {
  starter: { name: "Starter", monthlyPrice: "Free", annualPrice: "Free", cases: 3, team: 0, featureCount: 6 },
  solo: { name: "Solo", monthlyPrice: "$99/mo", annualPrice: "$79/mo", cases: 15, team: 0, featureCount: 10 },
  small_firm: { name: "Small Firm", monthlyPrice: "$299/mo", annualPrice: "$249/mo", cases: 50, team: 5, featureCount: 15 },
  mid_size: { name: "Mid-Size", monthlyPrice: "$799/mo", annualPrice: "$649/mo", cases: 150, team: 15, featureCount: 18 },
  enterprise: { name: "Enterprise", monthlyPrice: "Custom", annualPrice: "Custom", cases: "\u221E", team: 50, featureCount: 21, isEnterprise: true },
};

const FEATURE_LABELS: Record<string, string> = {
  basic_dashboard: "Dashboard & Analytics", case_management: "Case Management", messaging: "Secure Messaging",
  basic_reporting: "Basic Reports", calendar: "Calendar & Events", directory_listing: "Directory Listing",
  ocr_processing: "Court Order OCR", advanced_reporting: "Advanced Reports", custom_templates: "Custom Templates",
  aria_intake: "ARIA Intake Tool", team_management: "Team Management", firm_branding: "Firm Branding",
  case_queue: "Case Queue & Dispatch", call_recording: "Call Recording", compliance_exports: "Compliance Exports",
  bulk_operations: "Bulk Operations", multi_firm: "Multi-Firm Support", api_access: "API Access",
  priority_support: "Priority Support", featured_listing: "Featured Directory", white_label: "White-Label Options",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner", admin: "Admin", attorney: "Attorney", paralegal: "Paralegal",
  intake_coordinator: "Intake Coordinator", read_only: "View Only",
};

const FIRM_TYPE_LABELS: Record<string, string> = {
  law_firm: "Law Firm", mediation_practice: "Mediation Practice",
  court_services: "Court Services", solo_practice: "Solo Practice",
};

// ─── Settings Hub ────────────────────────────────────────────────────────────

function SettingsContent() {
  const { token, profile } = useProfessionalAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(tabParam && TABS.some(t => t.id === tabParam) ? tabParam : "account");

  // Data
  const [usage, setUsage] = useState<TierUsage | null>(null);
  const [firm, setFirm] = useState<FirmData | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscription
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Firm editing
  const [firmEditing, setFirmEditing] = useState(false);
  const [firmDraft, setFirmDraft] = useState<Partial<FirmData>>({});
  const [firmSaving, setFirmSaving] = useState(false);

  // Invite
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("attorney");
  const [inviting, setInviting] = useState(false);

  // Fetch all data
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const [usageRes, profileRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/professional/tier/usage`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/v1/professional/profile`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (usageRes.ok) setUsage(await usageRes.json());

        if (profileRes.ok) {
          const pd = await profileRes.json();
          const firms = pd.firms || [];
          if (firms.length > 0) {
            const f = firms[0];
            setFirm(f);
            setFirmDraft(f);
            // Fetch members
            try {
              const membersRes = await fetch(`${API_BASE}/api/v1/professional/firms/${f.id}/members`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (membersRes.ok) {
                const md = await membersRes.json();
                setMembers(Array.isArray(md) ? md : md.members || []);
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error("Settings load error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [token]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    router.replace(`/professional/settings?tab=${tab}`, { scroll: false });
  };

  // Checkout — uses the professional subscription endpoint
  const handleCheckout = async (planCode: string) => {
    if (!token) return;
    setCheckoutLoading(planCode);
    try {
      const res = await fetch(`${API_BASE}/api/v1/professional/subscription/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ plan_code: planCode, billing_period: billingCycle === "annual" ? "annual" : "monthly" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error("Checkout error:", err?.detail || res.status);
        return;
      }
      const data = await res.json();
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Firm save
  const handleFirmSave = async () => {
    if (!token || !firm) return;
    setFirmSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/professional/firms/${firm.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(firmDraft),
      });
      if (res.ok) {
        const updated = await res.json();
        setFirm(updated);
        setFirmEditing(false);
      }
    } catch (err) {
      console.error("Firm save error:", err);
    } finally {
      setFirmSaving(false);
    }
  };

  // Invite member
  const handleInvite = async () => {
    if (!token || !firm || !inviteEmail) return;
    setInviting(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/professional/firms/${firm.id}/members/invite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (res.ok) {
        setShowInvite(false);
        setInviteEmail("");
        // Refresh members
        const membersRes = await fetch(`${API_BASE}/api/v1/professional/firms/${firm.id}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (membersRes.ok) {
          const md = await membersRes.json();
          setMembers(Array.isArray(md) ? md : md.members || []);
        }
      }
    } catch (err) {
      console.error("Invite error:", err);
    } finally {
      setInviting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#3DAA8A]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account, subscription, firm, and integrations</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs — desktop: vertical, mobile: horizontal pills */}
        <nav className="lg:w-56 shrink-0">
          {/* Mobile: horizontal scroll */}
          <div className="flex lg:hidden gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-[#3DAA8A] text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-[#3DAA8A]/30"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Desktop: vertical sidebar */}
          <div className="hidden lg:flex flex-col gap-1 bg-white rounded-2xl border border-slate-200 p-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                    isActive
                      ? "bg-[#F4F8F7] text-[#1E3A4A] border-l-[3px] border-l-[#3DAA8A]"
                      : "text-slate-600 hover:bg-slate-50 border-l-[3px] border-l-transparent"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-[#3DAA8A]" : "text-slate-400"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content Panel */}
        <div className="flex-1 min-w-0">
          {activeTab === "account" && <AccountTab profile={profile} />}
          {activeTab === "subscription" && (
            <SubscriptionTab
              usage={usage}
              billingCycle={billingCycle}
              setBillingCycle={setBillingCycle}
              checkoutLoading={checkoutLoading}
              handleCheckout={handleCheckout}
              profile={profile}
            />
          )}
          {activeTab === "firm" && (
            <FirmTab
              firm={firm}
              firmDraft={firmDraft}
              setFirmDraft={setFirmDraft}
              firmEditing={firmEditing}
              setFirmEditing={setFirmEditing}
              firmSaving={firmSaving}
              handleFirmSave={handleFirmSave}
              members={members}
              showInvite={showInvite}
              setShowInvite={setShowInvite}
              inviteEmail={inviteEmail}
              setInviteEmail={setInviteEmail}
              inviteRole={inviteRole}
              setInviteRole={setInviteRole}
              inviting={inviting}
              handleInvite={handleInvite}
              usage={usage}
            />
          )}
          {activeTab === "integrations" && <IntegrationsTab />}
        </div>
      </div>
    </div>
  );
}

// ─── Account Tab ─────────────────────────────────────────────────────────────

function AccountTab({ profile }: { profile: any }) {
  return (
    <div className="space-y-4">
      <Card className="border border-slate-200 rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-900">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider">Name</Label>
              <p className="text-sm font-medium text-slate-900 mt-1">
                {profile?.first_name} {profile?.last_name}
              </p>
            </div>
            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider">Email</Label>
              <p className="text-sm font-medium text-slate-900 mt-1">{profile?.email}</p>
            </div>
            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider">Professional Type</Label>
              <p className="text-sm font-medium text-slate-900 mt-1 capitalize">
                {(profile?.professional_type || "attorney").replace(/_/g, " ")}
              </p>
            </div>
            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider">Timezone</Label>
              <p className="text-sm font-medium text-slate-900 mt-1">
                {profile?.timezone || "America/Los_Angeles"}
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Link href="/professional/profile">
              <Button variant="outline" size="sm" className="rounded-lg border-slate-200 text-slate-700">
                Edit Profile <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-900">Security & Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Link href="/forgot-password" className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg"><Key className="h-4 w-4 text-slate-500" /></div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Change Password</p>
                  <p className="text-xs text-slate-500">Update your login credentials</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
            </Link>
            <Link href="/professional/notifications/preferences" className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg"><Bell className="h-4 w-4 text-slate-500" /></div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Notification Preferences</p>
                  <p className="text-xs text-slate-500">Email and in-app notification settings</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
            </Link>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F4F8F7]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg"><Shield className="h-4 w-4 text-[#3DAA8A]" /></div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Data & Privacy</p>
                  <p className="text-xs text-slate-500">HIPAA compliant, all actions logged</p>
                </div>
              </div>
              <Badge className="bg-[#3DAA8A]/10 text-[#3DAA8A] border-0 text-xs">Protected</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Subscription Tab ────────────────────────────────────────────────────────

function SubscriptionTab({
  usage, billingCycle, setBillingCycle, checkoutLoading, handleCheckout, profile,
}: {
  usage: TierUsage | null;
  billingCycle: "monthly" | "annual";
  setBillingCycle: (c: "monthly" | "annual") => void;
  checkoutLoading: string | null;
  handleCheckout: (planCode: string) => void;
  profile: any;
}) {
  if (!usage) return <p className="text-sm text-slate-500 py-8 text-center">Unable to load subscription data.</p>;

  const currentPlan = PLANS[usage.tier] || PLANS.starter;
  const casePercent = usage.cases.max > 0 ? Math.min(100, (usage.cases.active / usage.cases.max) * 100) : 0;
  const isNearLimit = casePercent >= 80;

  return (
    <div className="space-y-4">
      {/* Plan Cards — moved to top */}
      <Card className="rounded-2xl border border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#3DAA8A]" /> Choose Your Plan
            </CardTitle>
            <div className="flex items-center gap-1 bg-slate-100 rounded-full p-0.5">
              {(["monthly", "annual"] as const).map((cycle) => (
                <button key={cycle} onClick={() => setBillingCycle(cycle)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${billingCycle === cycle ? "bg-[#3DAA8A] text-white shadow-sm" : "text-slate-600"}`}>
                  {cycle === "monthly" ? "Monthly" : "Annual (Save 20%)"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {TIER_ORDER.map((tierKey) => {
              const plan = PLANS[tierKey];
              const isCurrent = tierKey === usage.tier;
              const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.annualPrice;
              const canCheckout = tierKey !== "starter" && !plan.isEnterprise;
              return (
                <div key={tierKey} className={`relative rounded-xl border p-4 flex flex-col ${isCurrent ? "border-[#3DAA8A] bg-[#F4F8F7] ring-1 ring-[#3DAA8A]/20" : "border-slate-200 hover:border-[#3DAA8A]/30"}`}>
                  {isCurrent && <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#3DAA8A] text-white border-0 text-[10px] px-2">Current</Badge>}
                  <h3 className="text-sm font-bold text-[#1E3A4A]">{plan.name}</h3>
                  <p className="text-lg font-bold text-slate-900 mt-1">{price}</p>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 flex-1">
                    <div className="flex items-center gap-1.5"><FolderOpen className="h-3 w-3 text-[#3DAA8A]" />{plan.cases} cases</div>
                    <div className="flex items-center gap-1.5"><Users className="h-3 w-3 text-[#3DAA8A]" />{plan.team === 0 ? "Solo" : `${plan.team} members`}</div>
                    <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-[#3DAA8A]" />{plan.featureCount}/21 features</div>
                  </div>
                  <div className="mt-3">
                    {isCurrent ? (
                      <Button disabled variant="outline" size="sm" className="w-full text-xs h-8 rounded-lg">Current</Button>
                    ) : plan.isEnterprise ? (
                      <Button asChild size="sm" className="w-full bg-[#1E3A4A] hover:bg-[#162E3C] text-white text-xs h-8 rounded-lg">
                        <a href="mailto:sales@find-commonground.com?subject=Enterprise%20Inquiry"><Mail className="h-3 w-3 mr-1" />Contact</a>
                      </Button>
                    ) : canCheckout ? (
                      <Button onClick={() => handleCheckout(tierKey)} disabled={checkoutLoading === tierKey} size="sm" className="w-full bg-[#3DAA8A] hover:bg-[#2D8A6E] text-white text-xs h-8 rounded-lg">
                        {checkoutLoading === tierKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <>Switch</>}
                      </Button>
                    ) : (
                      <Button disabled variant="outline" size="sm" className="w-full text-xs h-8 rounded-lg">Free</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className={`rounded-2xl border ${isNearLimit ? "border-amber-200" : "border-slate-200"}`}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-slate-400" /> Active Cases
              </span>
              <span className="text-sm font-semibold">{usage.cases.active} / {usage.cases.max >= 999999 ? "\u221E" : usage.cases.max}</span>
            </div>
            <Progress value={casePercent} className={`h-2 ${isNearLimit ? "[&>div]:bg-amber-500" : ""}`} />
            <p className="text-xs text-slate-500 mt-2">{usage.cases.remaining >= 999999 ? "Unlimited" : `${usage.cases.remaining} remaining`}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-200">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" /> Team Members
              </span>
              <span className="text-sm font-semibold">{usage.team_members.max >= 999999 ? "Unlimited" : `Max ${usage.team_members.max}`}</span>
            </div>
            <p className="text-xs text-slate-500">
              {usage.team_members.max === 0 ? "Upgrade to Small Firm or higher for team features." : `You can invite up to ${usage.team_members.max} members.`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      <Card className="rounded-2xl border border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-700">Features Included</CardTitle>
          <CardDescription className="text-xs">
            Your {currentPlan.name} plan includes {Object.values(usage.features).filter(Boolean).length} of {Object.keys(usage.features).length} features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {Object.entries(usage.features).map(([feature, enabled]) => (
              <div key={feature} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${enabled ? "text-slate-700" : "text-slate-400"}`}>
                {enabled ? <CheckCircle2 className="h-3.5 w-3.5 text-[#3DAA8A] shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                {FEATURE_LABELS[feature] || feature.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card className="rounded-2xl border border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-400" /> Billing History
            </CardTitle>
            <Badge className="bg-slate-100 text-slate-500 border-0 text-[10px]">
              {usage.subscription_status === "active" ? "Active" : "Free Tier"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {usage.tier === "starter" ? (
            <div className="py-6 text-center">
              <CreditCard className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No billing history</p>
              <p className="text-xs text-slate-400 mt-1">Upgrade to a paid plan to see transaction history here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Current subscription info */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F4F8F7]">
                <div>
                  <p className="text-sm font-medium text-slate-900">{currentPlan.name} Plan</p>
                  <p className="text-xs text-slate-500">
                    {billingCycle === "monthly" ? currentPlan.monthlyPrice : currentPlan.annualPrice}
                    {" \u00B7 "}
                    {usage.subscription_status === "active" ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    {usage.subscription_ends_at
                      ? `Renews ${new Date(usage.subscription_ends_at).toLocaleDateString()}`
                      : "No renewal date"}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                For detailed invoices and payment methods,{" "}
                <button
                  type="button"
                  onClick={async () => {
                    if (!token) return;
                    try {
                      const res = await fetch(`${API_BASE}/api/v1/professional/subscription/portal`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      const data = await res.json();
                      if (data.portal_url) window.open(data.portal_url, "_blank");
                    } catch (err) {
                      console.error("Portal error:", err);
                    }
                  }}
                  className="text-[#3DAA8A] hover:underline font-medium"
                >
                  open billing portal
                </button>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Firm & Team Tab ─────────────────────────────────────────────────────────

function FirmTab({
  firm, firmDraft, setFirmDraft, firmEditing, setFirmEditing, firmSaving, handleFirmSave,
  members, showInvite, setShowInvite, inviteEmail, setInviteEmail, inviteRole, setInviteRole, inviting, handleInvite,
  usage,
}: any) {
  if (!firm) {
    return (
      <Card className="rounded-2xl border border-slate-200">
        <CardContent className="py-12 text-center">
          <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">No Firm Created</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">Create a firm to manage your team and directory presence.</p>
          <Link href="/professional/firm/new">
            <Button className="bg-[#3DAA8A] hover:bg-[#2D8A6E] text-white rounded-xl">Create Firm</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Firm Info */}
      <Card className="rounded-2xl border border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-slate-900">{firm.name || "Your Firm"}</CardTitle>
            {!firmEditing ? (
              <Button variant="outline" size="sm" className="rounded-lg border-slate-200 text-xs" onClick={() => setFirmEditing(true)}>
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-lg border-slate-200 text-xs" onClick={() => { setFirmEditing(false); setFirmDraft(firm); }}>
                  Cancel
                </Button>
                <Button size="sm" className="rounded-lg bg-[#3DAA8A] hover:bg-[#2D8A6E] text-white text-xs" onClick={handleFirmSave} disabled={firmSaving}>
                  {firmSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {firmEditing ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Firm Name</Label>
                <Input value={firmDraft.name || ""} onChange={(e) => setFirmDraft({ ...firmDraft, name: e.target.value })} className="border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Type</Label>
                <select value={firmDraft.type || ""} onChange={(e) => setFirmDraft({ ...firmDraft, type: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  {Object.entries(FIRM_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Email</Label>
                <Input value={firmDraft.email || ""} onChange={(e) => setFirmDraft({ ...firmDraft, email: e.target.value })} className="border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Phone</Label>
                <Input value={firmDraft.phone || ""} onChange={(e) => setFirmDraft({ ...firmDraft, phone: e.target.value })} className="border-slate-200" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs text-slate-500">Website</Label>
                <Input value={firmDraft.website || ""} onChange={(e) => setFirmDraft({ ...firmDraft, website: e.target.value })} className="border-slate-200" />
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: "Type", value: FIRM_TYPE_LABELS[firm.type] || firm.type, icon: Building2 },
                { label: "Email", value: firm.email, icon: Mail },
                { label: "Phone", value: firm.phone, icon: Phone },
                { label: "Website", value: firm.website, icon: Globe },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="p-1.5 bg-slate-100 rounded-lg mt-0.5"><item.icon className="h-3.5 w-3.5 text-slate-500" /></div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm text-slate-900">{item.value || "—"}</p>
                  </div>
                </div>
              ))}
              {(firm.address_city || firm.address_state) && (
                <div className="flex items-start gap-3 sm:col-span-2">
                  <div className="p-1.5 bg-slate-100 rounded-lg mt-0.5"><MapPin className="h-3.5 w-3.5 text-slate-500" /></div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Location</p>
                    <p className="text-sm text-slate-900">{[firm.address_line1, firm.address_city, firm.address_state, firm.address_zip].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Directory listing */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F4F8F7]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg"><Globe className="h-4 w-4 text-[#3DAA8A]" /></div>
              <div>
                <p className="text-sm font-medium text-slate-900">Directory Listing</p>
                <p className="text-xs text-slate-500">Visible to parents searching for professionals</p>
              </div>
            </div>
            <Badge className={`text-xs ${firm.directory_listed ? "bg-[#3DAA8A]/10 text-[#3DAA8A]" : "bg-slate-100 text-slate-500"}`}>
              {firm.directory_listed ? "Listed" : "Hidden"}
            </Badge>
          </div>

          <Link href="/professional/firm" className="inline-flex items-center gap-1.5 text-xs text-[#3DAA8A] hover:text-[#2D8A6E] font-medium">
            View full firm settings <ExternalLink className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card className="rounded-2xl border border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-slate-900">Team Members</CardTitle>
            {usage?.team_members?.max > 0 && (
              <Button size="sm" className="rounded-lg bg-[#3DAA8A] hover:bg-[#2D8A6E] text-white text-xs gap-1.5"
                onClick={() => setShowInvite(!showInvite)}>
                <UserPlus className="h-3.5 w-3.5" /> Invite
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Invite Form */}
          {showInvite && (
            <div className="p-4 rounded-xl bg-[#F4F8F7] border border-[#3DAA8A]/10 mb-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Email</Label>
                  <Input value={inviteEmail} onChange={(e: any) => setInviteEmail(e.target.value)} placeholder="colleague@firm.com" className="border-slate-200" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Role</Label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    {Object.entries(ROLE_LABELS).filter(([k]) => k !== "owner").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="rounded-lg bg-[#3DAA8A] hover:bg-[#2D8A6E] text-white text-xs" onClick={handleInvite} disabled={inviting || !inviteEmail}>
                  {inviting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Mail className="h-3 w-3 mr-1" />} Send Invite
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg border-slate-200 text-xs" onClick={() => setShowInvite(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {members.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                {usage?.team_members?.max === 0 ? "Team features require Small Firm tier or higher." : "No team members yet. Invite your first colleague."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m: TeamMember) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center text-xs font-bold text-[#3DAA8A]">
                      {(m.first_name?.[0] || "").toUpperCase()}{(m.last_name?.[0] || "").toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{m.first_name} {m.last_name}</p>
                      <p className="text-xs text-slate-500">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${m.status === "active" ? "bg-green-50 text-green-700" : m.status === "invited" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                      {m.status}
                    </Badge>
                    <Badge className="text-[10px] bg-slate-100 text-slate-600 border-0">
                      {ROLE_LABELS[m.role] || m.role}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Integrations Tab ────────────────────────────────────────────────────────

function IntegrationsTab() {
  const integrations = [
    { name: "MyCase", description: "Sync cases and client data with MyCase", icon: FolderOpen, status: "coming_soon" },
    { name: "Clio", description: "Connect your Clio practice management", icon: FolderOpen, status: "coming_soon" },
    { name: "Google Calendar", description: "Sync events with Google Calendar", icon: Calendar, status: "coming_soon" },
    { name: "Apple Calendar", description: "Sync events with iCal", icon: Calendar, status: "coming_soon" },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-[#F4F8F7] border border-[#3DAA8A]/10">
        <p className="text-sm text-[#1E3A4A] font-medium">Integrations are coming soon</p>
        <p className="text-xs text-slate-500 mt-1">We're building connections with the tools you already use. Stay tuned for Q3 2026.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {integrations.map((int) => (
          <Card key={int.name} className="rounded-2xl border border-slate-200 opacity-75">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-slate-100 rounded-xl">
                  <int.icon className="h-5 w-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">{int.name}</h3>
                    <Badge className="bg-slate-100 text-slate-500 border-0 text-[10px]">Coming Soon</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{int.description}</p>
                </div>
              </div>
              <Button disabled variant="outline" size="sm" className="w-full mt-3 rounded-lg text-xs h-8">
                <Plug className="h-3 w-3 mr-1.5" /> Connect
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#3DAA8A]" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}
