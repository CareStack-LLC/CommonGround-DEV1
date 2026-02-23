"use client";

import { useState, useEffect } from "react";
import {
  User,
  Shield,
  Building2,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit,
  Save,
  X,
  FileText,
  Globe,
  Video,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfessionalAuth } from "../layout";
import { MediaUpload } from "@/components/ui/media-upload";
import { professionalAPI } from "@/lib/api";

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
}

const PRACTICE_AREAS = [
  "custody",
  "divorce",
  "mediation",
  "child_support",
  "adoption",
  "domestic_violence",
  "paternity",
  "guardianship",
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
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const PROFESSIONAL_TYPES: Record<string, { label: string; color: string }> = {
  attorney: { label: "Attorney", color: "bg-emerald-100 text-emerald-800" },
  paralegal: { label: "Paralegal", color: "bg-blue-100 text-blue-800" },
  mediator: { label: "Mediator", color: "bg-purple-100 text-purple-800" },
  parenting_coordinator: { label: "Parenting Coordinator", color: "bg-amber-100 text-amber-800" },
  intake_coordinator: { label: "Intake Coordinator", color: "bg-cyan-100 text-cyan-800" },
  practice_admin: { label: "Practice Admin", color: "bg-slate-100 text-slate-800" },
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
          <Badge key={index} variant="secondary" className="flex items-center gap-1 pr-1">
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
          <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-md border">
            <div className="text-sm">
              {fields.map((f, i) => (
                <span key={String(f.key)}>
                  {i > 0 && " • "}
                  <span className={i === 0 ? "font-bold text-foreground" : "text-muted-foreground"}>
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
          <p className="text-sm text-muted-foreground italic pl-1">Not provided</p>
        )}
      </div>

      {isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 border p-3 rounded-md bg-muted/10 mt-2">
          {fields.map((f) => (
            <div key={String(f.key)} className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">{f.label}</Label>
              <Input
                value={String(newValues[f.key] || "")}
                onChange={(e) => setNewValues({ ...newValues, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="h-8 text-sm"
              />
            </div>
          ))}
          <div className="flex items-end">
            <Button
              type="button"
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
  const PLATFORMS = [
    { key: "linkedin", label: "LinkedIn" },
    { key: "twitter", label: "X (Twitter)" },
    { key: "facebook", label: "Facebook" },
    { key: "website", label: "Firm Website" },
  ];
  return (
    <div className="space-y-3">
      <Label>Social & Web Links</Label>
      <div className="grid gap-2">
        {PLATFORMS.map((p) => (
          <div key={p.key} className="flex items-center gap-2">
            <div className="w-24 text-xs font-medium text-muted-foreground">{p.label}</div>
            <Input
              value={links[p.key] || ""}
              onChange={(e) => onChange({ ...links, [p.key]: e.target.value })}
              placeholder={`https://${p.key}.com/...`}
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// New Directory Preview Components
function MobileDirectoryCard({ profile, formData }: { profile: any; formData: ProfileFormData }) {
  const displayName = `${profile.user_first_name || ""} ${profile.user_last_name || ""}`.trim();
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Card className="overflow-hidden shadow-xl border-slate-200 w-full max-w-[320px] mx-auto">
      <div className="flex flex-col">
        <div className="bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center p-6 border-b border-slate-100">
          <Avatar className="w-20 h-20 mb-3 border-2 border-white shadow-sm ring-4 ring-emerald-500/10">
            <AvatarFallback className="bg-emerald-50 text-emerald-600 text-xl font-bold">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
          {profile.license_verified && (
            <Badge variant="outline" className="bg-white text-emerald-600 border-emerald-200 text-[10px] gap-1 px-2">
              <CheckCircle2 className="w-3 h-3" /> Licensed
            </Badge>
          )}
        </div>
        <div className="p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-base text-slate-900 leading-tight">
                {displayName}
              </h3>
              <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mt-1">
                {formData.headline || profile.professional_type.replace('_', ' ')}
              </p>
            </div>
            {formData.hourly_rate && (
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900">{formData.hourly_rate}</div>
                <div className="text-[10px] text-slate-500">per hour</div>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
            {formData.bio || "No biography available."}
          </p>

          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            {formData.years_experience && (
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formData.years_experience} Years Exp.
              </div>
            )}
            {formData.languages.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                {formData.languages.join(", ")}
              </div>
            )}
            {formData.awards.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                {formData.awards.length} Awards
              </div>
            )}
          </div>
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
      });
    }
  }, [profile]);

  // Auto-select first firm if user has firms
  useEffect(() => {
    if (firms.length > 0 && !selectedFirmId) {
      setSelectedFirmId(firms[0].id);
    }
  }, [firms, selectedFirmId]);

  // Load firm data when firm is selected
  useEffect(() => {
    const loadFirmData = async () => {
      if (!selectedFirmId || !token) return;
      try {
        const response = await fetch(`${API_BASE}/api/v1/professional/firms/${selectedFirmId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const firmData = await response.json();
          setFirmFormData({
            description: firmData.description || "",
            practice_areas: firmData.practice_areas || [],
            headline: firmData.headline || "",
            logo_url: firmData.logo_url || "",
            video_url: firmData.video_url || "",
            social_links: firmData.social_links || {},
            pricing_structure: firmData.pricing_structure || {},
            safety_vetted: firmData.safety_vetted || false,
          });
        }
      } catch (error) {
        console.error("Error loading firm data:", error);
      }
    };
    loadFirmData();
  }, [selectedFirmId, token]);

  const handleSave = async () => {
    if (!token) return;

    setIsSaving(true);
    try {
      const dataToSend = {
        ...formData,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
      };
      const response = await fetch(`${API_BASE}/api/v1/professional/profile`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        await refreshProfile();
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
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

  const handleSaveFirm = async () => {
    if (!token || !selectedFirmId) return;

    setIsSavingFirm(true);
    setFirmSaveSuccess(false);
    try {
      const response = await fetch(`${API_BASE}/api/v1/professional/firms/${selectedFirmId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(firmFormData),
      });

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

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const typeInfo = PROFESSIONAL_TYPES[profile.professional_type];
  const displayName = `${profile.user_first_name || ""} ${profile.user_last_name || ""}`.trim();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* LEFT COLUMN: EDITOR */}
        <div className="flex-1 space-y-8 min-w-0 pb-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-30 py-4 border-b">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Directory Presence Manager</h1>
              <p className="text-sm text-slate-500 mt-1 italic font-medium">Control how parents see you in the firm directory</p>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} className="bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all">
                <Edit className="h-4 w-4 mr-2" />
                Edit My Bio & Expertise
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)} className="shadow-sm">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 shadow-md"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save My Profile"}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Identity & Headline Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <User className="h-5 w-5 text-emerald-600" />
                  My Public Identity
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  Visible to Public
                </Badge>
              </div>
              <div className="p-6 space-y-6">
                {isEditing ? (
                  <div className="mb-2 max-w-xs">
                    <MediaUpload
                      label="Professional Headshot"
                      value={formData.headshot_url}
                      onChange={(url) => setFormData((prev) => ({ ...prev, headshot_url: url }))}
                      onUpload={async (file) => {
                        const updated = await professionalAPI.uploadHeadshot(file);
                        return updated.headshot_url || "";
                      }}
                      aspectRatio="square"
                      placeholder="Upload Headshot"
                    />
                  </div>
                ) : formData.headshot_url ? (
                  <div className="mb-2">
                    <img
                      src={formData.headshot_url.startsWith('http') ? formData.headshot_url : `${API_BASE}${formData.headshot_url}`}
                      alt="Headshot"
                      className="w-32 h-32 rounded-lg object-cover border"
                    />
                  </div>
                ) : null}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="headline" className="text-slate-700 font-semibold">Professional Headline</Label>
                    {isEditing ? (
                      <Input
                        id="headline"
                        value={formData.headline}
                        onChange={(e) => setFormData((prev) => ({ ...prev, headline: e.target.value }))}
                        placeholder="e.g. Board Certified Family Law Specialist"
                        className="border-slate-300 focus:ring-emerald-500"
                        maxLength={150}
                      />
                    ) : (
                      <p className="text-slate-900 font-medium p-2 bg-slate-50 rounded-lg min-h-[40px] border border-slate-100 italic">
                        {formData.headline || "Not set - parents will see your professional type"}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Showcases your primary value proposition</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-slate-700 font-semibold">Short Biography</Label>
                    {isEditing ? (
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell parents about your approach to high-conflict cases..."
                        className="min-h-[120px] border-slate-300 focus:ring-emerald-500"
                      />
                    ) : (
                      <p className="text-slate-600 text-sm p-3 bg-slate-50 rounded-lg border border-slate-100 line-clamp-4 leading-relaxed">
                        {formData.bio || "No biography provided yet."}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 pt-4 border-t border-slate-50">
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate" className="text-slate-700 font-semibold">Hourly Rate (Display)</Label>
                    {isEditing ? (
                      <Input
                        id="hourly_rate"
                        value={formData.hourly_rate}
                        onChange={(e) => setFormData((prev) => ({ ...prev, hourly_rate: e.target.value }))}
                        placeholder="e.g. $350"
                        className="border-slate-300 focus:ring-emerald-500"
                      />
                    ) : (
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-900 font-bold">
                        {formData.hourly_rate || "N/A"} <span className="text-[10px] text-slate-400 font-normal">/ hour</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="years_experience" className="text-slate-700 font-semibold">Years of Experience</Label>
                    {isEditing ? (
                      <Input
                        id="years_experience"
                        type="number"
                        value={formData.years_experience}
                        onChange={(e) => setFormData((prev) => ({ ...prev, years_experience: e.target.value }))}
                        placeholder="e.g. 15"
                        className="border-slate-300 focus:ring-emerald-500"
                      />
                    ) : (
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-900 font-bold">
                        {formData.years_experience || "0"} <span className="text-[10px] text-slate-400 font-normal">Years</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold">Languages</Label>
                    {isEditing ? (
                      <ListEditor
                        label=""
                        items={formData.languages}
                        onAdd={(l) => setFormData(p => ({ ...p, languages: [...p.languages, l] }))}
                        onRemove={(i) => setFormData(p => ({ ...p, languages: p.languages.filter((_, idx) => idx !== i) }))}
                        placeholder="Add language..."
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formData.languages.length > 0 ? formData.languages.map(l => (
                          <Badge key={l} variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] uppercase">{l}</Badge>
                        )) : <p className="text-slate-400 text-xs italic">English only</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Expertise Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <Briefcase className="h-5 w-5 text-emerald-600" />
                  Expertise & Education
                </div>
                <Badge variant="outline" className="text-slate-500">Public Directory</Badge>
              </div>
              <div className="p-6 space-y-8">
                <div className="space-y-3">
                  <Label className="text-slate-700 font-semibold">Primary Practice Areas</Label>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      {PRACTICE_AREAS.map((area) => (
                        <Button
                          key={area}
                          variant={formData.practice_areas.includes(area) ? "default" : "outline"}
                          size="sm"
                          onClick={() => togglePracticeArea(area)}
                          className={formData.practice_areas.includes(area) ? "bg-emerald-600 hover:bg-emerald-700 ring-offset-2" : "text-slate-600 hover:bg-slate-50"}
                        >
                          {area.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {formData.practice_areas.map((area) => (
                        <Badge key={area} variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors uppercase text-[10px] tracking-widest py-1 border-0">
                          {area.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-8 pt-6 border-t border-slate-50">
                  <ComplexListEditor
                    label="Education History"
                    items={formData.education}
                    isEditing={isEditing}
                    onAdd={(item) => setFormData(p => ({ ...p, education: [...p.education, item] }))}
                    onRemove={(i) => setFormData(p => ({ ...p, education: p.education.filter((_, idx) => idx !== i) }))}
                    fields={[
                      { key: "institution", label: "Institution", placeholder: "Stanford Law" },
                      { key: "degree", label: "Degree", placeholder: "J.D." },
                      { key: "year", label: "Year", placeholder: "2012" },
                    ]}
                  />
                  <ComplexListEditor
                    label="Awards & Recognition"
                    items={formData.awards}
                    isEditing={isEditing}
                    onAdd={(item) => setFormData(p => ({ ...p, awards: [...p.awards, item] }))}
                    onRemove={(i) => setFormData(p => ({ ...p, awards: p.awards.filter((_, idx) => idx !== i) }))}
                    fields={[
                      { key: "title", label: "Title", placeholder: "Super Lawyer" },
                      { key: "organization", label: "Org", placeholder: "Bar Assoc." },
                      { key: "year", label: "Year", placeholder: "2023" },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Firm Presence Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-900 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                  Firm Directory Page
                </div>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  Visible to Public
                </Badge>
              </div>
              <div className="p-6 space-y-8 bg-gradient-to-br from-white to-slate-50/30">
                {firms.length === 0 ? (
                  <div className="text-center py-10">
                    <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">Join a firm to manage your organization's directory presence</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                      <div className="flex-1 space-y-6 w-full">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-slate-700 font-bold text-lg">Firm Details</Label>
                            {firms.length > 1 && (
                              <Select value={selectedFirmId || ""} onValueChange={setSelectedFirmId}>
                                <SelectTrigger className="w-[180px] h-8 bg-white shadow-sm ring-1 ring-slate-200 border-0">
                                  <SelectValue placeholder="Select Firm" />
                                </SelectTrigger>
                                <SelectContent>
                                  {firms.map(f => (
                                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            <MediaUpload
                              label="Firm Logo"
                              value={firmFormData.logo_url}
                              onChange={(url) => setFirmFormData((prev) => ({ ...prev, logo_url: url }))}
                              onUpload={async (file) => {
                                const updated = await professionalAPI.uploadFirmLogo(selectedFirmId!, file);
                                return updated.logo_url || "";
                              }}
                              aspectRatio="square"
                              placeholder="Upload Logo"
                            />
                            <MediaUpload
                              label="Firm Video Presentation"
                              value={firmFormData.video_url}
                              onChange={(url) => setFirmFormData((prev) => ({ ...prev, video_url: url }))}
                              onUpload={async (file) => {
                                const updated = await professionalAPI.uploadFirmVideo(selectedFirmId!, file);
                                return updated.video_url || "";
                              }}
                              mediaType="video"
                              aspectRatio="video"
                              placeholder="Upload Presentation"
                            />
                          </div>

                          <div className="space-y-3">
                            <Label htmlFor="firm_headline" className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Firm Headline / Tagline</Label>
                            <Input
                              id="firm_headline"
                              value={firmFormData.headline}
                              onChange={e => setFirmFormData(p => ({ ...p, headline: e.target.value }))}
                              placeholder="e.g. Versatile Family Law Team Serving San Bernardino..."
                              className="border-slate-300"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label htmlFor="firm_description" className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Firm About Us</Label>
                            <Textarea
                              id="firm_description"
                              value={firmFormData.description}
                              onChange={e => setFirmFormData(p => ({ ...p, description: e.target.value }))}
                              placeholder="Detailed description for the firm's landing page..."
                              className="min-h-[160px] border-slate-300"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="w-full sm:w-80 space-y-6">
                        <SocialLinksEditor
                          links={firmFormData.social_links}
                          onChange={links => setFirmFormData(p => ({ ...p, social_links: links }))}
                        />
                        <div className="space-y-3">
                          <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Video Introduction</Label>
                          <div className="relative group">
                            <Input
                              value={firmFormData.video_url}
                              onChange={e => setFirmFormData(p => ({ ...p, video_url: e.target.value }))}
                              placeholder="YouTube/Vimeo Link"
                              className="pl-9 border-slate-300"
                            />
                            <Video className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-emerald-500 transition-colors" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-200">
                      <div className="flex items-center gap-2 mb-6">
                        <DollarSign className="h-5 w-5 text-slate-800" />
                        <Label className="text-slate-800 font-bold text-lg">Services & Transparent Pricing</Label>
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                          { id: 'consultation', label: 'Consultation', placeholder: 'e.g. $150 or Free' },
                          { id: 'hourly', label: 'Hourly Rate', placeholder: 'e.g. $300-$500' },
                          { id: 'retainer', label: 'Typical Retainer', placeholder: 'e.g. $3,500' },
                          { id: 'mediation', label: 'Mediation (Flat)', placeholder: 'e.g. $1,500' },
                        ].map(field => (
                          <div key={field.id} className="space-y-2">
                            <Label className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">{field.label}</Label>
                            <Input
                              value={(firmFormData.pricing_structure as any)[field.id] || ""}
                              onChange={e => setFirmFormData(p => ({
                                ...p,
                                pricing_structure: { ...p.pricing_structure, [field.id]: e.target.value }
                              }))}
                              placeholder={field.placeholder}
                              className="bg-white border-slate-200 shadow-sm"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 flex items-center justify-between p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <ShieldCheck className="h-6 w-6 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">Safety Vetted Personnel</p>
                            <p className="text-xs text-slate-500">Highlight that your staff has undergone standard safety vetting</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={firmFormData.safety_vetted}
                          onChange={e => setFirmFormData(p => ({ ...p, safety_vetted: e.target.checked }))}
                          className="h-6 w-6 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-6">
                      <Button
                        onClick={handleSaveFirm}
                        disabled={isSavingFirm}
                        className="bg-slate-900 hover:bg-slate-800 text-white min-w-[200px] shadow-lg shadow-slate-200"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSavingFirm ? "Deploying Updates..." : "Sync Firm Profile"}
                      </Button>
                      {firmSaveSuccess && (
                        <span className="text-sm font-semibold text-emerald-600 animate-in fade-in slide-in-from-left-2 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> Published to Directory
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
              <h3 className="text-xl font-bold text-slate-900">Live Directory Preview</h3>
              <Badge className="bg-emerald-50 text-emerald-600 border-0 uppercase text-[9px] tracking-widest font-bold">Real-time</Badge>
            </div>

            <div className="space-y-8 bg-slate-100/50 p-6 rounded-3xl border border-dashed border-slate-300">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Mobile Search Result Card</p>
                <MobileDirectoryCard profile={profile} formData={formData} />
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Firm Page Overview</p>
                <Card className="p-4 shadow-sm border-slate-200 overflow-hidden relative">
                  <div className="h-2 bg-emerald-600 absolute top-0 left-0 right-0" />
                  <h4 className="font-bold text-sm text-slate-900 group">
                    {firms.find(f => f.id === selectedFirmId)?.name || "Your Firm"}
                    <Globe className="h-3 w-3 inline ml-2 text-slate-300" />
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 italic">{firmFormData.headline || "Headline placeholder..."}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {firmFormData.practice_areas.slice(0, 3).map(a => (
                      <div key={a} className="text-[9px] px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded text-slate-500">{a}</div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card className="bg-blue-600 p-4 border-0 shadow-xl shadow-blue-200">
                <div className="flex items-center gap-3 text-white">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">CommonGround Verified Profile</p>
                    <p className="text-[10px] opacity-80 mt-1 uppercase tracking-wider font-semibold">Security Level: High</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                The information provided above will be indexed by search engines and visible to all CommonGround users. Review your bio and headline for clarity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
