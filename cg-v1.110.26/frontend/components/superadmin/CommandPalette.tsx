'use client';

/**
 * Global Cmd+K / Ctrl+K command palette.
 *
 * Search-and-jump across:
 *   - Pages (fuzzy substring on navSections)
 *   - Users (adminAPI.searchUsers — debounced, q.length >= 2)
 *   - Runbooks (adminAPI.listRunbooks — cached at module scope)
 *
 * Keyboard-first: Cmd+K to open, Esc to close, ↑/↓ to navigate, Enter to
 * activate. Empty state (no query) shows "Tip: Cmd+K from anywhere" plus up
 * to 4 recent pages pulled from sessionStorage.
 *
 * Mounted once inside the superadmin layout.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ArrowRight,
  LayoutDashboard,
  UserCircle,
  BookOpen,
  Clock,
  X,
} from 'lucide-react';
import { adminAPI, type AdminUser } from '@/lib/admin-api';
import { flatNavItems, type NavItem } from '@/app/superadmin/_nav';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface Runbook {
  id: string;
  title: string;
  category: string;
  summary: string | null;
  tags: string[];
  enabled: boolean;
}

interface RecentPage {
  href: string;
  label: string;
}

const RECENT_PAGES_KEY = 'cg_admin_recent_pages';
const MAX_RECENT = 4;

// Module-scope cache for runbooks — loaded lazily on first open
let _runbooksCache: Runbook[] | null = null;
let _runbooksLoadedAt = 0;
const RUNBOOKS_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadRunbooks(): Promise<Runbook[]> {
  const now = Date.now();
  if (_runbooksCache && now - _runbooksLoadedAt < RUNBOOKS_TTL_MS) {
    return _runbooksCache;
  }
  try {
    const rows = await adminAPI.listRunbooks();
    _runbooksCache = rows as Runbook[];
    _runbooksLoadedAt = now;
    return _runbooksCache;
  } catch {
    // Pre-migration or transient error — silently fall back to empty
    return [];
  }
}

function readRecentPages(): RecentPage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(RECENT_PAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && typeof p.href === 'string' && typeof p.label === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function pushRecentPage(page: RecentPage): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = readRecentPages();
    const next = [page, ...existing.filter((p) => p.href !== page.href)].slice(0, MAX_RECENT);
    sessionStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(next));
  } catch {
    // sessionStorage may be unavailable (SSR, private mode) — fail silently
  }
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);

  // Reset + focus on open
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setHighlightedIdx(0);
    setUsers([]);
    setRecentPages(readRecentPages());
    // Load runbooks on first open (or refresh if TTL expired)
    loadRunbooks().then(setRunbooks);
    // Focus input shortly after mount so the modal has time to paint
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Debounced user search
  const searchCounterRef = useRef(0);
  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setUsers([]);
      setUserLoading(false);
      return;
    }
    const myTurn = ++searchCounterRef.current;
    const handle = setTimeout(async () => {
      setUserLoading(true);
      try {
        const result = await adminAPI.searchUsers({ q: query, limit: 6 });
        if (myTurn !== searchCounterRef.current) return; // stale
        setUsers(result.users || []);
      } catch {
        if (myTurn === searchCounterRef.current) setUsers([]);
      } finally {
        if (myTurn === searchCounterRef.current) setUserLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open]);

  // Build result list (flat, for keyboard navigation)
  type Result =
    | { kind: 'page'; item: NavItem }
    | { kind: 'user'; item: AdminUser }
    | { kind: 'runbook'; item: Runbook }
    | { kind: 'recent'; item: RecentPage };

  const results: Result[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Empty state: show recent pages only
    if (!q) {
      return recentPages.map((item) => ({ kind: 'recent' as const, item }));
    }
    const pages = flatNavItems()
      .filter((item) => item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q))
      .slice(0, 8)
      .map((item) => ({ kind: 'page' as const, item }));
    const userResults = users.slice(0, 6).map((u) => ({ kind: 'user' as const, item: u }));
    const rbResults = runbooks
      .filter((rb) => {
        if (!rb.enabled) return false;
        const t = rb.title.toLowerCase();
        const c = rb.category.toLowerCase();
        const tags = (rb.tags || []).join(' ').toLowerCase();
        return t.includes(q) || c.includes(q) || tags.includes(q);
      })
      .slice(0, 5)
      .map((item) => ({ kind: 'runbook' as const, item }));
    return [...pages, ...userResults, ...rbResults];
  }, [query, users, runbooks, recentPages]);

  // Keep highlight valid as results change
  useEffect(() => {
    if (highlightedIdx >= results.length) {
      setHighlightedIdx(Math.max(0, results.length - 1));
    }
  }, [results.length, highlightedIdx]);

  const activate = useCallback((r: Result) => {
    if (r.kind === 'page') {
      pushRecentPage({ href: r.item.href, label: r.item.label });
      router.push(r.item.href);
    } else if (r.kind === 'recent') {
      router.push(r.item.href);
    } else if (r.kind === 'user') {
      router.push(`/superadmin/users/${r.item.id}`);
    } else if (r.kind === 'runbook') {
      router.push(`/superadmin/runbook?id=${r.item.id}`);
    }
    onClose();
  }, [router, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[highlightedIdx];
      if (target) activate(target);
      return;
    }
  };

  if (!open) return null;

  // Group results by kind for display
  const pageResults = results.filter((r) => r.kind === 'page');
  const recentResults = results.filter((r) => r.kind === 'recent');
  const userResults = results.filter((r) => r.kind === 'user');
  const runbookResults = results.filter((r) => r.kind === 'runbook');

  // Figure out flat index for highlighting
  let flatIdx = 0;

  const renderGroup = (label: string, items: Result[], iconKind: Result['kind']) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-1">
        <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </div>
        {items.map((r) => {
          const myIdx = flatIdx++;
          const active = myIdx === highlightedIdx;
          return (
            <button
              key={`${r.kind}-${r.kind === 'page' || r.kind === 'recent' ? r.item.href : r.item.id}`}
              onClick={() => activate(r)}
              onMouseEnter={() => setHighlightedIdx(myIdx)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded transition-colors ${
                active ? 'bg-cg-sage/15 text-white' : 'text-cg-slate-tint hover:bg-cg-slate/20'
              }`}
            >
              {iconKind === 'page' && r.kind === 'page' && (
                <r.item.icon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              )}
              {iconKind === 'recent' && <Clock className="w-4 h-4 flex-shrink-0 text-muted-foreground" />}
              {iconKind === 'user' && <UserCircle className="w-4 h-4 flex-shrink-0 text-muted-foreground" />}
              {iconKind === 'runbook' && <BookOpen className="w-4 h-4 flex-shrink-0 text-muted-foreground" />}
              <span className="flex-1 min-w-0 truncate">
                {r.kind === 'page' && r.item.label}
                {r.kind === 'recent' && r.item.label}
                {r.kind === 'user' && (
                  <>
                    <span className="text-white">
                      {r.item.first_name} {r.item.last_name}
                    </span>
                    <span className="text-muted-foreground text-xs ml-2">{r.item.email}</span>
                  </>
                )}
                {r.kind === 'runbook' && (
                  <>
                    <span className="text-white">{r.item.title}</span>
                    <span className="text-muted-foreground text-xs ml-2 capitalize">{r.item.category}</span>
                  </>
                )}
              </span>
              <ArrowRight className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-cg-sage' : 'text-cg-slate-strong'}`} />
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-[600px] max-w-full bg-cg-slate-deep border border-cg-slate/30 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-cg-slate/20">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightedIdx(0);
            }}
            placeholder="Search pages, users, runbooks…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-cg-slate-strong focus:outline-none"
          />
          {userLoading && (
            <span className="text-[10px] text-muted-foreground">searching…</span>
          )}
          <button aria-label="Close"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-white transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2 px-1">
          {!query && recentResults.length === 0 && (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              <LayoutDashboard className="w-6 h-6 mx-auto mb-2 opacity-40" />
              Tip: <span className="font-mono text-cg-slate-muted">Cmd+K</span> from anywhere.
              Start typing to find pages, users, or runbooks.
            </div>
          )}
          {!query && renderGroup('Recent', recentResults, 'recent')}
          {query && renderGroup('Pages', pageResults, 'page')}
          {query && renderGroup('Users', userResults, 'user')}
          {query && renderGroup('Runbooks', runbookResults, 'runbook')}
          {query && results.length === 0 && !userLoading && (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              No results for &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>

        <div className="px-3 py-2 border-t border-cg-slate/20 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-cg-ink border border-cg-slate/30 px-1 rounded">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono bg-cg-ink border border-cg-slate/30 px-1 rounded">↵</kbd> open</span>
            <span><kbd className="font-mono bg-cg-ink border border-cg-slate/30 px-1 rounded">esc</kbd> close</span>
          </div>
          <span>{results.length} result{results.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
}
