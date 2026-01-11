'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Settings,
  ChevronLeft,
  Loader2,
  Video,
  MessageCircle,
  Film,
  Gamepad2,
  PenTool,
  Bell,
  Clock,
  Users,
  Shield,
  Save,
} from 'lucide-react';
import { kidcomsAPI, familyFilesAPI, KidComsSettings, KidComsSettingsUpdate } from '@/lib/api';
import { Navigation } from '@/components/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { PageContainer } from '@/components/layout';
import {
  CGCard,
  CGCardHeader,
  CGCardTitle,
  CGCardContent,
  CGButton,
} from '@/components/cg';
import { Sparkles } from 'lucide-react';

export default function KidComsSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const familyFileId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [familyTitle, setFamilyTitle] = useState<string>('');
  const [settings, setSettings] = useState<KidComsSettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, [familyFileId]);

  async function loadSettings() {
    try {
      setIsLoading(true);
      setError(null);

      const [settingsData, familyData] = await Promise.all([
        kidcomsAPI.getSettings(familyFileId),
        familyFilesAPI.get(familyFileId),
      ]);

      setSettings(settingsData);
      setFamilyTitle(familyData.title);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!settings) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const updateData: KidComsSettingsUpdate = {
        circle_approval_mode: settings.circle_approval_mode,
        enforce_availability: settings.enforce_availability,
        require_parent_notification: settings.require_parent_notification,
        notify_on_session_start: settings.notify_on_session_start,
        notify_on_session_end: settings.notify_on_session_end,
        notify_on_aria_flag: settings.notify_on_aria_flag,
        allowed_features: settings.allowed_features,
        max_session_duration_minutes: settings.max_session_duration_minutes,
        max_daily_sessions: settings.max_daily_sessions,
        max_participants_per_session: settings.max_participants_per_session,
        require_parent_in_call: settings.require_parent_in_call,
        allow_child_to_initiate: settings.allow_child_to_initiate,
        record_sessions: settings.record_sessions,
      };

      const updated = await kidcomsAPI.updateSettings(familyFileId, updateData);
      setSettings(updated);
      setSuccess('Settings saved successfully');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }

  function updateFeature(feature: keyof KidComsSettings['allowed_features'], value: boolean) {
    if (!settings) return;
    setSettings({
      ...settings,
      allowed_features: {
        ...settings.allowed_features,
        [feature]: value,
      },
    });
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-cg-background">
          <Navigation />
          <div className="flex flex-col items-center justify-center pt-32">
            <div className="w-16 h-16 rounded-full bg-cg-sage-subtle flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-cg-sage animate-pulse" />
            </div>
            <p className="mt-4 text-muted-foreground font-medium">Loading Settings...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!settings) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-cg-background">
          <Navigation />
          <div className="flex flex-col items-center justify-center pt-32">
            <p className="text-muted-foreground">Failed to load settings</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-cg-background pb-20 lg:pb-0">
        <Navigation />

        <PageContainer>
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cg-sage-subtle flex items-center justify-center">
                <Settings className="h-5 w-5 text-cg-sage" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">KidComs Settings</h1>
                <p className="text-sm text-muted-foreground">{familyTitle}</p>
              </div>
            </div>
            <CGButton
              onClick={handleSave}
              disabled={isSaving}
              variant="primary"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </CGButton>
          </div>

          {error && (
            <CGCard variant="default" className="mb-6 border-cg-error/30 bg-cg-error-subtle">
              <CGCardContent className="py-4">
                <p className="text-cg-error font-medium">{error}</p>
              </CGCardContent>
            </CGCard>
          )}

          {success && (
            <CGCard variant="default" className="mb-6 border-cg-success/30 bg-cg-success-subtle">
              <CGCardContent className="py-4">
                <p className="text-cg-success font-medium">{success}</p>
              </CGCardContent>
            </CGCard>
          )}

          <div className="space-y-6">

          {/* Circle Approval */}
          <CGCard variant="elevated">
            <CGCardHeader>
              <CGCardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-cg-sage" />
                Circle Approval
              </CGCardTitle>
            </CGCardHeader>
            <CGCardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Control how circle contacts are approved for video calls
              </p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="approval_mode"
                    checked={settings.circle_approval_mode === 'both_parents'}
                    onChange={() => setSettings({ ...settings, circle_approval_mode: 'both_parents' })}
                    className="text-cg-sage"
                  />
                  <div>
                    <p className="font-medium text-foreground">Both Parents Required</p>
                    <p className="text-sm text-muted-foreground">Both parents must approve each contact</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="approval_mode"
                    checked={settings.circle_approval_mode === 'either_parent'}
                    onChange={() => setSettings({ ...settings, circle_approval_mode: 'either_parent' })}
                    className="text-cg-sage"
                  />
                  <div>
                    <p className="font-medium text-foreground">Either Parent</p>
                    <p className="text-sm text-muted-foreground">One parent approval is sufficient</p>
                  </div>
                </label>
              </div>
            </CGCardContent>
          </CGCard>

          {/* Features */}
          <CGCard variant="elevated">
            <CGCardHeader>
              <CGCardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-cg-sage" />
                Allowed Features
              </CGCardTitle>
            </CGCardHeader>
            <CGCardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Enable or disable KidComs features for your family
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: 'video', label: 'Video Calls', icon: Video },
                  { key: 'chat', label: 'Chat', icon: MessageCircle },
                  { key: 'theater', label: 'Theater', icon: Film },
                  { key: 'arcade', label: 'Arcade', icon: Gamepad2 },
                  { key: 'whiteboard', label: 'Whiteboard', icon: PenTool },
                ].map(({ key, label, icon: Icon }) => (
                  <label
                    key={key}
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      settings.allowed_features[key as keyof typeof settings.allowed_features]
                        ? 'border-cg-sage bg-cg-sage-subtle'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={settings.allowed_features[key as keyof typeof settings.allowed_features]}
                      onChange={(e) => updateFeature(key as keyof typeof settings.allowed_features, e.target.checked)}
                      className="text-cg-sage rounded"
                    />
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{label}</span>
                  </label>
                ))}
              </div>
            </CGCardContent>
          </CGCard>

          {/* Session Limits */}
          <CGCard variant="elevated">
            <CGCardHeader>
              <CGCardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-cg-sage" />
                Session Limits
              </CGCardTitle>
            </CGCardHeader>
            <CGCardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Max Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.max_session_duration_minutes}
                    onChange={(e) => setSettings({ ...settings, max_session_duration_minutes: parseInt(e.target.value) || 60 })}
                    min={15}
                    max={180}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-cg-sage focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Max Daily Sessions
                  </label>
                  <input
                    type="number"
                    value={settings.max_daily_sessions}
                    onChange={(e) => setSettings({ ...settings, max_daily_sessions: parseInt(e.target.value) || 5 })}
                    min={1}
                    max={20}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-cg-sage focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    value={settings.max_participants_per_session}
                    onChange={(e) => setSettings({ ...settings, max_participants_per_session: parseInt(e.target.value) || 4 })}
                    min={2}
                    max={10}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-cg-sage focus:border-transparent"
                  />
                </div>
              </div>
            </CGCardContent>
          </CGCard>

          {/* Parental Controls */}
          <CGCard variant="elevated">
            <CGCardHeader>
              <CGCardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-cg-sage" />
                Parental Controls
              </CGCardTitle>
            </CGCardHeader>
            <CGCardContent>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Allow Child to Initiate Calls</p>
                    <p className="text-sm text-muted-foreground">Children can start video calls themselves</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.allow_child_to_initiate}
                    onChange={(e) => setSettings({ ...settings, allow_child_to_initiate: e.target.checked })}
                    className="text-cg-sage rounded h-5 w-5"
                  />
                </label>
                <label className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Require Parent in Call</p>
                    <p className="text-sm text-muted-foreground">A parent must be present during calls</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.require_parent_in_call}
                    onChange={(e) => setSettings({ ...settings, require_parent_in_call: e.target.checked })}
                    className="text-cg-sage rounded h-5 w-5"
                  />
                </label>
                <label className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Record Sessions</p>
                    <p className="text-sm text-muted-foreground">Automatically record all video sessions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.record_sessions}
                    onChange={(e) => setSettings({ ...settings, record_sessions: e.target.checked })}
                    className="text-cg-sage rounded h-5 w-5"
                  />
                </label>
              </div>
            </CGCardContent>
          </CGCard>

          {/* Notifications */}
          <CGCard variant="elevated">
            <CGCardHeader>
              <CGCardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-cg-sage" />
                Notifications
              </CGCardTitle>
            </CGCardHeader>
            <CGCardContent>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Session Started</p>
                    <p className="text-sm text-muted-foreground">Notify when a session begins</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notify_on_session_start}
                    onChange={(e) => setSettings({ ...settings, notify_on_session_start: e.target.checked })}
                    className="text-cg-sage rounded h-5 w-5"
                  />
                </label>
                <label className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Session Ended</p>
                    <p className="text-sm text-muted-foreground">Notify when a session ends</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notify_on_session_end}
                    onChange={(e) => setSettings({ ...settings, notify_on_session_end: e.target.checked })}
                    className="text-cg-sage rounded h-5 w-5"
                  />
                </label>
                <label className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">ARIA Flags</p>
                    <p className="text-sm text-muted-foreground">Notify when ARIA flags a message</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notify_on_aria_flag}
                    onChange={(e) => setSettings({ ...settings, notify_on_aria_flag: e.target.checked })}
                    className="text-cg-sage rounded h-5 w-5"
                  />
                </label>
              </div>
            </CGCardContent>
          </CGCard>
          </div>
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}
