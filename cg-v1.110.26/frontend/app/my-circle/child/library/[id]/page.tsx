'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OriginalsBadge } from '@/components/kidcoms/originals-badge';
import { useRealtimeBookRead } from '@/hooks/use-realtime-book-read';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ChildUserData {
  userId: string;
  childId: string;
  childName: string;
  avatarId?: string;
  familyFileId: string;
}

export default function BookReaderPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const bookId = params.id as string;

  // Read-together is opt-in via ?together=1 (kid clicks "Read with a
  // grown-up" from the library). Once enabled, we subscribe to the
  // broadcast channel AND announce the current page on every turn.
  const togetherMode = searchParams?.get('together') === '1';

  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [error, setError] = useState<string | null>(null);
  const [togetherStatus, setTogetherStatus] = useState<
    'subscribing' | 'connected' | 'error'
  >('subscribing');
  // Suppress the broadcast when the page change came FROM the remote
  // side (otherwise we'd echo it back and start a loop).
  const remoteDrivenRef = useRef<boolean>(false);

  // Fetch book from API
  const [book, setBook] = useState<{ id: string; title: string; url: string; cover: string; pages: number; author: string } | null>(null);

  useEffect(() => {
    validateAndLoadUser();
    const fetchBook = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/kidspace/books?limit=50`);
        if (res.ok) {
          const data = await res.json();
          const items = data.books || data || [];
          const found = items.find((b: any) => b.id === bookId);
          if (found) {
            setBook({
              id: found.id,
              title: found.title,
              url: found.pdf_url || '',
              cover: found.cover_url || '',
              pages: found.page_count || 0,
              author: found.author_name || found.author?.name || '',
            });
          }
        }
      } catch {
        // API unavailable
      }
    };
    fetchBook();
  }, [bookId]);

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

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error('PDF load error:', error);
    setError('Failed to load the book. Please try again.');
  }

  // Broadcast to the remote side whenever THIS client turned the page.
  // `remoteDrivenRef` is flipped when we snap to the other side's page,
  // preventing the echo.
  const { sendPageChange } = useRealtimeBookRead({
    bookId: togetherMode ? bookId : null,
    childId: togetherMode ? userData?.childId ?? null : null,
    senderId: userData?.childId ?? 'anon',
    onPageReceived: (remotePage) => {
      if (remotePage < 1) return;
      remoteDrivenRef.current = true;
      setPageNumber(remotePage);
    },
    onStatusChange: setTogetherStatus,
  });

  useEffect(() => {
    if (!togetherMode) return;
    if (remoteDrivenRef.current) {
      // Local state caught up to the remote page — clear the flag and
      // skip the broadcast so we don't loop.
      remoteDrivenRef.current = false;
      return;
    }
    sendPageChange(pageNumber);
  }, [pageNumber, togetherMode, sendPageChange]);

  function goToPrevPage() {
    setPageNumber((prev) => Math.max(1, prev - 1));
  }

  function goToNextPage() {
    setPageNumber((prev) => Math.min(numPages, prev + 1));
  }

  function zoomIn() {
    setScale((prev) => Math.min(2.0, prev + 0.2));
  }

  function zoomOut() {
    setScale((prev) => Math.max(0.6, prev - 0.2));
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--portal-background)' }}>
        <div className="text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>Loading...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--portal-background)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>Book not found</h1>
          <button
            onClick={() => router.push('/my-circle/child/library')}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-full font-bold hover:scale-105 active:scale-95 transition-all"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--portal-background)' }}>
      {togetherMode && (
        <div
          className={cn(
            'w-full text-center py-2 text-sm font-semibold',
            togetherStatus === 'connected'
              ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white'
              : togetherStatus === 'error'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-50 text-amber-700',
          )}
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          <span className="inline-flex items-center gap-2">
            <Users className="w-4 h-4" />
            {togetherStatus === 'connected'
              ? 'Reading together — turn a page, they\u2019ll see it too'
              : togetherStatus === 'error'
                ? 'Could not sync the pages. You can keep reading on your own.'
                : 'Connecting\u2026'}
          </span>
        </div>
      )}

      {/* Header */}
      <header className="backdrop-blur-lg sticky top-0 z-10" style={{ background: 'var(--portal-background)', borderBottom: '1px solid var(--portal-border)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/my-circle/child/library')}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: 'var(--portal-surface)', color: 'var(--portal-text-heading)' }}
                aria-label="Back to library"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold truncate" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
                    {book.title}
                  </h1>
                  <OriginalsBadge size="sm" />
                </div>
                {book.author && (
                  <p className="text-xs truncate" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>by {book.author}</p>
                )}
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={zoomOut}
                className="p-2 rounded-xl transition-colors"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }}
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold min-w-[3rem] text-center" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--portal-text)' }}>
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="p-2 rounded-xl transition-colors"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }}
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* PDF Viewer */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="rounded-2xl shadow-xl p-4 min-h-[600px]" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
          {error ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <p className="text-red-500 font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>{error}</p>
                <button
                  onClick={() => router.push('/my-circle/child/library')}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-full font-bold hover:scale-105 active:scale-95 transition-all"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Back to Library
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* PDF Document */}
              <div className="flex justify-center">
                <Document
                  file={book.url}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex items-center justify-center h-[600px]">
                      <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="shadow-lg"
                  />
                </Document>
              </div>

              {/* Page Navigation */}
              {numPages > 0 && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  <button
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                    className={cn(
                      'p-3 rounded-full shadow-lg transition-all',
                      pageNumber <= 1
                        ? 'opacity-40 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:scale-110 active:scale-95'
                    )}
                    style={pageNumber <= 1 ? { background: 'var(--portal-surface)', color: 'var(--portal-muted)' } : undefined}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <div className="px-5 py-2 rounded-full" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                    <span className="text-sm font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--portal-text-heading)' }}>
                      {pageNumber} / {numPages}
                    </span>
                  </div>

                  <button
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                    className={cn(
                      'p-3 rounded-full shadow-lg transition-all',
                      pageNumber >= numPages
                        ? 'opacity-40 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:scale-110 active:scale-95'
                    )}
                    style={pageNumber >= numPages ? { background: 'var(--portal-surface)', color: 'var(--portal-muted)' } : undefined}
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
