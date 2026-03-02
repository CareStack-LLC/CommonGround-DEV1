'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Gamepad2, Film, BookOpen } from 'lucide-react';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { HeroSection } from '@/components/kidcoms/dashboard/hero-section';
import { QuickActionCard } from '@/components/kidcoms/dashboard/quick-action-card';
import { RecentMediaCard } from '@/components/kidcoms/dashboard/recent-media-card';
import { CallHistoryWidget } from '@/components/kidcoms/dashboard/call-history-widget';
import { CalendarWidget } from '@/components/kidcoms/dashboard/calendar-widget';
import { theaterContent } from '@/lib/theater-content';
import type { WatchProgress } from '@/lib/watch-progress';
import type { ReadingProgress } from '@/lib/reading-progress';

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
  const [recentVideos, setRecentVideos] = useState<WatchProgress[]>([]);
  const [recentBooks, setRecentBooks] = useState<ReadingProgress[]>([]);

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

      // Load contacts if available
      if (contactsStr) {
        try {
          const parsedContacts = JSON.parse(contactsStr) as ChildContact[];
          setContacts(parsedContacts);
        } catch {
          setContacts([]);
        }
      }

      // Load media history safely on client only
      const { getRecentlyWatched } = require('@/lib/watch-progress');
      const { getRecentlyRead } = require('@/lib/reading-progress');
      setRecentVideos(getRecentlyWatched());
      setRecentBooks(getRecentlyRead());

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load user:', error);
      if (typeof localStorage !== 'undefined') localStorage.clear();
      router.push('/my-circle/child');
    }
  }

  // recentVideos and recentBooks are loaded from state after auth

  // Combine and sort by last watched/read
  let recentMedia = [
    ...recentVideos.map(v => ({
      ...v,
      type: 'video' as const,
      content: theaterContent.videos.find(vid => vid.id === v.videoId)
    })),
    ...recentBooks.map(b => ({
      ...b,
      type: 'book' as const,
      content: theaterContent.storybooks.find(book => book.id === b.bookId)
    }))
  ]
    .filter(item => item.content) // Only include items with valid content
    .sort((a, b) => {
      const dateA = 'lastWatched' in a ? a.lastWatched : a.lastRead;
      const dateB = 'lastWatched' in b ? b.lastWatched : b.lastRead;
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 4); // Show top 4

  // Mock recently watched data if no real data (for demo purposes)
  if (recentMedia.length === 0 && theaterContent.videos.length > 0) {
    const mockRecentMedia = [
      {
        videoId: theaterContent.videos[0]?.id || 'brave',
        type: 'video' as const,
        progress: 45,
        currentTime: 180,
        duration: 400,
        lastWatched: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        completed: false,
        watchedWith: contacts[0]?.display_name || 'Uncle TJ',
        content: theaterContent.videos[0]
      },
      {
        videoId: theaterContent.videos[1]?.id || 'piper',
        type: 'video' as const,
        progress: 78,
        currentTime: 280,
        duration: 360,
        lastWatched: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        completed: false,
        watchedWith: 'alone',
        content: theaterContent.videos[1]
      }
    ].filter(item => item.content);

    recentMedia = mockRecentMedia as any;
  }

  // Mock call history (TODO: integrate with real call history API)
  const mockCallHistory = [
    {
      id: '1',
      contactName: contacts[0]?.display_name || 'Mom',
      type: 'video' as const,
      duration: '7:32',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: '2',
      contactName: contacts[1]?.display_name || 'Uncle TJ',
      type: 'voice' as const,
      duration: '7:14',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    },
    {
      id: '3',
      contactName: contacts[0]?.display_name || 'Dad',
      type: 'video' as const,
      duration: '12:45',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },
  ];

  // Mock calendar events (TODO: integrate with real family file schedule)
  const mockCalendarEvents = [
    {
      id: '1',
      title: 'Soccer Practice',
      date: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      time: '4:00 PM',
      location: 'West Field',
      type: 'activity' as const,
    },
    {
      id: '2',
      title: 'Visit with Mom',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      time: '5:30 PM',
      type: 'family' as const,
    },
    {
      id: '3',
      title: 'School Project Due',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      time: '9:00 AM',
      type: 'school' as const,
    },
  ];

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white pb-24">
      {/* Main Content */}
      <main className="p-4 space-y-6 max-w-6xl mx-auto">
        {/* Hero Section */}
        <HeroSection
          childName={userData?.childName || 'friend'}
          className="mb-6"
        />

        {/* Quick Actions Grid - 2x2 */}
        <section>
          <h2 className="font-bold text-slate-800 text-lg mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionCard
              title="Call"
              icon={<Phone className="w-full h-full" strokeWidth={2} />}
              color="teal"
              onClick={() => router.push('/my-circle/child/my-circle-page')}
            />
            <QuickActionCard
              title="Games"
              icon={<Gamepad2 className="w-full h-full" strokeWidth={2} />}
              color="purple"
              onClick={() => router.push('/my-circle/child/arcade')}
            />
            <QuickActionCard
              title="Movies"
              icon={<Film className="w-full h-full" strokeWidth={2} />}
              color="red"
              onClick={() => router.push('/my-circle/child/movies')}
            />
            <QuickActionCard
              title="Books"
              icon={<BookOpen className="w-full h-full" strokeWidth={2} />}
              color="amber"
              onClick={() => router.push('/my-circle/child/library')}
            />
          </div>
        </section>

        {/* Recently Watched Section */}
        {recentMedia.length > 0 && (
          <section>
            <h2 className="font-bold text-slate-800 text-lg mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Recently Watched
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {recentMedia.map((item) => {
                if (!item.content) return null;

                return (
                  <RecentMediaCard
                    key={item.type === 'video' ? item.videoId : item.bookId}
                    type={item.type}
                    title={item.content.title}
                    thumbnail={item.type === 'video' ? item.content.thumbnail : item.content.cover}
                    progress={item.type === 'video' ? item.progress :
                      ((item as any).currentPage / (item as any).totalPages) * 100}
                    watchedWith={item.type === 'video' ? item.watchedWith : (item as any).readWith}
                    onResume={() => {
                      if (item.type === 'video') {
                        router.push(`/my-circle/child/movies/${item.videoId}`);
                      } else {
                        router.push(`/my-circle/child/library/${item.bookId}`);
                      }
                    }}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Two Column Layout for Call History and Calendar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recent Calls */}
          <section>
            <CallHistoryWidget
              calls={mockCallHistory}
              onCallClick={(contactName) => {
                if (contactName === 'view_all') {
                  router.push('/my-circle/child/my-circle-page');
                } else {
                  router.push('/my-circle/child/my-circle-page');
                }
              }}
            />
          </section>

          {/* Calendar Widget */}
          <section>
            <CalendarWidget
              events={mockCalendarEvents}
              onEventClick={(eventId) => {
                // TODO: Navigate to calendar when implemented
                console.log('Event clicked:', eventId);
              }}
            />
          </section>
        </div>
      </main>

      {/* Bottom Navigation */}
      <KidBottomNav />
    </div>
  );
}
