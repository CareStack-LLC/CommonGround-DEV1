'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, BookOpen, Gamepad2, Film } from 'lucide-react';
import { KidDashboardCard } from '@/components/kidcoms/kid-dashboard-card';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-700" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white pb-20">
      {/* Header - Minimal, modern */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 border-b border-slate-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-slate-900 text-xl" style={{ fontFamily: 'Space Grotesk, DM Sans, sans-serif' }}>
              Hey {userData?.childName || 'friend'} 👋
            </h1>
            <p className="text-sm text-slate-500" style={{ fontFamily: 'Inter, DM Sans, sans-serif' }}>
              What do you want to do today?
            </p>
          </div>
        </div>
      </header>

      {/* Main Content - Card Grid */}
      <main className="p-4 pb-8">
        <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
            {/* MOVIES Card - Red (Netflix vibe) */}
            <KidDashboardCard
              title="MOVIES"
              subtitle={featuredMovie?.title || 'Watch something fun!'}
              icon={<Film className="w-full h-full" />}
              color="red"
              onClick={() => router.push('/my-circle/child/movies')}
              className="w-full h-[200px]"
            />

            {/* BOOKS Card - Amber (warm, inviting) */}
            <KidDashboardCard
              title="BOOKS"
              icon={<BookOpen className="w-full h-full" />}
              color="amber"
              onClick={() => router.push('/my-circle/child/library')}
              className="w-full h-[200px]"
            />

            {/* GAMES Card - Purple (playful tech) */}
            <KidDashboardCard
              title="GAMES"
              icon={<Gamepad2 className="w-full h-full" />}
              color="purple"
              onClick={() => router.push('/my-circle/child/arcade')}
              className="w-full h-[200px]"
            />

            {/* MY CIRCLE Card - Teal (communication) */}
            <KidDashboardCard
              title="MY CIRCLE"
              icon={<Users className="w-full h-full" />}
              color="teal"
              badge={contacts.length > 0 ? contacts.length : undefined}
              onClick={() => router.push('/my-circle/child/my-circle-page')}
              className="w-full h-[200px]"
            />
        </div>
      </main>

      {/* Bottom Navigation */}
      <KidBottomNav />
    </div>
  );
}
