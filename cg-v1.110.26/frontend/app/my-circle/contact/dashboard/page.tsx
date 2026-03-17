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
   CommonGround SVG Logo Component
   Two parents (teal + blue) above a child (gold) connected by a golden arch
   ============================================================================= */
function CommonGroundLogo({ size = 48 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className="flex-shrink-0"
    >
      <rect width="512" height="512" rx="64" fill="url(#cg-dash-bg)" />
      <defs>
        <linearGradient id="cg-dash-bg" x1="0" y1="0" x2="512" y2="512">
          <stop stopColor="#E8F4F8" />
          <stop offset="1" stopColor="#D6ECE8" />
        </linearGradient>
        <linearGradient id="cg-dash-pa" x1="140" y1="110" x2="196" y2="186">
          <stop stopColor="#5BC4A0" />
          <stop offset="1" stopColor="#3DAA8A" />
        </linearGradient>
        <linearGradient id="cg-dash-pb" x1="316" y1="110" x2="372" y2="186">
          <stop stopColor="#4BA8C8" />
          <stop offset="1" stopColor="#2D6A8F" />
        </linearGradient>
      </defs>
      <circle cx="168" cy="148" r="48" fill="url(#cg-dash-pa)" />
      <path d="M120 260c0-26.5 21.5-48 48-48s48 21.5 48 48" stroke="url(#cg-dash-pa)" strokeWidth="16" fill="none" strokeLinecap="round" />
      <circle cx="344" cy="148" r="48" fill="url(#cg-dash-pb)" />
      <path d="M296 260c0-26.5 21.5-48 48-48s48 21.5 48 48" stroke="url(#cg-dash-pb)" strokeWidth="16" fill="none" strokeLinecap="round" />
      <path d="M168 200 Q256 140 344 200" stroke="#F5A623" strokeWidth="10" fill="none" strokeLinecap="round" />
      <circle cx="256" cy="330" r="38" fill="#F5A623" />
      <path d="M218 410c0-21 17-38 38-38s38 17 38 38" stroke="#F5A623" strokeWidth="14" fill="none" strokeLinecap="round" />
    </svg>
  );
}

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
  lion: '\u{1F981}',
  panda: '\u{1F43C}',
  unicorn: '\u{1F984}',
  bear: '\u{1F43B}',
  cat: '\u{1F431}',
  dog: '\u{1F436}',
  rabbit: '\u{1F430}',
  fox: '\u{1F98A}',
  koala: '\u{1F428}',
  penguin: '\u{1F427}',
  monkey: '\u{1F435}',
  dragon: '\u{1F409}',
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

      // Terms gate: redirect to terms page if not accepted
      const loginData = localStorage.getItem('circle_login_data');
      if (loginData) {
        const parsed = JSON.parse(loginData);
        if (!parsed.terms_accepted) {
          router.push('/my-circle/contact/terms');
          return;
        }
      }

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
    return '\u{1F9D2}';
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
    router.push(`/my-circle/contact/circle-call/${joinData.sessionId}`);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="fixed inset-0 bg-gradient-to-br from-[#E8F4F8] via-background to-[#D6ECE8] dark:from-[#1E3A4A]/30 dark:via-background dark:to-[#1E3A4A]/20 -z-10" />
        <div className="flex flex-col items-center gap-4">
          <CommonGroundLogo size={80} />
          <p className="text-muted-foreground font-medium">Connecting to your circle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Branded background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#E8F4F8]/50 via-background to-[#D6ECE8]/30 dark:from-[#1E3A4A]/20 dark:via-background dark:to-[#1E3A4A]/10 -z-10" />

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
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & User Info */}
            <div className="flex items-center gap-4">
              <CommonGroundLogo size={44} />
              <div>
                <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  Common<span className="text-[#3DAA8A]">Ground</span>
                </h1>
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#3DAA8A]/10 dark:bg-[#3DAA8A]/20 rounded-full mb-4">
            <Star className="h-4 w-4 text-[#F5A623]" />
            <span className="text-sm font-medium text-[#2D6A8F] dark:text-[#4BA8C8]">You&apos;re Part of Something Special</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Thank You for Being Here
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-2">
            You&apos;re part of a trusted circle helping to keep a child grounded in love and connection.
            In times of change, <span className="text-[#3DAA8A] font-medium">you are their constant</span>.
          </p>
          <p className="text-sm text-[#3DAA8A] dark:text-[#5BC4A0] italic flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" />
            {encouragingMessage}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <CGCard variant="default" className="mb-6 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/50">
            <div className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
            </div>
          </CGCard>
        )}

        {/* Connection Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <HandHeart className="h-5 w-5 text-[#3DAA8A]" />
            <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>Your Connections</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            The children you&apos;re approved to connect with &mdash; they&apos;re excited to hear from you!
          </p>
        </div>

        {/* Empty State */}
        {children.length === 0 ? (
          <CGCard variant="elevated" className="p-8 text-center border-2 border-border rounded-2xl shadow-lg">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E8F4F8] to-[#D6ECE8] flex items-center justify-center mx-auto mb-4">
              <Users className="h-10 w-10 text-[#3DAA8A]" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>Awaiting Connections</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Once a parent adds you to their circle and approves your access,
              you&apos;ll see the children you can connect with here.
            </p>
            <p className="text-sm text-[#3DAA8A] mt-4">
              Your patience and presence mean everything.
            </p>
          </CGCard>
        ) : (
          /* Children Grid */
          <div className="grid gap-4 md:grid-cols-2">
            {children.map((child) => {
              const status = canCommunicate(child.permissions);

              return (
                <div
                  key={child.child_id}
                  className={cn(
                    'bg-card rounded-2xl border-2 border-border shadow-lg p-5 cursor-pointer transition-all duration-200',
                    'hover:border-[#3DAA8A]/50 hover:shadow-xl',
                    !status.allowed && 'opacity-60 cursor-not-allowed hover:border-border hover:shadow-lg'
                  )}
                  onClick={() => status.allowed && setSelectedChild(child)}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E8F4F8] to-[#F5A623]/20 flex items-center justify-center text-4xl flex-shrink-0 shadow-sm">
                        {getChildAvatar(child.avatar_id)}
                      </div>
                      {status.allowed && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#3DAA8A] rounded-full border-2 border-card flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-foreground truncate" style={{ fontFamily: "'DM Serif Display', serif" }}>
                          {child.child_name}
                        </h3>
                        <CGBadge variant={status.allowed ? 'sage' : 'default'}>
                          {status.allowed ? 'Available' : 'Unavailable'}
                        </CGBadge>
                      </div>

                      {/* Permission Icons */}
                      <div className="flex gap-2 mb-3">
                        {child.permissions.can_video_call && (
                          <div className="p-2 bg-[#3DAA8A]/10 dark:bg-[#3DAA8A]/20 rounded-lg" title="Video Calls">
                            <Video className="h-4 w-4 text-[#3DAA8A]" />
                          </div>
                        )}
                        {child.permissions.can_voice_call && (
                          <div className="p-2 bg-[#2D6A8F]/10 dark:bg-[#2D6A8F]/20 rounded-lg" title="Voice Calls">
                            <Phone className="h-4 w-4 text-[#2D6A8F] dark:text-[#4BA8C8]" />
                          </div>
                        )}
                        {child.permissions.can_chat && (
                          <div className="p-2 bg-[#F5A623]/10 dark:bg-[#F5A623]/20 rounded-lg" title="Chat">
                            <MessageCircle className="h-4 w-4 text-[#F5A623]" />
                          </div>
                        )}
                        {child.permissions.can_theater && (
                          <div className="p-2 bg-[#1E3A4A]/10 dark:bg-[#1E3A4A]/20 rounded-lg" title="Watch Together">
                            <Film className="h-4 w-4 text-[#1E3A4A] dark:text-[#4BA8C8]" />
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
                        <p className="mt-2 text-xs text-[#F5A623] font-medium">{status.reason}</p>
                      )}
                    </div>

                    {/* Arrow */}
                    {status.allowed && (
                      <ChevronRight className="h-5 w-5 text-[#3DAA8A] flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Trust & Safety Section */}
        <div className="mt-12 mb-8">
          <div className="bg-card rounded-2xl p-6 border-2 border-border shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#3DAA8A]/10 dark:bg-[#3DAA8A]/20 flex items-center justify-center shadow-sm flex-shrink-0">
                <Shield className="h-6 w-6 text-[#3DAA8A]" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  A Safe Space for Connection
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  CommonGround creates a protected environment where children can stay connected
                  with the people who matter most. Here&apos;s how we keep everyone safe:
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#2D6A8F]/10 dark:bg-[#2D6A8F]/20 flex items-center justify-center flex-shrink-0">
                      <Eye className="h-4 w-4 text-[#2D6A8F] dark:text-[#4BA8C8]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Monitored Calls</p>
                      <p className="text-xs text-muted-foreground">Parents are notified of all communications</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F5A623]/10 dark:bg-[#F5A623]/20 flex items-center justify-center flex-shrink-0">
                      <Lock className="h-4 w-4 text-[#F5A623]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Parent Approved</p>
                      <p className="text-xs text-muted-foreground">Access controlled by parents</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#3DAA8A]/10 dark:bg-[#3DAA8A]/20 flex items-center justify-center flex-shrink-0">
                      <CommonGroundLogo size={16} />
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
            <span className="text-[#2D6A8F] dark:text-[#4BA8C8] font-medium">&quot;It takes a village to raise a child&quot;</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Thank you for being part of this child&apos;s village.
            Your love and consistency help them find their <span className="font-medium text-[#3DAA8A]">common ground</span>.
          </p>
        </div>
      </main>

      {/* Call Modal */}
      {selectedChild && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedChild(null)}
        >
          <div
            className="bg-card max-w-sm w-full rounded-2xl border-2 border-border shadow-xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 text-center">
              {/* Avatar */}
              <div className="relative inline-block mb-6">
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-[#E8F4F8] to-[#F5A623]/20 flex items-center justify-center text-7xl mx-auto shadow-lg">
                  {getChildAvatar(selectedChild.avatar_id)}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                  <CGBadge variant="sage" className="shadow-sm">Ready to Connect</CGBadge>
                </div>
              </div>

              {/* Name */}
              <h2 className="text-2xl font-semibold text-foreground mb-1" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {selectedChild.child_name}
              </h2>
              <p className="text-muted-foreground mb-2">is excited to hear from you!</p>
              <p className="text-sm text-[#3DAA8A] mb-6">Choose how to connect</p>

              {/* Call Options */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {selectedChild.permissions.can_video_call && (
                  <button
                    onClick={() => handleStartCall(selectedChild, 'video')}
                    disabled={isStartingCall}
                    className={cn(
                      'flex flex-col items-center gap-3 p-5 rounded-2xl transition-all',
                      'bg-gradient-to-br from-[#3DAA8A]/10 to-[#3DAA8A]/20 hover:from-[#3DAA8A]/20 hover:to-[#3DAA8A]/30 active:scale-95',
                      'dark:from-[#3DAA8A]/20 dark:to-[#3DAA8A]/10 dark:hover:from-[#3DAA8A]/30 dark:hover:to-[#3DAA8A]/20',
                      'border border-[#3DAA8A]/30',
                      'disabled:opacity-50 disabled:active:scale-100'
                    )}
                  >
                    {isStartingCall ? (
                      <Loader2 className="h-10 w-10 text-[#3DAA8A] animate-spin" />
                    ) : (
                      <Video className="h-10 w-10 text-[#3DAA8A]" />
                    )}
                    <span className="font-semibold text-[#3DAA8A]">Video Call</span>
                  </button>
                )}
                {selectedChild.permissions.can_voice_call && (
                  <button
                    onClick={() => handleStartCall(selectedChild, 'voice')}
                    disabled={isStartingCall}
                    className={cn(
                      'flex flex-col items-center gap-3 p-5 rounded-2xl transition-all',
                      'bg-gradient-to-br from-[#2D6A8F]/10 to-[#2D6A8F]/20 hover:from-[#2D6A8F]/20 hover:to-[#2D6A8F]/30 active:scale-95',
                      'dark:from-[#2D6A8F]/20 dark:to-[#2D6A8F]/10 dark:hover:from-[#2D6A8F]/30 dark:hover:to-[#2D6A8F]/20',
                      'border border-[#2D6A8F]/30',
                      'disabled:opacity-50 disabled:active:scale-100'
                    )}
                  >
                    {isStartingCall ? (
                      <Loader2 className="h-10 w-10 text-[#2D6A8F] dark:text-[#4BA8C8] animate-spin" />
                    ) : (
                      <Phone className="h-10 w-10 text-[#2D6A8F] dark:text-[#4BA8C8]" />
                    )}
                    <span className="font-semibold text-[#2D6A8F] dark:text-[#4BA8C8]">Voice Call</span>
                  </button>
                )}
              </div>

              {/* Chat & Theater Options */}
              {(selectedChild.permissions.can_chat || selectedChild.permissions.can_theater) && (
                <div className="flex justify-center gap-3 mb-6">
                  {selectedChild.permissions.can_chat && (
                    <button
                      onClick={() => {
                        setSelectedChild(null);
                        router.push(`/my-circle/contact/chat/${selectedChild.child_id}`);
                      }}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-2xl transition-all',
                        'bg-gradient-to-br from-[#F5A623]/10 to-[#F5A623]/20',
                        'hover:from-[#F5A623]/20 hover:to-[#F5A623]/30',
                        'dark:from-[#F5A623]/20 dark:to-[#F5A623]/10',
                        'dark:hover:from-[#F5A623]/30 dark:hover:to-[#F5A623]/20',
                        'active:scale-95 border border-[#F5A623]/30',
                      )}
                    >
                      <MessageCircle className="h-8 w-8 text-[#F5A623]" />
                      <span className="font-semibold text-sm text-[#F5A623]">Chat</span>
                    </button>
                  )}
                  {selectedChild.permissions.can_theater && (
                    <button
                      disabled
                      className="flex flex-col items-center gap-2 p-4 bg-[#1E3A4A]/5 dark:bg-[#1E3A4A]/20 rounded-2xl opacity-50 border border-[#1E3A4A]/20 dark:border-[#1E3A4A]/40"
                      title="Coming soon!"
                    >
                      <Film className="h-8 w-8 text-[#1E3A4A]/50 dark:text-[#4BA8C8]/50" />
                      <span className="font-semibold text-sm text-[#1E3A4A]/50 dark:text-[#4BA8C8]/50">Theater</span>
                    </button>
                  )}
                </div>
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
          </div>
        </div>
      )}
    </div>
  );
}
