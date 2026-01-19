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

interface ProfileFormData {
  license_number: string;
  license_state: string;
  bio: string;
  practice_areas: string[];
  phone: string;
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
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        license_number: profile.license_number || "",
        license_state: profile.license_state || "",
        bio: "",
        practice_areas: [],
        phone: "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!token) return;

    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/professional/profile`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
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
        <CardContent className="pt-6">
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

      {/* Practice Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Practice Areas
          </CardTitle>
          <CardDescription>Your areas of specialization</CardDescription>
        </CardHeader>
        <CardContent>
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
            <p className="text-muted-foreground">No practice areas specified</p>
          )}
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
