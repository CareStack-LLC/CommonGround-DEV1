'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Video,
  Phone,
  MessageCircle,
  Film,
  LogOut,
  Loader2,
  Users,
  Clock,
  Calendar,
  Shield,
  ChevronRight,
  X,
  Heart,
  Sparkles,
} from 'lucide-react';
import { myCircleAPI, kidcomsAPI, CirclePermission, IncomingCall } from '@/lib/api';
import IncomingCallAlert from '@/components/my-circle/incoming-call-alert';
import { CGCard, CGBadge, CGButton, CGEmptyState } from '@/components/cg';
import { cn } from '@/lib/utils';

/* =============================================================================
   Circle Contact Dashboard - "The Sanctuary of Truth"
   Clean, professional interface for trusted contacts (grandparents, etc.)
   ============================================================================= */

interface CircleUserData {
  userId: string;
  contactId: string;
  contactName: string;
  familyFileId: string;
  childIds?: string[];
}

interface ChildWithPermissions {
  child_id: string;
  child_name: string;
  avatar_id?: string;
  permissions: CirclePermission;
}

const CHILD_AVATARS: Record<string, string> = {
  lion: '🦁',
  panda: '🐼',
  unicorn: '🦄',
  bear: '🐻',
  cat: '🐱',
  dog: '🐶',
  rabbit: '🐰',
  fox: '🦊',
  koala: '🐨',
  penguin: '🐧',
  monkey: '🐵',
  dragon: '🐉',
};

