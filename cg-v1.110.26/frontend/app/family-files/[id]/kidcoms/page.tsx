'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Video,
  Users,
  Settings,
  Plus,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  MessageCircle,
  Film,
  Gamepad2,
  PenTool,
  ArrowLeft,
  Heart,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import {
  circleAPI,
  kidcomsAPI,
  familyFilesAPI,
  CircleContact,
  KidComsSession,
  KidComsSettings,
} from '@/lib/api';
import { IncomingCallBanner } from '@/components/kidcoms/incoming-call-banner';
import { Navigation } from '@/components/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { PageContainer } from '@/components/layout';
import { cn } from '@/lib/utils';
import { FeatureGate } from '@/components/feature-gate';

/* =============================================================================
   KidSpace Page - Video Communication Hub for Children
   Purple-accented design for the video/communication features
   ============================================================================= */

interface Child {
  id: string;
  first_name: string;
  preferred_name?: string;
  photo_url?: string;
}

export default function KidComsPage() {
  const params = useParams();
  const router = useRouter();
  const familyFileId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [familyTitle, setFamilyTitle] = useState<string>('');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [contacts, setContacts] = useState<CircleContact[]>([]);
  const [sessions, setSessions] = useState<KidComsSession[]>([]);
  const [settings, setSettings] = useState<KidComsSettings | null>(null);
  const [isStartingSession, setIsStartingSession] = useState(false);

  useEffect(() => {
    loadData();
  }, [familyFileId]);

  useEffect(() => {
    if (selectedChild && familyFileId) {
      loadChildData();
    }
  }, [selectedChild?.id]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      const familyData = await familyFilesAPI.get(familyFileId);
      setFamilyTitle(familyData.title);
      setChildren(familyData.children || []);

      if (familyData.children && familyData.children.length > 0) {
        setSelectedChild(familyData.children[0]);
      }

      try {
        const settingsData = await kidcomsAPI.getSettings(familyFileId);
        setSettings(settingsData);
      } catch {
        // Settings may not exist yet
      }

      const sessionsData = await kidcomsAPI.listSessions(familyFileId, { limit: 10 });
      setSessions(sessionsData.items);
    } catch (err) {
      console.error('Error loading KidComs data:', err);
      setError('Failed to load KidSpace data');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadChildData() {
    if (!selectedChild || !familyFileId) return;

    try {
      const contactsData = await circleAPI.list(familyFileId, {
        childId: selectedChild.id,
      });
      setContacts(contactsData.items);
    } catch (err) {
      console.error('Error loading child data:', err);
    }
  }

  async function startVideoCall(contactId?: string) {
    if (!selectedChild || !familyFileId) return;

    try {
      setIsStartingSession(true);
      const session = await kidcomsAPI.createSession({
        family_file_id: familyFileId,
        child_id: selectedChild.id,
        session_type: 'video_call',
        invited_contact_ids: contactId ? [contactId] : undefined,
      });

      router.push(`/family-files/${familyFileId}/kidcoms/session/${session.id}`);
    } catch (err) {
      console.error('Error starting session:', err);
      setError('Failed to start video call');
    } finally {
      setIsStartingSession(false);
    }
  }

  async function startVoiceCall(contactId?: string) {
    if (!selectedChild || !familyFileId) return;

    try {
      setIsStartingSession(true);
      const session = await kidcomsAPI.createSession({
        family_file_id: familyFileId,
        child_id: selectedChild.id,
        session_type: 'voice_call',
        invited_contact_ids: contactId ? [contactId] : undefined,
      });

      router.push(`/family-files/${familyFileId}/kidcoms/session/${session.id}?mode=voice`);
    } catch (err) {
      console.error('Error starting session:', err);
      setError('Failed to start voice call');
    } finally {
      setIsStartingSession(false);
    }
  }

  function getSessionStatusBadge(status: string) {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">Active</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-foreground text-xs font-medium border border-border">Completed</span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium border border-red-200">Cancelled</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">Waiting</span>;
    }
  }

  function getSessionTypeIcon(type: string) {
    switch (type) {
      case 'theater':
        return <Film className="h-4 w-4" />;
      case 'arcade':
        return <Gamepad2 className="h-4 w-4" />;
      case 'whiteboard':
        return <PenTool className="h-4 w-4" />;
      case 'voice_call':
        return <Phone className="h-4 w-4" />;
      default:
        return <Video className="h-4 w-4" />;
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background pb-20 lg:pb-0">
          <Navigation />
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-14 h-14 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            <p className="mt-4 text-muted-foreground font-medium">Loading KidSpace...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <Navigation />

        <PageContainer background="transparent">
          {/* Feature Gate - Complete tier only */}
          <FeatureGate
            feature="kidcoms_access"
            title="KidSpace Video Calls"
            description="Connect with your children through secure video calls with ARIA monitoring, circle management, and theater mode. Available with Complete subscription."
            icon={Video}
          >
            {/* Incoming Call Banner */}
            <IncomingCallBanner familyFileId={familyFileId} />

            {/* Page Header */}
            <div className="flex items-start gap-4 mb-8">
            <button
              onClick={() => router.push(`/family-files/${familyFileId}`)}
              className="w-10 h-10 rounded-lg hover:bg-muted flex items-center justify-center transition-colors mt-1"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 flex items-center justify-center shadow-md">
                  <Video className="h-6 w-6 text-purple-600" />
                </div>
                KidComs
              </h1>
              <p className="text-muted-foreground font-medium mt-1">
                Safe video communication for {familyTitle}
              </p>
            </div>
            <button
              onClick={() => router.push(`/family-files/${familyFileId}/kidcoms/settings`)}
              className="cg-btn-secondary flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Child Selection & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Child Selector */}
            {children.length > 0 && (
              <div className="bg-card border-2 border-border rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Select Child</h2>
                <div className="space-y-2">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedChild(child)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl transition-all border-2',
                        selectedChild?.id === child.id
                          ? 'bg-purple-50 border-purple-300 shadow-sm'
                          : 'bg-muted border-border hover:border-border'
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                        selectedChild?.id === child.id
                          ? 'bg-purple-500 text-white'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {(child.preferred_name || child.first_name).charAt(0)}
                      </div>
                      <span className="font-bold text-foreground">
                        {child.preferred_name || child.first_name}
                      </span>
                      {selectedChild?.id === child.id && (
                        <CheckCircle className="h-5 w-5 text-purple-600 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-card border-2 border-border rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => startVideoCall()}
                  disabled={!selectedChild || isStartingSession}
                  className={cn(
                    'flex flex-col items-center p-4 rounded-xl transition-all border-2',
                    'bg-purple-50 border-purple-200 hover:border-purple-300 hover:shadow-md active:scale-95',
                    'disabled:opacity-50 disabled:hover:border-purple-200 disabled:active:scale-100'
                  )}
                >
                  {isStartingSession ? (
                    <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                  ) : (
                    <Video className="h-8 w-8 text-purple-600" />
                  )}
                  <span className="mt-2 text-sm font-bold text-purple-700">Video Call</span>
                </button>
                <button
                  onClick={() => startVoiceCall()}
                  disabled={!selectedChild || isStartingSession}
                  className={cn(
                    'flex flex-col items-center p-4 rounded-xl transition-all border-2',
                    'bg-blue-50 border-blue-200 hover:border-blue-300 hover:shadow-md active:scale-95',
                    'disabled:opacity-50 disabled:hover:border-blue-200 disabled:active:scale-100'
                  )}
                >
                  {isStartingSession ? (
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                  ) : (
                    <Phone className="h-8 w-8 text-blue-600" />
                  )}
                  <span className="mt-2 text-sm font-bold text-blue-700">Voice Call</span>
                </button>
                <button
                  onClick={() => router.push(`/family-files/${familyFileId}/my-circle`)}
                  className={cn(
                    'flex flex-col items-center p-4 rounded-xl transition-all border-2',
                    'bg-teal-50 border-teal-200 hover:border-teal-300 hover:shadow-md active:scale-95'
                  )}
                >
                  <Heart className="h-8 w-8 text-teal-600" />
                  <span className="mt-2 text-sm font-bold text-teal-700">My Circle</span>
                </button>
                <button
                  disabled
                  className="flex flex-col items-center p-4 border-2 border-border bg-muted rounded-xl opacity-50 cursor-not-allowed"
                >
                  <MessageCircle className="h-8 w-8 text-muted-foreground" />
                  <span className="mt-2 text-sm font-bold text-muted-foreground">Chat</span>
                </button>
              </div>
            </div>
          </div>

          {/* Center Column - Circle Contacts */}
          <div className="lg:col-span-1">
            <div className="bg-card border-2 border-border rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  <Heart className="h-5 w-5 text-teal-500" />
                  My Circle
                </h2>
                <button
                  onClick={() => router.push(`/family-files/${familyFileId}/my-circle?tab=contacts`)}
                  className="text-sm text-[#2C5F5D] hover:text-[#1a4746] font-medium flex items-center gap-1"
                >
                  <Settings className="h-4 w-4" />
                  Manage
                </button>
              </div>
              {contacts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-teal-500" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>No circle contacts yet</h3>
                  <p className="text-muted-foreground mb-4">Add trusted contacts to your circle</p>
                  <button
                    onClick={() => router.push(`/family-files/${familyFileId}/my-circle`)}
                    className="cg-btn-primary flex items-center gap-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Add Contacts
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted hover:bg-muted transition-colors border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center font-bold text-teal-700">
                          {contact.contact_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{contact.contact_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {contact.relationship_type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {contact.can_communicate ? (
                          <button
                            onClick={() => startVideoCall(contact.id)}
                            disabled={isStartingSession}
                            className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Phone className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">Pending</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Recent Sessions */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card border-2 border-border rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                <Clock className="h-5 w-5 text-muted-foreground" />
                Recent Sessions
              </h2>
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-1 font-medium">No sessions yet</p>
                  <p className="text-xs text-muted-foreground">Start a video call to see it here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        if (session.status === 'active' || session.status === 'waiting') {
                          router.push(`/family-files/${familyFileId}/kidcoms/session/${session.id}`);
                        }
                      }}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-xl transition-all border-2',
                        session.status === 'active' || session.status === 'waiting'
                          ? 'bg-purple-50 border-purple-200 hover:border-purple-300 cursor-pointer'
                          : 'bg-muted border-border cursor-default'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
                          {getSessionTypeIcon(session.session_type)}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-foreground">
                            {session.title || 'Video Call'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.started_at
                              ? new Date(session.started_at).toLocaleDateString()
                              : 'Scheduled'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSessionStatusBadge(session.status)}
                        {(session.status === 'active' || session.status === 'waiting') && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Feature Status */}
            {settings && (
              <div className="bg-card border-2 border-border rounded-2xl shadow-lg p-6">
                <h2 className="text-base font-bold text-foreground mb-4" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Enabled Features</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      settings.allowed_features.video ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                    )} />
                    <span className="text-sm text-foreground font-medium">Video</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      settings.allowed_features.chat ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                    )} />
                    <span className="text-sm text-foreground font-medium">Chat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      settings.allowed_features.theater ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                    )} />
                    <span className="text-sm text-foreground font-medium">Theater</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      settings.allowed_features.arcade ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                    )} />
                    <span className="text-sm text-foreground font-medium">Arcade</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
          </FeatureGate>
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}
