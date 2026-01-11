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

// Set up PDF.js worker - use unpkg CDN for exact version match
// pdfjs.version will be something like "4.x.x" from pdfjs-dist
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface TheaterPdfViewerProps {
  src: string;
  title?: string;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export function TheaterPdfViewer({
  src,
  title,
  currentPage: syncedPage,
  onPageChange,
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
          {/* Synced Indicator */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
            <Users className="h-3.5 w-3.5" />
            <span>Synced</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Zoom controls */}
          <button
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
          <button
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

      {/* Page Navigation */}
      <div className="flex items-center justify-center px-4 py-3 bg-gray-800/90 border-t border-gray-700">
        <div className="flex items-center space-x-4">
          <button
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

          <button
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
