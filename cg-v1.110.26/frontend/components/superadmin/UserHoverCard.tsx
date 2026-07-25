'use client';

/**
 * Hover-to-preview user card.
 *
 * Wraps any child node with pointer listeners. On pointerenter + 300ms,
 * fetches the user's detail and renders a floating card positioned near
 * the trigger. Fetched detail is cached in a module-level Map so repeated
 * hovers don't refetch.
 *
 * Apply sparingly — every wrapped email triggers an HTTP call. Currently
 * applied in: users list (email cell) and impersonation audit (target email).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Shield, Mail, Clock, AlertCircle } from 'lucide-react';
import { adminAPI, type AdminUserDetail } from '@/lib/admin-api';
import { timeAgo } from './helpers';

// Session-lifetime cache. Admin identities rarely mutate mid-session, so
// this is fine; the cache is cleared on reload.
const _cache = new Map<string, AdminUserDetail>();

interface Props {
  userId: string;
  children: React.ReactNode;
  /** Disable fetching + card display (useful when inside an admin-on-admin edge case). */
  disabled?: boolean;
}

type Status = 'idle' | 'loading' | 'ready' | 'error';

export function UserHoverCard({ userId, children, disabled }: Props) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  const computeCoords = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const CARD_WIDTH = 288;
    const CARD_ESTIMATED_HEIGHT = 220;
    const PAD = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Default: right of trigger
    let x = rect.right + PAD;
    let y = rect.top;

    // If overflows right edge → try below
    if (x + CARD_WIDTH > vw - PAD) {
      x = rect.left;
      y = rect.bottom + PAD;
    }
    // If overflows bottom → try left
    if (y + CARD_ESTIMATED_HEIGHT > vh - PAD) {
      x = rect.left - CARD_WIDTH - PAD;
      y = rect.top;
    }
    // Clamp to viewport
    if (x < PAD) x = PAD;
    if (y < PAD) y = PAD;
    return { x, y };
  }, []);

  const clearTimers = () => {
    if (showTimerRef.current) { clearTimeout(showTimerRef.current); showTimerRef.current = null; }
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
  };

  const onEnter = () => {
    if (disabled) return;
    clearTimers();
    showTimerRef.current = setTimeout(async () => {
      const next = computeCoords();
      if (next) setCoords(next);
      setVisible(true);

      const cached = _cache.get(userId);
      if (cached) {
        setData(cached);
        setStatus('ready');
        return;
      }
      setStatus('loading');
      try {
        const detail = await adminAPI.getUserDetail(userId);
        _cache.set(userId, detail);
        setData(detail);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    }, 300);
  };

  const onLeave = () => {
    clearTimers();
    hideTimerRef.current = setTimeout(() => setVisible(false), 200);
  };

  useEffect(() => clearTimers, []);

  const initials = (() => {
    if (!data) return '??';
    const f = (data.first_name || '').charAt(0);
    const l = (data.last_name || '').charAt(0);
    return (f + l || (data.email?.charAt(0) ?? '?')).toUpperCase();
  })();

  // Card content — separated so error/loading can share the frame
  const card = (
    <div
      className="fixed z-[60] w-[288px] bg-[#1A3648] border border-cg-slate/30 rounded-xl shadow-2xl p-4"
      style={{ left: coords?.x ?? 0, top: coords?.y ?? 0 }}
      onPointerEnter={() => clearTimers()}
      onPointerLeave={onLeave}
    >
      {status === 'loading' && (
        <div className="text-xs text-muted-foreground animate-pulse">Loading profile…</div>
      )}
      {status === 'error' && (
        <div>
          <div className="flex items-center gap-2 text-red-400 text-xs mb-2">
            <AlertCircle className="w-3.5 h-3.5" />
            Unable to load profile
          </div>
          <Link
            href={`/superadmin/users/${userId}`}
            className="text-xs text-cg-sage hover:text-cg-sage-light"
          >
            View full profile →
          </Link>
        </div>
      )}
      {status === 'ready' && data && (
        <>
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cg-sage/15 border border-cg-sage/30 flex items-center justify-center text-sm font-semibold text-cg-sage-light">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white truncate">
                  {data.first_name} {data.last_name}
                </span>
                {data.is_admin && (
                  <Shield className="w-3 h-3 text-cg-sage flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{data.email}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            {data.profile?.subscription_tier && (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium capitalize bg-cg-sage/15 text-cg-sage-light border border-cg-sage/20">
                {data.profile.subscription_tier.replace(/_/g, ' ')}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                data.is_active
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}
            >
              <span className={`w-1 h-1 rounded-full ${data.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {data.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-[#8AACBC] mb-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span>Joined {timeAgo(data.created_at)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span>Last active {timeAgo(data.last_active || data.last_login)}</span>
            </div>
            {data.family_file_count > 0 && (
              <div className="text-muted-foreground">
                {data.family_file_count} case{data.family_file_count === 1 ? '' : 's'}
              </div>
            )}
          </div>

          <Link
            href={`/superadmin/users/${userId}`}
            className="block w-full text-center py-1.5 rounded text-xs font-medium bg-cg-sage/10 hover:bg-cg-sage/20 text-cg-sage-light transition-colors"
          >
            View full profile →
          </Link>
        </>
      )}
    </div>
  );

  return (
    <>
      <span ref={triggerRef} onPointerEnter={onEnter} onPointerLeave={onLeave}>
        {children}
      </span>
      {visible && coords && typeof document !== 'undefined' && createPortal(card, document.body)}
    </>
  );
}
