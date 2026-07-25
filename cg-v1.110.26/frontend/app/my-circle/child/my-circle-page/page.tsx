'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ARIAMascot } from '@/components/kidcoms/aria-mascot';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { KidSpaceHeader } from '@/components/kidcoms/kidspace-header';
import { kidcomsAPI, circleCallsAPI, ChildCallHistoryEntry } from '@/lib/api';
import { Users, Phone, Video, MessageCircle, Camera, X, Check, Pencil, Loader2, Shield } from 'lucide-react';
import { ARIAHelper } from '@/components/kidcoms/aria-helper';

interface ChildUserData {
  userId: string;
  childId: string;
  childName: string;
  avatarId?: string;
  familyFileId: string;
}

interface ChildContact {
  contact_id: string;
  display_name: string;
  contact_type: 'parent_a' | 'parent_b' | 'circle';
  relationship?: string;
  can_video_call: boolean;
  can_voice_call: boolean;
  can_chat?: boolean;
}

// Local override stored in localStorage — child's side only
interface ContactOverride {
  nickname?: string;
  photoDataUrl?: string;
}

const AVATAR_COLORS = [
  'from-cg-sage to-emerald-500',
  'from-cg-slate-light to-cg-sage',
  'from-amber-500 to-orange-400',
  'from-red-500 to-orange-500',
  'from-pink-500 to-rose-500',
  'from-cg-slate to-purple-500',
];

const CONTACT_EMOJIS: Record<string, string> = {
  parent_a: '👩',
  parent_b: '👨',
  grandparent: '👴',
  grandma: '👵',
  aunt: '👩‍🦰',
  uncle: '👨‍🦱',
  cousin: '🧒',
  family_friend: '🤗',
  godparent: '💝',
  step_parent: '💕',
  sibling: '👦',
  therapist: '🧠',
  tutor: '📚',
  coach: '⚽',
  other: '💜',
};

const OVERRIDES_KEY = 'kid_contact_overrides';

function getOverrides(): Record<string, ContactOverride> {
  try {
    if (typeof localStorage === 'undefined') return {};
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}');
  } catch { return {}; }
}

