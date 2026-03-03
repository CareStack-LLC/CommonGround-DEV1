'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ARIAMascot } from '@/components/kidcoms/aria-mascot';
import { KidContactCard } from '@/components/kidcoms/kid-contact-card';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { KidComsLogo } from '@/components/kidcoms/kidcoms-logo';
import { circleCallsAPI, circleAPI } from '@/lib/api';
import { Users, Clock, AlertCircle } from 'lucide-react';

interface ChildUserData {
  userId: string;
  childId: string;
  childName: string;
  avatarId?: string;
  familyFileId: string;
}

interface CircleContact {
  id: string;
  contact_name: string;
  relationship: string;
  contact_type: string;
  profile_picture?: string;
  permissions: {
    can_video_call: boolean;
    can_voice_call: boolean;
    allowed_days?: string[];
    allowed_start_time?: string;
    allowed_end_time?: string;
    max_call_duration_minutes?: number;
    require_parent_present?: boolean;
  };
  is_available_now: boolean;
  availability_message?: string;
}

export default function CircleContactsPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [contacts, setContacts] = useState<CircleContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateAndLoadUser();
  }, []);

  async function validateAndLoadUser() {
    try {
      const token = localStorage.getItem('child_token');
      const userStr = localStorage.getItem('child_user');

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

      // Load circle contacts for this child
      await loadCircleContacts(user.familyFileId, user.childId);
    } catch (error) {
      console.error('Failed to load user:', error);
      setError('Failed to load your contacts');
      setIsLoading(false);
    }
  }

  async function loadCircleContacts(familyFileId: string, childId: string) {
    try {
      const response = await circleAPI.list(familyFileId, { childId });
      setContacts(response.items as any);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load circle contacts:', err);
      setError('Could not load your circle contacts');
      setIsLoading(false);
    }
  }

  async function handleCallContact(contact: CircleContact, callType: 'video' | 'audio') {
    if (isStartingCall || !userData) return;

    // Check if calls are allowed
    if (callType === 'video' && !contact.permissions.can_video_call) {
      alert('Video calls are not available with this contact');
      return;
    }
    if (callType === 'audio' && !contact.permissions.can_voice_call) {
      alert('Voice calls are not available with this contact');
      return;
    }

    // Check availability
    if (!contact.is_available_now) {
      alert(contact.availability_message || 'This contact is not available right now');
      return;
    }

    setIsStartingCall(true);
    try {
      // Initiate circle call (bidirectional)
      const response = await circleCallsAPI.initiateCall({
        circle_contact_id: contact.id,
        child_id: userData.childId,
        call_type: callType,
      }, 'child');

      // Store session data for call screen
      localStorage.setItem(
        'circle_call_session',
        JSON.stringify({
          sessionId: response.session_id,
          roomUrl: response.room_url,
          token: response.token,
          callType: response.call_type,
          status: response.status,
          contactName: contact.contact_name,
          childName: userData.childName,
        })
      );

      // Navigate to circle call screen
      router.push(`/my-circle/child/circle-call/${response.session_id}`);
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9] flex items-center justify-center p-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#2C3E50] mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/my-circle/child/dashboard')}
            className="px-6 py-3 bg-[#2C5F5D] text-white rounded-full font-semibold hover:bg-[#2C5F5D]/90 transition-all"
          >
            Go Back
          </button>
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
              <h1 className="text-2xl font-bold text-[#2C3E50]">Circle Contacts</h1>
            </div>
            <p className="text-gray-600 mt-1">Call your family and friends</p>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-6">
            <ARIAMascot
              state="idle"
              greeting="You don't have any circle contacts yet. Ask a grown-up to add people!"
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
                <h1 className="text-3xl font-bold text-[#2C3E50]">Circle Contacts</h1>
                <p className="text-gray-600 text-sm">
                  {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} available
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
                key={contact.id}
                className="group transform hover:scale-[1.01] transition-all duration-200"
              >
                {/* Availability Indicator */}
                {!contact.is_available_now && contact.availability_message && (
                  <div className="mb-2 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">
                    <Clock className="h-4 w-4" />
                    <span>{contact.availability_message}</span>
                  </div>
                )}

                <KidContactCard
                  contact={{
                    contact_id: contact.id,
                    display_name: contact.contact_name,
                    contact_type: contact.relationship,
                    relationship: contact.relationship,
                    can_video_call: contact.permissions.can_video_call && contact.is_available_now,
                    can_voice_call: contact.permissions.can_voice_call && contact.is_available_now,
                  }}
                  onCall={() => handleCallContact(contact, 'audio')}
                  onVideo={() => handleCallContact(contact, 'video')}
                  className="border border-gray-200 hover:border-[#2C5F5D]/40 hover:shadow-lg transition-all"
                />

                {/* Call restrictions info */}
                {contact.permissions.max_call_duration_minutes && (
                  <div className="mt-2 text-xs text-gray-500 px-4">
                    ⏱️ Max {contact.permissions.max_call_duration_minutes} min per call
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>

      <KidBottomNav />

      {/* Loading overlay when starting call */}
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
