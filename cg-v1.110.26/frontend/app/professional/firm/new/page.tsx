"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Building2, ArrowLeft, ArrowRight, Check, Loader2,
    Globe, Mail, Phone, MapPin, Palette, Users,
    Scale, User, Briefcase, ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProfessionalAuth } from "../../layout";
import { useToast } from "@/hooks/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const FIRM_TYPES = [
    { value: "law_firm", label: "Law Firm", icon: <Scale className="h-5 w-5" />, description: "Full-service legal representation" },
    { value: "mediation_practice", label: "Mediation Practice", icon: <Users className="h-5 w-5" />, description: "Neutral dispute resolution" },
    { value: "solo_practice", label: "Solo Practice", icon: <User className="h-5 w-5" />, description: "Independent practitioner" },
    { value: "court_services", label: "Court Services", icon: <ShieldCheck className="h-5 w-5" />, description: "Court-appointed services" },
    { value: "consulting", label: "Consulting", icon: <Briefcase className="h-5 w-5" />, description: "Advisory and consulting" },
];

const STEPS = [
    { id: "type", label: "Firm Type", icon: <Building2 className="h-4 w-4" /> },
    { id: "info", label: "Basic Info", icon: <Mail className="h-4 w-4" /> },
    { id: "location", label: "Location", icon: <MapPin className="h-4 w-4" /> },
    { id: "review", label: "Review", icon: <Check className="h-4 w-4" /> },
];

