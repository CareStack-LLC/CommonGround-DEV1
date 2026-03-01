"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  Shield,
  AlertTriangle,
  MessageSquare,
  Settings,
  Save,
  RotateCcw,
  TrendingUp,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface ARIAControlsPanelProps {
  open: boolean;
  onClose: () => void;
  familyFileId: string;
  caseName: string;
  token: string;
}

interface ARIASettings {
  rewrite_strictness: number; // 1-10 scale
  auto_flag_hostile: boolean;
  structured_only_mode: boolean;
  silent_handoff_mode: boolean;
  enable_mediation_suggestions: boolean;
  custom_keywords?: string[];
  intervention_threshold: number; // 0.0-1.0 toxicity score
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function ARIAControlsPanel({
  open,
  onClose,
  familyFileId,
  caseName,
  token,
}: ARIAControlsPanelProps) {
  const [settings, setSettings] = useState<ARIASettings>({
    rewrite_strictness: 5,
    auto_flag_hostile: true,
    structured_only_mode: false,
    silent_handoff_mode: false,
    enable_mediation_suggestions: true,
    intervention_threshold: 0.3,
  });

  const [originalSettings, setOriginalSettings] = useState<ARIASettings>(settings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [interventionStats, setInterventionStats] = useState<any>(null);
  const [recentInterventions, setRecentInterventions] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetchSettings();
      fetchInterventionStats();
    }
  }, [open, familyFileId]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/aria/settings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setOriginalSettings(data);
      }
    } catch (err) {
      console.error("Failed to fetch ARIA settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInterventionStats = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/aria/interventions?limit=5`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setInterventionStats(data.stats);
        setRecentInterventions(data.recent || []);
      }
    } catch (err) {
      console.error("Failed to fetch intervention stats:", err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/cases/${familyFileId}/aria/settings`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settings),
        }
      );

      if (response.ok) {
        setOriginalSettings(settings);
        onClose();
      }
    } catch (err) {
      console.error("Failed to save ARIA settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const getStrictnessLabel = (value: number) => {
    if (value <= 3) return "Minimal Filtering";
    if (value <= 5) return "Moderate Filtering";
    if (value <= 7) return "Strict Filtering";
    return "Maximum Filtering";
  };

  const getStrictnessDescription = (value: number) => {
    if (value <= 3)
      return "Only rewrites severe threats and profanity. Parents communicate mostly unfiltered.";
    if (value <= 5)
      return "Rewrites hostile tone, accusations, and blame. Balanced filtering.";
    if (value <= 7)
      return "Rewrites all negative tone, converts to neutral language.";
    return "Maximum intervention - all messages converted to strictly neutral, business-like tone.";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-amber-900/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Bot className="h-6 w-6 text-amber-900" />
            ARIA Controls - {caseName}
          </DialogTitle>
          <DialogDescription>
            Adjust AI mediation settings to manage conflict levels and communication quality
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6 mt-6">
            {/* Rewrite Strictness */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <Label className="text-sm font-semibold text-slate-900">
                    Rewrite Strictness
                  </Label>
                  <p className="text-xs text-slate-600 mt-1">
                    How aggressively ARIA filters and rewrites messages
                  </p>
                </div>
                <Badge className="bg-amber-50 text-amber-900 border-amber-900/30">
                  {getStrictnessLabel(settings.rewrite_strictness)}
                </Badge>
              </div>

              <div className="px-2">
                <Slider
                  value={[settings.rewrite_strictness]}
                  onValueChange={(value) =>
                    setSettings({ ...settings, rewrite_strictness: value[0] })
                  }
                  min={1}
                  max={10}
                  step={1}
                  className="my-4"
                />
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Minimal (1)</span>
                  <span className="font-semibold text-slate-900">
                    {settings.rewrite_strictness}
                  </span>
                  <span>Maximum (10)</span>
                </div>
              </div>

              <Card className="border-2 border-blue-900/20 bg-blue-50/30">
                <CardContent className="py-3">
                  <p className="text-xs text-blue-900">
                    {getStrictnessDescription(settings.rewrite_strictness)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Intervention Threshold */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold text-slate-900">
                  Intervention Threshold
                </Label>
                <p className="text-xs text-slate-600 mt-1">
                  Toxicity score (0.0-1.0) that triggers ARIA intervention
                </p>
              </div>

              <div className="px-2">
                <Slider
                  value={[settings.intervention_threshold * 100]}
                  onValueChange={(value) =>
                    setSettings({ ...settings, intervention_threshold: value[0] / 100 })
                  }
                  min={10}
                  max={90}
                  step={5}
                  className="my-4"
                />
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Low (0.1)</span>
                  <span className="font-semibold text-slate-900">
                    {settings.intervention_threshold.toFixed(2)}
                  </span>
                  <span>High (0.9)</span>
                </div>
              </div>
            </div>

            {/* Toggle Settings */}
            <div className="space-y-3">
              <Card className="border-2 border-slate-200">
                <CardContent className="py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-900 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Auto-Flag Hostile Messages
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Automatically flag messages with hostile tone for your review
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.auto_flag_hostile}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, auto_flag_hostile: checked })
                    }
                  />
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-200">
                <CardContent className="py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-blue-900 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Structured-Only Mode
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Limit parents to pre-written message templates only
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.structured_only_mode}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, structured_only_mode: checked })
                    }
                  />
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-200">
                <CardContent className="py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-purple-900 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Silent Handoff Mode
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Enable contactless exchanges with QR code check-in
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.silent_handoff_mode}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, silent_handoff_mode: checked })
                    }
                  />
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-200">
                <CardContent className="py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Bot className="h-5 w-5 text-emerald-900 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Mediation Suggestions
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        ARIA suggests constructive alternatives during conflicts
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.enable_mediation_suggestions}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, enable_mediation_suggestions: checked })
                    }
                  />
                </CardContent>
              </Card>
            </div>

            {/* Warning for High-Risk Settings */}
            {(settings.structured_only_mode || settings.rewrite_strictness >= 9) && (
              <Card className="border-2 border-amber-900/30 bg-amber-50/30">
                <CardContent className="py-3 flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-900 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 mb-1">
                      High-Conflict Protection Enabled
                    </p>
                    <p className="text-xs text-amber-900">
                      These settings significantly limit parent communication. Use only for
                      high-conflict cases with documented escalation patterns.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6 mt-6">
            {/* Intervention Statistics */}
            {interventionStats && (
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-2 border-slate-200">
                  <CardContent className="py-4">
                    <p className="text-xs text-slate-600 mb-1">Total Interventions</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {interventionStats.total_interventions || 0}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Last 30 days</p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-slate-200">
                  <CardContent className="py-4">
                    <p className="text-xs text-slate-600 mb-1">Conflict Trend</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-slate-900">
                        {interventionStats.trend || "Stable"}
                      </p>
                      {interventionStats.trend === "Increasing" && (
                        <TrendingUp className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Interventions */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-900">
                Recent Interventions
              </Label>
              {recentInterventions.length > 0 ? (
                <div className="space-y-2">
                  {recentInterventions.map((intervention, index) => (
                    <Card key={index} className="border-2 border-slate-200">
                      <CardContent className="py-3 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <Badge variant="outline" className="text-xs">
                            {intervention.category}
                          </Badge>
                          <span className="text-xs text-slate-600">
                            {new Date(intervention.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="text-slate-600 mb-1">Before:</p>
                            <p className="text-slate-900 italic line-clamp-2">
                              "{intervention.original_text?.substring(0, 100)}..."
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-600 mb-1">After:</p>
                            <p className="text-emerald-900 line-clamp-2">
                              "{intervention.rewritten_text?.substring(0, 100)}..."
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-2 border-dashed border-slate-200">
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-slate-600">
                      No recent interventions
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>

          {hasChanges && (
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}

          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="bg-amber-900 hover:bg-amber-950 text-white"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
