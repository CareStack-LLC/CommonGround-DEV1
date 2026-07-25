'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Settings,
  ChevronLeft,
  Loader2,
  Video,
  MessageCircle,
  Film,
  Gamepad2,
  PenTool,
  Shield,
  Clock,
  Users,
  Bell,
  Save,
  AlertCircle,
} from 'lucide-react';
import { kidcomsAPI, KidComsSettings, KidComsSettingsUpdate } from '@/lib/api';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
] as const;

const DEFAULT_SCHEDULE: Record<string, { start: string; end: string }> = {
  monday: { start: '09:00', end: '20:00' },
  tuesday: { start: '09:00', end: '20:00' },
  wednesday: { start: '09:00', end: '20:00' },
  thursday: { start: '09:00', end: '20:00' },
  friday: { start: '09:00', end: '21:00' },
  saturday: { start: '08:00', end: '21:00' },
  sunday: { start: '08:00', end: '20:00' },
};

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyFileId = searchParams.get('case');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<KidComsSettings | null>(null);
  const [formData, setFormData] = useState<KidComsSettingsUpdate>({});
  const [schedule, setSchedule] = useState<Record<string, { start: string; end: string; enabled: boolean }>>(
    Object.fromEntries(
      DAYS_OF_WEEK.map(d => [d.key, { ...DEFAULT_SCHEDULE[d.key], enabled: true }])
    )
  );

  useEffect(() => {
    if (familyFileId) {
      loadSettings();
    } else {
      setIsLoading(false);
    }
  }, [familyFileId]);

  async function loadSettings() {
    try {
      setIsLoading(true);
      setError(null);
      const data = await kidcomsAPI.getSettings(familyFileId!);
      setSettings(data);
      setFormData({
        circle_approval_mode: data.circle_approval_mode,
        enforce_availability: data.enforce_availability,
        availability_schedule: data.availability_schedule,
        require_parent_notification: data.require_parent_notification,
        notify_on_session_start: data.notify_on_session_start,
        notify_on_session_end: data.notify_on_session_end,
        notify_on_aria_flag: data.notify_on_aria_flag,
        allowed_features: data.allowed_features,
        max_session_duration_minutes: data.max_session_duration_minutes,
        max_daily_sessions: data.max_daily_sessions,
        max_participants_per_session: data.max_participants_per_session,
        require_parent_in_call: data.require_parent_in_call,
        allow_child_to_initiate: data.allow_child_to_initiate,
        record_sessions: data.record_sessions,
      });
      // Load saved schedule into local state
      if (data.availability_schedule) {
        const savedSchedule: Record<string, { start: string; end: string; enabled: boolean }> = {};
        for (const day of DAYS_OF_WEEK) {
          const saved = data.availability_schedule[day.key] as { start: string; end: string } | undefined;
          savedSchedule[day.key] = saved
            ? { start: saved.start, end: saved.end, enabled: true }
            : { ...DEFAULT_SCHEDULE[day.key], enabled: false };
        }
        setSchedule(savedSchedule);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      // Settings may not exist yet, use defaults
      setFormData({
        circle_approval_mode: 'both_parents',
        enforce_availability: true,
        require_parent_notification: true,
        notify_on_session_start: true,
        notify_on_session_end: true,
        notify_on_aria_flag: true,
        allowed_features: {
          video: true,
          chat: true,
          theater: true,
          arcade: true,
          whiteboard: true,
        },
        max_session_duration_minutes: 60,
        max_daily_sessions: 5,
        max_participants_per_session: 4,
        require_parent_in_call: false,
        allow_child_to_initiate: true,
        record_sessions: false,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!familyFileId) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      const updated = await kidcomsAPI.updateSettings(familyFileId, formData);
      setSettings(updated);
      setSuccessMessage('Settings saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }

  function updateFeature(feature: string, enabled: boolean) {
    setFormData((prev) => ({
      ...prev,
      allowed_features: {
        ...prev.allowed_features,
        [feature]: enabled,
      },
    }));
  }

  function updateScheduleDay(day: string, field: 'start' | 'end' | 'enabled', value: string | boolean) {
    setSchedule((prev) => {
      const updated = {
        ...prev,
        [day]: { ...prev[day], [field]: value },
      };
      // Sync to formData: only include enabled days
      const apiSchedule: Record<string, { start: string; end: string }> = {};
      for (const [k, v] of Object.entries(updated)) {
        if (v.enabled) {
          apiSchedule[k] = { start: v.start, end: v.end };
        }
      }
      setFormData((prevForm) => ({
        ...prevForm,
        availability_schedule: Object.keys(apiSchedule).length > 0 ? apiSchedule : null,
      }));
      return updated;
    });
  }

  if (!familyFileId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center p-8">
          <Settings className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">No family file selected</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button aria-label="Previous"
                onClick={() => router.push(`/kidcoms?case=${familyFileId}`)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-foreground">KidSpace Settings</h1>
                <p className="text-sm text-muted-foreground">Parental controls and preferences</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Save</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400">
            {successMessage}
          </div>
        )}

        {/* Circle Approval */}
        <section className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
              <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Circle Approval</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            How should circle contacts be approved?
          </p>
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="approval_mode"
                checked={formData.circle_approval_mode === 'both_parents'}
                onChange={() =>
                  setFormData((prev) => ({ ...prev, circle_approval_mode: 'both_parents' }))
                }
                className="w-4 h-4 text-purple-600"
              />
              <div>
                <span className="font-medium text-foreground">Both parents must approve</span>
                <p className="text-sm text-muted-foreground">Recommended for maximum safety</p>
              </div>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="approval_mode"
                checked={formData.circle_approval_mode === 'either_parent'}
                onChange={() =>
                  setFormData((prev) => ({ ...prev, circle_approval_mode: 'either_parent' }))
                }
                className="w-4 h-4 text-purple-600"
              />
              <div>
                <span className="font-medium text-foreground">Either parent can approve</span>
                <p className="text-sm text-muted-foreground">More flexible, faster approval</p>
              </div>
            </label>
          </div>
        </section>

        {/* Allowed Features */}
        <section className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Video className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Allowed Features</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Which features can your child use during sessions?
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'video', label: 'Video Calls', icon: Video, color: 'text-purple-600 dark:text-purple-400' },
              { key: 'chat', label: 'Chat', icon: MessageCircle, color: 'text-blue-600 dark:text-blue-400' },
              { key: 'theater', label: 'Theater', icon: Film, color: 'text-pink-600 dark:text-pink-400' },
              { key: 'arcade', label: 'Arcade', icon: Gamepad2, color: 'text-green-600 dark:text-green-400' },
              { key: 'whiteboard', label: 'Whiteboard', icon: PenTool, color: 'text-orange-600 dark:text-orange-400' },
            ].map((feature) => {
              const Icon = feature.icon;
              const isEnabled = formData.allowed_features?.[feature.key as keyof typeof formData.allowed_features] ?? true;
              return (
                <label
                  key={feature.key}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isEnabled
                      ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700'
                      : 'bg-muted border-border'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => updateFeature(feature.key, e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <Icon className={`h-5 w-5 ${feature.color}`} />
                  <span className="font-medium text-foreground">{feature.label}</span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Session Limits */}
        <section className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Session Limits</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Max Duration (minutes)
              </label>
              <input
                type="number"
                min={15}
                max={180}
                value={formData.max_session_duration_minutes || 60}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    max_session_duration_minutes: parseInt(e.target.value) || 60,
                  }))
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Max Daily Sessions
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={formData.max_daily_sessions || 5}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    max_daily_sessions: parseInt(e.target.value) || 5,
                  }))
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Max Participants
              </label>
              <input
                type="number"
                min={2}
                max={10}
                value={formData.max_participants_per_session || 4}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    max_participants_per_session: parseInt(e.target.value) || 4,
                  }))
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
              />
            </div>
          </div>
        </section>

        {/* Parental Controls */}
        <section className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Parental Controls</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">Allow child to start sessions</span>
                <p className="text-sm text-muted-foreground">
                  If disabled, only parents can initiate calls
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.allow_child_to_initiate ?? true}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    allow_child_to_initiate: e.target.checked,
                  }))
                }
                className="w-5 h-5 text-purple-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">Require parent in call</span>
                <p className="text-sm text-muted-foreground">
                  A parent must be present during all sessions
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.require_parent_in_call ?? false}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    require_parent_in_call: e.target.checked,
                  }))
                }
                className="w-5 h-5 text-purple-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">Enforce availability schedule</span>
                <p className="text-sm text-muted-foreground">
                  Only allow sessions during set hours
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.enforce_availability ?? true}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    enforce_availability: e.target.checked,
                  }))
                }
                className="w-5 h-5 text-purple-600 rounded"
              />
            </label>

            {/* Availability Schedule Picker — shown when enforcement is on */}
            {formData.enforce_availability && (
              <div className="ml-1 pl-4 border-l-2 border-purple-200 dark:border-purple-800 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Allowed hours per day
                </p>
                {DAYS_OF_WEEK.map((day) => {
                  const daySchedule = schedule[day.key];
                  return (
                    <div key={day.key} className="flex items-center gap-3">
                      <label className="flex items-center gap-2 w-16 shrink-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={daySchedule.enabled}
                          onChange={(e) => updateScheduleDay(day.key, 'enabled', e.target.checked)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span className={`text-sm font-medium ${daySchedule.enabled ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                          {day.label}
                        </span>
                      </label>
                      {daySchedule.enabled ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={daySchedule.start}
                            onChange={(e) => updateScheduleDay(day.key, 'start', e.target.value)}
                            className="px-2 py-1 text-sm border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                          />
                          <span className="text-muted-foreground text-xs">to</span>
                          <input
                            type="time"
                            value={daySchedule.end}
                            onChange={(e) => updateScheduleDay(day.key, 'end', e.target.value)}
                            className="px-2 py-1 text-sm border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No sessions allowed</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">Record sessions</span>
                <p className="text-sm text-muted-foreground">
                  Save recordings for parental review
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.record_sessions ?? false}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    record_sessions: e.target.checked,
                  }))
                }
                className="w-5 h-5 text-purple-600 rounded"
              />
            </label>
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
              <Bell className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">Notify when session starts</span>
                <p className="text-sm text-muted-foreground">
                  Get notified when your child joins a call
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.notify_on_session_start ?? true}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    notify_on_session_start: e.target.checked,
                  }))
                }
                className="w-5 h-5 text-purple-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">Notify when session ends</span>
                <p className="text-sm text-muted-foreground">
                  Get notified when a call is completed
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.notify_on_session_end ?? true}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    notify_on_session_end: e.target.checked,
                  }))
                }
                className="w-5 h-5 text-purple-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">Notify on ARIA flags</span>
                <p className="text-sm text-muted-foreground">
                  Get alerted if chat content is flagged
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.notify_on_aria_flag ?? true}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    notify_on_aria_flag: e.target.checked,
                  }))
                }
                className="w-5 h-5 text-purple-600 rounded"
              />
            </label>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function KidComsSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
