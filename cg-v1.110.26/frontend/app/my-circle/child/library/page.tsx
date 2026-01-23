'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ARIAMascot } from '@/components/kidcoms/aria-mascot';
import { KidBookCard } from '@/components/kidcoms/kid-book-card';
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

export default function LibraryPage() {
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

  function handleBookSelect(book: typeof theaterContent.storybooks[0]) {
    console.log('Selected book:', book);
    alert(`Coming soon: ${book.title}! 📚`);
    // Future: Navigate to PDF reader or theater reading mode
    // router.push(`/my-circle/child/library/${book.id}`);
  }

  const books = theaterContent.storybooks;
  const featuredBook = books[0];

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <ARIAMascot state="loading" greeting="Loading library..." />
        </div>
      </div>
    );
  }

  // Empty state - no books
  if (books.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-24">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-sm border-b-2 border-purple-100">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <KidComsLogo size="sm" className="mb-3" />
            <h1 className="text-2xl font-black text-gray-800">READ WITH ME LIBRARY</h1>
            <p className="text-gray-600 mt-1">Read amazing stories!</p>
          </div>
        </header>

        {/* Empty State */}
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-6">
            <ARIAMascot
              state="idle"
              greeting="No stories available right now. Check back soon!"
            />
          </div>
        </div>

        {/* Bottom Navigation */}
        <KidBottomNav />
      </div>
    );
  }

  // Normal state with books
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-24">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b-2 border-purple-100">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <KidComsLogo size="sm" className="mb-3" />
          <h1 className="text-2xl font-black text-gray-800">READ WITH ME LIBRARY</h1>
          <p className="text-gray-600 mt-1">Read amazing stories!</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Featured Story Section */}
        {featuredBook && (
          <section>
            <h2 className="text-lg font-bold text-gray-700 mb-3">FEATURED STORY</h2>
            <div className="max-w-md">
              <KidBookCard
                book={featuredBook}
                onClick={() => handleBookSelect(featuredBook)}
              />
            </div>
          </section>
        )}

        {/* All Stories Grid */}
        <section>
          <h2 className="text-lg font-bold text-gray-700 mb-3">ALL STORIES</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {books.map((book) => (
              <KidBookCard
                key={book.id}
                book={book}
                onClick={() => handleBookSelect(book)}
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