function saveOverrides(map: Record<string, ContactOverride>) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(map));
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function MyCirclePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [contacts, setContacts] = useState<ChildContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, ContactOverride>>({});

  const [recentCalls, setRecentCalls] = useState<ChildCallHistoryEntry[]>([]);
  const [callsLoading, setCallsLoading] = useState(true);

  // Edit modal state
  const [editContact, setEditContact] = useState<ChildContact | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhoto, setEditPhoto] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const AVATAR_COLORS_LIST = AVATAR_COLORS;
  const userInitial = userData?.childName?.charAt(0).toUpperCase() || 'K';
  const avatarGradient = AVATAR_COLORS_LIST[(userData?.childName?.length || 0) % AVATAR_COLORS_LIST.length];

  useEffect(() => {
    validateAndLoadUser();
    setOverrides(getOverrides());
    loadRecentCalls();
  }, []);

  async function loadRecentCalls() {
    try {
      const history = await circleCallsAPI.getChildCallHistory(10);
      setRecentCalls(history);
    } catch (err) {
      console.error('Failed to load call history:', err);
    } finally {
      setCallsLoading(false);
    }
  }

  function validateAndLoadUser() {
    try {
      const token = localStorage.getItem('child_token');
      const userStr = localStorage.getItem('child_user');
      const contactsStr = localStorage.getItem('child_contacts');

      if (!token || !userStr) {
        router.push('/my-circle/child');
        return;
      }

      const user = JSON.parse(userStr) as ChildUserData;
      if (!user.familyFileId) {
        localStorage.clear();
        router.push('/my-circle/child');
        return;
      }

      setUserData(user);

      if (contactsStr) {
        try { setContacts(JSON.parse(contactsStr) as ChildContact[]); } catch { setContacts([]); }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.clear();
      router.push('/my-circle/child');
    }
  }

  async function handleCall(contact: ChildContact, type: 'video' | 'voice') {
    if (isStartingCall) return;
    setIsStartingCall(true);
    try {
      const response = await kidcomsAPI.createChildSession({
        contact_type: contact.contact_type,
        contact_id: contact.contact_id,
        session_type: (type === 'video' ? 'video_call' : 'voice_call') as 'video_call' | 'voice_call',
      });

      localStorage.setItem('child_call_session', JSON.stringify({
        sessionId: response.session_id,
        roomUrl: response.room_url,
        token: response.token,
        participantName: response.participant_name,
        contactName: contact.display_name,
        callType: type,
      }));

      router.push(`/my-circle/child/call?session=${response.session_id}`);
    } catch (error) {
      console.error('Failed to start call:', error);
      alert('Could not start call. Please try again!');
      setIsStartingCall(false);
    }
  }

  // Open edit modal
  function openEdit(contact: ChildContact) {
    const override = overrides[contact.contact_id] || {};
    setEditContact(contact);
    setEditName(override.nickname || contact.display_name);
    setEditPhoto(override.photoDataUrl);
  }

  // Save edits to localStorage (child's side only)
  function saveEdit() {
    if (!editContact) return;
    const updated = {
      ...overrides,
      [editContact.contact_id]: {
        nickname: editName.trim() || editContact.display_name,
        photoDataUrl: editPhoto,
      },
    };
    setOverrides(updated);
    saveOverrides(updated);
    setEditContact(null);
  }

  // Handle image file upload
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setEditPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  // Get display values (with local overrides applied)
  function getDisplayName(contact: ChildContact) {
    return overrides[contact.contact_id]?.nickname || contact.display_name;
  }
  function getDisplayPhoto(contact: ChildContact) {
    return overrides[contact.contact_id]?.photoDataUrl;
  }

  function getAvatarColor(contact: ChildContact) {
    const idx = contact.display_name.length % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--portal-background)' }}>
        <div className="text-center">
          <ARIAMascot state="loading" greeting="Loading your circle..." />
        </div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="min-h-screen pb-24" style={{ background: 'var(--portal-background)' }}>
        <KidSpaceHeader
          title="My Circle"
          subtitle="Your people"
          userInitial={userInitial}
          avatarGradient={avatarGradient}
          sticky={false}
        />

        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-6">
            <ARIAMascot state="idle" greeting="No contacts yet. Ask a grown-up to add people to your circle!" />
          </div>
        </div>

        <KidBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--portal-background)' }}>
      {/* Header */}
      <KidSpaceHeader
        title="My Circle"
        subtitle={`${contacts.length} ${contacts.length === 1 ? 'person' : 'people'} in your circle`}
        userInitial={userInitial}
        avatarGradient={avatarGradient}
      />

      <main className="px-4 py-6">
        {/* ARIA monitoring status */}
        <div className="mb-4 flex items-center gap-2 px-1">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-semibold text-emerald-400" style={{ fontFamily: 'var(--portal-font-body)' }}>
              ARIA is watching over your conversations
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        <div className="space-y-3">
          {contacts.map(contact => {
            const displayName = getDisplayName(contact);
            const photoUrl = getDisplayPhoto(contact);
            const emoji = CONTACT_EMOJIS[contact.contact_type] || CONTACT_EMOJIS.other;
            const avatarColor = getAvatarColor(contact);

            return (
              <div
                key={contact.contact_id}
                className="rounded-2xl p-4 flex items-center gap-4 transition-colors"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
              >
                {/* Avatar — tap to edit */}
                <button
                  onClick={() => openEdit(contact)}
                  className="flex-shrink-0 relative group"
                  aria-label={`Edit ${displayName}`}
                >
                  <div className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br ${avatarColor} shadow-lg`}>
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl" role="img" aria-label={displayName}>{emoji}</span>
                    )}
                  </div>
                  {/* Edit overlay */}
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Pencil className="w-5 h-5 text-white" />
                  </div>
                </button>

                {/* Name and relationship */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black truncate" style={{ fontFamily: 'var(--portal-font-heading)', color: 'var(--portal-text-heading)' }}>
                    {displayName}
                  </h3>
                  {contact.relationship && (
                    <p className="text-sm font-semibold capitalize truncate" style={{ fontFamily: 'var(--portal-font-body)', color: 'var(--portal-muted)' }}>
                      {contact.relationship.replace('_', ' ')}
                    </p>
                  )}
                  {overrides[contact.contact_id]?.nickname && (
                    <p className="text-[10px] text-cg-sage mt-0.5" style={{ fontFamily: 'var(--portal-font-body)' }}>
                      ✏️ Custom name
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  {contact.can_chat && (
                    <button
                      onClick={() => router.push(`/my-circle/child/chat/${contact.contact_id}`)}
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 bg-purple-500 hover:bg-purple-400 shadow-lg shadow-purple-500/30 hover:scale-110 active:scale-95"
                      aria-label={`Message ${displayName}`}
                    >
                      <MessageCircle color="white" size={28} strokeWidth={3} className="relative z-10" />
                    </button>
                  )}

                  <button
                    onClick={() => handleCall(contact, 'voice')}
                    disabled={!contact.can_voice_call}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${contact.can_voice_call
                      ? 'bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 hover:scale-110 active:scale-95'
                      : 'opacity-40 cursor-not-allowed'
                      }`}
                    aria-label={`Call ${displayName}`}
                  >
                    <Phone color="white" size={32} strokeWidth={3} className="relative z-10" />
                  </button>

                  <button
                    onClick={() => handleCall(contact, 'video')}
                    disabled={!contact.can_video_call}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${contact.can_video_call
                      ? 'bg-cg-slate-light hover:bg-cg-sage-light shadow-lg shadow-cg-slate-light/30 hover:scale-110 active:scale-95'
                      : 'opacity-40 cursor-not-allowed'
                      }`}
                    aria-label={`Video call ${displayName}`}
                  >
                    <Video color="white" size={32} strokeWidth={3} className="relative z-10" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Calls Section */}
        <section className="mt-12 pb-8">
          <h2 className="text-xl font-bold mb-4 px-1" style={{ fontFamily: 'var(--portal-font-heading)', color: 'var(--portal-text-heading)' }}>
            Recent Calls
          </h2>
          <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', boxShadow: 'var(--portal-shadow-xl)' }}>
            {callsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--portal-muted)' }} />
              </div>
            ) : recentCalls.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Phone className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--portal-muted)' }} />
                <p className="text-sm" style={{ fontFamily: 'var(--portal-font-body)', color: 'var(--portal-text-light)' }}>
                  No calls yet. Tap a contact above to start!
                </p>
              </div>
            ) : (
              recentCalls.map((call) => {
                const initial = call.contact_name?.charAt(0).toUpperCase() || '?';
                const colorIdx = call.contact_name.length % AVATAR_COLORS.length;
                const color = AVATAR_COLORS[colorIdx];
                const isVideo = call.call_type === 'video_call';
                const timeAgo = call.initiated_at ? formatTimeAgo(call.initiated_at) : '';

                return (
                  <div key={call.id} className="flex items-center gap-4 p-4 last:border-0 transition-colors group" style={{ borderBottom: '1px solid var(--portal-divider)' }}>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform`}>
                      <span className="text-white font-black text-lg" style={{ fontFamily: 'var(--portal-font-heading)' }}>{initial}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm" style={{ fontFamily: 'var(--portal-font-heading)', color: 'var(--portal-text-heading)' }}>{call.contact_name}</h3>
                      <p className="text-xs flex items-center gap-1.5" style={{ fontFamily: 'var(--portal-font-body)', color: 'var(--portal-text-light)' }}>
                        {isVideo ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                        {isVideo ? 'Video Call' : 'Voice Call'}
                        {timeAgo && ` · ${timeAgo}`}
                        {call.duration_seconds && ` · ${Math.round(call.duration_seconds / 60)}m`}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--portal-surface-elevated)', color: 'var(--portal-muted)' }}>
                      {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      <KidBottomNav />

      {/* ── Edit Contact Modal ── */}
      {editContact && (
        <div
          className="fixed inset-0 z-50 backdrop-blur-sm flex items-end"
          style={{ background: 'var(--portal-overlay)' }}
          onClick={() => setEditContact(null)}
        >
          <div
            className="w-full rounded-t-3xl p-6 pb-safe"
            style={{ background: 'var(--portal-surface-elevated)', borderTop: '1px solid var(--portal-border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--portal-muted)' }} />

            <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--portal-font-heading)', color: 'var(--portal-text-heading)' }}>
              Customize Contact
            </h3>
            <p className="text-xs mb-5" style={{ fontFamily: 'var(--portal-font-body)', color: 'var(--portal-muted)' }}>
              Only you can see these changes 🔒
            </p>

            {/* Photo picker */}
            <div className="flex justify-center mb-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative group"
                aria-label="Change photo"
              >
                <div className={`w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-cg-sage to-cg-slate-light flex items-center justify-center shadow-xl ${!editPhoto ? 'ring-2 ring-[var(--portal-primary)]/20' : ''}`}>
                  {editPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editPhoto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">{CONTACT_EMOJIS[editContact.contact_type] || '💜'}</span>
                  )}
                </div>
                {/* Camera overlay */}
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-cg-slate-light flex items-center justify-center shadow-lg" style={{ border: '2px solid var(--portal-surface-elevated)' }}>
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
              <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ fontFamily: 'var(--portal-font-body)', color: 'var(--portal-muted)' }}>
                Nickname
              </label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder={editContact.display_name}
                className="w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-cg-slate-light focus:border-transparent transition-all"
                style={{ fontFamily: 'var(--portal-font-heading)', background: 'var(--portal-input-bg)', border: '1px solid var(--portal-input-border)', color: 'var(--portal-text)' }}
                maxLength={30}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setEditContact(null)}
                className="flex-1 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors"
                style={{ fontFamily: 'var(--portal-font-body)', background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-text-light)' }}
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-cg-sage to-cg-slate-light text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-cg-slate-light/20"
                style={{ fontFamily: 'var(--portal-font-body)' }}
              >
                <Check className="w-4 h-4" /> Save
              </button>
            </div>

            {/* Remove customization */}
            {(overrides[editContact.contact_id]?.nickname || overrides[editContact.contact_id]?.photoDataUrl) && (
              <button
                onClick={() => {
                  const updated = { ...overrides };
                  delete updated[editContact.contact_id];
                  setOverrides(updated);
                  saveOverrides(updated);
                  setEditContact(null);
                }}
                className="w-full mt-3 py-2.5 text-sm hover:text-red-400 transition-colors"
                style={{ color: 'var(--portal-text-light)', fontFamily: 'var(--portal-font-body)' }}
              >
                Reset to original
              </button>
            )}
          </div>
        </div>
      )}

      {/* Calling overlay */}
      {isStartingCall && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <ARIAMascot state="loading" greeting="Starting your call..." />
          </div>
        </div>
      )}
    </div>
  );
}
