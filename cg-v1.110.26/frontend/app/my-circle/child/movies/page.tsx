'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ARIAMascot } from '@/components/kidcoms/aria-mascot';
import { KidMovieCard } from '@/components/kidcoms/kid-movie-card';
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

export default function MoviesPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    validateAndLoadUser();
  }, []);

  function validateAndLoadUser() {
    try {
      const token = localStorage.getItem('child_token');
      const userStr = localStorage.getItem('child_user');

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
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.clear();
      router.push('/my-circle/child');
    }
  }

  function handleVideoSelect(video: typeof theaterContent.videos[0]) {
    console.log('Selected video:', video);
    router.push(`/my-circle/child/movies/${video.id}`);
  }

  const videos = theaterContent.videos;
  const featuredVideo = videos[0];

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <ARIAMascot state="loading" greeting="Loading movies..." />
        </div>
      </div>
    );
  }

  // Empty state - no videos
  if (videos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 pb-24">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-sm border-b-2 border-purple-100">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <KidComsLogo size="sm" className="mb-3" />
            <h1 className="text-2xl font-black text-gray-800">MOVIES</h1>
            <p className="text-gray-600 mt-1">Watch fun videos!</p>
          </div>
        </header>

        {/* Empty State */}
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-6">
            <ARIAMascot
              state="idle"
              greeting="No movies available right now. Check back soon!"
            />
          </div>
        </div>

        {/* Bottom Navigation */}
        <KidBottomNav />
      </div>
    );
  }

  // Normal state with videos
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 pb-24">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b-2 border-purple-100">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <KidComsLogo size="sm" className="mb-3" />
          <h1 className="text-2xl font-black text-gray-800">MOVIES</h1>
          <p className="text-gray-600 mt-1">Watch fun videos!</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Featured Movie Section */}
        {featuredVideo && (
          <section>
            <h2 className="text-lg font-bold text-gray-700 mb-3">NEW MOVIE</h2>
            <div className="max-w-md">
              <KidMovieCard
                video={featuredVideo}
                onClick={() => handleVideoSelect(featuredVideo)}
              />
            </div>
          </section>
        )}

        {/* All Movies Grid */}
        <section>
          <h2 className="text-lg font-bold text-gray-700 mb-3">ALL MOVIES</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {videos.map((video) => (
              <KidMovieCard
                key={video.id}
                video={video}
                onClick={() => handleVideoSelect(video)}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <KidBottomNav />
    </div>
  );
}
