'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ARIAMascot } from '@/components/kidcoms/aria-mascot';
import { KidContactCard } from '@/components/kidcoms/kid-contact-card';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { kidcomsAPI } from '@/lib/api';
import { Users } from 'lucide-react';

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

const AVATAR_COLORS = [
  'from-teal-500 to-emerald-500',
  'from-cyan-500 to-teal-500',
  'from-amber-500 to-orange-400',
  'from-red-500 to-orange-500',
];

export default function MyCirclePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [contacts, setContacts] = useState<ChildContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingCall, setIsStartingCall] = useState(false);

  useEffect(() => {
    validateAndLoadUser();
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
        try {
          setContacts(JSON.parse(contactsStr) as ChildContact[]);
        } catch {
          setContacts([]);
        }
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

  const userInitial = userData?.childName?.charAt(0).toUpperCase() || 'K';
  const avatarGradient = AVATAR_COLORS[(userData?.childName?.length || 0) % AVATAR_COLORS.length];

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
          {contacts.map(contact => (
            <KidContactCard
              key={contact.contact_id}
              contact={contact}
              onCall={() => handleCall(contact, 'voice')}
              onVideo={() => handleCall(contact, 'video')}
            />
          ))}
        </div>
      </main>

      <KidBottomNav />

      {isStartingCall && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <ARIAMascot state="loading" greeting="Starting your call..." />
          </div>
        </div>
      )}
    </div>
  );
}