export default function CircleContactDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<CircleUserData | null>(null);
  const [children, setChildren] = useState<ChildWithPermissions[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildWithPermissions | null>(null);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  // Poll for incoming calls
  const checkIncomingCalls = useCallback(async () => {
    try {
      const calls = await myCircleAPI.getIncomingCallsForCircle();
      if (calls.items.length > 0) {
        setIncomingCall(calls.items[0]);
      } else {
        setIncomingCall(null);
      }
    } catch (err) {
      console.debug('Incoming call check failed:', err);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (!userData) return;
    checkIncomingCalls();
    const interval = setInterval(checkIncomingCalls, 3000);
    return () => clearInterval(interval);
  }, [userData, checkIncomingCalls]);

  async function loadUserData() {
    try {
      const token = localStorage.getItem('circle_token');
      const userStr = localStorage.getItem('circle_user');

      if (!token || !userStr) {
        router.push('/my-circle/contact');
        return;
      }

      const user = JSON.parse(userStr) as CircleUserData;
      setUserData(user);
      await loadChildrenWithPermissions();
    } catch (err) {
      console.error('Error loading user data:', err);
      router.push('/my-circle/contact');
    }
  }

  async function loadChildrenWithPermissions() {
    try {
      setIsLoading(true);
      const permissionList = await myCircleAPI.getMyPermissions();
      const childrenData: ChildWithPermissions[] = permissionList.items.map((perm) => ({
        child_id: perm.child_id,
        child_name: perm.child_name || `Child ${perm.child_id.slice(0, 4)}`,
        avatar_id: undefined,
        permissions: perm,
      }));
      setChildren(childrenData);
    } catch (err) {
      console.error('Error loading permissions:', err);
      setError('Failed to load your connections. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('circle_token');
    localStorage.removeItem('circle_user');
    router.push('/my-circle/contact');
  }

  function getChildAvatar(avatarId?: string): string {
    if (avatarId && CHILD_AVATARS[avatarId]) {
      return CHILD_AVATARS[avatarId];
    }
    return '🧒';
  }

  function isWithinAllowedHours(permission: CirclePermission): boolean {
    if (!permission.allowed_start_time || !permission.allowed_end_time) return true;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = permission.allowed_start_time.split(':').map(Number);
    const [endHour, endMin] = permission.allowed_end_time.split(':').map(Number);
    return currentTime >= startHour * 60 + startMin && currentTime <= endHour * 60 + endMin;
  }

  function isAllowedDay(permission: CirclePermission): boolean {
    if (!permission.allowed_days || permission.allowed_days.length === 0) return true;
    return permission.allowed_days.includes(new Date().getDay());
  }

  function canCommunicate(permission: CirclePermission): { allowed: boolean; reason?: string } {
    if (!isAllowedDay(permission)) return { allowed: false, reason: 'Not available on this day' };
    if (!isWithinAllowedHours(permission)) return { allowed: false, reason: 'Outside allowed hours' };
    return { allowed: true };
  }

  async function handleStartCall(child: ChildWithPermissions, type: 'video' | 'voice') {
    const canCall = canCommunicate(child.permissions);
    if (!canCall.allowed) {
      alert(canCall.reason);
      return;
    }

    if (type === 'video' && !child.permissions.can_video_call) {
      alert('Video calls are not enabled for this connection');
      return;
    }

    if (type === 'voice' && !child.permissions.can_voice_call) {
      alert('Voice calls are not enabled for this connection');
      return;
    }

    setIsStartingCall(true);
    setError(null);

    try {
      const sessionType = type === 'video' ? 'video_call' : 'voice_call';
      const response = await kidcomsAPI.createCircleContactSession({
        child_id: child.child_id,
        session_type: sessionType,
      });

      localStorage.setItem('circle_call_session', JSON.stringify({
        roomUrl: response.room_url,
        token: response.token,
        sessionId: response.session_id,
        childName: child.child_name,
        childAvatar: child.avatar_id,
        sessionType: sessionType,
        contactName: userData?.contactName,
      }));

      router.push('/my-circle/contact/call');
    } catch (err: any) {
      console.error('Error starting call:', err);
      setError(err?.message || 'Failed to start call. Please try again.');
      setIsStartingCall(false);
    }
  }

  function formatTime(timeStr?: string): string {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${minute.toString().padStart(2, '0')} ${period}`;
  }

  function formatDays(days?: number[]): string {
    if (!days || days.length === 0) return 'Any day';
    if (days.length === 7) return 'Every day';
    const dayAbbrev: Record<number, string> = {
      0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
    };
    return days.map(d => dayAbbrev[d] || String(d)).join(', ');
  }

  function handleAcceptIncomingCall(joinData: { roomUrl: string; token: string; sessionId: string }) {
    localStorage.setItem('circle_call_session', JSON.stringify({
      roomUrl: joinData.roomUrl,
      token: joinData.token,
      sessionId: joinData.sessionId,
      childName: incomingCall?.child_name || 'Child',
      childAvatar: undefined,
      sessionType: incomingCall?.session_type || 'video_call',
      contactName: userData?.contactName,
      isIncoming: true,
    }));
    setIncomingCall(null);
    router.push('/my-circle/contact/call');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-cg-sage-subtle flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-cg-sage animate-pulse" />
            </div>
          </div>
          <p className="text-cg-text-secondary font-medium">Loading your circle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cg-background">
      {/* Incoming Call Alert */}
      {incomingCall && (
        <IncomingCallAlert
          call={incomingCall}
          userType="circle"
          onAccept={handleAcceptIncomingCall}
          onReject={() => setIncomingCall(null)}
          onDismiss={() => setIncomingCall(null)}
        />
      )}

      {/* Header */}
      <header className="bg-card border-b border-border/50 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & User Info */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cg-sage-subtle flex items-center justify-center">
                <Heart className="h-6 w-6 text-cg-sage" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">My Circle</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {userData?.contactName}</p>
              </div>
            </div>

            {/* Logout */}
            <CGButton
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </CGButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Error Message */}
        {error && (
          <CGCard variant="default" className="mb-6 border-cg-error/30 bg-cg-error-subtle">
            <div className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-cg-error/20 flex items-center justify-center flex-shrink-0">
                <X className="h-4 w-4 text-cg-error" />
              </div>
              <p className="text-cg-error font-medium">{error}</p>
            </div>
          </CGCard>
        )}

        {/* Section Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">Your Connections</h2>
          <p className="text-sm text-muted-foreground">
            Children you're approved to connect with
          </p>
        </div>

        {/* Empty State */}
        {children.length === 0 ? (
          <CGCard variant="elevated" className="p-0">
            <CGEmptyState
              icon={<Users className="h-8 w-8" />}
              title="No Connections Yet"
              description="You'll see children you can connect with here once a parent adds you to their circle."
              size="lg"
            />
          </CGCard>
        ) : (
          /* Children Grid */
          <div className="grid gap-4 md:grid-cols-2">
            {children.map((child) => {
              const status = canCommunicate(child.permissions);

              return (
                <CGCard
                  key={child.child_id}
                  variant="interactive"
                  className={cn(
                    'cursor-pointer transition-all duration-200',
                    !status.allowed && 'opacity-60 cursor-not-allowed'
                  )}
                  onClick={() => status.allowed && setSelectedChild(child)}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cg-sage-subtle to-cg-slate-subtle flex items-center justify-center text-4xl flex-shrink-0">
                        {getChildAvatar(child.avatar_id)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-foreground truncate">
                            {child.child_name}
                          </h3>
                          <CGBadge variant={status.allowed ? 'sage' : 'default'}>
                            {status.allowed ? 'Available' : 'Unavailable'}
                          </CGBadge>
                        </div>

                        {/* Permission Icons */}
                        <div className="flex gap-2 mb-3">
                          {child.permissions.can_video_call && (
                            <div className="p-2 bg-cg-sage-subtle rounded-lg" title="Video Calls">
                              <Video className="h-4 w-4 text-cg-sage" />
                            </div>
                          )}
                          {child.permissions.can_voice_call && (
                            <div className="p-2 bg-cg-slate-subtle rounded-lg" title="Voice Calls">
                              <Phone className="h-4 w-4 text-cg-slate" />
                            </div>
                          )}
                          {child.permissions.can_chat && (
                            <div className="p-2 bg-purple-100 rounded-lg" title="Chat">
                              <MessageCircle className="h-4 w-4 text-purple-600" />
                            </div>
                          )}
                          {child.permissions.can_theater && (
                            <div className="p-2 bg-cg-amber-subtle rounded-lg" title="Watch Together">
                              <Film className="h-4 w-4 text-cg-amber" />
                            </div>
                          )}
                        </div>

                        {/* Schedule */}
                        {(child.permissions.allowed_start_time || child.permissions.allowed_days?.length) && (
                          <div className="space-y-1.5">
                            {child.permissions.allowed_start_time && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                <span>
                                  {formatTime(child.permissions.allowed_start_time)} - {formatTime(child.permissions.allowed_end_time)}
                                </span>
                              </div>
                            )}
                            {child.permissions.allowed_days && child.permissions.allowed_days.length > 0 && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{formatDays(child.permissions.allowed_days)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Unavailable Reason */}
                        {!status.allowed && status.reason && (
                          <p className="mt-2 text-xs text-cg-amber font-medium">{status.reason}</p>
                        )}
                      </div>

                      {/* Arrow */}
                      {status.allowed && (
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </CGCard>
              );
            })}
          </div>
        )}

        {/* Safety Notice */}
        <div className="mt-10 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Shield className="h-4 w-4" />
          <span>All communications are monitored for child safety</span>
        </div>
      </main>

      {/* Call Modal */}
      {selectedChild && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedChild(null)}
        >
          <CGCard
            variant="elevated"
            className="max-w-sm w-full animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 text-center">
              {/* Avatar */}
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cg-sage-subtle to-cg-slate-subtle flex items-center justify-center text-6xl mx-auto shadow-lg">
                  {getChildAvatar(selectedChild.avatar_id)}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                  <CGBadge variant="sage" className="shadow-sm">Online</CGBadge>
                </div>
              </div>

              {/* Name */}
              <h2 className="text-2xl font-semibold text-foreground mb-1">
                {selectedChild.child_name}
              </h2>
              <p className="text-muted-foreground mb-8">Choose how to connect</p>

              {/* Call Options */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {selectedChild.permissions.can_video_call && (
                  <button
                    onClick={() => handleStartCall(selectedChild, 'video')}
                    disabled={isStartingCall}
                    className={cn(
                      'flex flex-col items-center gap-3 p-5 rounded-2xl transition-all',
                      'bg-cg-sage-subtle hover:bg-cg-sage/20 active:scale-95',
                      'disabled:opacity-50 disabled:hover:bg-cg-sage-subtle disabled:active:scale-100'
                    )}
                  >
                    {isStartingCall ? (
                      <Loader2 className="h-10 w-10 text-cg-sage animate-spin" />
                    ) : (
                      <Video className="h-10 w-10 text-cg-sage" />
                    )}
                    <span className="font-semibold text-cg-sage">Video Call</span>
                  </button>
                )}
                {selectedChild.permissions.can_voice_call && (
                  <button
                    onClick={() => handleStartCall(selectedChild, 'voice')}
                    disabled={isStartingCall}
                    className={cn(
                      'flex flex-col items-center gap-3 p-5 rounded-2xl transition-all',
                      'bg-cg-slate-subtle hover:bg-cg-slate/20 active:scale-95',
                      'disabled:opacity-50 disabled:hover:bg-cg-slate-subtle disabled:active:scale-100'
                    )}
                  >
                    {isStartingCall ? (
                      <Loader2 className="h-10 w-10 text-cg-slate animate-spin" />
                    ) : (
                      <Phone className="h-10 w-10 text-cg-slate" />
                    )}
                    <span className="font-semibold text-cg-slate">Voice Call</span>
                  </button>
                )}
              </div>

              {/* Other Options (Coming Soon) */}
              <div className="flex justify-center gap-3 mb-2">
                {selectedChild.permissions.can_chat && (
                  <button
                    disabled
                    className="p-4 bg-purple-50 rounded-xl opacity-50"
                    title="Coming soon!"
                  >
                    <MessageCircle className="h-6 w-6 text-purple-500" />
                  </button>
                )}
                {selectedChild.permissions.can_theater && (
                  <button
                    disabled
                    className="p-4 bg-cg-amber-subtle rounded-xl opacity-50"
                    title="Coming soon!"
                  >
                    <Film className="h-6 w-6 text-cg-amber" />
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-6">Chat & Watch Together coming soon!</p>

              {/* Cancel */}
              <CGButton
                variant="secondary"
                className="w-full"
                onClick={() => setSelectedChild(null)}
              >
                Cancel
              </CGButton>
            </div>
          </CGCard>
        </div>
      )}
    </div>
  );
}
