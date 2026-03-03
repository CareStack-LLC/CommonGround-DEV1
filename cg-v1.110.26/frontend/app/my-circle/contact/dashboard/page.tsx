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
  Star,
  Lock,
  Eye,
  HandHeart,
} from 'lucide-react';
import { myCircleAPI, circleCallsAPI, CirclePermission, IncomingCall } from '@/lib/api';
import IncomingCallAlert from '@/components/my-circle/incoming-call-alert';
import { CGCard, CGBadge, CGButton, CGEmptyState } from '@/components/cg';
import { cn } from '@/lib/utils';

/* =============================================================================
   Circle Contact Dashboard - "The Village That Raises A Child"
   Warm, inviting interface celebrating the importance of extended family
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

// Encouraging messages that rotate
const ENCOURAGING_MESSAGES = [
  "Your voice brings comfort and joy",
  "Every call creates lasting memories",
  "You're helping them feel loved and grounded",
  "Your connection matters more than you know",
  "Being present is the greatest gift",
];

export default function CircleContactDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<CircleUserData | null>(null);
  const [children, setChildren] = useState<ChildWithPermissions[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildWithPermissions | null>(null);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [encouragingMessage] = useState(() =>
    ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)]
  );

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

    if (!userData?.contactId) {
      setError('User data not loaded properly');
      return;
    }

    setIsStartingCall(true);
    setError(null);

    try {
      const callType = type === 'video' ? 'video' : 'audio';

      // Use new circle calls API (bidirectional)
      const response = await circleCallsAPI.initiateCall({
        circle_contact_id: userData.contactId,
        child_id: child.child_id,
        call_type: callType,
      }, 'circle');

      localStorage.setItem('circle_call_session', JSON.stringify({
        roomUrl: response.room_url,
        token: response.token,
        sessionId: response.session_id,
        childName: child.child_name,
        childAvatar: child.avatar_id,
        callType: response.call_type,
        status: response.status,
        contactName: userData.contactName,
      }));

      router.push(`/my-circle/contact/circle-call/${response.session_id}`);
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
      <div className="min-h-screen bg-gradient-to-b from-teal-50/50 to-cg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-100 to-cg-sage-subtle flex items-center justify-center">
              <Heart className="h-10 w-10 text-teal-600 animate-pulse" />
            </div>
          </div>
          <p className="text-cg-text-secondary font-medium">Connecting to your circle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/30 to-cg-background">
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
      <header className="bg-white/80 backdrop-blur-sm border-b border-teal-100/50 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & User Info */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center shadow-sm">
                <Heart className="h-6 w-6 text-teal-600" />
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
        {/* Hero Welcome Section */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100/50 rounded-full mb-4">
            <Star className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-medium text-teal-700">You&apos;re Part of Something Special</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Thank You for Being Here
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-2">
            You&apos;re part of a trusted circle helping to keep a child grounded in love and connection.
            In times of change, <span className="text-teal-600 font-medium">you are their constant</span>.
          </p>
          <p className="text-sm text-teal-600 italic flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" />
            {encouragingMessage}
          </p>
        </div>

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

        {/* Connection Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <HandHeart className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-semibold text-foreground">Your Connections</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            The children you&apos;re approved to connect with &mdash; they&apos;re excited to hear from you!
          </p>
        </div>

        {/* Empty State */}
        {children.length === 0 ? (
          <CGCard variant="elevated" className="p-8 text-center border-teal-100">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center mx-auto mb-4">
              <Users className="h-10 w-10 text-teal-500" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Awaiting Connections</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Once a parent adds you to their circle and approves your access,
              you&apos;ll see the children you can connect with here.
            </p>
            <p className="text-sm text-teal-600 mt-4">
              Your patience and presence mean everything.
            </p>
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
                    'cursor-pointer transition-all duration-200 border-teal-100/50 hover:border-teal-200 hover:shadow-md',
                    !status.allowed && 'opacity-60 cursor-not-allowed'
                  )}
                  onClick={() => status.allowed && setSelectedChild(child)}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-amber-50 flex items-center justify-center text-4xl flex-shrink-0 shadow-sm">
                          {getChildAvatar(child.avatar_id)}
                        </div>
                        {status.allowed && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-cg-success rounded-full border-2 border-white flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
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
                            <div className="p-2 bg-teal-50 rounded-lg" title="Video Calls">
                              <Video className="h-4 w-4 text-teal-600" />
                            </div>
                          )}
                          {child.permissions.can_voice_call && (
                            <div className="p-2 bg-cg-slate-subtle rounded-lg" title="Voice Calls">
                              <Phone className="h-4 w-4 text-cg-slate" />
                            </div>
                          )}
                          {child.permissions.can_chat && (
                            <div className="p-2 bg-purple-50 rounded-lg" title="Chat">
                              <MessageCircle className="h-4 w-4 text-purple-500" />
                            </div>
                          )}
                          {child.permissions.can_theater && (
                            <div className="p-2 bg-amber-50 rounded-lg" title="Watch Together">
                              <Film className="h-4 w-4 text-amber-600" />
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
                          <p className="mt-2 text-xs text-amber-600 font-medium">{status.reason}</p>
                        )}
                      </div>

                      {/* Arrow */}
                      {status.allowed && (
                        <ChevronRight className="h-5 w-5 text-teal-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </CGCard>
              );
            })}
          </div>
        )}

        {/* Trust & Safety Section - Warm, Non-Aggressive */}
        <div className="mt-12 mb-8">
          <div className="bg-gradient-to-r from-teal-50/80 to-slate-50/80 rounded-2xl p-6 border border-teal-100/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                <Shield className="h-6 w-6 text-teal-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-2">
                  A Safe Space for Connection
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  CommonGround creates a protected environment where children can stay connected
                  with the people who matter most. Here&apos;s how we keep everyone safe:
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                      <Eye className="h-4 w-4 text-teal-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Monitored Calls</p>
                      <p className="text-xs text-muted-foreground">Parents are notified of all communications</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                      <Lock className="h-4 w-4 text-teal-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Parent Approved</p>
                      <p className="text-xs text-muted-foreground">Access controlled by parents</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                      <Heart className="h-4 w-4 text-teal-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Child-Centered</p>
                      <p className="text-xs text-muted-foreground">Everything revolves around their wellbeing</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Encouragement Footer */}
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-2">
            <span className="text-teal-600 font-medium">&quot;It takes a village to raise a child&quot;</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Thank you for being part of this child&apos;s village.
            Your love and consistency help them find their <span className="font-medium">common ground</span>.
          </p>
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
            className="max-w-sm w-full animate-in zoom-in-95 duration-200 border-teal-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 text-center">
              {/* Avatar */}
              <div className="relative inline-block mb-6">
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-teal-100 to-amber-50 flex items-center justify-center text-7xl mx-auto shadow-lg">
                  {getChildAvatar(selectedChild.avatar_id)}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                  <CGBadge variant="sage" className="shadow-sm">Ready to Connect</CGBadge>
                </div>
              </div>

              {/* Name */}
              <h2 className="text-2xl font-semibold text-foreground mb-1">
                {selectedChild.child_name}
              </h2>
              <p className="text-muted-foreground mb-2">is excited to hear from you!</p>
              <p className="text-sm text-teal-600 mb-6">Choose how to connect</p>

              {/* Call Options */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {selectedChild.permissions.can_video_call && (
                  <button
                    onClick={() => handleStartCall(selectedChild, 'video')}
                    disabled={isStartingCall}
                    className={cn(
                      'flex flex-col items-center gap-3 p-5 rounded-2xl transition-all',
                      'bg-gradient-to-br from-teal-50 to-teal-100/50 hover:from-teal-100 hover:to-teal-100 active:scale-95',
                      'border border-teal-200/50',
                      'disabled:opacity-50 disabled:hover:from-teal-50 disabled:active:scale-100'
                    )}
                  >
                    {isStartingCall ? (
                      <Loader2 className="h-10 w-10 text-teal-600 animate-spin" />
                    ) : (
                      <Video className="h-10 w-10 text-teal-600" />
                    )}
                    <span className="font-semibold text-teal-700">Video Call</span>
                  </button>
                )}
                {selectedChild.permissions.can_voice_call && (
                  <button
                    onClick={() => handleStartCall(selectedChild, 'voice')}
                    disabled={isStartingCall}
                    className={cn(
                      'flex flex-col items-center gap-3 p-5 rounded-2xl transition-all',
                      'bg-gradient-to-br from-slate-50 to-slate-100/50 hover:from-slate-100 hover:to-slate-100 active:scale-95',
                      'border border-slate-200/50',
                      'disabled:opacity-50 disabled:hover:from-slate-50 disabled:active:scale-100'
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
              {(selectedChild.permissions.can_chat || selectedChild.permissions.can_theater) && (
                <>
                  <div className="flex justify-center gap-3 mb-2">
                    {selectedChild.permissions.can_chat && (
                      <button
                        disabled
                        className="p-4 bg-purple-50 rounded-xl opacity-50 border border-purple-100"
                        title="Coming soon!"
                      >
                        <MessageCircle className="h-6 w-6 text-purple-400" />
                      </button>
                    )}
                    {selectedChild.permissions.can_theater && (
                      <button
                        disabled
                        className="p-4 bg-amber-50 rounded-xl opacity-50 border border-amber-100"
                        title="Coming soon!"
                      >
                        <Film className="h-6 w-6 text-amber-400" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-6">Chat & Watch Together coming soon!</p>
                </>
              )}

              {/* Cancel */}
              <CGButton
                variant="secondary"
                className="w-full"
                onClick={() => setSelectedChild(null)}
              >
                Maybe Later
              </CGButton>
            </div>
          </CGCard>
        </div>
      )}
    </div>
  );
}
