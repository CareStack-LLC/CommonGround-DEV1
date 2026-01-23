'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ARIAMascot } from '@/components/kidcoms/aria-mascot';
import { KidContactCard } from '@/components/kidcoms/kid-contact-card';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { KidComsLogo } from '@/components/kidcoms/kidcoms-logo';
import { kidcomsAPI } from '@/lib/api';

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

      // Validate token and user data exist
      if (!token || !userStr) {
        router.push('/my-circle/child');
        return;
      }

      const user = JSON.parse(userStr) as ChildUserData;

      // CRITICAL: Validate family file ID
      if (!user.familyFileId) {
        console.error('Missing family file ID');
        localStorage.clear();
        router.push('/my-circle/child');
        return;
      }

      setUserData(user);

      // Load contacts if available
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

      // Store session info for the call page
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

      // Navigate to call page
      router.push(`/my-circle/child/call?session=${response.session_id}`);
    } catch (error) {
      console.error('Failed to start call:', error);
      alert('Could not start call. Please try again! 😊');
      setIsStartingCall(false);
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <ARIAMascot state="loading" greeting="Loading your circle..." />
        </div>
      </div>
    );
  }

  // Empty state - no contacts
  if (contacts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 pb-24">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-sm border-b-2 border-purple-100">
          <div className="max-w-2xl mx-auto px-6 py-6">
            <KidComsLogo size="sm" className="mb-3" />
            <h1 className="text-2xl font-black text-gray-800">MY CIRCLE</h1>
            <p className="text-gray-600 mt-1">Call someone you love!</p>
          </div>
        </header>

        {/* Empty State */}
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-6">
            <ARIAMascot
              state="idle"
              greeting="You don't have any contacts yet. Ask a grown-up to add people to your circle!"
            />
          </div>
        </div>

        {/* Bottom Navigation */}
        <KidBottomNav />
      </div>
    );
  }

  // Normal state with contacts
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 pb-24">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b-2 border-purple-100">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <KidComsLogo size="sm" className="mb-3" />
          <h1 className="text-2xl font-black text-gray-800">MY CIRCLE</h1>
          <p className="text-gray-600 mt-1">Call someone you love!</p>
        </div>
      </header>

      {/* Contact List */}
      <main className="max-w-2xl mx-auto px-6 py-6">
        <div className="space-y-4">
          {contacts.map((contact) => (
            <KidContactCard
              key={contact.contact_id}
              contact={contact}
              onCall={() => handleCall(contact, 'voice')}
              onVideo={() => handleCall(contact, 'video')}
            />
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <KidBottomNav />

      {/* Loading overlay when starting a call */}
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
