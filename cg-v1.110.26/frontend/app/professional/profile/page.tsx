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
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Professional Profile</h1>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-emerald-100 text-emerald-600 text-2xl">
                {initials || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">{displayName || "Professional"}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {typeInfo && (
                  <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                )}
                {profile.license_verified ? (
                  <Badge className="bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : profile.license_number ? (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending Verification
                  </Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground mt-2">{profile.user_email}</p>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="headline">Professional Headline</Label>
                  <Input
                    id="headline"
                    value={formData.headline}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, headline: e.target.value }))
                    }
                    placeholder="e.g. Board Certified Family Law Specialist"
                  />
                  <p className="text-xs text-muted-foreground">
                    A brief, impactful summary of your role or expertise (max 150 chars).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    placeholder="Tell parents about your experience, approach, and why they should work with you..."
                    className="min-h-[150px]"
                  />
                </div>
              </>
            ) : (
              <>
                {profile.headline ? (
                  <p className="text-lg font-medium text-foreground">{profile.headline}</p>
                ) : (
                  <p className="text-muted-foreground italic">No headline provided</p>
                )}
                {profile.bio ? (
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">No bio provided</p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* License Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-5 w-5" />
            License Information
          </CardTitle>
          <CardDescription>Your professional credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="license_number">License Number</Label>
                <Input
                  id="license_number"
                  value={formData.license_number}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, license_number: e.target.value }))
                  }
                  placeholder="Enter license number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_state">License State</Label>
                <Select
                  value={formData.license_state}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, license_state: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">License Number</p>
                <p className="font-medium">{profile.license_number || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">License State</p>
                <p className="font-medium">{profile.license_state || "Not provided"}</p>
              </div>
            </div>
          )}

          {!profile.license_verified && profile.license_number && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Verification Pending</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Your license is being verified. This typically takes 1-2 business days.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expertise & Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Expertise & Experience
          </CardTitle>
          <CardDescription>How you present yourself to potential clients</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Practice Areas</Label>
                {isEditing ? (
                  <div className="flex flex-wrap gap-2">
                    {PRACTICE_AREAS.map((area) => (
                      <Button
                        key={area}
                        variant={formData.practice_areas.includes(area) ? "default" : "outline"}
                        size="sm"
                        onClick={() => togglePracticeArea(area)}
                        className={
                          formData.practice_areas.includes(area)
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : ""
                        }
                      >
                        {area.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Button>
                    ))}
                  </div>
                ) : formData.practice_areas.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.practice_areas.map((area) => (
                      <Badge key={area} variant="secondary" className="capitalize">
                        {area.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No practice areas specified</p>
                )}
              </div>

              {isEditing ? (
                <ListEditor
                  label="Languages Spoken"
                  items={formData.languages}
                  onAdd={(lang) =>
                    setFormData((prev) => ({ ...prev, languages: [...prev.languages, lang] }))
                  }
                  onRemove={(idx) =>
                    setFormData((prev) => ({
                      ...prev,
                      languages: prev.languages.filter((_, i) => i !== idx),
                    }))
                  }
                  placeholder="e.g. Spanish, Mandarin..."
                />
              ) : (
                <div className="space-y-2">
                  <Label>Languages</Label>
                  <p className="text-sm">
                    {formData.languages.length > 0
                      ? formData.languages.join(", ")
                      : "English (Default)"}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="years_experience">Years of Experience</Label>
                    <Input
                      id="years_experience"
                      type="number"
                      value={formData.years_experience}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, years_experience: e.target.value }))
                      }
                      placeholder="e.g. 10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate">Hourly Rate</Label>
                    <Input
                      id="hourly_rate"
                      value={formData.hourly_rate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, hourly_rate: e.target.value }))
                      }
                      placeholder="e.g. $350"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultation_fee">Consultation Fee</Label>
                    <Input
                      id="consultation_fee"
                      value={formData.consultation_fee}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, consultation_fee: e.target.value }))
                      }
                      placeholder="e.g. $150 (or Free)"
                    />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Experience
                    </p>
                    <p className="text-sm font-medium">
                      {formData.years_experience || "0"} Years
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Hourly Rate
                    </p>
                    <p className="text-sm font-medium">{formData.hourly_rate || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Consultation
                    </p>
                    <p className="text-sm font-medium">{formData.consultation_fee || "N/A"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Education & Awards */}
          <div className="grid md:grid-cols-2 gap-8 pt-6 border-t">
            <ComplexListEditor
              label="Education History"
              items={formData.education}
              isEditing={isEditing}
              onAdd={(item) =>
                setFormData((prev) => ({ ...prev, education: [...prev.education, item] }))
              }
              onRemove={(idx) =>
                setFormData((prev) => ({
                  ...prev,
                  education: prev.education.filter((_, i) => i !== idx),
                }))
              }
              fields={[
                { key: "institution", label: "Institution", placeholder: "e.g. Stanford Law" },
                { key: "degree", label: "Degree", placeholder: "e.g. J.D." },
                { key: "year", label: "Year", placeholder: "e.g. 2012" },
              ]}
            />
            <ComplexListEditor
              label="Awards & Recognition"
              items={formData.awards}
              isEditing={isEditing}
              onAdd={(item) => setFormData((prev) => ({ ...prev, awards: [...prev.awards, item] }))}
              onRemove={(idx) =>
                setFormData((prev) => ({
                  ...prev,
                  awards: prev.awards.filter((_, i) => i !== idx),
                }))
              }
              fields={[
                { key: "title", label: "Award Title", placeholder: "e.g. Super Lawyer" },
                { key: "organization", label: "Organization", placeholder: "e.g. Bar Assoc." },
                { key: "year", label: "Year", placeholder: "e.g. 2023" },
              ]}
            />
          </div>

          {/* Payment Methods */}
          <div className="pt-6 border-t">
            {isEditing ? (
              <ListEditor
                label="Accepted Payment Methods"
                items={formData.accepted_payment_methods}
                onAdd={(item) =>
                  setFormData((prev) => ({
                    ...prev,
                    accepted_payment_methods: [...prev.accepted_payment_methods, item],
                  }))
                }
                onRemove={(idx) =>
                  setFormData((prev) => ({
                    ...prev,
                    accepted_payment_methods: prev.accepted_payment_methods.filter((_, i) => i !== idx),
                  }))
                }
                placeholder="e.g. Credit Card, Wire, Zelle..."
              />
            ) : (
              <div className="space-y-2">
                <Label>Payment Methods</Label>
                <p className="text-sm">
                  {formData.accepted_payment_methods.length > 0
                    ? formData.accepted_payment_methods.join(", ")
                    : "Not specified"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Firm Memberships */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Firm Memberships
          </CardTitle>
          <CardDescription>Organizations you belong to</CardDescription>
        </CardHeader>
        <CardContent>
          {firms.length > 0 ? (
            <div className="space-y-3">
              {firms.map((firm) => (
                <div
                  key={firm.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{firm.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {firm.firm_type.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {firm.role}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No firm memberships</p>
              <Button variant="outline" size="sm" className="mt-3">
                Create or Join a Firm
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Firm Profile - Directory Listing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Firm Profile
          </CardTitle>
          <CardDescription>
            This information appears in the directory and is visible to parents searching for professionals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {firms.length === 0 ? (
            <div className="text-center py-6">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Join a firm to edit its profile</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create or join a firm in the Firm Memberships section above to edit firm details.
              </p>
            </div>
          ) : (
            <>
              {/* Firm selector if multiple firms */}
              {firms.length > 1 && (
                <div className="space-y-2">
                  <Label>Select Firm to Edit</Label>
                  <Select
                    value={selectedFirmId || ""}
                    onValueChange={setSelectedFirmId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a firm" />
                    </SelectTrigger>
                    <SelectContent>
                      {firms.map((firm) => (
                        <SelectItem key={firm.id} value={firm.id}>
                          {firm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="firm_headline">Firm Headline</Label>
                    <Input
                      id="firm_headline"
                      value={firmFormData.headline}
                      onChange={(e) =>
                        setFirmFormData((prev) => ({ ...prev, headline: e.target.value }))
                      }
                      placeholder="e.g. Leading Family Law Firm in Southern California"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firm_description">Firm Description</Label>
                    <Textarea
                      id="firm_description"
                      value={firmFormData.description}
                      onChange={(e) =>
                        setFirmFormData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Describe your firm's services, specialties, and what sets you apart..."
                      className="min-h-[160px]"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Firm Practice Areas</Label>
                    <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-2 border rounded-md">
                      {FIRM_PRACTICE_AREAS.map((area) => (
                        <Button
                          key={area}
                          variant={firmFormData.practice_areas.includes(area) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleFirmPracticeArea(area)}
                          className={
                            firmFormData.practice_areas.includes(area)
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : ""
                          }
                        >
                          {area}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firm_video">Video Introduction (URL)</Label>
                    <Input
                      id="firm_video"
                      value={firmFormData.video_url}
                      onChange={(e) =>
                        setFirmFormData((prev) => ({ ...prev, video_url: e.target.value }))
                      }
                      placeholder="e.g. YouTube or Vimeo link"
                    />
                  </div>
                  <SocialLinksEditor
                    links={firmFormData.social_links}
                    onChange={(social_links) =>
                      setFirmFormData((prev) => ({ ...prev, social_links }))
                    }
                  />
                </div>
              </div>

              {/* Pricing & Transparency */}
              <div className="pt-4 border-t">
                <Label className="text-base font-medium">Pricing & Transparency</Label>
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="firm_rate_range">Hourly Rate Range</Label>
                    <Input
                      id="firm_rate_range"
                      value={firmFormData.pricing_structure?.rate_range || ""}
                      onChange={(e) =>
                        setFirmFormData((prev) => ({
                          ...prev,
                          pricing_structure: { ...prev.pricing_structure, rate_range: e.target.value },
                        }))
                      }
                      placeholder="e.g. $250 - $500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firm_retainer">Typical Retainer</Label>
                    <Input
                      id="firm_retainer"
                      value={firmFormData.pricing_structure?.typical_retainer || ""}
                      onChange={(e) =>
                        setFirmFormData((prev) => ({
                          ...prev,
                          pricing_structure: { ...prev.pricing_structure, typical_retainer: e.target.value },
                        }))
                      }
                      placeholder="e.g. $3,500"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-muted/50 rounded-md">
                      <input
                        type="checkbox"
                        checked={firmFormData.safety_vetted}
                        onChange={(e) =>
                          setFirmFormData((prev) => ({ ...prev, safety_vetted: e.target.checked }))
                        }
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-600 h-4 w-4"
                      />
                      <span>Safety Vetted Personnel</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleSaveFirm}
                  disabled={isSavingFirm}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSavingFirm ? "Saving..." : "Save Firm Profile"}
                </Button>
                {firmSaveSuccess && (
                  <span className="text-sm text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Saved successfully!
                  </span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Privacy
          </CardTitle>
          <CardDescription>Account security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security
                </p>
              </div>
            </div>
            <Badge variant="outline">Enabled</Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Session Timeout</p>
                <p className="text-sm text-muted-foreground">
                  Auto-logout after inactivity
                </p>
              </div>
            </div>
            <span className="text-sm text-muted-foreground">30 minutes</span>
          </div>

          <div className="pt-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              All actions are logged for compliance and audit purposes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
