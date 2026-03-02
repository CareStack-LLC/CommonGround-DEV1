"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Briefcase,
  MapPin,
  Star,
  Globe,
  Edit,
  Save,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  DollarSign,
  Video,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Award,
  Clock,
  Briefcase as CaseIcon,
  Phone,
  Mail,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Scale,
  Gavel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfessionalAuth } from "../layout";
import { MediaUpload } from "@/components/professional/media-upload";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  hourly_rate: string;
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

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const PROFESSIONAL_TYPES: Record<string, { label: string; color: string }> = {
  attorney: { label: "Attorney", color: "bg-amber-50 text-amber-900 border-2 border-amber-900/30" },
  paralegal: { label: "Paralegal", color: "bg-blue-50 text-blue-900 border-2 border-blue-900/30" },
  mediator: { label: "Mediator", color: "bg-purple-50 text-purple-900 border-2 border-purple-900/30" },
  parenting_coordinator: {
    label: "Parenting Coordinator",
    color: "bg-emerald-50 text-emerald-900 border-2 border-emerald-900/30",
  },
  intake_coordinator: {
    label: "Intake Coordinator",
    color: "bg-cyan-50 text-cyan-900 border-2 border-cyan-900/30",
  },
  practice_admin: {
    label: "Practice Admin",
    color: "bg-slate-50 text-slate-900 border-2 border-slate-900/30",
  },
};

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
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((item, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="flex items-center gap-1 pr-1"
          >
            {item}
            <button
              onClick={() => onRemove(index)}
              className="hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          onKeyPress={(e) => {
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
  isEditing,
}: {
  items: T[];
  onAdd: (item: T) => void;
  onRemove: (index: number) => void;
  fields: { key: keyof T; label: string; placeholder: string }[];
  label: string;
  isEditing: boolean;
}) {
  const [newValues, setNewValues] = useState<T>({} as T);
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-muted/30 rounded-md border"
          >
            <div className="text-sm">
              {fields.map((f, i) => (
                <span key={String(f.key)}>
                  {i > 0 && " • "}
                  <span
                    className={
                      i === 0
                        ? "font-bold text-foreground"
                        : "text-muted-foreground"
                    }
                  >
                    {String(item[f.key])}
                  </span>
                </span>
              ))}
            </div>
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {items.length === 0 && !isEditing && (
          <p className="text-sm text-muted-foreground italic pl-1">
            Not provided
          </p>
        )}
      </div>

      {isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 border p-3 rounded-md bg-muted/10 mt-2">
          {fields.map((f) => (
            <div key={String(f.key)} className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">
                {f.label}
              </Label>
              <Input
                value={(newValues[f.key] as string) || ""}
                onChange={(e) =>
                  setNewValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
                placeholder={f.placeholder}
                className="h-8 text-xs h-8"
              />
            </div>
          ))}
          <div className="flex items-end">
            <Button
              size="sm"
              className="w-full h-8"
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
      )}
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
    { id: "twitter", label: "Twitter", icon: Twitter },
    { id: "instagram", label: "Instagram", icon: Instagram },
    { id: "facebook", label: "Facebook", icon: Facebook },
    { id: "website", label: "Website", icon: Globe },
  ];

  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
      <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">
        Social Channels
      </Label>
      <div className="space-y-3">
        {SOCIAL_NETWORKS.map((sn) => (
          <div key={sn.id} className="relative group">
            <Input
              value={links[sn.id] || ""}
              onChange={(e) => onChange({ ...links, [sn.id]: e.target.value })}
              placeholder={`${sn.label} URL`}
              className="pl-9 bg-white border-slate-200 transition-all focus:ring-emerald-500"
            />
            <sn.icon className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-emerald-500 transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileDirectoryCard({
  profile,
  formData,
}: {
  profile: any;
  formData: ProfileFormData;
}) {
  const displayName =
    `${profile?.user_first_name || ""} ${profile?.user_last_name || ""}`.trim();
  const typeInfo = PROFESSIONAL_TYPES[profile?.professional_type || "attorney"];

  return (
    <Card className="max-w-[320px] mx-auto overflow-hidden shadow-xl border-0 bg-white ring-1 ring-slate-200 group">
      <div className="relative h-40 bg-slate-100">
        {formData.headshot_url ? (
          <img
            src={
              formData.headshot_url.startsWith("http")
                ? formData.headshot_url
                : `${API_BASE}${formData.headshot_url}`
            }
            className="w-full h-full object-cover"
            alt={displayName}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-emerald-50">
            <User className="h-12 w-12 text-emerald-200" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge className="bg-white/90 backdrop-blur-md text-emerald-600 border-0 shadow-sm text-[9px] font-bold">
            TOP RATED
          </Badge>
          <Badge className="bg-blue-600 text-white border-0 shadow-sm text-[9px] font-bold">
            VERIFIED
          </Badge>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
            {displayName || "Professional Name"}
          </h3>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight mt-0.5">
            {typeInfo.label} • {formData.years_experience || "0"} Years exp
          </p>
        </div>
        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed italic border-l-2 border-emerald-500 pl-2">
          {formData.headline ||
            "Seeking representation? I specialize in complex family transitions."}
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {formData.practice_areas.slice(0, 3).map((area) => (
            <Badge
              key={area}
              variant="outline"
              className="text-[9px] px-1.5 py-0 bg-slate-50 border-slate-100 text-slate-500 capitalize"
            >
              {area.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
          <div className="flex items-center gap-1.5">
            <div className="flex h-4 items-center -space-x-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className="h-2.5 w-2.5 fill-amber-400 text-amber-400"
                />
              ))}
            </div>
            <span className="text-[10px] font-bold text-slate-700">5.0</span>
          </div>
          <p className="text-[10px] font-bold text-slate-900">
            {formData.hourly_rate || "$0"}
            <span className="font-normal text-slate-400">/hr</span>
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function ProfilePage() {
  const { profile, firms, token, refreshProfile } = useProfessionalAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
    hourly_rate: "",
    years_experience: "",
    education: [],
    awards: [],
    consultation_fee: "",
    accepted_payment_methods: [],
    service_location: "",
  });

  // Firm editing state
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
        hourly_rate: profile.hourly_rate || "",
        years_experience: profile.years_experience?.toString() || "",
        education: profile.education || [],
        awards: profile.awards || [],
        consultation_fee: profile.consultation_fee || "",
        accepted_payment_methods: profile.accepted_payment_methods || [],
        service_location: "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (firms.length > 0 && !selectedFirmId) {
      setSelectedFirmId(firms[0].id);
    }
  }, [firms, selectedFirmId]);

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
              payment_plans_available:
                firmData.payment_plans_available || false,
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
  }, [selectedFirmId]);

  const handleSave = async () => {
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
      setIsEditing(false);
      await refreshProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFirm = async () => {
    if (!selectedFirmId) return;
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
    setFormData((prev) => {
      const areas = prev.practice_areas.includes(area)
        ? prev.practice_areas.filter((a) => a !== area)
        : [...prev.practice_areas, area];
      return { ...prev, practice_areas: areas };
    });
  };

  const toggleFirmPracticeArea = (area: string) => {
    setFirmFormData((prev) => {
      const areas = prev.practice_areas.includes(area)
        ? prev.practice_areas.filter((a) => a !== area)
        : [...prev.practice_areas, area];
      return { ...prev, practice_areas: areas };
    });
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const typeInfo = PROFESSIONAL_TYPES[profile.professional_type];
  const displayName =
    `${profile.user_first_name || ""} ${profile.user_last_name || ""}`.trim();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
      <link
        href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Outfit:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <div className="flex flex-col lg:flex-row gap-8">
        {/* LEFT COLUMN: EDITOR */}
        <div className="flex-1 space-y-8 min-w-0 pb-20">
          {/* Header */}
          <div className="relative overflow-hidden rounded-sm bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 px-8 py-8 shadow-2xl border-2 border-amber-900/40">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />
            <div className="flex items-start gap-5">
              <div className="p-4 bg-amber-50 border-2 border-amber-900/20 rounded-sm shadow-xl shrink-0">
                <Scale className="h-8 w-8 text-amber-900" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="serif text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
                  Directory Presence Manager
                </h1>
                <p className="sans text-sm text-amber-100 mt-2 max-w-3xl">
                  Control how parents see you in the professional directory
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-amber-900 hover:bg-amber-800 text-white shadow-lg border-2 border-amber-900/40 sans font-semibold"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="shadow-sm border-2 border-slate-300 sans"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-amber-900 hover:bg-amber-800 text-white shadow-lg border-2 border-amber-900/40 sans font-semibold"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Attorney Identity Section */}
            <div className="bg-gradient-to-br from-white via-amber-50/30 to-white rounded-sm shadow-lg border-2 border-amber-900/30 overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
              <div className="border-b-2 border-amber-900/10 bg-gradient-to-r from-amber-50 to-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 serif font-bold text-slate-900">
                  <User className="h-5 w-5 text-amber-900" strokeWidth={2} />
                  Individual Attorney Details
                </div>
                <Badge className="bg-amber-50 text-amber-900 border-2 border-amber-900/30 sans">
                  Private & Public Mix
                </Badge>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label className="text-slate-700 font-semibold">
                      Professional Headshot
                    </Label>
                    <MediaUpload
                      label=""
                      value={formData.headshot_url}
                      onChange={(url) =>
                        setFormData((prev) => ({ ...prev, headshot_url: url }))
                      }
                      onUpload={async (file: File) => {
                        const formData = new FormData();
                        formData.append("file", file);
                        const response = await fetch(`${API_BASE}/api/v1/professional/profile/headshot`, {
                          method: "POST",
                          headers: { Authorization: `Bearer ${token}` },
                          body: formData,
                        });
                        const updated = await response.json();
                        return updated.headshot_url || "";
                      }}
                      aspectRatio="square"
                      placeholder="Upload Headshot"
                    />
                  </div>
                  <div className="space-y-4">
                    <Label
                      htmlFor="headline"
                      className="text-slate-700 font-semibold"
                    >
                      Professional Headline
                    </Label>
                    <Input
                      id="headline"
                      value={formData.headline}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          headline: e.target.value,
                        }))
                      }
                      placeholder="e.g. Board Certified Family Law Specialist"
                      className="border-slate-300 focus:ring-emerald-500"
                      maxLength={150}
                    />
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      Visible on search result cards
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-slate-700 font-semibold">
                    Short Biography
                  </Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    placeholder="Tell parents about your approach to high-conflict cases..."
                    className="min-h-[120px] border-slate-300 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-6 pt-4 border-t border-slate-50">
                  <div className="space-y-2">
                    <Label
                      htmlFor="service_location"
                      className="text-slate-700 font-semibold"
                    >
                      Service Location
                    </Label>
                    <Input
                      id="service_location"
                      value={formData.service_location}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          service_location: e.target.value,
                        }))
                      }
                      placeholder="e.g. San Francisco Area"
                      className="border-slate-300 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="years_experience"
                      className="text-slate-700 font-semibold"
                    >
                      Years of Experience
                    </Label>
                    <Input
                      id="years_experience"
                      type="number"
                      value={formData.years_experience}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          years_experience: e.target.value,
                        }))
                      }
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold">
                      Languages
                    </Label>
                    <ListEditor
                      label=""
                      items={formData.languages}
                      onAdd={(l) =>
                        setFormData((p) => ({
                          ...p,
                          languages: [...p.languages, l],
                        }))
                      }
                      onRemove={(i) =>
                        setFormData((p) => ({
                          ...p,
                          languages: p.languages.filter((_, idx) => idx !== i),
                        }))
                      }
                      placeholder="Add language..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Expertise Section */}
            <div className="bg-gradient-to-br from-white via-amber-50/30 to-white rounded-sm shadow-lg border-2 border-amber-900/30 overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
              <div className="border-b-2 border-amber-900/10 bg-gradient-to-r from-amber-50 to-white px-6 py-4">
                <div className="flex items-center gap-2 serif font-bold text-slate-900">
                  <Gavel className="h-5 w-5 text-amber-900" strokeWidth={2} />
                  Expertise & Academic Background
                </div>
              </div>
              <div className="p-6 space-y-8">
                <div className="space-y-3">
                  <Label className="serif text-slate-900 font-bold">
                    Practice Areas
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {PRACTICE_AREAS.map((area) => (
                      <Button
                        key={area}
                        variant={
                          formData.practice_areas.includes(area)
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => togglePracticeArea(area)}
                        className={
                          formData.practice_areas.includes(area)
                            ? "bg-amber-900 hover:bg-amber-800 text-white border-2 border-amber-900/40 sans font-semibold"
                            : "border-2 border-slate-300 sans hover:border-amber-900/40 hover:bg-amber-50"
                        }
                      >
                        {area.replace(/_/g, " ")}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 pt-6 border-t border-slate-50">
                  <ComplexListEditor
                    label="Education History"
                    items={formData.education}
                    isEditing={true}
                    onAdd={(item) =>
                      setFormData((p) => ({
                        ...p,
                        education: [...p.education, item],
                      }))
                    }
                    onRemove={(i) =>
                      setFormData((p) => ({
                        ...p,
                        education: p.education.filter((_, idx) => idx !== i),
                      }))
                    }
                    fields={[
                      {
                        key: "institution",
                        label: "Institution",
                        placeholder: "University Name",
                      },
                      {
                        key: "degree",
                        label: "Degree",
                        placeholder: "Juris Doctor",
                      },
                      { key: "year", label: "Year", placeholder: "2010" },
                    ]}
                  />
                  <ComplexListEditor
                    label="Awards & Honors"
                    items={formData.awards}
                    isEditing={true}
                    onAdd={(item) =>
                      setFormData((p) => ({
                        ...p,
                        awards: [...p.awards, item],
                      }))
                    }
                    onRemove={(i) =>
                      setFormData((p) => ({
                        ...p,
                        awards: p.awards.filter((_, idx) => idx !== i),
                      }))
                    }
                    fields={[
                      {
                        key: "title",
                        label: "Award Title",
                        placeholder: "Super Lawyer",
                      },
                      {
                        key: "organization",
                        label: "Organization",
                        placeholder: "State Bar",
                      },
                      { key: "year", label: "Year", placeholder: "2023" },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Firm Presence Section */}
            <div className="bg-gradient-to-br from-white via-amber-50/30 to-white rounded-sm shadow-lg border-2 border-amber-900/30 overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900"></div>
              <div className="border-b-2 border-amber-900/10 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 px-6 py-4">
                <div className="flex items-center gap-2 serif font-bold text-white">
                  <Building2 className="h-5 w-5 text-amber-50" strokeWidth={2} />
                  Firm-Wide Identity
                </div>
              </div>
              <div className="p-6 space-y-8">
                {firms.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-slate-500">No firm association found.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Label className="text-slate-700 font-semibold">
                          Firm Logo
                        </Label>
                        <MediaUpload
                          label=""
                          value={firmFormData.logo_url}
                          onChange={(url) =>
                            setFirmFormData((prev) => ({
                              ...prev,
                              logo_url: url,
                            }))
                          }
                          onUpload={async (file: File) => {
                            const formData = new FormData();
                            formData.append("file", file);
                            const response = await fetch(`${API_BASE}/api/v1/professional/firms/${selectedFirmId}/logo`, {
                              method: "POST",
                              headers: { Authorization: `Bearer ${token}` },
                              body: formData,
                            });
                            const updated = await response.json();
                            return updated.logo_url || "";
                          }}
                          aspectRatio="square"
                        />
                      </div>
                      <div className="space-y-4">
                        <Label
                          htmlFor="firm_headline"
                          className="text-slate-700 font-semibold"
                        >
                          Firm Headline
                        </Label>
                        <Input
                          id="firm_headline"
                          value={firmFormData.headline}
                          onChange={(e) =>
                            setFirmFormData((p) => ({
                              ...p,
                              headline: e.target.value,
                            }))
                          }
                          placeholder="e.g. Leading Family Law Firm in California"
                          className="border-slate-300"
                        />
                        <Label
                          htmlFor="firm_service_location"
                          className="text-slate-700 font-semibold mt-4"
                        >
                          Firm Service Location
                        </Label>
                        <Input
                          id="firm_service_location"
                          value={firmFormData.service_location}
                          onChange={(e) =>
                            setFirmFormData((p) => ({
                              ...p,
                              service_location: e.target.value,
                            }))
                          }
                          placeholder="Greater Los Angeles Area"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-slate-50">
                      <Label className="text-slate-700 font-bold text-lg">
                        Programs & Financials
                      </Label>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <Label className="font-bold text-slate-700">
                            Payment Plans Available
                          </Label>
                          <input
                            type="checkbox"
                            checked={firmFormData.payment_plans_available}
                            onChange={(e) =>
                              setFirmFormData((p) => ({
                                ...p,
                                payment_plans_available: e.target.checked,
                              }))
                            }
                            className="h-6 w-6 rounded-lg"
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <Label className="font-bold text-slate-700">
                            Works with Nonprofits
                          </Label>
                          <input
                            type="checkbox"
                            checked={firmFormData.works_with_nonprofits}
                            onChange={(e) =>
                              setFirmFormData((p) => ({
                                ...p,
                                works_with_nonprofits: e.target.checked,
                              }))
                            }
                            className="h-6 w-6 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-6">
                      <Button
                        onClick={handleSaveFirm}
                        disabled={isSavingFirm}
                        className="bg-amber-900 hover:bg-amber-800 text-white min-w-[200px] shadow-lg border-2 border-amber-900/40 sans font-semibold"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSavingFirm
                          ? "Saving..."
                          : "Save Firm Profile"}
                      </Button>
                      {firmSaveSuccess && (
                        <span className="sans text-sm font-semibold text-amber-900 flex items-center gap-1.5 animate-in fade-in">
                          <CheckCircle2 className="h-4 w-4" /> Published
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW (STICKY) */}
        <div className="hidden lg:block w-[360px] flex-shrink-0">
          <div className="sticky top-8 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="serif text-xl font-bold text-slate-900">
                Live Directory Preview
              </h3>
              <Badge className="bg-amber-50 text-amber-900 border-2 border-amber-900/30 uppercase text-[9px] tracking-widest sans font-bold">
                Real-time
              </Badge>
            </div>

            <div className="space-y-8 bg-gradient-to-br from-amber-50/30 to-white p-6 rounded-sm border-2 border-dashed border-amber-900/20 shadow-inner">
              <div className="space-y-2">
                <p className="sans text-[10px] font-bold text-amber-900/60 uppercase tracking-widest text-center">
                  Mobile Search Result Card
                </p>
                <MobileDirectoryCard profile={profile} formData={formData} />
              </div>

              <div className="space-y-4 pt-4 border-t-2 border-amber-900/20">
                <p className="sans text-[10px] font-bold text-amber-900/60 uppercase tracking-widest text-center">
                  Firm Page Overview
                </p>
                <Card className="p-4 shadow-lg border-2 border-amber-900/30 overflow-hidden relative bg-gradient-to-br from-white via-amber-50/20 to-white">
                  <div className="h-1 bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900 absolute top-0 left-0 right-0" />
                  <h4 className="serif font-bold text-sm text-slate-900 group">
                    {firms.find((f) => f.id === selectedFirmId)?.name ||
                      "Your Firm"}
                    <Globe className="h-3 w-3 inline ml-2 text-amber-900/40" />
                  </h4>
                  <p className="sans text-[10px] text-slate-600 mt-0.5 line-clamp-1 italic">
                    {firmFormData.headline || "Headline placeholder..."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {firmFormData.practice_areas.slice(0, 3).map((a) => (
                      <div
                        key={a}
                        className="sans text-[9px] px-1.5 py-0.5 bg-amber-50 border-2 border-amber-900/20 rounded-sm text-amber-900"
                      >
                        {a}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card className="bg-gradient-to-br from-blue-900 to-blue-800 p-4 border-2 border-blue-900/40 shadow-xl">
                <div className="flex items-center gap-3 text-white">
                  <div className="p-2 bg-blue-50 rounded-sm border-2 border-blue-900/20">
                    <ShieldCheck className="h-5 w-5 text-blue-900" />
                  </div>
                  <div>
                    <p className="serif text-xs font-bold leading-tight">
                      CommonGround Verified Profile
                    </p>
                    <p className="sans text-[10px] opacity-80 mt-1 uppercase tracking-wider font-semibold">
                      Security Level: High
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-sm border-2 border-amber-900/30 flex gap-3 shadow-sm">
              <AlertTriangle className="h-4 w-4 text-amber-900 shrink-0 mt-0.5" />
              <p className="sans text-[11px] text-amber-900 leading-relaxed font-medium">
                The information provided above will be indexed by search engines
                and visible to all CommonGround users. Review your bio and
                headline for clarity.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .serif {
          font-family: "Crimson Pro", serif;
        }
        .sans {
          font-family: "Outfit", sans-serif;
        }
      `}</style>
    </div>
  );
}
