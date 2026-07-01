'use client';

/**
 * Parent inbox for persistent parent ↔ child async messages.
 * Wave 1 A1. This is distinct from /messages (parent ↔ co-parent chat).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Shield, Users } from 'lucide-react';

import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import {
  familyMessagingAPI,
  getImageUrl,
  type ParentChildThreadSummary,
} from '@/lib/api';

function formatRelative(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function ThreadCard({ thread }: { thread: ParentChildThreadSummary }) {
  const avatar = getImageUrl(thread.child_avatar_url ?? null);
  return (
    <Link
      href={`/messages/child/${thread.child_id}`}
      className="flex items-center gap-4 p-4 rounded-2xl bg-card border-2 border-border hover:border-[var(--portal-primary)] hover:bg-[var(--portal-primary)]/5 transition-all duration-200 shadow-sm hover:shadow-md"
    >
      <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-[var(--portal-primary)]/20 to-[var(--portal-primary)]/10 flex items-center justify-center flex-shrink-0 shadow-sm">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={thread.child_name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl font-bold text-[var(--portal-primary)]">
            {thread.child_name.charAt(0).toUpperCase()}
          </span>
        )}
        {thread.unread_count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#C53030] text-white text-xs font-bold flex items-center justify-center shadow-md">
            {thread.unread_count > 99 ? '99+' : thread.unread_count}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-foreground truncate">{thread.child_name}</p>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatRelative(thread.last_message_at)}
          </span>
        </div>
        <p
          className={`text-sm truncate mt-0.5 ${
            thread.unread_count > 0
              ? 'text-foreground font-semibold'
              : 'text-muted-foreground'
          }`}
        >
          {thread.last_message_preview || 'Say hi — no messages yet.'}
        </p>
      </div>
    </Link>
  );
}

function ParentChildInboxContent() {
  const router = useRouter();
  const [threads, setThreads] = useState<ParentChildThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await familyMessagingAPI.listThreads();
        if (!cancelled) setThreads(data.items);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load messages');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 pb-24 lg:pb-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-xl hover:bg-muted transition-all"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-[var(--portal-primary)]/10 rounded-xl">
              <MessageSquare className="h-5 w-5 text-[var(--portal-primary)]" />
            </div>
            <div>
              <h1
                className="text-2xl font-bold text-foreground"
                style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
              >
                Messages with your kids
              </h1>
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                <Shield className="w-3 h-3" /> ARIA-protected
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-[#FEE2E2] border-2 border-[#FEE2E2] text-sm text-[#9B2C2C]">
            {error}
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-[var(--portal-primary)]/10 flex items-center justify-center mb-4">
              <Users className="h-10 w-10 text-[var(--portal-primary)]" />
            </div>
            <h2
              className="text-xl font-semibold text-foreground mb-2"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              No children yet
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Add a child to your family file to start sending messages.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map((thread) => (
              <ThreadCard key={thread.child_id} thread={thread} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ParentChildInboxPage() {
  return (
    <ProtectedRoute>
      <ParentChildInboxContent />
    </ProtectedRoute>
  );
}
