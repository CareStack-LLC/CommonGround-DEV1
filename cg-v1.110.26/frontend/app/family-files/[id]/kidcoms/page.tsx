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
  ChevronLeft,
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
import {
  CGCard,
  CGCardHeader,
  CGCardTitle,
  CGCardContent,
  CGButton,
  CGBadge,
  CGAvatar,
  CGEmptyState,
} from '@/components/cg';
import { Navigation } from '@/components/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { PageContainer } from '@/components/layout';
import { cn } from '@/lib/utils';

/* =============================================================================
   KidComs Page - Video Communication Hub for Children
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
      setError('Failed to load KidComs data');
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
        return <CGBadge variant="sage">Active</CGBadge>;
      case 'completed':
        return <CGBadge variant="default">Completed</CGBadge>;
      case 'cancelled':
        return <CGBadge variant="error">Cancelled</CGBadge>;
      default:
        return <CGBadge variant="amber">Waiting</CGBadge>;
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
        <div className="min-h-screen bg-cg-background">
          <Navigation />
          <div className="flex flex-col items-center justify-center pt-32">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-cg-sage-subtle flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-cg-sage animate-pulse" />
              </div>
            </div>
            <p className="mt-4 text-muted-foreground font-medium">Loading KidComs...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-cg-background pb-20 lg:pb-0">
        <Navigation />

        {/* Incoming Call Banner */}
        <IncomingCallBanner familyFileId={familyFileId} />

        <PageContainer>
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cg-sage-subtle flex items-center justify-center">
                <Video className="h-5 w-5 text-cg-sage" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">KidComs</h1>
                <p className="text-sm text-muted-foreground">{familyTitle}</p>
              </div>
            </div>
            <CGButton
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/family-files/${familyFileId}/kidcoms/settings`)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </CGButton>
          </div>
        {/* Error */}
        {error && (
          <CGCard variant="default" className="mb-6 border-cg-error/30 bg-cg-error-subtle">
            <CGCardContent className="py-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-cg-error" />
                <p className="text-cg-error font-medium">{error}</p>
              </div>
            </CGCardContent>
          </CGCard>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Child Selection & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Child Selector */}
            {children.length > 0 && (
              <CGCard variant="elevated">
                <CGCardHeader>
                  <CGCardTitle className="text-base">Select Child</CGCardTitle>
                </CGCardHeader>
                <CGCardContent>
                  <div className="space-y-2">
                    {children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => setSelectedChild(child)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
                          selectedChild?.id === child.id
                            ? 'bg-purple-100 ring-2 ring-purple-500'
                            : 'bg-muted/50 hover:bg-muted'
                        )}
                      >
                        <CGAvatar
                          name={child.preferred_name || child.first_name}
                          size="md"
                          color={selectedChild?.id === child.id ? 'sage' : 'slate'}
                        />
                        <span className="font-medium text-foreground">
                          {child.preferred_name || child.first_name}
                        </span>
                        {selectedChild?.id === child.id && (
                          <CheckCircle className="h-5 w-5 text-purple-600 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </CGCardContent>
              </CGCard>
            )}

            {/* Quick Actions */}
            <CGCard variant="elevated">
              <CGCardHeader>
                <CGCardTitle className="text-base">Quick Actions</CGCardTitle>
              </CGCardHeader>
              <CGCardContent>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => startVideoCall()}
                    disabled={!selectedChild || isStartingSession}
                    className={cn(
                      'flex flex-col items-center p-4 rounded-xl transition-all',
                      'bg-purple-50 hover:bg-purple-100 active:scale-95',
                      'disabled:opacity-50 disabled:hover:bg-purple-50 disabled:active:scale-100'
                    )}
                  >
                    {isStartingSession ? (
                      <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                    ) : (
                      <Video className="h-8 w-8 text-purple-600" />
                    )}
                    <span className="mt-2 text-sm font-medium text-purple-700">Video</span>
                  </button>
                  <button
                    onClick={() => startVoiceCall()}
                    disabled={!selectedChild || isStartingSession}
                    className={cn(
                      'flex flex-col items-center p-4 rounded-xl transition-all',
                      'bg-cg-sage-subtle hover:bg-cg-sage/20 active:scale-95',
                      'disabled:opacity-50 disabled:hover:bg-cg-sage-subtle disabled:active:scale-100'
                    )}
                  >
                    {isStartingSession ? (
                      <Loader2 className="h-8 w-8 text-cg-sage animate-spin" />
                    ) : (
                      <Phone className="h-8 w-8 text-cg-sage" />
                    )}
                    <span className="mt-2 text-sm font-medium text-cg-sage">Voice</span>
                  </button>
                  <button
                    disabled
                    className="flex flex-col items-center p-4 bg-muted rounded-xl opacity-50 cursor-not-allowed"
                  >
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                    <span className="mt-2 text-sm font-medium text-muted-foreground">Chat</span>
                  </button>
                </div>
              </CGCardContent>
            </CGCard>
          </div>

          {/* Center Column - Circle Contacts */}
          <div className="lg:col-span-1">
            <CGCard variant="elevated">
              <CGCardHeader className="flex flex-row items-center justify-between">
                <CGCardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-teal-500" />
                  My Circle
                </CGCardTitle>
                <CGButton
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/family-files/${familyFileId}/kidcoms/circle`)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Manage
                </CGButton>
              </CGCardHeader>
              <CGCardContent>
                {contacts.length === 0 ? (
                  <CGEmptyState
                    icon={<Users className="h-6 w-6" />}
                    title="No circle contacts yet"
                    description="Add trusted contacts to your circle"
                    action={{
                      label: "Add Contacts",
                      onClick: () => router.push(`/family-files/${familyFileId}/kidcoms/circle`),
                    }}
                    size="sm"
                  />
                ) : (
                  <div className="space-y-3">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <CGAvatar name={contact.contact_name} size="md" color="sage" />
                          <div>
                            <p className="font-medium text-foreground">{contact.contact_name}</p>
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
                              className="p-2 bg-cg-sage-subtle hover:bg-cg-sage/20 rounded-full transition-colors disabled:opacity-50"
                            >
                              <Phone className="h-4 w-4 text-cg-sage" />
                            </button>
                          ) : (
                            <CGBadge variant="amber">Pending</CGBadge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CGCardContent>
            </CGCard>
          </div>

          {/* Right Column - Recent Sessions */}
          <div className="lg:col-span-1 space-y-6">
            <CGCard variant="elevated">
              <CGCardHeader>
                <CGCardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-cg-slate" />
                  Recent Sessions
                </CGCardTitle>
              </CGCardHeader>
              <CGCardContent>
                {sessions.length === 0 ? (
                  <CGEmptyState
                    icon={<Clock className="h-6 w-6" />}
                    title="No sessions yet"
                    description="Start a video call to see it here"
                    size="sm"
                  />
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
                          'w-full flex items-center justify-between p-3 rounded-xl transition-all',
                          session.status === 'active' || session.status === 'waiting'
                            ? 'bg-purple-50 hover:bg-purple-100 cursor-pointer'
                            : 'bg-muted/50 cursor-default'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center">
                            {getSessionTypeIcon(session.session_type)}
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-foreground">
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
              </CGCardContent>
            </CGCard>

            {/* Feature Status */}
            {settings && (
              <CGCard variant="default">
                <CGCardHeader>
                  <CGCardTitle className="text-base">Features</CGCardTitle>
                </CGCardHeader>
                <CGCardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-2.5 h-2.5 rounded-full',
                        settings.allowed_features.video ? 'bg-cg-sage' : 'bg-muted-foreground/30'
                      )} />
                      <span className="text-sm text-muted-foreground">Video</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-2.5 h-2.5 rounded-full',
                        settings.allowed_features.chat ? 'bg-cg-sage' : 'bg-muted-foreground/30'
                      )} />
                      <span className="text-sm text-muted-foreground">Chat</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-2.5 h-2.5 rounded-full',
                        settings.allowed_features.theater ? 'bg-cg-sage' : 'bg-muted-foreground/30'
                      )} />
                      <span className="text-sm text-muted-foreground">Theater</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-2.5 h-2.5 rounded-full',
                        settings.allowed_features.arcade ? 'bg-cg-sage' : 'bg-muted-foreground/30'
                      )} />
                      <span className="text-sm text-muted-foreground">Arcade</span>
                    </div>
                  </div>
                </CGCardContent>
              </CGCard>
            )}
          </div>
        </div>
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}
