"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  MapPin,
  Save,
  X,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Video,
  Globe,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  GraduationCap,
  Languages,
  Eye,
  Loader2,
  Camera,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProfessionalAuth } from "../layout";
import { MediaUpload } from "@/components/professional/media-upload";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EducationItem {
  institution: string;
  degree: string;
  year: string;
}

interface AwardItem {
  title: string;
  organization: string;
  year: string;
}

interface ProfileFormData {
  license_number: string;
  license_state: string;
  bio: string;
  practice_areas: string[];
  phone: string;
  headline: string;
  headshot_url: string;
  video_url: string;
  languages: string[];
  years_experience: string;
  education: EducationItem[];
  awards: AwardItem[];
  consultation_fee: string;
  accepted_payment_methods: string[];
  service_location: string;
}

interface FirmFormData {
  description: string;
  practice_areas: string[];
  headline: string;
  logo_url: string;
  video_url: string;
  social_links: Record<string, string>;
  pricing_structure: Record<string, any>;
  safety_vetted: boolean;
  accepted_payment_methods: string[];
  payment_plans_available: boolean;
  works_with_nonprofits: boolean;
  service_location: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRACTICE_AREAS = [
  "divorce",
  "custody_and_visitation",
  "child_support",
  "spousal_support",
  "domestic_violence",
  "paternity",
  "guardianship",
  "adoption",
  "mediation",
  "collaborative_law",
];

const FIRM_PRACTICE_AREAS = [
  "Family Law",
  "Custody",
  "Divorce",
  "Mediation",
  "Child Support",
  "Adoption",
  "Domestic Violence",
  "Paternity",
  "Guardianship",
  "Property Division",
  "Spousal Support",
];

const PROFESSIONAL_TYPES: Record<string, { label: string }> = {
  attorney: { label: "Attorney" },
  paralegal: { label: "Paralegal" },
  mediator: { label: "Mediator" },
  parenting_coordinator: { label: "Parenting Coordinator" },
  intake_coordinator: { label: "Intake Coordinator" },
  practice_admin: { label: "Practice Admin" },
};

// ─── Helper Components ────────────────────────────────────────────────────────

function ListEditor({
  items,
  onAdd,
  onRemove,
  placeholder,
  label,
}: {
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  label: string;
}) {
  const [inputValue, setInputValue] = useState("");
  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium text-slate-700">{label}</Label>}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((item, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F4F8F7] text-[#1E3A4A] text-xs font-medium border border-[#3DAA8A]/20"
          >
            {item}
            <button
              onClick={() => onRemove(index)}
              className="hover:text-red-500 transition-colors ml-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="h-9 text-sm border-slate-200 focus:border-[#3DAA8A] focus:ring-[#3DAA8A]/20"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (inputValue.trim()) {
                onAdd(inputValue.trim());
                setInputValue("");
              }
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 px-4 border-slate-200 hover:bg-[#F4F8F7] hover:border-[#3DAA8A]/30 text-sm"
          onClick={() => {
            if (inputValue.trim()) {
              onAdd(inputValue.trim());
              setInputValue("");
            }
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function ComplexListEditor<T extends Record<string, any>>({
  items,
  onAdd,
  onRemove,
  fields,
  label,
}: {
  items: T[];
  onAdd: (item: T) => void;
  onRemove: (index: number) => void;
  fields: { key: keyof T; label: string; placeholder: string }[];
  label: string;
  isEditing?: boolean;
}) {
  const [newValues, setNewValues] = useState<T>({} as T);
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-[#F4F8F7]/50 rounded-xl border border-slate-100"
          >
            <div className="text-sm">
              {fields.map((f, i) => (
                <span key={String(f.key)}>
                  {i > 0 && " · "}
                  <span className={i === 0 ? "font-semibold text-slate-900" : "text-slate-500"}>
                    {String(item[f.key])}
                  </span>
                </span>
              ))}
            </div>
            <button
              onClick={() => onRemove(index)}
              className="text-slate-400 hover:text-red-500 transition-colors p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-slate-400 italic py-2">None added yet</p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
        {fields.map((f) => (
          <div key={String(f.key)} className="space-y-1">
            <label className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">
              {f.label}
            </label>
            <Input
              value={(newValues[f.key] as string) || ""}
              onChange={(e) =>
                setNewValues((v) => ({ ...v, [f.key]: e.target.value }))
              }
              placeholder={f.placeholder}
              className="h-8 text-xs border-slate-200 focus:border-[#3DAA8A]"
            />
          </div>
        ))}
        <div className="flex items-end">
          <Button
            size="sm"
            className="w-full h-8 bg-[#1E3A4A] hover:bg-[#2D6A8F] text-white text-xs"
            onClick={() => {
              if (Object.values(newValues).some((v) => v)) {
                onAdd(newValues);
                setNewValues({} as T);
              }
            }}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

function SocialLinksEditor({
  links,
  onChange,
}: {
  links: Record<string, string>;
  onChange: (links: Record<string, string>) => void;
}) {
  const SOCIAL_NETWORKS = [
    { id: "linkedin", label: "LinkedIn", icon: Linkedin },
    { id: "twitter", label: "Twitter / X", icon: Twitter },
    { id: "instagram", label: "Instagram", icon: Instagram },
    { id: "facebook", label: "Facebook", icon: Facebook },
    { id: "website", label: "Website", icon: Globe },
  ];

  return (
    <div className="space-y-3">
      {SOCIAL_NETWORKS.map((sn) => (
        <div key={sn.id} className="relative">
          <sn.icon className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
          <Input
            value={links[sn.id] || ""}
            onChange={(e) => onChange({ ...links, [sn.id]: e.target.value })}
            placeholder={`${sn.label} URL`}
            className="pl-10 h-10 border-slate-200 focus:border-[#3DAA8A] focus:ring-[#3DAA8A]/20 text-sm"
          />
        </div>
      ))}
    </div>
  );
}

// ─── Live Directory Card Preview (mirrors ProfessionalCard.tsx) ──────────────

function DirectoryCardPreview({
  firmName,
  firmFormData,
}: {
  firmName: string;
  firmFormData: FirmFormData;
}) {
  return (
    <Card className="overflow-hidden bg-white rounded-3xl border-2 border-slate-100 shadow-md flex flex-col group">
      {/* Media Header — mirrors ProfessionalCard */}
      <div className="relative h-44 bg-slate-50 overflow-hidden">
        {firmFormData.video_url ? (
          <div className="absolute inset-0">
            <video
              src={firmFormData.video_url}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] z-10" />
            <div className="absolute bottom-3 right-3 z-20 w-10 h-10 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center border border-white/50 shadow-sm">
              <Video className="w-5 h-5 text-white fill-current" />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 p-6">
            {firmFormData.logo_url ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={firmFormData.logo_url.startsWith("http") ? firmFormData.logo_url : `${API_BASE}${firmFormData.logo_url}`}
                  alt={firmName}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center shadow-inner">
                <span className="text-4xl font-bold text-slate-400" style={{ fontFamily: "DM Serif Display, serif" }}>
                  {firmName.charAt(0) || "F"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 z-30 flex flex-col gap-2">
          {firmFormData.safety_vetted && (
            <Badge className="bg-emerald-500 text-white gap-1 border-0 shadow-sm text-[10px]">
              <ShieldCheck className="w-3 h-3" />
              Safety Vetted
            </Badge>
          )}
        </div>
      </div>

      {/* Content — mirrors ProfessionalCard */}
      <CardContent className="flex-1 p-5 space-y-3">
        <div>
          <h3
            className="font-bold text-lg leading-tight text-slate-900"
            style={{ fontFamily: "DM Serif Display, Georgia, serif" }}
          >
            {firmName || "Your Firm Name"}
          </h3>
          {firmFormData.headline && (
            <p className="text-[11px] font-bold text-[#3DAA8A] mb-2 mt-1 tracking-wide uppercase">
              {firmFormData.headline}
            </p>
          )}
          {firmFormData.service_location && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-3">
              <MapPin className="w-3 h-3 text-[#3DAA8A]" />
              <span>{firmFormData.service_location}</span>
            </div>
          )}
          {firmFormData.description && (
            <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
              {firmFormData.description}
            </p>
          )}
        </div>
        {firmFormData.practice_areas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {firmFormData.practice_areas.slice(0, 3).map((area) => (
              <span
                key={area}
                className="px-2.5 py-0.5 rounded-full bg-[#F4F8F7] text-[#3DAA8A] text-[10px] font-bold border border-[#3DAA8A]/10"
              >
                {area}
              </span>
            ))}
            {firmFormData.practice_areas.length > 3 && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                +{firmFormData.practice_areas.length - 3}
              </span>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-5 pt-0 mt-auto">
        <div className="w-full rounded-full bg-[#3DAA8A] text-white text-center py-2.5 text-sm font-bold opacity-60 cursor-default">
          View Profile
        </div>
      </CardFooter>
    </Card>
  );
}

// ─── Team Member Mini Card ──────────────────────────────────────────────────

function TeamMemberPreview({
  profile,
  formData,
}: {
  profile: any;
  formData: ProfileFormData;
}) {
  const displayName = `${profile?.user_first_name || ""} ${profile?.user_last_name || ""}`.trim();
  const typeInfo = PROFESSIONAL_TYPES[profile?.professional_type || "attorney"];

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-100">
      <div className="w-11 h-11 rounded-full bg-[#F4F8F7] flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
        {formData.headshot_url ? (
          <img
            src={formData.headshot_url.startsWith("http") ? formData.headshot_url : `${API_BASE}${formData.headshot_url}`}
            className="w-full h-full object-cover"
            alt={displayName}
          />
        ) : (
          <User className="h-5 w-5 text-slate-400" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{displayName || "Your Name"}</p>
        <p className="text-[11px] text-slate-500">{typeInfo?.label}</p>
        {formData.headline && (
          <p className="text-[11px] text-[#3DAA8A] mt-0.5 truncate">{formData.headline}</p>
        )}
      </div>
    </div>
  );
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-[#F4F8F7]/60 to-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1E3A4A] flex items-center justify-center">
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-[15px]">{title}</h3>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { profile, firms, token, refreshProfile } = useProfessionalAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "firm">("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    license_number: "",
    license_state: "",
    bio: "",
    practice_areas: [],
    phone: "",
    headline: "",
    headshot_url: "",
    video_url: "",
    languages: [],
    years_experience: "",
    education: [],
    awards: [],
    consultation_fee: "",
    accepted_payment_methods: [],
    service_location: "",
  });

  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  const [firmFormData, setFirmFormData] = useState<FirmFormData>({
    description: "",
    practice_areas: [],
    headline: "",
    logo_url: "",
    video_url: "",
    social_links: {},
    pricing_structure: {},
    safety_vetted: false,
    accepted_payment_methods: [],
    payment_plans_available: false,
    works_with_nonprofits: false,
    service_location: "",
  });
  const [isSavingFirm, setIsSavingFirm] = useState(false);
  const [firmSaveSuccess, setFirmSaveSuccess] = useState(false);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        license_number: profile.license_number || "",
        license_state: profile.license_state || "",
        bio: profile.bio || "",
        practice_areas: profile.practice_areas || [],
        phone: profile.professional_phone || "",
        headline: profile.headline || "",
        headshot_url: profile.headshot_url || "",
        video_url: profile.video_url || "",
        languages: profile.languages || [],
        years_experience: profile.years_experience?.toString() || "",
        education: profile.education || [],
        awards: profile.awards || [],
        consultation_fee: profile.consultation_fee || "",
        accepted_payment_methods: profile.accepted_payment_methods || [],
        service_location: "",
      });
    }
  }, [profile]);

  // Auto-select first firm
  useEffect(() => {
    if (firms.length > 0 && !selectedFirmId) {
      setSelectedFirmId(firms[0].id);
    }
  }, [firms, selectedFirmId]);

  // Load firm data
  useEffect(() => {
    const loadFirmData = async () => {
      if (selectedFirmId && token) {
        try {
          const response = await fetch(`${API_BASE}/api/v1/professional/firms/${selectedFirmId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const firmData = await response.json();
          if (firmData) {
            setFirmFormData({
              description: firmData.description || "",
              practice_areas: firmData.practice_areas || [],
              headline: firmData.headline || "",
              logo_url: firmData.logo_url || "",
              video_url: firmData.video_url || "",
              social_links: firmData.social_links || {},
              pricing_structure: firmData.pricing_structure || {},
              safety_vetted: firmData.safety_vetted || false,
              accepted_payment_methods: firmData.accepted_payment_methods || [],
              payment_plans_available: firmData.payment_plans_available || false,
              works_with_nonprofits: firmData.works_with_nonprofits || false,
              service_location: firmData.service_location || "",
            });
          }
        } catch (error) {
          console.error("Error loading firm data:", error);
        }
      }
    };
    loadFirmData();
  }, [selectedFirmId, token]);

  // Save handlers
  const handleSaveProfile = async () => {
    if (!profile || !token) return;
    setIsSaving(true);
    try {
      await fetch(`${API_BASE}/api/v1/professional/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          years_experience: parseInt(formData.years_experience) || 0,
        }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await refreshProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFirm = async () => {
    if (!selectedFirmId || !token) return;
    setIsSavingFirm(true);
    try {
      const response = await fetch(
        `${API_BASE}/professional/firm/${selectedFirmId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(firmFormData),
        },
      );
      if (response.ok) {
        setFirmSaveSuccess(true);
        setTimeout(() => setFirmSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Error saving firm:", error);
    } finally {
      setIsSavingFirm(false);
    }
  };

  const togglePracticeArea = (area: string) => {
    setFormData((prev) => ({
      ...prev,
      practice_areas: prev.practice_areas.includes(area)
        ? prev.practice_areas.filter((a) => a !== area)
        : [...prev.practice_areas, area],
    }));
  };

  const toggleFirmPracticeArea = (area: string) => {
    setFirmFormData((prev) => ({
      ...prev,
      practice_areas: prev.practice_areas.includes(area)
        ? prev.practice_areas.filter((a) => a !== area)
        : [...prev.practice_areas, area],
    }));
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3DAA8A]" />
      </div>
    );
  }

  const firmName = firms.find((f) => f.id === selectedFirmId)?.name || "Your Firm";

  return (
    <div className="max-w-7xl mx-auto py-2">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Directory Profile
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage how parents find and see you in the CommonGround directory
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4F8F7] border border-[#3DAA8A]/20">
            <Eye className="h-3.5 w-3.5 text-[#3DAA8A]" />
            <span className="text-xs font-medium text-[#1E3A4A]">Live Preview</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-slate-100/80 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "profile"
              ? "bg-white text-[#1E3A4A] shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <User className="h-4 w-4" />
          Your Profile
        </button>
        <button
          onClick={() => setActiveTab("firm")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "firm"
              ? "bg-white text-[#1E3A4A] shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Your Firm
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ═══════════════════════════ LEFT: FORM ═══════════════════════════ */}
        <div className="flex-1 min-w-0 space-y-6 pb-20">
          {activeTab === "profile" ? (
            <>
              {/* ─── Headshot & Headline ─── */}
              <FormSection icon={Camera} title="Photo & Headline" description="First impressions matter — this appears on the firm detail page">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2 block">Headshot</Label>
                    <MediaUpload
                      value={formData.headshot_url}
                      onChange={(url) => setFormData((prev) => ({ ...prev, headshot_url: url }))}
                      onUpload={async (file: File) => {
                        const fd = new FormData();
                        fd.append("file", file);
                        const response = await fetch(`${API_BASE}/api/v1/professional/profile/headshot`, {
                          method: "POST",
                          headers: { Authorization: `Bearer ${token}` },
                          body: fd,
                        });
                        const updated = await response.json();
                        return updated.headshot_url || "";
                      }}
                      aspectRatio="square"
                      placeholder="Upload Headshot"
                    />
                  </div>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Professional Headline</Label>
                      <Input
                        value={formData.headline}
                        onChange={(e) => setFormData((prev) => ({ ...prev, headline: e.target.value }))}
                        placeholder="e.g. Board Certified Family Law Specialist"
                        className="border-slate-200 focus:border-[#3DAA8A] focus:ring-[#3DAA8A]/20"
                        maxLength={150}
                      />
                      <p className="text-[11px] text-slate-400">Appears below your name on the team page</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">Years Experience</Label>
                        <Input
                          type="number"
                          value={formData.years_experience}
                          onChange={(e) => setFormData((prev) => ({ ...prev, years_experience: e.target.value }))}
                          placeholder="0"
                          className="border-slate-200 focus:border-[#3DAA8A]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">Location</Label>
                        <Input
                          value={formData.service_location}
                          onChange={(e) => setFormData((prev) => ({ ...prev, service_location: e.target.value }))}
                          placeholder="e.g. Los Angeles, CA"
                          className="border-slate-200 focus:border-[#3DAA8A]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </FormSection>

              {/* ─── Biography ─── */}
              <FormSection icon={FileText} title="Biography" description="Tell parents about your approach and experience">
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell parents about your approach to family law, your experience with high-conflict cases, and what makes your practice different..."
                  className="min-h-[140px] border-slate-200 focus:border-[#3DAA8A] focus:ring-[#3DAA8A]/20 text-sm leading-relaxed resize-y"
                />
              </FormSection>

              {/* ─── Practice Areas ─── */}
              <FormSection icon={Sparkles} title="Practice Areas" description="Select all areas you specialize in">
                <div className="flex flex-wrap gap-2">
                  {PRACTICE_AREAS.map((area) => (
                    <button
                      key={area}
                      onClick={() => togglePracticeArea(area)}
                      className={`px-3.5 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                        formData.practice_areas.includes(area)
                          ? "bg-[#1E3A4A] text-white shadow-sm"
                          : "bg-slate-50 text-slate-600 border border-slate-200 hover:border-[#3DAA8A]/40 hover:bg-[#F4F8F7]"
                      }`}
                    >
                      {area.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </FormSection>

              {/* ─── Languages ─── */}
              <FormSection icon={Languages} title="Languages" description="Languages you can serve clients in">
                <ListEditor
                  label=""
                  items={formData.languages}
                  onAdd={(l) => setFormData((p) => ({ ...p, languages: [...p.languages, l] }))}
                  onRemove={(i) => setFormData((p) => ({ ...p, languages: p.languages.filter((_, idx) => idx !== i) }))}
                  placeholder="e.g. Spanish, Mandarin..."
                />
              </FormSection>

              {/* ─── Education & Awards ─── */}
              <FormSection icon={GraduationCap} title="Education & Credentials" description="Build trust with your academic background">
                <div className="space-y-8">
                  <ComplexListEditor
                    label="Education"
                    items={formData.education}
                    isEditing={true}
                    onAdd={(item) => setFormData((p) => ({ ...p, education: [...p.education, item] }))}
                    onRemove={(i) => setFormData((p) => ({ ...p, education: p.education.filter((_, idx) => idx !== i) }))}
                    fields={[
                      { key: "institution", label: "Institution", placeholder: "University Name" },
                      { key: "degree", label: "Degree", placeholder: "Juris Doctor" },
                      { key: "year", label: "Year", placeholder: "2010" },
                    ]}
                  />
                  <div className="border-t border-slate-100 pt-6">
                    <ComplexListEditor
                      label="Awards & Honors"
                      items={formData.awards}
                      isEditing={true}
                      onAdd={(item) => setFormData((p) => ({ ...p, awards: [...p.awards, item] }))}
                      onRemove={(i) => setFormData((p) => ({ ...p, awards: p.awards.filter((_, idx) => idx !== i) }))}
                      fields={[
                        { key: "title", label: "Award", placeholder: "Super Lawyer" },
                        { key: "organization", label: "Organization", placeholder: "State Bar" },
                        { key: "year", label: "Year", placeholder: "2023" },
                      ]}
                    />
                  </div>
                </div>
              </FormSection>

              {/* Save Button */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="bg-[#3DAA8A] hover:bg-[#2D8A6E] text-white px-8 h-11 rounded-xl shadow-sm font-semibold"
                >
                  {isSaving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Save Profile</>
                  )}
                </Button>
                {saveSuccess && (
                  <span className="text-sm font-medium text-[#3DAA8A] flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4" /> Saved
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              {/* ═══════════════════ FIRM TAB ═══════════════════ */}

              {firms.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                  <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Firm Associated</h3>
                  <p className="text-sm text-slate-500">Contact support to link your professional account to a firm.</p>
                </div>
              ) : (
                <>
                  {/* ─── Firm Logo & Headline ─── */}
                  <FormSection icon={Building2} title="Firm Identity" description="Logo and headline shown on your directory card">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-medium text-slate-700 mb-2 block">Firm Logo</Label>
                        <MediaUpload
                          value={firmFormData.logo_url}
                          onChange={(url) => setFirmFormData((prev) => ({ ...prev, logo_url: url }))}
                          onUpload={async (file: File) => {
                            const fd = new FormData();
                            fd.append("file", file);
                            const response = await fetch(`${API_BASE}/api/v1/professional/firms/${selectedFirmId}/logo`, {
                              method: "POST",
                              headers: { Authorization: `Bearer ${token}` },
                              body: fd,
                            });
                            const updated = await response.json();
                            return updated.logo_url || "";
                          }}
                          aspectRatio="square"
                        />
                      </div>
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">Firm Headline</Label>
                          <Input
                            value={firmFormData.headline}
                            onChange={(e) => setFirmFormData((p) => ({ ...p, headline: e.target.value }))}
                            placeholder="e.g. Leading Family Law Firm in California"
                            className="border-slate-200 focus:border-[#3DAA8A] focus:ring-[#3DAA8A]/20"
                          />
                          <p className="text-[11px] text-slate-400">Appears below your firm name on the directory card</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">Service Location</Label>
                          <Input
                            value={firmFormData.service_location}
                            onChange={(e) => setFirmFormData((p) => ({ ...p, service_location: e.target.value }))}
                            placeholder="e.g. Greater Los Angeles Area"
                            className="border-slate-200 focus:border-[#3DAA8A]"
                          />
                        </div>
                      </div>
                    </div>
                  </FormSection>

                  {/* ─── Firm Description ─── */}
                  <FormSection icon={FileText} title="About Your Firm" description="Describe your firm's mission and approach">
                    <Textarea
                      value={firmFormData.description}
                      onChange={(e) => setFirmFormData((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Describe your firm's approach to family law, specializations, and what sets you apart..."
                      className="min-h-[120px] border-slate-200 focus:border-[#3DAA8A] focus:ring-[#3DAA8A]/20 text-sm leading-relaxed resize-y"
                    />
                  </FormSection>

                  {/* ─── Firm Practice Areas ─── */}
                  <FormSection icon={Sparkles} title="Firm Practice Areas" description="Areas your firm covers">
                    <div className="flex flex-wrap gap-2">
                      {FIRM_PRACTICE_AREAS.map((area) => (
                        <button
                          key={area}
                          onClick={() => toggleFirmPracticeArea(area)}
                          className={`px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
                            firmFormData.practice_areas.includes(area)
                              ? "bg-[#1E3A4A] text-white shadow-sm"
                              : "bg-slate-50 text-slate-600 border border-slate-200 hover:border-[#3DAA8A]/40 hover:bg-[#F4F8F7]"
                          }`}
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  </FormSection>

                  {/* ─── Social Links ─── */}
                  <FormSection icon={Globe} title="Social & Web Presence" description="Help parents find you online">
                    <SocialLinksEditor
                      links={firmFormData.social_links}
                      onChange={(links) => setFirmFormData((p) => ({ ...p, social_links: links }))}
                    />
                  </FormSection>

                  {/* ─── Programs ─── */}
                  <FormSection icon={ShieldCheck} title="Programs & Trust Signals" description="Build confidence with parents">
                    <div className="space-y-3">
                      {[
                        { key: "payment_plans_available" as const, label: "Payment Plans Available", desc: "Offer flexible payment options" },
                        { key: "works_with_nonprofits" as const, label: "Works with Nonprofits", desc: "Partner with nonprofit organizations" },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center justify-between p-4 rounded-xl bg-[#F4F8F7]/50 border border-slate-100 hover:border-[#3DAA8A]/20 transition-colors cursor-pointer"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={firmFormData[item.key] as boolean}
                            onChange={(e) =>
                              setFirmFormData((p) => ({ ...p, [item.key]: e.target.checked }))
                            }
                            className="h-5 w-5 rounded border-slate-300 text-[#3DAA8A] focus:ring-[#3DAA8A]/20"
                          />
                        </label>
                      ))}
                    </div>
                  </FormSection>

                  {/* Save Button */}
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      onClick={handleSaveFirm}
                      disabled={isSavingFirm}
                      className="bg-[#3DAA8A] hover:bg-[#2D8A6E] text-white px-8 h-11 rounded-xl shadow-sm font-semibold"
                    >
                      {isSavingFirm ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                      ) : (
                        <><Save className="h-4 w-4 mr-2" /> Save Firm Profile</>
                      )}
                    </Button>
                    {firmSaveSuccess && (
                      <span className="text-sm font-medium text-[#3DAA8A] flex items-center gap-1.5 animate-in fade-in">
                        <CheckCircle2 className="h-4 w-4" /> Published to directory
                      </span>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* ═══════════════════════════ RIGHT: LIVE PREVIEW ═══════════════════════════ */}
        <div className="hidden lg:block w-[380px] flex-shrink-0">
          <div className="sticky top-6 space-y-5">
            {/* Preview Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Live Preview
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Updates as you type</span>
            </div>

            {/* Directory Card Preview */}
            <div>
              <p className="text-[11px] font-medium text-slate-400 mb-2 uppercase tracking-wide">
                Directory Card
              </p>
              <DirectoryCardPreview
                firmName={firmName}
                firmFormData={firmFormData}
              />
            </div>

            {/* Team Member Preview */}
            <div>
              <p className="text-[11px] font-medium text-slate-400 mb-2 uppercase tracking-wide">
                Your Team Listing
              </p>
              <TeamMemberPreview profile={profile} formData={formData} />
            </div>

            {/* Tip */}
            <div className="p-4 rounded-xl bg-[#F4F8F7] border border-[#3DAA8A]/10">
              <div className="flex gap-3">
                <Sparkles className="h-4 w-4 text-[#3DAA8A] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#1E3A4A]">Profile completeness matters</p>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Firms with a logo, headline, description, and practice areas get 3x more views from parents.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
