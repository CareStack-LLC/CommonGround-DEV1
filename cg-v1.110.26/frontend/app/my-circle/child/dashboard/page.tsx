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
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9] flex items-center justify-center">
        <div className="text-center">
          <ARIAMascot state="loading" greeting="Loading your space..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative pb-24 bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9]">
      {/* Subtle decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.02]">
        <div className="absolute top-32 left-0 w-full h-px bg-[#2C5F5D]" />
        <div className="absolute top-64 right-0 w-3/4 h-px bg-[#D97757]" />
        <div className="absolute bottom-64 left-0 w-2/3 h-px bg-[#2C5F5D]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header with Greeting */}
        <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <KidComsLogo size="md" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#2C3E50] tracking-tight">
              Welcome back, {userData?.childName || 'friend'}
            </h1>
            <p className="text-lg text-gray-600 mt-2">
              What would you like to do today?
            </p>
          </div>
        </header>

        {/* ARIA Mascot Section */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex justify-center">
            <div className="relative">
              {/* Subtle glow */}
              <div className="absolute -inset-4 bg-gradient-to-r from-[#2C5F5D]/10 to-[#D97757]/10 rounded-full blur-xl"></div>
              <ARIAMascot
                state="greeting"
                greeting="Choose an activity below"
              />
            </div>
          </div>
        </div>

        {/* Dashboard Cards */}
        <main className="max-w-5xl mx-auto px-6 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* MY CIRCLE Card */}
            <div className="group transform hover:scale-[1.02] transition-all duration-200">
              <KidDashboardCard
                title="MY CIRCLE"
                icon={<Users className="w-full h-full" />}
                color="purple"
                badge={contacts.length > 0 ? contacts.length : undefined}
                onClick={() => router.push('/my-circle/child/my-circle-page')}
                className="border border-[#2C5F5D]/20 hover:border-[#2C5F5D]/40 hover:shadow-lg transition-all"
              />
            </div>

            {/* READ WITH ME LIBRARY Card */}
            <div className="group transform hover:scale-[1.02] transition-all duration-200">
              <KidDashboardCard
                title="READ WITH ME LIBRARY"
                icon={<BookOpen className="w-full h-full" />}
                color="blue"
                onClick={() => router.push('/my-circle/child/library')}
                className="border border-[#2C5F5D]/20 hover:border-[#2C5F5D]/40 hover:shadow-lg transition-all"
              />
            </div>

            {/* ARCADE Card */}
            <div className="group transform hover:scale-[1.02] transition-all duration-200">
              <KidDashboardCard
                title="ARCADE"
                icon={<Gamepad2 className="w-full h-full" />}
                color="pink"
                onClick={() => router.push('/my-circle/child/arcade')}
                className="border border-[#D97757]/20 hover:border-[#D97757]/40 hover:shadow-lg transition-all"
              />
            </div>

            {/* NEW MOVIE Card */}
            <div className="group transform hover:scale-[1.02] transition-all duration-200">
              <KidDashboardCard
                title="NEW MOVIE"
                subtitle={featuredMovie?.title || 'Watch something fun!'}
                icon={<Film className="w-full h-full" />}
                color="green"
                onClick={() => router.push('/my-circle/child/movies')}
                className="border border-[#2C5F5D]/20 hover:border-[#2C5F5D]/40 hover:shadow-lg transition-all"
              />
            </div>

            {/* MESSAGES Card (Future Feature - Disabled) */}
            <div className="group opacity-60">
              <KidDashboardCard
                title="MESSAGES"
                subtitle="Coming Soon!"
                icon={<MessageCircle className="w-full h-full" />}
                color="amber"
                onClick={() => {
                  // Future feature
                }}
                disabled
                className="border border-gray-300"
              />
            </div>
          </div>
        </main>
      </div>

      {/* Bottom Navigation */}
      <KidBottomNav />
    </div>
  );
}
