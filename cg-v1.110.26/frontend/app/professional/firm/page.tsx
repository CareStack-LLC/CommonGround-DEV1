"use client";

import { useState, useEffect } from "react";
import { FirmAuditLog } from "@/components/professional/firm/audit-log";
import { useProfessionalAuth } from "../layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Save,
  Globe,
  MapPin,
  Phone,
  Mail,
  Palette,
  Users,
  ArrowRight,
  FileText,
  BarChart3,
  Inbox,
  Clock,
} from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const FIRM_TYPES = [
  { value: "law_firm", label: "Law Firm" },
  { value: "mediation_practice", label: "Mediation Practice" },
  { value: "court_services", label: "Court Services" },
  { value: "solo_practice", label: "Solo Practice" },
];

interface FirmDetails {
  id: string;
  name: string;
  slug: string;
  firm_type: string;
  email: string;
  phone: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string;
  zip_code: string | null;
  logo_url: string | null;
  primary_color: string | null;
  is_public: boolean;
  is_active: boolean;
  subscription_tier: string;
  subscription_status: string;
  member_count: number;
}

export default function FirmSettingsPage() {
  const { token, activeFirm, firms } = useProfessionalAuth();
  const { toast } = useToast();
  const [firm, setFirm] = useState<FirmDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    firm_type: "",
    email: "",
    phone: "",
    website: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    zip_code: "",
    primary_color: "#4F46E5",
    is_public: false,
  });

  useEffect(() => {
    if (token && activeFirm) {
      fetchFirmDetails();
    }
  }, [token, activeFirm]);

  const fetchFirmDetails = async () => {
    if (!activeFirm) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/professional/firms/${activeFirm.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFirm(data);
        setFormData({
          name: data.name || "",
          firm_type: data.firm_type || "law_firm",
          email: data.email || "",
          phone: data.phone || "",
          website: data.website || "",
          address_line1: data.address_line1 || "",
          address_line2: data.address_line2 || "",
          city: data.city || "",
          state: data.state || "",
          zip_code: data.zip_code || "",
          primary_color: data.primary_color || "#4F46E5",
          is_public: data.is_public || false,
        });
      }
    } catch (err) {
      console.error("Error fetching firm:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!activeFirm) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/professional/firms/${activeFirm.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        toast({
          title: "Settings saved",
          description: "Your firm settings have been updated.",
        });
        fetchFirmDetails();
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save firm settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeFirm) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Firm Selected</h2>
            <p className="text-gray-500 mb-4">Select a firm from the header to manage settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="h-10 bg-gray-200 animate-pulse rounded" />
            <div className="h-10 bg-gray-200 animate-pulse rounded" />
            <div className="h-10 bg-gray-200 animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Firm Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your firm profile and preferences</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-cg-sage/10 text-foreground border-0 text-xs font-medium">
            {firm?.subscription_tier === "professional" ? "Professional" : firm?.subscription_tier}
          </Badge>
          <Badge className={`text-xs ${firm?.subscription_status === "active" ? "bg-cg-sage-subtle text-cg-sage-dark border-0" : "bg-slate-100 text-slate-600 border-0"}`}>
            {firm?.subscription_status || "trial"}
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { href: "/professional/firm/team", icon: Users, label: "Team Members", desc: `${firm?.member_count || 0} members`, color: "text-blue-600 bg-blue-50" },
          { href: "/professional/firm/templates", icon: FileText, label: "Templates", desc: "Intake & agreement templates", color: "text-cg-slate bg-cg-slate-tint" },
          { href: "/professional/firm/analytics", icon: BarChart3, label: "Analytics", desc: "Firm performance & trends", color: "text-cg-sage bg-background" },
          { href: "/professional/firm/queue", icon: Inbox, label: "Case Queue", desc: "Assign incoming cases", color: "text-foreground bg-slate-100" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="border border-slate-200 hover:border-cg-sage/30 hover:shadow-sm transition-all cursor-pointer rounded-xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.color}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Basic Info */}
      <Card className="mb-6 border border-slate-200 rounded-2xl">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-slate-900">Basic Information</CardTitle>
          <CardDescription className="sans">Your firm's public profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Firm Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Acme Law Firm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firm_type">Firm Type</Label>
              <Select
                value={formData.firm_type}
                onValueChange={(value) => setFormData({ ...formData, firm_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {FIRM_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="h-4 w-4 inline mr-1" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@acmelaw.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="h-4 w-4 inline mr-1" />
                Phone
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">
              <Globe className="h-4 w-4 inline mr-1" />
              Website
            </Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://acmelaw.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card className="mb-6 border border-slate-200 rounded-2xl">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-slate-900">
            <MapPin className="h-5 w-5 inline mr-2 text-foreground" />
            Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address_line1">Street Address</Label>
            <Input
              id="address_line1"
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              placeholder="123 Main Street"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address_line2">Suite/Unit</Label>
            <Input
              id="address_line2"
              value={formData.address_line2}
              onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
              placeholder="Suite 200"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Los Angeles"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="CA"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip_code">ZIP Code</Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                placeholder="90001"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding & Visibility */}
      <Card className="mb-6 border border-slate-200 rounded-2xl">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-slate-900">
            <Palette className="h-5 w-5 inline mr-2 text-foreground" />
            Branding & Visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="is_public">Directory Listing</Label>
              <p className="text-sm text-gray-500">
                Show your firm in the public professional directory
              </p>
            </div>
            <Switch
              id="is_public"
              checked={formData.is_public}
              onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="primary_color">Brand Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="primary_color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="h-10 w-16 rounded border cursor-pointer"
              />
              <Input
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                placeholder="#4F46E5"
                className="w-32"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card className="mb-6 border border-slate-200 rounded-2xl">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-slate-900">
            <Clock className="h-5 w-5 inline mr-2 text-foreground" />
            Recent Activity
          </CardTitle>
          <CardDescription className="sans">Audit log of firm actions for compliance</CardDescription>
        </CardHeader>
        <CardContent>
          <FirmAuditLog firmId={activeFirm.id} token={token || ""} />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="bg-cg-sage hover:bg-cg-sage-dark text-white rounded-xl shadow-sm font-semibold">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
