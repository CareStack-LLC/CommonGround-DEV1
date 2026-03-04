"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCourtAuth } from "../../../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CourtSettings {
  gps_checkins_required: boolean;
  supervised_exchange_required: boolean;
  in_app_communication_only: boolean;
  aria_enforcement_locked: boolean;
  agreement_edits_locked: boolean;
  investigation_mode: boolean;
  disable_delete_messages: boolean;
  require_read_receipts: boolean;
}

const SETTING_DEFINITIONS = [
  {
    key: "gps_checkins_required",
    label: "GPS Check-ins Required",
    description: "Parents must verify location during custody exchanges",
    category: "Exchange Controls",
    impact: "high",
  },
  {
    key: "supervised_exchange_required",
    label: "Supervised Exchanges Only",
    description: "All exchanges must occur at designated supervised locations",
    category: "Exchange Controls",
    impact: "high",
  },
  {
    key: "in_app_communication_only",
    label: "In-App Communication Only",
    description: "Block external contact methods, require all communication through CommonGround",
    category: "Communication Controls",
    impact: "high",
  },
  {
    key: "aria_enforcement_locked",
    label: "ARIA Enforcement Locked",
    description: "Parents cannot disable ARIA messaging suggestions",
    category: "ARIA Controls",
    impact: "medium",
  },
  {
    key: "agreement_edits_locked",
    label: "Agreement Edits Locked",
    description: "Prevent parents from modifying custody agreement terms",
    category: "Agreement Controls",
    impact: "high",
  },
  {
    key: "investigation_mode",
    label: "Investigation Mode",
    description: "Enhanced logging and evidence collection for court review",
    category: "Monitoring",
    impact: "high",
  },
  {
    key: "disable_delete_messages",
    label: "Disable Message Deletion",
    description: "Prevent parents from deleting sent messages",
    category: "Communication Controls",
    impact: "medium",
  },
  {
    key: "require_read_receipts",
    label: "Require Read Receipts",
    description: "Force read receipt acknowledgment for all messages",
    category: "Communication Controls",
    impact: "low",
  },
];

const DEFAULT_SETTINGS: CourtSettings = {
  gps_checkins_required: false,
  supervised_exchange_required: false,
  in_app_communication_only: false,
  aria_enforcement_locked: false,
  agreement_edits_locked: false,
  investigation_mode: false,
  disable_delete_messages: false,
  require_read_receipts: false,
};

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { professional, token, isLoading } = useCourtAuth();
  const [settings, setSettings] = useState<CourtSettings>(DEFAULT_SETTINGS);
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const caseId = params.id as string;

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    if (professional && caseId) {
      loadSettings();
    }
  }, [professional, caseId]);

  const loadSettings = async () => {
    try {
      setIsLoadingSettings(true);
      setError(null);
      const response = await fetch(`${API_BASE}/court/settings/case/${caseId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        // If no settings exist yet, use defaults
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading settings...</div>
      </div>
    );
  }

  const handleToggle = (key: string, value: boolean) => {
    setPendingChanges((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch(`${API_BASE}/court/settings/case/${caseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(pendingChanges),
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
        setPendingChanges({});
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to save settings");
      }
    } catch (err) {
      setError("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setPendingChanges({});
  };

  const getCurrentValue = (key: string) => {
    if (key in pendingChanges) {
      return pendingChanges[key];
    }
    return settings[key as keyof CourtSettings] ?? false;
  };

  const groupedSettings = SETTING_DEFINITIONS.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, typeof SETTING_DEFINITIONS>);

  const impactColors = {
    high: "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/court-portal/cases/${params.id}`}
              className="text-slate-500 hover:text-slate-700"
            >
              ← Back to Case
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Court-Controlled Settings</h1>
          <p className="text-slate-600">
            Settings that parents cannot override
          </p>
        </div>
        {hasChanges && (
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleDiscard} disabled={isSaving}>
              Discard
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          Settings saved successfully! Changes are now active for this case.
        </div>
      )}

      {/* Pending Changes Warning */}
      {hasChanges && (
        <Card className="border-2 border-orange-300 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-medium text-orange-800">
                  You have {Object.keys(pendingChanges).length} unsaved change(s)
                </p>
                <p className="text-sm text-orange-700">
                  Changes will be logged and take effect immediately upon saving.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings by Category */}
      {Object.entries(groupedSettings).map(([category, categorySettings]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categorySettings.map((setting) => {
              const currentValue = getCurrentValue(setting.key);
              const hasChanged = setting.key in pendingChanges;

              return (
                <div
                  key={setting.key}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    hasChanged ? "border-orange-300 bg-orange-50" : "border-slate-200"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Label htmlFor={setting.key} className="font-medium text-slate-900">
                        {setting.label}
                      </Label>
                      <span className={`px-2 py-0.5 rounded text-xs ${impactColors[setting.impact as keyof typeof impactColors]}`}>
                        {setting.impact} impact
                      </span>
                      {hasChanged && (
                        <span className="px-2 py-0.5 rounded text-xs bg-orange-200 text-orange-800">
                          modified
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{setting.description}</p>
                  </div>
                  <Switch
                    id={setting.key}
                    checked={currentValue}
                    onCheckedChange={(value) => handleToggle(setting.key, value)}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Audit Info */}
      <Card className="bg-slate-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <span className="text-xl">📋</span>
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-700">Change Logging</p>
              <p className="mt-1">
                All setting changes are permanently logged with timestamp, your identity,
                and the previous value. This log cannot be modified or deleted.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Changes Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Setting Changes</CardTitle>
          <CardDescription>Audit log of modifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
              <div>
                <span className="font-medium">Investigation Mode</span>
                <span className="text-slate-500"> enabled by </span>
                <span className="font-medium">Sarah Chen (GAL)</span>
              </div>
              <span className="text-slate-500">Dec 15, 2025</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
              <div>
                <span className="font-medium">ARIA Enforcement</span>
                <span className="text-slate-500"> locked by </span>
                <span className="font-medium">Court Order #2025-847</span>
              </div>
              <span className="text-slate-500">Dec 1, 2025</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
              <div>
                <span className="font-medium">Agreement Edits</span>
                <span className="text-slate-500"> locked by </span>
                <span className="font-medium">Court Order #2025-847</span>
              </div>
              <span className="text-slate-500">Dec 1, 2025</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
