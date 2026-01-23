'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ARIAMascot } from '@/components/kidcoms/aria-mascot';
import { KidMovieCard } from '@/components/kidcoms/kid-movie-card';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { KidComsLogo } from '@/components/kidcoms/kidcoms-logo';
import { theaterContent } from '@/lib/theater-content';
import { Film } from 'lucide-react';

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
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.clear();
      router.push('/my-circle/child');
    }
  }

  function handleVideoSelect(video: typeof theaterContent.videos[0]) {
    router.push(`/my-circle/child/movies/${video.id}`);
  }

  const videos = theaterContent.videos;
  const featuredVideo = videos[0];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9] flex items-center justify-center">
        <div className="text-center">
          <ARIAMascot state="loading" greeting="Loading movies..." />
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9] pb-24">
        <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <KidComsLogo size="sm" className="mb-3" />
            <div className="flex items-center gap-3">
              <Film className="w-10 h-10 text-[#2C5F5D]" />
              <h1 className="text-2xl font-bold text-[#2C3E50]">MOVIES</h1>
            </div>
            <p className="text-gray-600 mt-1">Watch fun videos</p>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-6">
            <ARIAMascot
              state="idle"
              greeting="No movies available right now. Check back soon!"
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
          <div className="max-w-5xl mx-auto px-6 py-6">
            <KidComsLogo size="sm" className="mb-3" />
            <div className="flex items-center gap-3">
              <Film className="w-10 h-10 text-[#2C5F5D]" />
              <div>
                <h1 className="text-3xl font-bold text-[#2C3E50]">Movies</h1>
                <p className="text-gray-600 text-sm">Watch and enjoy</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
          {/* Featured Movie Section */}
          {featuredVideo && (
            <section>
              <h2 className="text-xl font-bold text-[#2C3E50] mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-[#D97757] rounded-full"></span>
                Featured Movie
              </h2>
              <div className="max-w-2xl mx-auto">
                <div className="group transform hover:scale-[1.02] transition-all duration-200">
                  <KidMovieCard
                    video={featuredVideo}
                    onClick={() => handleVideoSelect(featuredVideo)}
                    className="border border-[#2C5F5D]/20 hover:border-[#2C5F5D]/40 hover:shadow-lg transition-all"
                  />
                </div>
              </div>
            </section>
          )}

          {/* All Movies Grid */}
          <section>
            <h2 className="text-xl font-bold text-[#2C3E50] mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#2C5F5D] rounded-full"></span>
              All Movies
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="group transform hover:scale-[1.02] transition-all duration-200"
                >
                  <KidMovieCard
                    video={video}
                    onClick={() => handleVideoSelect(video)}
                    className="border border-gray-200 hover:border-[#2C5F5D]/40 hover:shadow-lg transition-all"
                  />
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      <KidBottomNav />
    </div>
  );
}