export default function NewFirmPage() {
    const router = useRouter();
    const { token } = useProfessionalAuth();
    const { toast } = useToast();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        firm_type: "",
        name: "",
        email: "",
        phone: "",
        website: "",
        address_line1: "",
        city: "",
        state: "",
        zip_code: "",
        primary_color: "#0f766e",
        is_public: false,
    });

    const update = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

    const canProceed = () => {
        if (step === 0) return !!form.firm_type;
        if (step === 1) return !!form.name && !!form.email;
        if (step === 2) return !!form.city && !!form.state;
        return true;
    };

    const handleCreate = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/professional/firms`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(form),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Creation failed" }));
                throw new Error(err.detail || "Failed to create firm");
            }
            const firm = await res.json();
            toast({ title: "Firm created!", description: `${form.name} is ready.` });
            router.push(`/professional/firm`);
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const selectedType = FIRM_TYPES.find((t) => t.value === form.firm_type);

    return (
        <div className="max-w-2xl mx-auto">
            {/* Back link */}
            <Link
                href="/professional/firm"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Firm Settings
            </Link>

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg">
                    <Building2 className="h-7 w-7" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Create New Firm</h1>
                    <p className="text-slate-500">Set up your law firm or practice on CommonGround</p>
                </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-0 mb-8">
                {STEPS.map((s, i) => (
                    <div key={s.id} className="flex items-center flex-1">
                        <div className={`flex items-center gap-2 ${i <= step ? "text-[var(--portal-primary)]" : "text-slate-300"}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all text-sm font-bold
                ${i < step ? "bg-[var(--portal-primary)] border-[var(--portal-primary)] text-white"
                                    : i === step ? "border-[var(--portal-primary)] text-[var(--portal-primary)]"
                                        : "border-slate-200 text-slate-300"}`}>
                                {i < step ? <Check className="h-4 w-4" /> : i + 1}
                            </div>
                            <span className={`text-xs font-semibold hidden sm:block ${i === step ? "text-slate-900" : ""}`}>
                                {s.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-2 ${i < step ? "bg-[var(--portal-primary)]" : "bg-slate-200"}`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <Card className="border-slate-200">
                <CardContent className="pt-6 pb-4">
                    {/* Step 0: Type */}
                    {step === 0 && (
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 mb-1">What type of firm is this?</h2>
                                <p className="text-sm text-slate-500">This helps us tailor the portal to your practice.</p>
                            </div>
                            <div className="grid gap-3">
                                {FIRM_TYPES.map((t) => (
                                    <button
                                        key={t.value}
                                        onClick={() => update("firm_type", t.value)}
                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${form.firm_type === t.value
                                                ? "border-[var(--portal-primary)] bg-[var(--portal-primary)]/5"
                                                : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg ${form.firm_type === t.value ? "bg-[var(--portal-primary)] text-white" : "bg-slate-100 text-slate-600"}`}>
                                            {t.icon}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">{t.label}</p>
                                            <p className="text-sm text-slate-500">{t.description}</p>
                                        </div>
                                        {form.firm_type === t.value && (
                                            <div className="ml-auto p-1 bg-[var(--portal-primary)] text-white rounded-full">
                                                <Check className="h-3.5 w-3.5" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 mb-1">Basic Information</h2>
                                <p className="text-sm text-slate-500">This information will appear on your firm profile.</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="firm-name">Firm Name *</Label>
                                <Input
                                    id="firm-name"
                                    value={form.name}
                                    onChange={(e) => update("name", e.target.value)}
                                    placeholder="e.g. Smith & Associates Family Law"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="firm-email">Primary Email *</Label>
                                <Input
                                    id="firm-email"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => update("email", e.target.value)}
                                    placeholder="contact@yourfirm.com"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="firm-phone">Phone</Label>
                                    <Input
                                        id="firm-phone"
                                        value={form.phone}
                                        onChange={(e) => update("phone", e.target.value)}
                                        placeholder="(555) 000-0000"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="firm-website">Website</Label>
                                    <Input
                                        id="firm-website"
                                        value={form.website}
                                        onChange={(e) => update("website", e.target.value)}
                                        placeholder="https://yourfirm.com"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="firm-color">Brand Color</Label>
                                <div className="flex items-center gap-3">
                                    <input
                                        id="firm-color"
                                        type="color"
                                        value={form.primary_color}
                                        onChange={(e) => update("primary_color", e.target.value)}
                                        className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                                    />
                                    <span className="text-sm text-slate-500 font-mono">{form.primary_color}</span>
                                    <span className="text-xs text-slate-400">Used in client-facing documents</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Location */}
                    {step === 2 && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 mb-1">Office Location</h2>
                                <p className="text-sm text-slate-500">Used for jurisdiction matching and client display.</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="address">Street Address</Label>
                                <Input
                                    id="address"
                                    value={form.address_line1}
                                    onChange={(e) => update("address_line1", e.target.value)}
                                    placeholder="123 Main Street, Suite 100"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="city">City *</Label>
                                    <Input
                                        id="city"
                                        value={form.city}
                                        onChange={(e) => update("city", e.target.value)}
                                        placeholder="Los Angeles"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>State *</Label>
                                    <Select value={form.state} onValueChange={(v) => update("state", v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select state" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {["CA", "NY", "TX", "FL", "WA", "OR", "AZ", "CO", "NV", "IL", "PA", "OH", "GA", "NC", "VA"].map((s) => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="zip">ZIP Code</Label>
                                <Input
                                    id="zip"
                                    value={form.zip_code}
                                    onChange={(e) => update("zip_code", e.target.value)}
                                    placeholder="90001"
                                    className="max-w-32"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {step === 3 && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 mb-1">Review & Create</h2>
                                <p className="text-sm text-slate-500">Confirm your firm details before creating.</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-3">
                                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                                    <div
                                        className="p-2.5 rounded-xl text-white"
                                        style={{ backgroundColor: form.primary_color }}
                                    >
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-lg">{form.name}</p>
                                        <Badge variant="outline" className="text-xs">
                                            {FIRM_TYPES.find((t) => t.value === form.firm_type)?.label}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                                        {form.email}
                                    </div>
                                    {form.phone && (
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                                            {form.phone}
                                        </div>
                                    )}
                                    {form.city && (
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                                            {form.city}, {form.state} {form.zip_code}
                                        </div>
                                    )}
                                    {form.website && (
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Globe className="h-4 w-4 shrink-0 text-slate-400" />
                                            {form.website}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-slate-400">
                                You can update all details from Firm Settings after creation. You'll be set as the Owner.
                            </p>
                        </div>
                    )}
                </CardContent>

                {/* Navigation Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                    <Button
                        variant="outline"
                        onClick={() => step > 0 ? setStep((s) => s - 1) : router.push("/professional/firm")}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {step === 0 ? "Cancel" : "Back"}
                    </Button>

                    {step < STEPS.length - 1 ? (
                        <Button
                            onClick={() => setStep((s) => s + 1)}
                            disabled={!canProceed()}
                            className="bg-[var(--portal-primary)] hover:bg-[var(--portal-primary-hover)] text-white gap-2"
                        >
                            Continue
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleCreate}
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                            {loading ? "Creating..." : "Create Firm"}
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
