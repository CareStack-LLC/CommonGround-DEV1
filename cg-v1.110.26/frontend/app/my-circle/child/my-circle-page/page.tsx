'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ARIAMascot } from '@/components/kidcoms/aria-mascot';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { kidcomsAPI } from '@/lib/api';
import { Users, Phone, Video, Camera, X, Check, Pencil } from 'lucide-react';

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
}

// Local override stored in localStorage — child's side only
interface ContactOverride {
  nickname?: string;
  photoDataUrl?: string;
}

const AVATAR_COLORS = [
  'from-teal-500 to-emerald-500',
  'from-cyan-500 to-teal-500',
  'from-amber-500 to-orange-400',
  'from-red-500 to-orange-500',
  'from-pink-500 to-rose-500',
  'from-violet-500 to-purple-500',
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

export default function MyCirclePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [contacts, setContacts] = useState<ChildContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, ContactOverride>>({});

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
  }, []);

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <ARIAMascot state="loading" greeting="Loading your circle..." />
        </div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 pb-24">
        <header className="bg-slate-950/95 backdrop-blur-lg border-b border-slate-800/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/25">
                <Users className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="font-black text-white text-xl" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>My Circle</h1>
                <p className="text-slate-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>Your people</p>
              </div>
            </div>
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center ring-2 ring-offset-2 ring-offset-slate-950 ring-teal-500/50`}>
              <span className="text-white font-bold text-sm">{userInitial}</span>
            </div>
          </div>
        </header>

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
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Dark header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-lg border-b border-slate-800/60">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/25">
              <Users className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-black text-white text-xl" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                My Circle
              </h1>
              <p className="text-slate-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
                {contacts.length} {contacts.length === 1 ? 'person' : 'people'} to call
              </p>
            </div>
          </div>

          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center ring-2 ring-offset-2 ring-offset-slate-950 ring-teal-500/50`}>
            <span className="text-white font-bold text-sm">{userInitial}</span>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        <div className="space-y-3">
          {contacts.map(contact => {
            const displayName = getDisplayName(contact);
            const photoUrl = getDisplayPhoto(contact);
            const emoji = CONTACT_EMOJIS[contact.contact_type] || CONTACT_EMOJIS.other;
            const avatarColor = getAvatarColor(contact);

            return (
              <div
                key={contact.contact_id}
                className="bg-slate-800/70 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4 hover:border-slate-600 transition-colors"
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
                  <h3 className="text-lg font-black text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {displayName}
                  </h3>
                  {contact.relationship && (
                    <p className="text-sm text-slate-400 font-semibold capitalize truncate" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {contact.relationship.replace('_', ' ')}
                    </p>
                  )}
                  {overrides[contact.contact_id]?.nickname && (
                    <p className="text-[10px] text-teal-400 mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                      ✏️ Custom name
                    </p>
                  )}
                </div>

                {/* Call buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleCall(contact, 'voice')}
                    disabled={!contact.can_voice_call}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${contact.can_voice_call
                      ? 'bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 hover:scale-110 active:scale-95'
                      : 'bg-slate-700 opacity-40 cursor-not-allowed'
                      }`}
                    aria-label={`Call ${displayName}`}
                  >
                    <Phone className="w-8 h-8 text-white" strokeWidth={2.5} />
                  </button>

                  <button
                    onClick={() => handleCall(contact, 'video')}
                    disabled={!contact.can_video_call}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${contact.can_video_call
                      ? 'bg-cyan-500 hover:bg-cyan-400 shadow-lg shadow-cyan-500/30 hover:scale-110 active:scale-95'
                      : 'bg-slate-700 opacity-40 cursor-not-allowed'
                      }`}
                    aria-label={`Video call ${displayName}`}
                  >
                    <Video className="w-8 h-8 text-white" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Calls Section — Match Dashboard Styling */}
        <section className="mt-12 pb-8">
          <h2 className="text-xl font-bold text-white mb-4 px-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Recent Calls
          </h2>
          <div className="bg-slate-800/40 rounded-3xl overflow-hidden border border-slate-800/60 shadow-xl">
            {[
              { name: 'Mom', type: 'video', time: '10 min ago', color: 'from-pink-400 to-rose-500', initial: 'M' },
              { name: 'Dad', type: 'voice', time: '2 hours ago', color: 'from-blue-400 to-indigo-500', initial: 'D' },
              { name: 'Grandma', type: 'video', time: 'Yesterday', color: 'from-emerald-400 to-teal-500', initial: 'G' },
              { name: 'Mom', type: 'video', time: '2 days ago', color: 'from-pink-400 to-rose-500', initial: 'M' },
              { name: 'Alice', type: 'voice', time: '3 days ago', color: 'from-amber-400 to-orange-500', initial: 'A' },
            ].map((call, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40 transition-colors group">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${call.color} flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform`}>
                  <span className="text-white font-black text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{call.initial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{call.name}</h3>
                  <p className="text-slate-500 text-xs flex items-center gap-1.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {call.type === 'video' ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                    {call.type === 'video' ? 'Video Call' : 'Voice Call'} · {call.time}
                  </p>
                </div>
                <button className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-all">
                  {call.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <KidBottomNav />

      {/* ── Edit Contact Modal ── */}
      {editContact && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
          onClick={() => setEditContact(null)}
        >
          <div
            className="w-full bg-slate-900 rounded-t-3xl border-t border-slate-700 p-6 pb-safe"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />

            <h3 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Customize Contact
            </h3>
            <p className="text-slate-400 text-xs mb-5" style={{ fontFamily: 'Inter, sans-serif' }}>
              Only you can see these changes 🔒
            </p>

            {/* Photo picker */}
            <div className="flex justify-center mb-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative group"
                aria-label="Change photo"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-xl">
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
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center border-2 border-slate-900 shadow-lg">
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
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ fontFamily: 'Inter, sans-serif' }}>
                Nickname
              </label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder={editContact.display_name}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-base placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                maxLength={30}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setEditContact(null)}
                className="flex-1 py-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20"
                style={{ fontFamily: 'Inter, sans-serif' }}
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
                className="w-full mt-3 py-2.5 text-slate-500 text-sm hover:text-red-400 transition-colors"
                style={{ fontFamily: 'Inter, sans-serif' }}
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
