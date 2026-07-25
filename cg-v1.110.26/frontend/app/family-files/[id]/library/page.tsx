'use client';

/**
 * Parent-side library picker.
 *
 * Arrived at with `?childId={id}`; lists every visible KidSpace book and
 * links into the synced parent reader at
 * `/family-files/[id]/read/[bookId]?childId=…`. Kids don't see this
 * route — they browse through `/my-circle/child/library`.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, BookOpen, Users } from 'lucide-react';

import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiBook {
  id: string;
  title: string;
  author_name?: string | null;
  description?: string | null;
  cover_url?: string | null;
  pdf_url?: string | null;
  page_count?: number;
  is_featured?: boolean;
}

function LibraryContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const familyFileId = params?.id as string;
  const childId = searchParams?.get('childId');

  const [books, setBooks] = useState<ApiBook[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/kidspace/books?limit=50`);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        if (cancelled) return;
        const items: ApiBook[] = data.books || data || [];
        // Featured first, then alphabetical.
        items.sort((a, b) => {
          if ((b.is_featured ? 1 : 0) !== (a.is_featured ? 1 : 0))
            return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
          return a.title.localeCompare(b.title);
        });
        setBooks(items);
      } catch {
        if (!cancelled) setError('Could not load books.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openBook = (bookId: string) => {
    const qs = childId ? `?childId=${encodeURIComponent(childId)}` : '';
    router.push(`/family-files/${familyFileId}/read/${bookId}${qs}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <header className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push(`/family-files/${familyFileId}`)}
            className="p-2 rounded-xl hover:bg-muted"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div>
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Read together
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Pick a book. Page turns sync to{childId ? ' your child\u2019s screen' : ' the other reader'} automatically.
            </p>
          </div>
        </header>

        {!childId && (
          <div className="mb-4 p-4 rounded-xl bg-cg-amber-subtle border border-cg-amber-subtle text-sm text-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            No child selected — opening a book here will read solo. Use the
            family file page to start a co-read with a specific child.
          </div>
        )}

        {error ? (
          <div className="p-6 rounded-xl bg-cg-error-subtle border border-cg-error-subtle text-[#9B2C2C]">
            {error}
          </div>
        ) : books === null ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            Loading books…
          </div>
        ) : books.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            The library is empty. Ask an admin to seed KidSpace books.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {books.map((book) => (
              <button
                key={book.id}
                onClick={() => openBook(book.id)}
                className="text-left group bg-card border-2 border-border rounded-2xl overflow-hidden shadow hover:shadow-xl transition-all"
              >
                <div className="relative w-full aspect-[2/3] bg-muted">
                  {book.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                  {book.is_featured && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cg-amber text-white">
                      FEATURED
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-bold text-foreground truncate">
                    {book.title}
                  </h3>
                  {book.author_name && (
                    <p className="text-xs text-muted-foreground truncate">
                      by {book.author_name}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FamilyLibraryPage() {
  return (
    <ProtectedRoute>
      <LibraryContent />
    </ProtectedRoute>
  );
}
