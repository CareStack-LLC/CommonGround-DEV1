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

  if (!familyFileId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <Settings className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No family file selected</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/kidcoms?case=${familyFileId}`)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">KidComs Settings</h1>
                <p className="text-sm text-gray-500">Parental controls and preferences</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
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
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}

        {/* Circle Approval */}
        <section className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold">Circle Approval</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
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
                <span className="font-medium">Both parents must approve</span>
                <p className="text-sm text-gray-500">Recommended for maximum safety</p>
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
                <span className="font-medium">Either parent can approve</span>
                <p className="text-sm text-gray-500">More flexible, faster approval</p>
              </div>
            </label>
          </div>
        </section>

        {/* Allowed Features */}
        <section className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Video className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold">Allowed Features</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Which features can your child use during sessions?
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'video', label: 'Video Calls', icon: Video, color: 'text-purple-600' },
              { key: 'chat', label: 'Chat', icon: MessageCircle, color: 'text-blue-600' },
              { key: 'theater', label: 'Theater', icon: Film, color: 'text-pink-600' },
              { key: 'arcade', label: 'Arcade', icon: Gamepad2, color: 'text-green-600' },
              { key: 'whiteboard', label: 'Whiteboard', icon: PenTool, color: 'text-orange-600' },
            ].map((feature) => {
              const Icon = feature.icon;
              const isEnabled = formData.allowed_features?.[feature.key as keyof typeof formData.allowed_features] ?? true;
              return (
                <label
                  key={feature.key}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isEnabled
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => updateFeature(feature.key, e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <Icon className={`h-5 w-5 ${feature.color}`} />
                  <span className="font-medium">{feature.label}</span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Session Limits */}
        <section className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <h2 className="text-lg font-semibold">Session Limits</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </section>

        {/* Parental Controls */}
        <section className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold">Parental Controls</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium">Allow child to start sessions</span>
                <p className="text-sm text-gray-500">
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
                <span className="font-medium">Require parent in call</span>
                <p className="text-sm text-gray-500">
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
                <span className="font-medium">Enforce availability schedule</span>
                <p className="text-sm text-gray-500">
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
            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium">Record sessions</span>
                <p className="text-sm text-gray-500">
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
        <section className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <Bell className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium">Notify when session starts</span>
                <p className="text-sm text-gray-500">
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
                <span className="font-medium">Notify when session ends</span>
                <p className="text-sm text-gray-500">
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
                <span className="font-medium">Notify on ARIA flags</span>
                <p className="text-sm text-gray-500">
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
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
