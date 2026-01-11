'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  FolderHeart,
  Sparkles,
} from 'lucide-react';
import {
  circleAPI,
  kidcomsAPI,
  familyFilesAPI,
  CircleContact,
  KidComsSession,
  KidComsSettings,
} from '@/lib/api';
import { Navigation } from '@/components/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { PageContainer } from '@/components/layout';

interface Child {
  id: string;
  first_name: string;
  preferred_name?: string;
  photo_url?: string;
}

interface FamilyFile {
  id: string;
  title: string;
  family_file_number: string;
  status: string;
  children?: Child[];
}

function KidComsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyFileId = searchParams.get('case');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [familyFiles, setFamilyFiles] = useState<FamilyFile[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [contacts, setContacts] = useState<CircleContact[]>([]);
  const [sessions, setSessions] = useState<KidComsSession[]>([]);
  const [settings, setSettings] = useState<KidComsSettings | null>(null);
  const [isStartingSession, setIsStartingSession] = useState(false);

  // Load family files if none selected, otherwise load family file data
  useEffect(() => {
    if (familyFileId) {
      loadData();
    } else {
      loadFamilyFiles();
    }
  }, [familyFileId]);

  async function loadFamilyFiles() {
    try {
      setIsLoading(true);
      setError(null);
      const response = await familyFilesAPI.list();
      setFamilyFiles(response.items || []);
    } catch (err) {
      console.error('Error loading family files:', err);
      setError('Failed to load family files');
    } finally {
      setIsLoading(false);
    }
  }

  function selectFamilyFile(id: string) {
    router.push(`/kidcoms?case=${id}`);
  }

  // Load child-specific data when child is selected
  useEffect(() => {
    if (selectedChild && familyFileId) {
      loadChildData();
    }
  }, [selectedChild?.id]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      // Load family file to get children
      const familyData = await familyFilesAPI.get(familyFileId!);
      setChildren(familyData.children || []);

      if (familyData.children && familyData.children.length > 0) {
        setSelectedChild(familyData.children[0]);
      }

      // Load settings
      try {
        const settingsData = await kidcomsAPI.getSettings(familyFileId!);
        setSettings(settingsData);
      } catch {
        // Settings may not exist yet
      }

      // Load recent sessions
      const sessionsData = await kidcomsAPI.listSessions(familyFileId!, { limit: 10 });
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
      // Load circle contacts for this child
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

      // Navigate to the session
      router.push(`/kidcoms/${session.id}?case=${familyFileId}`);
    } catch (err) {
      console.error('Error starting session:', err);
      setError('Failed to start video call');
    } finally {
      setIsStartingSession(false);
    }
  }

  function getSessionStatusIcon(status: string) {
    switch (status) {
      case 'active':
        return <Phone className="h-4 w-4 text-cg-success animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-cg-error" />;
      default:
        return <Clock className="h-4 w-4 text-cg-amber" />;
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
      default:
        return <Video className="h-4 w-4" />;
    }
  }

  if (!familyFileId) {
    return (
      <div className="min-h-screen bg-cg-background pb-20 lg:pb-0">
        <Navigation />
        <PageContainer>
          <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Video className="h-5 w-5 text-purple-600" />
                  </div>
                  <h1 className="text-2xl font-semibold text-foreground">KidComs</h1>
                </div>
                <p className="text-muted-foreground ml-[52px]">Safe video calls with your circle</p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-cg-error-subtle border border-cg-error/20 rounded-xl">
                <XCircle className="h-5 w-5 text-cg-error flex-shrink-0" />
                <p className="text-sm text-cg-error">{error}</p>
              </div>
            )}

            {/* Select Family File */}
            <div className="cg-card-elevated p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                <FolderHeart className="h-10 w-10 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Select a Family File</h2>
              <p className="text-muted-foreground mb-6">Choose a family file to access KidComs features</p>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : familyFiles.length === 0 ? (
                <div className="py-4">
                  <p className="text-muted-foreground mb-4">You don&apos;t have any family files yet.</p>
                  <button
                    onClick={() => router.push('/family-files/new')}
                    className="cg-btn-primary"
                  >
                    Create Family File
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 text-left max-w-2xl mx-auto">
                  {familyFiles.map((ff) => (
                    <button
                      key={ff.id}
                      onClick={() => selectFamilyFile(ff.id)}
                      className="cg-card p-5 text-left hover:border-purple-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground mb-1 group-hover:text-purple-600 transition-colors">{ff.title}</h3>
                          <p className="text-sm text-muted-foreground">{ff.family_file_number}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          ff.status === 'active'
                            ? 'bg-cg-success-subtle text-cg-success'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {ff.status}
                        </span>
                      </div>
                      {ff.children && ff.children.length > 0 && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>
                            {ff.children.length} {ff.children.length === 1 ? 'child' : 'children'}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </PageContainer>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cg-background pb-20 lg:pb-0">
        <Navigation />
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-purple-500 animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-muted-foreground font-medium">Loading KidComs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cg-background pb-20 lg:pb-0">
      <Navigation />
      <PageContainer>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Video className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">KidComs</h1>
                <p className="text-muted-foreground text-sm">Safe video calls with your circle</p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/kidcoms/settings?case=${familyFileId}`)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-cg-error-subtle border border-cg-error/20 rounded-xl">
              <XCircle className="h-5 w-5 text-cg-error flex-shrink-0" />
              <p className="text-sm text-cg-error">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Child Selection & Quick Actions */}
            <div className="lg:col-span-1 space-y-6">
              {/* Child Selector */}
              {children.length > 0 && (
                <div className="cg-card p-5">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Select Child</h3>
                  <div className="space-y-2">
                    {children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => setSelectedChild(child)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                          selectedChild?.id === child.id
                            ? 'bg-purple-50 border-2 border-purple-400 shadow-sm'
                            : 'bg-muted/30 hover:bg-muted/50 border-2 border-transparent'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                          {(child.preferred_name || child.first_name)[0]}
                        </div>
                        <span className="font-medium text-foreground">
                          {child.preferred_name || child.first_name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="cg-card p-5">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => startVideoCall()}
                    disabled={!selectedChild || isStartingSession}
                    className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isStartingSession ? (
                      <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                    ) : (
                      <Video className="h-8 w-8 text-purple-600" />
                    )}
                    <span className="mt-2 text-sm font-medium text-purple-700">Video Call</span>
                  </button>
                  <button
                    disabled
                    className="flex flex-col items-center p-4 bg-muted/50 rounded-xl opacity-50 cursor-not-allowed"
                  >
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                    <span className="mt-2 text-sm font-medium text-muted-foreground">Chat</span>
                  </button>
                  <button
                    disabled
                    className="flex flex-col items-center p-4 bg-muted/50 rounded-xl opacity-50 cursor-not-allowed"
                  >
                    <Film className="h-8 w-8 text-muted-foreground" />
                    <span className="mt-2 text-sm font-medium text-muted-foreground">Theater</span>
                  </button>
                  <button
                    disabled
                    className="flex flex-col items-center p-4 bg-muted/50 rounded-xl opacity-50 cursor-not-allowed"
                  >
                    <Gamepad2 className="h-8 w-8 text-muted-foreground" />
                    <span className="mt-2 text-sm font-medium text-muted-foreground">Arcade</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Center Column - Circle Contacts */}
            <div className="lg:col-span-1">
              <div className="cg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">My Circle</h3>
                  <button
                    onClick={() => router.push(`/kidcoms/circle?case=${familyFileId}`)}
                    className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>

                {contacts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <Users className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-foreground font-medium mb-1">No circle contacts yet</p>
                    <p className="text-sm text-muted-foreground">
                      Add trusted contacts to start video calls
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-cg-sage-subtle flex items-center justify-center text-cg-sage font-semibold">
                            {contact.contact_name[0]}
                          </div>
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
                              className="p-2 bg-cg-success-subtle hover:bg-cg-success/20 rounded-full transition-colors"
                            >
                              <Phone className="h-4 w-4 text-cg-success" />
                            </button>
                          ) : (
                            <span className="text-xs text-cg-amber bg-cg-amber-subtle px-2 py-1 rounded-full font-medium">
                              Pending
                            </span>
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
              <div className="cg-card p-5">
                <h3 className="text-lg font-semibold text-foreground mb-4">Recent Sessions</h3>

                {sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <Clock className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-foreground font-medium mb-1">No sessions yet</p>
                    <p className="text-sm text-muted-foreground">
                      Start a video call to see it here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => {
                          if (session.status === 'active' || session.status === 'waiting') {
                            router.push(`/kidcoms/${session.id}?case=${familyFileId}`);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                          session.status === 'active' || session.status === 'waiting'
                            ? 'bg-purple-50 hover:bg-purple-100 cursor-pointer'
                            : 'bg-muted/30 cursor-default'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
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
                        {getSessionStatusIcon(session.status)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Feature Status */}
              {settings && (
                <div className="cg-card p-5">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Features</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${settings.allowed_features.video ? 'bg-cg-success' : 'bg-muted-foreground/30'}`} />
                      <span className="text-foreground">Video</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${settings.allowed_features.chat ? 'bg-cg-success' : 'bg-muted-foreground/30'}`} />
                      <span className="text-foreground">Chat</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${settings.allowed_features.theater ? 'bg-cg-success' : 'bg-muted-foreground/30'}`} />
                      <span className="text-foreground">Theater</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${settings.allowed_features.arcade ? 'bg-cg-success' : 'bg-muted-foreground/30'}`} />
                      <span className="text-foreground">Arcade</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}

export default function KidComsPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="min-h-screen bg-cg-background">
          <Navigation />
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-purple-500 animate-pulse" />
            </div>
            <p className="mt-4 text-muted-foreground font-medium">Loading KidComs...</p>
          </div>
        </div>
      }>
        <KidComsContent />
      </Suspense>
    </ProtectedRoute>
  );
}
