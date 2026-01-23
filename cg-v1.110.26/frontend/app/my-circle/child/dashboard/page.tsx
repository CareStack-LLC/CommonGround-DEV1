'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, BookOpen, Gamepad2, Film, MessageCircle } from 'lucide-react';
import { ARIAMascot } from '@/components/kidcoms/aria-mascot';
import { KidDashboardCard } from '@/components/kidcoms/kid-dashboard-card';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { KidComsLogo } from '@/components/kidcoms/kidcoms-logo';
import { theaterContent } from '@/lib/theater-content';

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

export default function ChildDashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [contacts, setContacts] = useState<ChildContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // Get featured movie
  const featuredMovie = theaterContent.videos[0];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <ARIAMascot
            state="loading"
            greeting="Loading your circle..."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 pb-24">
      {/* Header with Greeting */}
      <header className="relative bg-white/90 backdrop-blur-sm border-b-2 border-purple-100">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-3">
            <KidComsLogo size="md" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-800 tracking-tight">
            HEY {userData?.childName?.toUpperCase() || 'FRIEND'}!
          </h1>
        </div>
      </header>

      {/* ARIA Mascot Section */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <ARIAMascot
          state="greeting"
          greeting="What do you want to do today?"
        />
      </div>

      {/* Card Grid */}
      <main className="max-w-4xl mx-auto px-6 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* MY CIRCLE Card */}
          <KidDashboardCard
            title="MY CIRCLE"
            icon={<Users className="w-full h-full" />}
            color="purple"
            badge={contacts.length > 0 ? contacts.length : undefined}
            onClick={() => router.push('/my-circle/child/my-circle-page')}
          />

          {/* READ WITH ME LIBRARY Card */}
          <KidDashboardCard
            title="READ WITH ME LIBRARY"
            icon={<BookOpen className="w-full h-full" />}
            color="blue"
            onClick={() => router.push('/my-circle/child/library')}
          />

          {/* ARCADE Card */}
          <KidDashboardCard
            title="ARCADE"
            icon={<Gamepad2 className="w-full h-full" />}
            color="pink"
            onClick={() => router.push('/my-circle/child/arcade')}
          />

          {/* NEW MOVIE Card */}
          <KidDashboardCard
            title="NEW MOVIE"
            subtitle={featuredMovie?.title || 'Watch something fun!'}
            icon={<Film className="w-full h-full" />}
            color="green"
            onClick={() => router.push('/my-circle/child/movies')}
          />

          {/* MESSAGES Card (Future Feature - Disabled) */}
          <KidDashboardCard
            title="MESSAGES"
            subtitle="Coming Soon!"
            icon={<MessageCircle className="w-full h-full" />}
            color="amber"
            onClick={() => {
              // Future feature
            }}
            disabled
          />
        </div>
      </main>

      {/* Bottom Navigation */}
      <KidBottomNav />
    </div>
  );
}
