'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { theaterContent } from '@/lib/theater-content';

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
  const bookId = params.id as string;

  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [error, setError] = useState<string | null>(null);

  // Find the book
  const book = theaterContent.storybooks.find((b) => b.id === bookId);

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

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error('PDF load error:', error);
    setError('Failed to load the book. Please try again.');
  }

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-lg text-gray-700">Loading...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Book not found</h1>
          <button
            onClick={() => router.push('/my-circle/child/library')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full font-bold"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b-2 border-blue-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/my-circle/child/library')}
                className="text-gray-700 hover:text-blue-600 transition-colors"
                aria-label="Back to library"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{book.title}</h1>
                {book.author && (
                  <p className="text-sm text-gray-600">by {book.author}</p>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Zoom Controls */}
              <button
                onClick={zoomOut}
                className="p-2 rounded-lg bg-white hover:bg-gray-100 border border-gray-300 transition-colors"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-5 h-5 text-gray-700" />
              </button>
              <span className="text-sm font-semibold text-gray-700">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="p-2 rounded-lg bg-white hover:bg-gray-100 border border-gray-300 transition-colors"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* PDF Viewer */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-3xl shadow-xl p-6 min-h-[600px]">
          {error ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <p className="text-red-600 font-semibold mb-4">{error}</p>
                <button
                  onClick={() => router.push('/my-circle/child/library')}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full font-bold"
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
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
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
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-110'
                    )}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <div className="bg-white px-6 py-2 rounded-full shadow-md border-2 border-blue-200">
                    <span className="text-lg font-bold text-gray-800">
                      Page {pageNumber} of {numPages}
                    </span>
                  </div>

                  <button
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                    className={cn(
                      'p-3 rounded-full shadow-lg transition-all',
                      pageNumber >= numPages
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-110'
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
