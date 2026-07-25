'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  Sun,
  Moon,
  Monitor,
  Camera,
  Pencil,
  Check,
} from 'lucide-react';
import {
  myCircleAPI,
  circleCallsAPI,
  circleParentMessagesAPI,
  CirclePermission,
  IncomingCall,
  ContactSideThreadInfo,
} from '@/lib/api';
import IncomingCallAlert from '@/components/my-circle/incoming-call-alert';
import { cn } from '@/lib/utils';

/* =============================================================================
   CommonGround SVG Logo — same logo used across the entire platform
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
      <defs>
        <linearGradient id="cg-dash-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8F4F8" />
          <stop offset="100%" stopColor="var(--border)" />
        </linearGradient>
        <linearGradient id="cg-dash-pa" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--cg-sage-light)" />
          <stop offset="100%" stopColor="var(--cg-sage)" />
        </linearGradient>
        <linearGradient id="cg-dash-pb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--cg-slate-light)" />
          <stop offset="100%" stopColor="var(--cg-slate)" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill="url(#cg-dash-bg)" />
      {/* Left parent */}
      <circle cx="168" cy="148" r="48" fill="url(#cg-dash-pa)" />
      <path d="M118 218 Q168 258 218 218" stroke="url(#cg-dash-pa)" strokeWidth="16" strokeLinecap="round" fill="none" />
      {/* Right parent */}
      <circle cx="344" cy="148" r="48" fill="url(#cg-dash-pb)" />
      <path d="M294 218 Q344 258 394 218" stroke="url(#cg-dash-pb)" strokeWidth="16" strokeLinecap="round" fill="none" />
      {/* Golden arch */}
      <path d="M218 168 Q256 104 294 168" stroke="var(--cg-amber)" strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.95" />
      {/* Child */}
      <circle cx="256" cy="330" r="38" fill="var(--cg-amber)" />
      <path d="M218 382 Q256 414 294 382" stroke="var(--cg-amber)" strokeWidth="12" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* =============================================================================
   Theme Toggle — mirrors parent-side theme system using cg_theme_preference
   ============================================================================= */
type ThemePreference = 'light' | 'dark' | 'system';

function CircleThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    const stored = localStorage.getItem('cg_theme_preference') as ThemePreference | null;
    if (stored) {
      setPreference(stored);
      applyTheme(stored);
    } else {
      applyTheme('system');
    }
  }, []);

  function applyTheme(pref: ThemePreference) {
    const root = document.documentElement;
    if (pref === 'dark') {
      root.classList.add('dark');
    } else if (pref === 'light') {
      root.classList.remove('dark');
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }

  function setTheme(pref: ThemePreference) {
    setPreference(pref);
    localStorage.setItem('cg_theme_preference', pref);
    applyTheme(pref);
  }

  const options: { value: ThemePreference; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
            preference === value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title={label}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

/* =============================================================================
   Circle Contact Dashboard — "The Village That Raises A Child"
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

// Local override stored in localStorage — circle contact's side
interface ChildOverride {
  nickname?: string;
  photoDataUrl?: string;
}

const OVERRIDES_KEY = 'circle_child_overrides';

function getOverrides(): Record<string, ChildOverride> {
  try {
    if (typeof localStorage === 'undefined') return {};
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}');
  } catch { return {}; }
}

function saveOverrides(map: Record<string, ChildOverride>) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(map));
}

// Contact's own profile — stored locally
interface ContactProfile {
  displayName?: string;
  photoDataUrl?: string;
}

const PROFILE_KEY = 'circle_contact_profile';

function getContactProfile(): ContactProfile {
  try {
    if (typeof localStorage === 'undefined') return {};
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
  } catch { return {}; }
}

function saveContactProfile(profile: ContactProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
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

  // Contact editing state (for children)
  const [overrides, setOverridesState] = useState<Record<string, ChildOverride>>({});
  const [editChild, setEditChild] = useState<ChildWithPermissions | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhoto, setEditPhoto] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Own profile editing state
  const [contactProfile, setContactProfile] = useState<ContactProfile>({});
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileEditName, setProfileEditName] = useState('');
  const [profileEditPhoto, setProfileEditPhoto] = useState<string | undefined>(undefined);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  // Parent-chat thread info (for the "Message parent" card badge)
  const [parentThread, setParentThread] = useState<ContactSideThreadInfo | null>(null);
  const [parentThreadUnread, setParentThreadUnread] = useState(0);

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
    setOverridesState(getOverrides());
    setContactProfile(getContactProfile());
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

      // Load parent-thread info for the "Message parent" card. Failures
      // are non-fatal — the card just won't render the badge.
      try {
        const thread = await circleParentMessagesAPI.getThreadAsContact({
          limit: 1,
        });
        setParentThread(thread.info);
        setParentThreadUnread(thread.unread_count);
      } catch {
        setParentThread(null);
      }
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
    if (avatarId && CHILD_AVATARS[avatarId]) return CHILD_AVATARS[avatarId];
    return '\u{1F9D2}';
  }

  function getDisplayName(child: ChildWithPermissions): string {
    return overrides[child.child_id]?.nickname || child.child_name;
  }

  function getDisplayPhoto(child: ChildWithPermissions): string | undefined {
    return overrides[child.child_id]?.photoDataUrl;
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

      const response = await circleCallsAPI.initiateCall({
        circle_contact_id: userData.contactId,
        child_id: child.child_id,
        call_type: callType,
      }, 'circle');

      localStorage.setItem('circle_call_session', JSON.stringify({
        roomUrl: response.room_url,
        token: response.token,
        sessionId: response.session_id,
        childName: getDisplayName(child),
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

  // --- Edit handlers ---
  function openEdit(child: ChildWithPermissions) {
    const override = overrides[child.child_id] || {};
    setEditChild(child);
    setEditName(override.nickname || child.child_name);
    setEditPhoto(override.photoDataUrl);
  }

  function saveEdit() {
    if (!editChild) return;
    const updated = {
      ...overrides,
      [editChild.child_id]: {
        nickname: editName.trim() || editChild.child_name,
        photoDataUrl: editPhoto,
      },
    };
    setOverridesState(updated);
    saveOverrides(updated);
    setEditChild(null);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setEditPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  // --- Profile edit handlers ---
  function openProfileEdit() {
    setProfileEditName(contactProfile.displayName || userData?.contactName || '');
    setProfileEditPhoto(contactProfile.photoDataUrl);
    setShowProfileEdit(true);
  }

  function saveProfileEdit() {
    const updated: ContactProfile = {
      displayName: profileEditName.trim() || undefined,
      photoDataUrl: profileEditPhoto,
    };
    setContactProfile(updated);
    saveContactProfile(updated);
    setShowProfileEdit(false);
  }

  function handleProfileImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setProfileEditPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function getContactDisplayName(): string {
    return contactProfile.displayName || userData?.contactName || '';
  }

  // --- Permission count ---
  function getPermissionCount(perms: CirclePermission): number {
    let count = 0;
    if (perms.can_video_call) count++;
    if (perms.can_voice_call) count++;
    if (perms.can_chat) count++;
    if (perms.can_theater) count++;
    return count;
  }

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="fixed inset-0 bg-gradient-to-br from-[#E8F4F8] via-background to-border dark:from-[#0D1B24] dark:via-background dark:to-[#0D1B24] -z-10" />
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 bg-cg-sage/20 rounded-full blur-2xl animate-pulse" />
            <CommonGroundLogo size={80} />
          </div>
          <div className="text-center">
            <p className="text-foreground font-semibold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Connecting to your circle
            </p>
            <p className="text-muted-foreground text-sm mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
              Loading your connections...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Branded Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#E8F4F8]/50 via-background to-border/30 dark:from-[#0D1B24]/80 dark:via-background dark:to-[#0D1B24]/60 -z-10" />

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
      <header className="bg-card/80 backdrop-blur-xl border-b border-border sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <CommonGroundLogo size={40} />
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Common<span className="text-cg-sage">Ground</span>
                </h1>
                <p className="text-xs text-cg-slate dark:text-cg-slate-light font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                  My Circle
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5">
              <CircleThemeToggle />
              {/* Profile avatar — tap to edit */}
              <button
                onClick={openProfileEdit}
                className="relative group/profile flex-shrink-0"
                aria-label="Edit your profile"
                title="Edit your profile"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cg-sage to-cg-slate flex items-center justify-center text-white text-sm font-bold overflow-hidden shadow-sm ring-2 ring-transparent group-hover/profile:ring-cg-sage/40 transition-all">
                  {contactProfile.photoDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={contactProfile.photoDataUrl} alt={getContactDisplayName()} className="w-full h-full object-cover" />
                  ) : (
                    getContactDisplayName().charAt(0).toUpperCase()
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-cg-sage flex items-center justify-center border-2 border-card">
                  <Pencil className="w-2 h-2 text-white" />
                </div>
              </button>
              <button
                onClick={() => router.push('/my-circle/contact/schedule')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cg-slate hover:text-cg-sage rounded-lg hover:bg-cg-sage/5 transition-colors"
                style={{ fontFamily: "'Inter', sans-serif" }}
                aria-label="See when you can call"
                title="When can I call?"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">When can I call?</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Greeting Card — matches parent dashboard style */}
        <div className="mb-8 relative overflow-hidden bg-gradient-to-br from-cg-sage/5 to-cg-sage/10 dark:from-cg-sage/10 dark:to-cg-slate/10 rounded-2xl p-6 border border-cg-sage/10">
          <div className="relative z-10 flex items-center gap-4">
            {/* Profile photo in greeting */}
            {contactProfile.photoDataUrl && (
              <button onClick={openProfileEdit} className="flex-shrink-0 group/greet">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-lg ring-2 ring-white/50 dark:ring-white/20 group-hover/greet:ring-cg-sage/60 transition-all">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={contactProfile.photoDataUrl} alt={getContactDisplayName()} className="w-full h-full object-cover" />
                </div>
              </button>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'},
              </h1>
              <h2 className="text-2xl sm:text-3xl font-semibold text-cg-sage" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                {getContactDisplayName()}
              </h2>
            </div>
          </div>
          {/* Calming nature illustration — same as parent dashboard */}
          <svg className="absolute right-2 bottom-0 w-32 h-32 sm:w-40 sm:h-40 opacity-15" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M160 180c-20-40-60-60-100-50 30-20 70-15 90 10-10-30-40-55-75-55 25-10 55 5 70 35-5-25-20-45-45-55 20 0 40 15 50 40 0-20-10-40-30-50 15 5 30 20 35 40 5-15 0-35-15-45 10 10 20 25 20 45" stroke="var(--cg-sage)" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <path d="M140 190c-10-50-40-80-80-85 20-5 45 10 55 35-5-25-25-45-50-50 15 0 35 15 45 35 0-20-15-35-30-40 15 5 25 20 30 35" stroke="var(--cg-sage)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6"/>
            <circle cx="155" cy="65" r="3" fill="var(--cg-sage)" opacity="0.3"/>
            <circle cx="170" cy="85" r="2" fill="var(--cg-sage)" opacity="0.2"/>
            <circle cx="130" cy="100" r="2.5" fill="var(--cg-sage)" opacity="0.25"/>
          </svg>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
              <X className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-red-600 dark:text-red-400 font-medium text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>{error}</p>
          </div>
        )}

        {/* Parent Coordination Channel */}
        {parentThread && (
          <div className="mb-6">
            <button
              onClick={() => router.push('/my-circle/contact/chat')}
              disabled={!parentThread.is_active || !parentThread.is_verified}
              className={cn(
                'w-full bg-card rounded-2xl border border-border p-5 text-left transition-all',
                'hover:border-cg-sage/40 hover:shadow-lg hover:shadow-cg-sage/5',
                (!parentThread.is_active || !parentThread.is_verified) &&
                  'opacity-60 cursor-not-allowed hover:border-border hover:shadow-none'
              )}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cg-sage/20 to-cg-slate/20 dark:from-cg-sage/30 dark:to-cg-slate/30 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-6 w-6 text-cg-sage" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4
                      className="font-bold text-foreground truncate"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      Message {parentThread.parent_name}
                    </h4>
                    {parentThreadUnread > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-cg-sage text-white text-[10px] font-semibold flex items-center justify-center">
                        {parentThreadUnread}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs text-muted-foreground mt-0.5"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {!parentThread.is_active
                      ? 'This contact is no longer active.'
                      : !parentThread.is_verified
                      ? 'Waiting on verification.'
                      : 'Coordinate plans directly — ARIA monitored.'}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
            </button>
          </div>
        )}

        {/* Connection Section Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-cg-sage/10 dark:bg-cg-sage/20 flex items-center justify-center">
              <HandHeart className="h-4 w-4 text-cg-sage" />
            </div>
            <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Your Connections
            </h3>
          </div>
          <p className="text-sm text-muted-foreground ml-[42px]" style={{ fontFamily: "'Inter', sans-serif" }}>
            The children you&apos;re approved to connect with
          </p>
        </div>

        {/* Empty State */}
        {children.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-10 text-center shadow-sm">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E8F4F8] to-border dark:from-cg-sage/20 dark:to-cg-slate/20 flex items-center justify-center mx-auto mb-5">
              <Users className="h-10 w-10 text-cg-sage" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Awaiting Connections
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
              Once a parent adds you to their circle and approves your access,
              you&apos;ll see the children you can connect with here.
            </p>
            <p className="text-sm text-cg-sage dark:text-cg-sage-light mt-4 font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
              Your patience and presence mean everything.
            </p>
          </div>
        ) : (
          /* Children Grid */
          <div className="grid gap-4 md:grid-cols-2">
            {children.map((child) => {
              const status = canCommunicate(child.permissions);
              const displayName = getDisplayName(child);
              const photoUrl = getDisplayPhoto(child);
              const permCount = getPermissionCount(child.permissions);

              return (
                <div
                  key={child.child_id}
                  className={cn(
                    'group bg-card rounded-2xl border border-border p-5 cursor-pointer transition-all duration-300',
                    'hover:border-cg-sage/40 hover:shadow-lg hover:shadow-cg-sage/5',
                    !status.allowed && 'opacity-60 cursor-not-allowed hover:border-border hover:shadow-none'
                  )}
                  onClick={() => status.allowed && setSelectedChild(child)}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar — tap to edit */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(child);
                      }}
                      className="relative flex-shrink-0 group/avatar"
                      aria-label={`Edit ${displayName}`}
                    >
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E8F4F8] to-cg-amber/20 dark:from-cg-sage/20 dark:to-cg-amber/10 flex items-center justify-center text-4xl shadow-sm overflow-hidden">
                        {photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photoUrl} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          getChildAvatar(child.avatar_id)
                        )}
                      </div>
                      {/* Edit overlay */}
                      <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                        <Pencil className="w-4 h-4 text-white" />
                      </div>
                      {status.allowed && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-cg-sage rounded-full border-2 border-card flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-lg font-bold text-foreground truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          {displayName}
                        </h3>
                        <span className={cn(
                          'px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full',
                          status.allowed
                            ? 'bg-cg-sage/10 text-cg-sage dark:bg-cg-sage/20 dark:text-cg-sage-light'
                            : 'bg-muted text-muted-foreground'
                        )} style={{ fontFamily: "var(--font-mono)" }}>
                          {status.allowed ? 'Online' : 'Offline'}
                        </span>
                      </div>

                      {overrides[child.child_id]?.nickname && (
                        <p className="text-[10px] text-cg-sage dark:text-cg-sage-light mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                          ✏️ Custom name
                        </p>
                      )}

                      {/* Permission Icons */}
                      <div className="flex gap-1.5 mb-2.5">
                        {child.permissions.can_video_call && (
                          <div className="p-1.5 bg-cg-sage/10 dark:bg-cg-sage/20 rounded-lg" title="Video Calls">
                            <Video className="h-3.5 w-3.5 text-cg-sage" />
                          </div>
                        )}
                        {child.permissions.can_voice_call && (
                          <div className="p-1.5 bg-cg-slate/10 dark:bg-cg-slate/20 rounded-lg" title="Voice Calls">
                            <Phone className="h-3.5 w-3.5 text-cg-slate dark:text-cg-slate-light" />
                          </div>
                        )}
                        {child.permissions.can_chat && (
                          <div className="p-1.5 bg-cg-amber/10 dark:bg-cg-amber/20 rounded-lg" title="Chat">
                            <MessageCircle className="h-3.5 w-3.5 text-cg-amber" />
                          </div>
                        )}
                        {child.permissions.can_theater && (
                          <div className="p-1.5 bg-foreground/10 dark:bg-cg-slate-light/15 rounded-lg" title="Watch Together">
                            <Film className="h-3.5 w-3.5 text-foreground dark:text-cg-slate-light" />
                          </div>
                        )}
                        <span className="text-[10px] text-muted-foreground self-center ml-1" style={{ fontFamily: "var(--font-mono)" }}>
                          {permCount} {permCount === 1 ? 'mode' : 'modes'}
                        </span>
                      </div>

                      {/* Schedule */}
                      {(child.permissions.allowed_start_time || (child.permissions.allowed_days && child.permissions.allowed_days.length > 0)) && (
                        <div className="space-y-1">
                          {child.permissions.allowed_start_time && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                              <Clock className="h-3 w-3" />
                              <span style={{ fontFamily: "var(--font-mono)" }}>
                                {formatTime(child.permissions.allowed_start_time)} – {formatTime(child.permissions.allowed_end_time)}
                              </span>
                            </div>
                          )}
                          {child.permissions.allowed_days && child.permissions.allowed_days.length > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                              <Calendar className="h-3 w-3" />
                              <span>{formatDays(child.permissions.allowed_days)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Unavailable Reason */}
                      {!status.allowed && status.reason && (
                        <p className="mt-2 text-xs text-cg-amber font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {status.reason}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    {status.allowed && (
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-cg-sage transition-colors flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Encouraging Message — moved below connections */}
        <div className="mt-8 mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cg-sage/10 dark:bg-cg-sage/20 rounded-full mb-4 border border-cg-sage/20">
            <Star className="h-4 w-4 text-cg-amber" />
            <span className="text-sm font-semibold text-cg-slate dark:text-cg-slate-light" style={{ fontFamily: "'Inter', sans-serif" }}>
              You&apos;re Part of Something Special
            </span>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Thank You for Being Here
          </h3>
          <p className="text-muted-foreground max-w-xl mx-auto mb-3 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
            You&apos;re part of a trusted circle helping to keep a child grounded in love and connection.
            In times of change, <span className="text-cg-sage dark:text-cg-sage-light font-medium">you are their constant</span>.
          </p>
          <p className="text-sm text-cg-sage dark:text-cg-sage-light italic flex items-center justify-center gap-2" style={{ fontFamily: "'Inter', sans-serif" }}>
            <Sparkles className="h-4 w-4" />
            {encouragingMessage}
          </p>
        </div>

        {/* Trust & Safety Section */}
        <div className="mt-4 mb-8">
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-cg-sage/10 dark:bg-cg-sage/20 flex items-center justify-center shadow-sm flex-shrink-0">
                <Shield className="h-6 w-6 text-cg-sage" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-foreground mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  A Safe Space for Connection
                </h4>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                  CommonGround creates a protected environment where children can stay connected
                  with the people who matter most.
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cg-slate/10 dark:bg-cg-slate/20 flex items-center justify-center flex-shrink-0">
                      <Eye className="h-4 w-4 text-cg-slate dark:text-cg-slate-light" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>Monitored</p>
                      <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                        Parents are notified of all communications
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cg-amber/10 dark:bg-cg-amber/20 flex items-center justify-center flex-shrink-0">
                      <Lock className="h-4 w-4 text-cg-amber" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>Approved</p>
                      <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                        Access controlled by parents
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cg-sage/10 dark:bg-cg-sage/20 flex items-center justify-center flex-shrink-0">
                      <CommonGroundLogo size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>Child-First</p>
                      <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                        Everything revolves around their wellbeing
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-1.5" style={{ fontFamily: "'Inter', sans-serif" }}>
            <span className="text-cg-slate dark:text-cg-slate-light font-semibold">&quot;It takes a village to raise a child&quot;</span>
          </p>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
            Thank you for being part of this child&apos;s village.
            Your love and consistency help them find their <span className="font-semibold text-cg-sage dark:text-cg-sage-light">common ground</span>.
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
            className="bg-card max-w-sm w-full rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 text-center">
              {/* Avatar */}
              <div className="relative inline-block mb-6">
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-[#E8F4F8] to-cg-amber/20 dark:from-cg-sage/20 dark:to-cg-amber/10 flex items-center justify-center text-7xl mx-auto shadow-lg overflow-hidden">
                  {getDisplayPhoto(selectedChild) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={getDisplayPhoto(selectedChild)!} alt={getDisplayName(selectedChild)} className="w-full h-full object-cover" />
                  ) : (
                    getChildAvatar(selectedChild.avatar_id)
                  )}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-cg-sage/10 text-cg-sage dark:bg-cg-sage/20 dark:text-cg-sage-light border border-cg-sage/20 shadow-sm" style={{ fontFamily: "var(--font-mono)" }}>
                    Ready to Connect
                  </span>
                </div>
              </div>

              {/* Name */}
              <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {getDisplayName(selectedChild)}
              </h2>
              <p className="text-muted-foreground mb-1 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                is excited to hear from you!
              </p>
              <p className="text-sm text-cg-sage dark:text-cg-sage-light mb-6 font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                Choose how to connect
              </p>

              {/* Call Options */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {selectedChild.permissions.can_video_call && (
                  <button
                    onClick={() => handleStartCall(selectedChild, 'video')}
                    disabled={isStartingCall}
                    className={cn(
                      'flex flex-col items-center gap-2.5 p-5 rounded-2xl transition-all duration-200',
                      'bg-gradient-to-br from-cg-sage/10 to-cg-sage/20 hover:from-cg-sage/20 hover:to-cg-sage/30 active:scale-95',
                      'dark:from-cg-sage/20 dark:to-cg-sage/10 dark:hover:from-cg-sage/30 dark:hover:to-cg-sage/20',
                      'border border-cg-sage/20 hover:border-cg-sage/40',
                      'disabled:opacity-50 disabled:active:scale-100'
                    )}
                  >
                    {isStartingCall ? (
                      <Loader2 className="h-10 w-10 text-cg-sage animate-spin" />
                    ) : (
                      <Video className="h-10 w-10 text-cg-sage" />
                    )}
                    <span className="font-bold text-cg-sage dark:text-cg-sage-light text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Video Call
                    </span>
                  </button>
                )}
                {selectedChild.permissions.can_voice_call && (
                  <button
                    onClick={() => handleStartCall(selectedChild, 'voice')}
                    disabled={isStartingCall}
                    className={cn(
                      'flex flex-col items-center gap-2.5 p-5 rounded-2xl transition-all duration-200',
                      'bg-gradient-to-br from-cg-slate/10 to-cg-slate/20 hover:from-cg-slate/20 hover:to-cg-slate/30 active:scale-95',
                      'dark:from-cg-slate/20 dark:to-cg-slate/10 dark:hover:from-cg-slate/30 dark:hover:to-cg-slate/20',
                      'border border-cg-slate/20 hover:border-cg-slate/40',
                      'disabled:opacity-50 disabled:active:scale-100'
                    )}
                  >
                    {isStartingCall ? (
                      <Loader2 className="h-10 w-10 text-cg-slate dark:text-cg-slate-light animate-spin" />
                    ) : (
                      <Phone className="h-10 w-10 text-cg-slate dark:text-cg-slate-light" />
                    )}
                    <span className="font-bold text-cg-slate dark:text-cg-slate-light text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Voice Call
                    </span>
                  </button>
                )}
              </div>

              {/* Chat & Theater Options */}
              {(selectedChild.permissions.can_chat || selectedChild.permissions.can_theater) && (
                <div className="flex justify-center gap-3 mb-5">
                  {selectedChild.permissions.can_chat && (
                    <button
                      onClick={() => {
                        setSelectedChild(null);
                        router.push(`/my-circle/contact/chat/${selectedChild.child_id}`);
                      }}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200',
                        'bg-gradient-to-br from-cg-amber/10 to-cg-amber/20',
                        'hover:from-cg-amber/20 hover:to-cg-amber/30',
                        'dark:from-cg-amber/15 dark:to-cg-amber/10',
                        'dark:hover:from-cg-amber/25 dark:hover:to-cg-amber/15',
                        'active:scale-95 border border-cg-amber/20 hover:border-cg-amber/40',
                      )}
                    >
                      <MessageCircle className="h-8 w-8 text-cg-amber" />
                      <span className="font-bold text-sm text-cg-amber" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Chat</span>
                    </button>
                  )}
                  {selectedChild.permissions.can_theater && (
                    <button
                      disabled
                      className="flex flex-col items-center gap-2 p-4 bg-muted/50 rounded-2xl opacity-50 border border-border"
                      title="Coming soon!"
                    >
                      <Film className="h-8 w-8 text-muted-foreground" />
                      <span className="font-bold text-sm text-muted-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Theater</span>
                    </button>
                  )}
                </div>
              )}

              {/* Cancel */}
              <button
                className="w-full py-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-sm transition-colors"
                onClick={() => setSelectedChild(null)}
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {editChild && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={() => setEditChild(null)}
        >
          <div
            className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl p-6 pb-safe border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle — mobile */}
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5 sm:hidden" />

            <h3 className="text-xl font-bold text-foreground mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Customize Contact
            </h3>
            <p className="text-xs text-muted-foreground mb-5" style={{ fontFamily: "'Inter', sans-serif" }}>
              Only you can see these changes
            </p>

            {/* Photo picker */}
            <div className="flex justify-center mb-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative group"
                aria-label="Change photo"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-[#E8F4F8] to-cg-amber/20 dark:from-cg-sage/20 dark:to-cg-amber/10 flex items-center justify-center shadow-xl">
                  {editPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editPhoto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl">{getChildAvatar(editChild.avatar_id)}</span>
                  )}
                </div>
                {/* Camera overlay */}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-cg-sage flex items-center justify-center shadow-lg border-2 border-card">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            {/* Name input */}
            <div className="mb-6">
              <label className="text-xs font-semibold uppercase tracking-widest mb-2 block text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                Nickname
              </label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder={editChild.child_name}
                className="w-full px-4 py-3 rounded-xl text-base bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent transition-all"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                maxLength={30}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setEditChild(null)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground transition-colors"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cg-sage to-cg-slate text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-cg-sage/20"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <Check className="w-4 h-4" /> Save
              </button>
            </div>

            {/* Remove customization */}
            {(overrides[editChild.child_id]?.nickname || overrides[editChild.child_id]?.photoDataUrl) && (
              <button
                onClick={() => {
                  const updated = { ...overrides };
                  delete updated[editChild.child_id];
                  setOverridesState(updated);
                  saveOverrides(updated);
                  setEditChild(null);
                }}
                className="w-full mt-3 py-2.5 text-sm text-muted-foreground hover:text-red-500 transition-colors"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Reset to original
              </button>
            )}
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={() => setShowProfileEdit(false)}
        >
          <div
            className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl p-6 pb-safe border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle — mobile */}
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5 sm:hidden" />

            <h3 className="text-xl font-bold text-foreground mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Your Profile
            </h3>
            <p className="text-xs text-muted-foreground mb-5" style={{ fontFamily: "'Inter', sans-serif" }}>
              Update your name and photo
            </p>

            {/* Photo picker */}
            <div className="flex justify-center mb-6">
              <button
                onClick={() => profileFileInputRef.current?.click()}
                className="relative group"
                aria-label="Change profile photo"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-cg-sage to-cg-slate flex items-center justify-center shadow-xl text-white text-4xl font-bold">
                  {profileEditPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profileEditPhoto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    (profileEditName || userData?.contactName || '?').charAt(0).toUpperCase()
                  )}
                </div>
                {/* Camera overlay */}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-cg-sage flex items-center justify-center shadow-lg border-2 border-card">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </button>
              <input
                ref={profileFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfileImageUpload}
              />
            </div>

            {/* Name input */}
            <div className="mb-6">
              <label className="text-xs font-semibold uppercase tracking-widest mb-2 block text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                Display Name
              </label>
              <input
                type="text"
                value={profileEditName}
                onChange={e => setProfileEditName(e.target.value)}
                placeholder={userData?.contactName || 'Your name'}
                className="w-full px-4 py-3 rounded-xl text-base bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent transition-all"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                maxLength={40}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowProfileEdit(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground transition-colors"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={saveProfileEdit}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cg-sage to-cg-slate text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-cg-sage/20"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <Check className="w-4 h-4" /> Save
              </button>
            </div>

            {/* Remove customization */}
            {(contactProfile.displayName || contactProfile.photoDataUrl) && (
              <button
                onClick={() => {
                  setContactProfile({});
                  saveContactProfile({});
                  setShowProfileEdit(false);
                }}
                className="w-full mt-3 py-2.5 text-sm text-muted-foreground hover:text-red-500 transition-colors"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Reset to original
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
