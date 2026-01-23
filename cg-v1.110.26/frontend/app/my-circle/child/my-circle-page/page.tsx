'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ARIAMascot } from '@/components/kidcoms/aria-mascot';
import { KidContactCard } from '@/components/kidcoms/kid-contact-card';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { KidComsLogo } from '@/components/kidcoms/kidcoms-logo';
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
        console.error('Missing family file ID');
        localStorage.clear();
        router.push('/my-circle/child');
        return;
      }

      setUserData(user);

      if (contactsStr) {
        try {
          const parsedContacts = JSON.parse(contactsStr) as ChildContact[];
          setContacts(parsedContacts);
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
      const sessionData = {
        contact_type: contact.contact_type,
        contact_id: contact.contact_id,
        session_type: (type === 'video' ? 'video_call' : 'voice_call') as 'video_call' | 'voice_call',
      };

      const response = await kidcomsAPI.createChildSession(sessionData);

      localStorage.setItem(
        'child_call_session',
        JSON.stringify({
          sessionId: response.session_id,
          roomUrl: response.room_url,
          token: response.token,
          participantName: response.participant_name,
          contactName: contact.display_name,
          callType: type,
        })
      );

      router.push(`/my-circle/child/call?session=${response.session_id}`);
    } catch (error) {
      console.error('Failed to start call:', error);
      alert('Could not start call. Please try again!');
      setIsStartingCall(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9] flex items-center justify-center">
        <div className="text-center">
          <ARIAMascot state="loading" greeting="Loading your circle..." />
        </div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9] pb-24">
        <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-6 py-6">
            <KidComsLogo size="sm" className="mb-3" />
            <div className="flex items-center gap-2">
              <Users className="w-8 h-8 text-[#2C5F5D]" />
              <h1 className="text-2xl font-bold text-[#2C3E50]">MY CIRCLE</h1>
            </div>
            <p className="text-gray-600 mt-1">Connect with family and friends</p>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-6">
            <ARIAMascot
              state="idle"
              greeting="You don't have any contacts yet. Ask a grown-up to add people to your circle!"
            />
          </div>
        </div>

        <KidBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative pb-24 bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9]">
      {/* Subtle decorative lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.02]">
        <div className="absolute top-32 left-0 w-full h-px bg-[#2C5F5D]" />
        <div className="absolute top-64 right-0 w-3/4 h-px bg-[#D97757]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-6 py-6">
            <KidComsLogo size="sm" className="mb-3" />
            <div className="flex items-center gap-3">
              <Users className="w-10 h-10 text-[#2C5F5D]" />
              <div>
                <h1 className="text-3xl font-bold text-[#2C3E50]">My Circle</h1>
                <p className="text-gray-600 text-sm">
                  {contacts.length} {contacts.length === 1 ? 'person' : 'people'} to call
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-2xl mx-auto px-6 py-6">
          <div className="space-y-4">
            {contacts.map((contact) => (
              <div
                key={contact.contact_id}
                className="group transform hover:scale-[1.01] transition-all duration-200"
              >
                <KidContactCard
                  contact={contact}
                  onCall={() => handleCall(contact, 'voice')}
                  onVideo={() => handleCall(contact, 'video')}
                  className="border border-gray-200 hover:border-[#2C5F5D]/40 hover:shadow-lg transition-all"
                />
              </div>
            ))}
          </div>
        </main>
      </div>

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
