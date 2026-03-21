'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function SuperAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { section: 'superadmin' },
    });
    console.error('[SuperAdmin] Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-8 max-w-md w-full text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-zinc-200 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-zinc-400 mb-1">
          An unexpected error occurred in the admin portal.
        </p>
        <p className="text-xs text-zinc-600 mb-6 font-mono">
          {error.message || 'Unknown error'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
