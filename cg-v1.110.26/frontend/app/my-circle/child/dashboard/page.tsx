'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Video,
  Phone,
  MessageCircle,
  Film,
  LogOut,
  Loader2,
  Heart,
  Star,
  Sparkles,
} from 'lucide-react';
import { ChildContact, kidcomsAPI, ChildSessionCreate } from '@/lib/api';
import { ChildIncomingCallBanner } from '@/components/kidcoms/child-incoming-call-banner';
import { CGChildBottomNav } from '@/components/cg';
import { cn } from '@/lib/utils';

/* =============================================================================
   Child Dashboard - Kid-Friendly Interface
   "The Playful Sanctuary" - Fun, colorful, large touch targets
   ============================================================================= */

const ROOM_COLORS = [
  'from-teal-400 to-emerald-500',
  'from-cyan-400 to-teal-500',
  'from-emerald-400 to-green-500',
  'from-orange-400 to-amber-500',
  'from-rose-400 to-pink-500',
  'from-blue-400 to-cyan-500',
  'from-violet-400 to-purple-500',
  'from-amber-400 to-orange-500',
  'from-lime-400 to-emerald-500',
  'from-sky-400 to-blue-500',
];

const RELATIONSHIP_EMOJIS: Record<string, string> = {
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

const AVATAR_EMOJIS = ['🦄', '🐶', '🐱', '🐼', '🦊', '🐰', '🦁', '🐻', '🐨', '🐸', '🦋', '🌈'];

interface ChildUserData {
  userId: string;
  childId: string;
  childName: string;
  avatarId?: string;
  familyFileId: string;
}

export default function ChildDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [contacts, setContacts] = useState<ChildContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChildContact | null>(null);
  const [isStartingCall, setIsStartingCall] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  function loadUserData() {
    try {
      const token = localStorage.getItem('child_token');
      const userStr = localStorage.getItem('child_user');

      if (!token || !userStr) {
        router.push('/my-circle/child');
        return;
      }

      const user = JSON.parse(userStr) as ChildUserData;
      setUserData(user);

      // Load contacts from stored login response
      const storedContacts = localStorage.getItem('child_contacts');
      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      }

      // Mock contacts for demo (would come from login response)
      if (!storedContacts) {
        setContacts([
          {
            contact_id: '1',
            contact_type: 'parent_a',
            display_name: 'Mom',
            room_number: 1,
            can_video_call: true,
            can_voice_call: true,
            can_chat: true,
            can_theater: true,
          },
          {
            contact_id: '2',
            contact_type: 'parent_b',
            display_name: 'Dad',
            room_number: 2,
            can_video_call: true,
            can_voice_call: true,
            can_chat: true,
            can_theater: true,
          },
        ]);
      }

      setIsLoading(false);
    } catch {
      router.push('/my-circle/child');
    }
  }

  function handleLogout() {
    localStorage.removeItem('child_token');
    localStorage.removeItem('child_user');
    localStorage.removeItem('child_contacts');
    router.push('/my-circle/child');
  }

  async function handleStartCall(contact: ChildContact, type: 'video' | 'voice') {
    setIsStartingCall(true);
    try {
      // Create session via API
      const sessionData: ChildSessionCreate = {
        contact_type: contact.contact_type,
        contact_id: contact.contact_id,
        session_type: type === 'video' ? 'video_call' : 'voice_call',
      };

      const response = await kidcomsAPI.createChildSession(sessionData);

      // Store session info for the call page
      localStorage.setItem('child_call_session', JSON.stringify({
        sessionId: response.session_id,
        roomUrl: response.room_url,
        token: response.token,
        participantName: response.participant_name,
        contactName: contact.display_name,
        callType: type,
      }));

      // Redirect to the call page
      router.push(`/my-circle/child/call?session=${response.session_id}`);
    } catch (error) {
      console.error('Failed to start call:', error);
      alert(error instanceof Error ? error.message : 'Failed to start call. Please try again.');
      setIsStartingCall(false);
      setSelectedContact(null);
    }
  }

  function getEmoji(contact: ChildContact) {
    return RELATIONSHIP_EMOJIS[contact.relationship || contact.contact_type] || '💜';
  }

  function getChildAvatar() {
    if (userData?.avatarId) {
      const index = parseInt(userData.avatarId) || 0;
      return AVATAR_EMOJIS[index % AVATAR_EMOJIS.length];
    }
    return '🦄';
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-emerald-400 to-cyan-400 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-white/30 flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-white animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-white/50 animate-ping" />
          </div>
          <p className="text-white text-lg font-bold">Loading your circle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-emerald-400 to-cyan-400 pb-24">
      {/* Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-48 h-48 bg-emerald-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-20 w-40 h-40 bg-cyan-300/20 rounded-full blur-3xl" />
      </div>

      {/* Incoming Call Banner */}
      <ChildIncomingCallBanner />

      {/* Header */}
      <header className="relative bg-white/20 backdrop-blur-md border-b-4 border-white/30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-white/30 flex items-center justify-center text-4xl shadow-lg ring-4 ring-white/50">
                  {getChildAvatar()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-3 border-white" />
              </div>
              <div className="text-white">
                <h1 className="text-2xl font-black drop-shadow-md">
                  Hi {userData?.childName}!
                </h1>
                <p className="text-white/90 font-medium">
                  Who do you want to talk to? 💬
                </p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl text-white transition-all hover:scale-105 active:scale-95"
              aria-label="Log out"
            >
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-4xl mx-auto px-4 py-6">
        {/* Rooms Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Contact Rooms */}
          {contacts.map((contact) => (
            <button
              key={contact.contact_id}
              onClick={() => setSelectedContact(contact)}
              className={cn(
                'relative bg-gradient-to-br rounded-3xl p-5 text-white shadow-xl',
                'hover:scale-105 hover:shadow-2xl active:scale-100',
                'transition-all duration-200 ease-out',
                'aspect-square flex flex-col items-center justify-center',
                'ring-4 ring-white/30',
                ROOM_COLORS[contact.room_number % ROOM_COLORS.length]
              )}
            >
              {/* Room Number Badge */}
              <div className="absolute top-3 right-3 w-8 h-8 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-sm font-black shadow-inner">
                {contact.room_number}
              </div>

              {/* Avatar */}
              <div className="text-6xl mb-2 drop-shadow-lg">{getEmoji(contact)}</div>

              {/* Name */}
              <span className="font-black text-xl drop-shadow-md">{contact.display_name}</span>

              {/* Relationship */}
              {contact.relationship && (
                <span className="text-white/80 text-sm capitalize mt-1 font-medium">
                  {contact.relationship.replace('_', ' ')}
                </span>
              )}

              {/* Online Indicator */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1">
                <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_2px_rgba(74,222,128,0.5)]" />
                <span className="text-xs font-bold">Online</span>
              </div>
            </button>
          ))}

          {/* Empty Rooms */}
          {Array.from({ length: Math.max(0, 8 - contacts.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 aspect-square flex flex-col items-center justify-center text-white/40 border-4 border-dashed border-white/20"
            >
              <div className="text-5xl mb-2 opacity-50">🏠</div>
              <span className="text-sm font-bold">Empty Room</span>
              <span className="text-xs mt-1">Room {contacts.length + i + 1}</span>
            </div>
          ))}
        </div>

        {/* Fun Stats */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="bg-white/20 backdrop-blur-md rounded-3xl p-5 text-white text-center border-4 border-white/30 shadow-xl">
            <div className="w-14 h-14 bg-pink-400/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <div className="text-4xl font-black drop-shadow-md">{contacts.length}</div>
            <div className="text-sm font-bold text-white/80 mt-1">People in My Circle</div>
          </div>
          <div className="bg-white/20 backdrop-blur-md rounded-3xl p-5 text-white text-center border-4 border-white/30 shadow-xl">
            <div className="w-14 h-14 bg-yellow-400/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Star className="h-8 w-8 text-white" />
            </div>
            <div className="text-4xl font-black drop-shadow-md">0</div>
            <div className="text-sm font-bold text-white/80 mt-1">Calls This Week</div>
          </div>
        </div>

        {/* Fun Message */}
        <div className="mt-6 text-center">
          <p className="text-white/70 text-sm font-medium">
            Tap a room to video or voice call! 📞✨
          </p>
        </div>
      </main>

      {/* Call Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Avatar */}
            <div className="relative inline-block">
              <div className="text-8xl drop-shadow-lg">{getEmoji(selectedContact)}</div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                Online
              </div>
            </div>

            {/* Name */}
            <h2 className="text-3xl font-black text-gray-800 mt-6 mb-1">
              {selectedContact.display_name}
            </h2>
            {selectedContact.relationship && (
              <p className="text-gray-500 font-medium capitalize mb-6">
                {selectedContact.relationship.replace('_', ' ')}
              </p>
            )}

            {/* Call Options */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {selectedContact.can_video_call && (
                <button
                  onClick={() => handleStartCall(selectedContact, 'video')}
                  disabled={isStartingCall}
                  className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
                >
                  {isStartingCall ? (
                    <Loader2 className="h-10 w-10 text-white animate-spin" />
                  ) : (
                    <Video className="h-10 w-10 text-white" />
                  )}
                  <span className="font-black text-white text-lg">Video</span>
                </button>
              )}
              {selectedContact.can_voice_call && (
                <button
                  onClick={() => handleStartCall(selectedContact, 'voice')}
                  disabled={isStartingCall}
                  className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-blue-400 to-indigo-500 hover:from-blue-500 hover:to-indigo-600 rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
                >
                  {isStartingCall ? (
                    <Loader2 className="h-10 w-10 text-white animate-spin" />
                  ) : (
                    <Phone className="h-10 w-10 text-white" />
                  )}
                  <span className="font-black text-white text-lg">Voice</span>
                </button>
              )}
            </div>

            {/* Other Options (Coming Soon) */}
            <div className="flex justify-center gap-3 mb-6">
              {selectedContact.can_chat && (
                <button
                  disabled
                  className="p-4 bg-purple-100 rounded-2xl opacity-50 transition-all"
                  title="Coming soon!"
                >
                  <MessageCircle className="h-7 w-7 text-purple-500" />
                </button>
              )}
              {selectedContact.can_theater && (
                <button
                  disabled
                  className="p-4 bg-orange-100 rounded-2xl opacity-50 transition-all"
                  title="Coming soon!"
                >
                  <Film className="h-7 w-7 text-orange-500" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-4">Chat & Movies coming soon!</p>

            {/* Cancel */}
            <button
              onClick={() => setSelectedContact(null)}
              className="w-full py-4 bg-gray-100 hover:bg-gray-200 rounded-2xl text-gray-600 font-bold text-lg transition-all hover:scale-[1.02] active:scale-100"
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <CGChildBottomNav />
    </div>
  );
}
