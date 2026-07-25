'use client';

/**
 * Parent-side "read together" book reader.
 *
 * Entered from the family-files page with `?childId={id}`. Subscribes
 * to the same broadcast channel as the kid's reader
 * (`book-read:{bookId}:{childId}`) so page turns on either side sync
 * instantly. The kid sees the parent's turns; the parent sees the
 * kid's.
 *
 * Skill-sharing: the reader render code (react-pdf) mirrors the kid
 * library reader at `/my-circle/child/library/[id]/page.tsx`. Kept
 * as-is (copy) rather than extracted so the kid page's kidspace theme
 * tokens don't bleed into the parent portal.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { useAuth } from '@/lib/auth-context';
import { useRealtimeBookRead } from '@/hooks/use-realtime-book-read';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface BookPayload {
  id: string;
  title: string;
  author_name?: string | null;
  pdf_url?: string | null;
  page_count?: number;
}

function ReaderContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const familyFileId = params?.id as string;
  const bookId = params?.bookId as string;
  const childId = searchParams?.get('childId') || null;

  const [book, setBook] = useState<BookPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [togetherStatus, setTogetherStatus] = useState<
    'subscribing' | 'connected' | 'error'
  >('subscribing');
  const remoteDrivenRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/kidspace/books?limit=50`);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const items: BookPayload[] = data.books || data || [];
        const found = items.find((b) => b.id === bookId);
        if (cancelled) return;
        if (found) setBook(found);
        else setError('Book not found');
      } catch {
        if (!cancelled) setError('Could not load the book catalog.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  // Sync channel — requires a childId in the URL. Without it we silently
  // skip the sync (still useful as a solo parent-side preview).
  const { sendPageChange } = useRealtimeBookRead({
    bookId: childId ? bookId : null,
    childId,
    senderId: user?.id ?? 'parent',
    onPageReceived: (page) => {
      remoteDrivenRef.current = true;
      setPageNumber(page);
    },
    onStatusChange: setTogetherStatus,
  });

  useEffect(() => {
    if (!childId) return;
    if (remoteDrivenRef.current) {
      remoteDrivenRef.current = false;
      return;
    }
    sendPageChange(pageNumber);
  }, [childId, pageNumber, sendPageChange]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      {childId && (
        <div
          className={cn(
            'w-full text-center py-2 text-sm font-medium border-b',
            togetherStatus === 'connected'
              ? 'bg-gradient-to-r from-cg-amber to-cg-amber text-white border-transparent'
              : togetherStatus === 'error'
                ? 'bg-cg-error-subtle text-[#9B2C2C] border-cg-error-subtle'
                : 'bg-cg-amber-subtle text-[#E09520] border-cg-amber-subtle',
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Users className="w-4 h-4" />
            {togetherStatus === 'connected'
              ? 'Reading together — your page turns are shared'
              : togetherStatus === 'error'
                ? 'Sync unavailable — you can still read solo'
                : 'Connecting\u2026'}
          </span>
        </div>
      )}

      <header className="bg-card border-b-2 border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push(`/family-files/${familyFileId}`)}
            className="p-2 rounded-xl hover:bg-muted transition-all"
            aria-label="Back to family file"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">
              {book?.title || 'Loading\u2026'}
            </h1>
            {book?.author_name && (
              <p className="text-xs text-muted-foreground truncate">
                by {book.author_name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
              className="p-2 rounded-xl hover:bg-muted"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono tabular-nums min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(2.0, s + 0.2))}
              className="p-2 rounded-xl hover:bg-muted"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <div className="rounded-2xl shadow-xl bg-card border-2 border-border p-4 min-h-[600px]">
          {error ? (
            <div className="flex items-center justify-center h-[600px]">
              <p className="text-cg-error font-semibold">{error}</p>
            </div>
          ) : !book?.pdf_url ? (
            <div className="flex items-center justify-center h-[600px]">
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <Document
                  file={book.pdf_url}
                  onLoadSuccess={({ numPages }) => {
                    setNumPages(numPages);
                    setError(null);
                  }}
                  onLoadError={(e) => {
                    console.error('PDF load error:', e);
                    setError('Failed to load the book.');
                  }}
                  loading={
                    <div className="flex items-center justify-center h-[600px]">
                      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer
                    renderAnnotationLayer
                    className="shadow-lg"
                  />
                </Document>
              </div>

              {numPages > 0 && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  <button
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                    disabled={pageNumber <= 1}
                    className={cn(
                      'p-3 rounded-full shadow transition-all',
                      pageNumber <= 1
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-[var(--portal-primary)] text-white hover:scale-110 active:scale-95',
                    )}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className="px-5 py-2 rounded-full bg-muted">
                    <span className="text-sm font-mono tabular-nums">
                      {pageNumber} / {numPages}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setPageNumber((p) => Math.min(numPages, p + 1))
                    }
                    disabled={pageNumber >= numPages}
                    className={cn(
                      'p-3 rounded-full shadow transition-all',
                      pageNumber >= numPages
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-[var(--portal-primary)] text-white hover:scale-110 active:scale-95',
                    )}
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

export default function ParentReadTogetherPage() {
  return (
    <ProtectedRoute>
      <ReaderContent />
    </ProtectedRoute>
  );
}
