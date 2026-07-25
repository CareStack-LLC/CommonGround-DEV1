'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Users,
  Loader2,
} from 'lucide-react';

// Set up PDF.js worker - use local copy from node_modules for reliability
// Falls back to CDN only if local copy unavailable
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface TheaterPdfViewerProps {
  src: string;
  title?: string;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  isSynced?: boolean;
}

export function TheaterPdfViewer({
  src,
  title,
  currentPage: syncedPage,
  onPageChange,
  isSynced = false,
}: TheaterPdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync to shared page state
  useEffect(() => {
    if (syncedPage !== undefined && syncedPage !== pageNumber && syncedPage >= 1 && syncedPage <= numPages) {
      console.log('PDF: Syncing to page', syncedPage);
      setPageNumber(syncedPage);
    }
  }, [syncedPage, numPages]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
  }

  function onDocumentLoadError(err: Error) {
    console.error('PDF load error:', err);
    setError('Failed to load PDF');
    setIsLoading(false);
  }

  function goToPage(page: number) {
    const newPage = Math.max(1, Math.min(numPages, page));
    setPageNumber(newPage);
    onPageChange?.(newPage);
  }

  function previousPage() {
    goToPage(pageNumber - 1);
  }

  function nextPage() {
    goToPage(pageNumber + 1);
  }

  function zoomIn() {
    setScale((prev) => Math.min(2.0, prev + 0.25));
  }

  function zoomOut() {
    setScale((prev) => Math.max(0.5, prev - 0.25));
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 rounded-xl overflow-hidden">
      {/* Header with title and controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          {title && (
            <h3 className="text-white font-medium text-sm truncate max-w-[200px]">
              {title}
            </h3>
          )}
          {/* Synced Indicator — only shown when another participant is connected */}
          {isSynced && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
              <Users className="h-3.5 w-3.5" />
              <span>Synced</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Zoom controls */}
          <button aria-label="Zoom out"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-1.5 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-gray-400 text-xs w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button aria-label="Zoom in"
            onClick={zoomIn}
            disabled={scale >= 2.0}
            className="p-1.5 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {isLoading && (
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading storybook...</p>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-red-400 mb-2">{error}</p>
            <p className="text-gray-500 text-sm">Please try another storybook</p>
          </div>
        )}

        <Document
          file={src}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className="flex justify-center"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-2xl rounded-lg overflow-hidden"
            loading={
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            }
          />
        </Document>
      </div>

      {/* Read-Along progress bar — updates via the same page sync that Theater
          Mode already broadcasts (no new wiring). When isSynced, both sides
          see the same fill. Clicking seeks to that relative page. */}
      {numPages > 0 && (
        <div className="px-4 pt-2 pb-1 bg-gray-800/90 border-t border-gray-700">
          <button
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const target = Math.max(1, Math.min(numPages, Math.round(ratio * numPages)));
              goToPage(target);
            }}
            className="group relative h-2 w-full rounded-full bg-gray-700 overflow-hidden cursor-pointer"
            aria-label={`Story progress, page ${pageNumber} of ${numPages}`}
          >
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-out"
              style={{ width: `${(pageNumber / numPages) * 100}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${(pageNumber / numPages) * 100}%` }}
            />
          </button>
          <div className="flex items-center justify-between mt-1 text-[11px] text-gray-400">
            <span>{Math.round((pageNumber / numPages) * 100)}% through</span>
            <span>{numPages - pageNumber} {numPages - pageNumber === 1 ? 'page' : 'pages'} left</span>
          </div>
        </div>
      )}

      {/* Page Navigation */}
      <div className="flex items-center justify-center px-4 py-3 bg-gray-800/90 border-t border-gray-700">
        <div className="flex items-center space-x-4">
          <button aria-label="Previous"
            onClick={previousPage}
            disabled={pageNumber <= 1}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-white font-medium">
              Page {pageNumber}
            </span>
            <span className="text-gray-400">of</span>
            <span className="text-white font-medium">{numPages}</span>
          </div>

          <button aria-label="Next"
            onClick={nextPage}
            disabled={pageNumber >= numPages}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
