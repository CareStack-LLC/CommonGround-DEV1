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
  ChevronLeft,
  Shield,
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

/**
 * KidComs - Safe Child Communication
 *
 * Design Philosophy: Playful yet secure
 * - Friendly, approachable interface for child communication
 * - Clear parental controls and safety indicators
 * - Professional trust signals for parents
 * - Vibrant but not overwhelming colors
 */

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
        return <Phone className="h-4 w-4 text-emerald-600 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-slate-400" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-amber-600" />;
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
      <div className="min-h-screen bg-gradient-to-br from-[var(--portal-background)] via-[var(--portal-surface)] to-[var(--portal-accent)]/5 pb-20 lg:pb-0">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Page Header */}
            <header className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--portal-primary)] to-[var(--portal-secondary)] flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Video className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">KidComs</h1>
              <p className="text-slate-600">Safe video calls with your circle</p>
            </header>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl max-w-2xl mx-auto">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Select Family File */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center max-w-4xl mx-auto">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-secondary)]/10 flex items-center justify-center mx-auto mb-6">
                <FolderHeart className="h-12 w-12 text-[var(--portal-primary)]" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Select a Family File</h2>
              <p className="text-slate-600 mb-8">Choose a family file to access KidComs features</p>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-12 h-12 border-3 border-[var(--portal-primary)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : familyFiles.length === 0 ? (
                <div className="py-4">
                  <p className="text-slate-600 mb-6">You don't have any family files yet.</p>
                  <button
                    onClick={() => router.push('/family-files/new')}
                    className="
                      inline-flex items-center gap-2 px-6 py-3
                      bg-gradient-to-br from-[var(--portal-primary)] to-[var(--portal-primary-hover)] text-white
                      rounded-xl font-medium shadow-md hover:shadow-lg
                      transition-all duration-200 hover:-translate-y-0.5
                    "
                  >
                    <Plus className="h-4 w-4" />
                    Create Family File
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 text-left">
                  {familyFiles.map((ff) => (
                    <button
                      key={ff.id}
                      onClick={() => selectFamilyFile(ff.id)}
                      className="
                        bg-white border border-slate-200 rounded-2xl p-5 text-left
                        hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all
                        group
                      "
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-[var(--portal-primary)] transition-colors">{ff.title}</h3>
                          <p className="text-sm text-slate-500 font-medium">{ff.family_file_number}</p>
                        </div>
                        <span className={`px-2.5 py-1 text-xs rounded-full font-semibold ${
                          ff.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {ff.status}
                        </span>
                      </div>
                      {ff.children && ff.children.length > 0 && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">
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
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--portal-background)] via-[var(--portal-surface)] to-[var(--portal-accent)]/5 pb-20 lg:pb-0">
        <Navigation />
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--portal-primary)] to-[var(--portal-secondary)] flex items-center justify-center shadow-lg">
              <Sparkles className="h-10 w-10 text-white animate-pulse" />
            </div>
          </div>
          <p className="mt-6 text-slate-600 font-medium">Loading KidComs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--portal-background)] via-[var(--portal-surface)] to-[var(--portal-accent)]/5 pb-24 lg:pb-8">
      <Navigation />

      {/* Page Header */}
      <header className="border-b border-[var(--portal-primary)]/20 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 -ml-2 rounded-xl hover:bg-[var(--portal-primary)]/10 transition-colors"
                aria-label="Go back"
              >
                <ChevronLeft className="h-5 w-5 text-slate-600" />
              </button>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--portal-primary)] to-[var(--portal-secondary)] flex items-center justify-center shadow-md">
                <Video className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">KidComs</h1>
                <p className="text-sm text-slate-600">Safe video calls with your circle</p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/kidcoms/settings?case=${familyFileId}`)}
              className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Child Selection & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Child Selector */}
            {children.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[var(--portal-primary)]" />
                  Select Child
                </h3>
                <div className="space-y-2">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedChild(child)}
                      className={`
                        w-full flex items-center gap-3 p-3 rounded-xl transition-all
                        ${selectedChild?.id === child.id
                          ? 'bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-secondary)]/10 border-2 border-[var(--portal-primary)]/40 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                        }
                      `}
                    >
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--portal-primary)] to-[var(--portal-secondary)] flex items-center justify-center text-white font-bold shadow-md">
                        {(child.preferred_name || child.first_name)[0]}
                      </div>
                      <span className="font-semibold text-slate-900">
                        {child.preferred_name || child.first_name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => startVideoCall()}
                  disabled={!selectedChild || isStartingSession}
                  className="
                    flex flex-col items-center p-4 rounded-xl transition-all
                    bg-gradient-to-br from-[var(--portal-primary)] to-[var(--portal-primary-hover)] text-white
                    hover:shadow-lg hover:-translate-y-0.5
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                  "
                >
                  {isStartingSession ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <Video className="h-8 w-8" />
                  )}
                  <span className="mt-2 text-sm font-semibold">Video Call</span>
                </button>
                <button
                  disabled
                  className="flex flex-col items-center p-4 bg-slate-100 rounded-xl opacity-50 cursor-not-allowed"
                >
                  <MessageCircle className="h-8 w-8 text-slate-400" />
                  <span className="mt-2 text-sm font-medium text-slate-600">Chat</span>
                  <span className="text-xs text-slate-500 mt-0.5">Soon</span>
                </button>
                <button
                  disabled
                  className="flex flex-col items-center p-4 bg-slate-100 rounded-xl opacity-50 cursor-not-allowed"
                >
                  <Film className="h-8 w-8 text-slate-400" />
                  <span className="mt-2 text-sm font-medium text-slate-600">Theater</span>
                  <span className="text-xs text-slate-500 mt-0.5">Soon</span>
                </button>
                <button
                  disabled
                  className="flex flex-col items-center p-4 bg-slate-100 rounded-xl opacity-50 cursor-not-allowed"
                >
                  <Gamepad2 className="h-8 w-8 text-slate-400" />
                  <span className="mt-2 text-sm font-medium text-slate-600">Arcade</span>
                  <span className="text-xs text-slate-500 mt-0.5">Soon</span>
                </button>
              </div>
            </div>
          </div>

          {/* Center Column - Circle Contacts */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">My Circle</h3>
                <button
                  onClick={() => router.push(`/kidcoms/circle?case=${familyFileId}`)}
                  className="
                    flex items-center gap-1.5 px-3 py-1.5 text-sm
                    bg-[var(--portal-primary)]/10 text-[var(--portal-primary)] rounded-lg
                    hover:bg-[var(--portal-primary)]/20 transition-colors font-medium
                  "
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>

              {contacts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-secondary)]/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-10 w-10 text-[var(--portal-primary)]" />
                  </div>
                  <p className="font-semibold text-slate-900 mb-1">No circle contacts yet</p>
                  <p className="text-sm text-slate-600">
                    Add trusted contacts to start video calls
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-[var(--portal-primary)]/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--portal-primary)] to-[var(--portal-secondary)] flex items-center justify-center text-white font-bold shadow-sm">
                          {contact.contact_name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{contact.contact_name}</p>
                          <p className="text-xs text-slate-600 capitalize font-medium">
                            {contact.relationship_type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {contact.can_communicate ? (
                          <button
                            onClick={() => startVideoCall(contact.id)}
                            disabled={isStartingSession}
                            className="
                              p-2 bg-emerald-100 hover:bg-emerald-200 rounded-full
                              transition-colors shadow-sm
                            "
                          >
                            <Phone className="h-4 w-4 text-emerald-700" />
                          </button>
                        ) : (
                          <span className="text-xs text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full font-semibold">
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Sessions</h3>

              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-secondary)]/10 flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-10 w-10 text-[var(--portal-primary)]" />
                  </div>
                  <p className="font-semibold text-slate-900 mb-1">No sessions yet</p>
                  <p className="text-sm text-slate-600">
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
                      className={`
                        w-full flex items-center justify-between p-3 rounded-xl transition-all
                        ${session.status === 'active' || session.status === 'waiting'
                          ? 'bg-[var(--portal-primary)]/5 hover:bg-[var(--portal-primary)]/10 cursor-pointer border border-[var(--portal-primary)]/20'
                          : 'bg-slate-50 cursor-default border border-slate-100'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          {getSessionTypeIcon(session.session_type)}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-slate-900">
                            {session.title || 'Video Call'}
                          </p>
                          <p className="text-xs text-slate-600 font-medium">
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
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Enabled Features</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${settings.allowed_features.video ? 'bg-emerald-500 shadow-sm' : 'bg-slate-300'}`} />
                    <span className="text-slate-900 font-medium">Video</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${settings.allowed_features.chat ? 'bg-emerald-500 shadow-sm' : 'bg-slate-300'}`} />
                    <span className="text-slate-900 font-medium">Chat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${settings.allowed_features.theater ? 'bg-emerald-500 shadow-sm' : 'bg-slate-300'}`} />
                    <span className="text-slate-900 font-medium">Theater</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${settings.allowed_features.arcade ? 'bg-emerald-500 shadow-sm' : 'bg-slate-300'}`} />
                    <span className="text-slate-900 font-medium">Arcade</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function KidComsPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-[var(--portal-background)] via-[var(--portal-surface)] to-[var(--portal-accent)]/5">
          <Navigation />
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--portal-primary)] to-[var(--portal-secondary)] flex items-center justify-center shadow-lg">
              <Sparkles className="h-10 w-10 text-white animate-pulse" />
            </div>
            <p className="mt-6 text-slate-600 font-medium">Loading KidComs...</p>
          </div>
        </div>
      }>
        <KidComsContent />
      </Suspense>
    </ProtectedRoute>
  );
}
