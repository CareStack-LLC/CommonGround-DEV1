'use client';

/**
 * Sticky top banner shown when a superadmin is impersonating a user.
 *
 * Detection: presence of both `admin_original_token` and
 * `impersonation_session_id` in localStorage (set when the admin clicks
 * "View as user" on the users page).
 *
 * "End impersonation" button:
 *   1. POSTs /admin/impersonate/end with the session_id
 *   2. Swaps the admin's original token back into localStorage
 *   3. Clears impersonation keys
 *   4. Reloads to apply the swapped identity
 *
 * Note: this component only renders on the client (uses localStorage),
 * so it's safe to include in app-providers without SSR side-effects.
 */

import { useEffect, useState } from 'react';
import { ShieldAlert, XCircle, Loader2 } from 'lucide-react';
import { adminAPI } from '@/lib/admin-api';

export function ImpersonationBanner() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sid = localStorage.getItem('impersonation_session_id');
    const originalToken = localStorage.getItem('admin_original_token');
    if (sid && originalToken) setSessionId(sid);

    // Refresh every minute in case the admin opens the page in another tab
    const interval = setInterval(() => {
      const sid2 = localStorage.getItem('impersonation_session_id');
      const orig2 = localStorage.getItem('admin_original_token');
      setSessionId(sid2 && orig2 ? sid2 : null);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleEnd = async () => {
    if (!sessionId) return;
    setEnding(true);
    try {
      await adminAPI.endImpersonation(sessionId, 'admin_ended');
    } catch (err) {
      // Non-blocking — if the server can't close the session (already ended,
      // network hiccup), we still want to restore the admin's original token.
      console.error('Failed to end impersonation server-side:', err);
    } finally {
      const originalToken = localStorage.getItem('admin_original_token');
      if (originalToken) {
        localStorage.setItem('access_token', originalToken);
      }
      localStorage.removeItem('admin_original_token');
      localStorage.removeItem('impersonation_session_id');
      // Hard reload so AuthContext re-reads the token + identity
      window.location.href = '/superadmin/users';
    }
  };

  if (!sessionId) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-[#F5A623]/95 backdrop-blur-sm text-[#1E3A4A] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            <strong>Impersonation active.</strong> All actions are logged to the admin audit trail.
          </span>
        </div>
        <button
          onClick={handleEnd}
          disabled={ending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1E3A4A]/20 hover:bg-[#1E3A4A]/30 text-[#1E3A4A] text-xs font-semibold border border-[#1E3A4A]/30 transition-colors disabled:opacity-50"
        >
          {ending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
          End impersonation
        </button>
      </div>
    </div>
  );
}
