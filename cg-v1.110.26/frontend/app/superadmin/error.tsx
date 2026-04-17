'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, Database, PlugZap, Key, RefreshCw } from 'lucide-react';

/**
 * SuperAdmin error boundary.
 *
 * Catches unhandled exceptions bubbling out of any /superadmin/* page and
 * turns the generic message into something an admin can act on. We pattern-
 * match on the error text for three common failure modes the admin portal
 * hits in partial environments:
 *
 *   1. 503 + "table not yet created" / "relation … does not exist"
 *      → a migration hasn't run. Tell the admin to run alembic.
 *   2. "not_connected" / "oauth"
 *      → an integration (GA4, Gmail) isn't authed. Tell the admin to connect.
 *   3. "client_configured" / "GOOGLE_OAUTH_CLIENT_SECRET"
 *      → an env var is missing on the backend. Tell the admin to set it.
 *
 * Anything else falls through to the original generic card. Sentry capture
 * is untouched so we still get a full stack trace.
 */

type Classification = {
  icon: typeof AlertTriangle;
  title: string;
  body: string;
  hint?: string;
};

function classify(message: string): Classification {
  const m = message.toLowerCase();

  if (
    /relation .* does not exist/i.test(message) ||
    /table .* (not yet created|missing|does not exist)/i.test(message) ||
    /503/.test(message)
  ) {
    return {
      icon: Database,
      title: 'This module needs a database migration',
      body:
        'A required table is missing in this environment. Run ' +
        '`alembic upgrade head` against the backend database, then reload.',
      hint: message,
    };
  }

  if (
    m.includes('client_configured') ||
    /google_oauth_client_secret/i.test(message) ||
    /env(ironment)? var/i.test(m)
  ) {
    return {
      icon: Key,
      title: 'An environment variable isn\u2019t set on the backend',
      body:
        'This integration needs a server-side credential that isn\u2019t configured. ' +
        'Ask an engineer to set the missing env var (Render \u2192 Environment) and restart the API.',
      hint: message,
    };
  }

  if (
    m.includes('not_connected') ||
    m.includes('oauth') ||
    m.includes('not connected')
  ) {
    return {
      icon: PlugZap,
      title: 'This integration isn\u2019t connected yet',
      body:
        'Complete the OAuth flow from the integration\u2019s settings page, ' +
        'then return here.',
      hint: message,
    };
  }

  return {
    icon: AlertTriangle,
    title: 'Something went wrong',
    body: 'An unexpected error occurred in the admin portal.',
    hint: message,
  };
}

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

  const info = classify(error?.message || '');
  const Icon = info.icon;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-8 max-w-md w-full text-center">
        <Icon className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-zinc-200 mb-2">
          {info.title}
        </h2>
        <p className="text-sm text-zinc-400 mb-3 leading-relaxed">
          {info.body}
        </p>
        {info.hint && (
          <p className="text-xs text-zinc-600 mb-6 font-mono break-words">
            {info.hint}
          </p>
        )}
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
