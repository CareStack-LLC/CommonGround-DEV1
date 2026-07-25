'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { DailyCall } from '@daily-co/daily-js';
import { X, Users } from 'lucide-react';
import '@excalidraw/excalidraw/index.css';

// Excalidraw uses browser-only APIs (IndexedDB, DOM measurement) so it must
// be loaded client-side only. Importing dynamically avoids SSR crashes.
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false },
);

/**
 * Sync payload piggy-backs on the Daily `sendAppMessage` channel that
 * theater-mode already uses. We tag it `whiteboard_scene` so handlers can
 * dispatch without colliding with `theater_control`.
 */
interface WhiteboardSyncMessage {
  type: 'whiteboard_scene';
  data: {
    action: 'scene' | 'sync_request';
    senderId: string;
    senderName?: string;
    elements?: readonly unknown[];
    appState?: Partial<Record<string, unknown>>;
  };
}

function isWhiteboardMessage(msg: unknown): msg is WhiteboardSyncMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as { type?: string }).type === 'whiteboard_scene'
  );
}

interface WhiteboardModeProps {
  isActive: boolean;
  userId: string;
  userName: string;
  callRef: React.RefObject<DailyCall | null>;
  onExit: () => void;
  /** Optional: passed through if you want to stamp server-side audit later. */
  sessionId?: string;
}

/**
 * KidSpace collaborative whiteboard. Each local edit is broadcast as a
 * compact scene snapshot over Daily's sendAppMessage. Remote updates are
 * applied via the Excalidraw imperative API.
 *
 * Performance rails:
 *   - broadcasts are throttled to 8fps (125ms) during drags
 *   - we drop redundant snapshots with identical element counts + versions
 *   - if the scene has >500 elements we skip broadcast to avoid flooding
 *     the call — this is a kids' canvas, not a design tool
 */
export function WhiteboardMode({
  isActive,
  userId,
  userName,
  callRef,
  onExit,
}: WhiteboardModeProps) {
  // Excalidraw's API ref. Typed as any because the public type has deep
  // generics that change between minor versions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const excalidrawRef = useRef<any | null>(null);
  const lastBroadcastRef = useRef<{ at: number; sig: string }>({ at: 0, sig: '' });
  const applyingRemoteRef = useRef(false);
  const [remoteActive, setRemoteActive] = useState(false);

  // ── Receive remote scene updates ──────────────────────────────────────
  useEffect(() => {
    const call = callRef.current;
    if (!call) return;

    const handleAppMessage = (event: { data: unknown; fromId?: string }) => {
      if (!isWhiteboardMessage(event.data)) return;
      const payload = event.data.data;
      if (payload.senderId === userId) return;

      setRemoteActive(true);

      if (payload.action === 'sync_request') {
        // Another participant joined — ship them the current scene.
        broadcastScene(true);
        return;
      }

      if (payload.action === 'scene' && excalidrawRef.current && payload.elements) {
        applyingRemoteRef.current = true;
        try {
          excalidrawRef.current.updateScene({
            elements: payload.elements,
            // Intentionally do NOT mirror appState — that would fight the
            // local user's zoom/pan. Only shared geometry is synced.
            commitToHistory: false,
          });
        } finally {
          // Give React a tick before we allow onChange to broadcast again.
          setTimeout(() => {
            applyingRemoteRef.current = false;
          }, 50);
        }
      }
    };

    call.on('app-message', handleAppMessage);
    return () => {
      call.off('app-message', handleAppMessage);
    };
    // Broadcasting closure is stable; other deps trigger remote-apply only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callRef, userId]);

  // ── Ask peers for their scene once on open ────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const call = callRef.current;
    if (!call) return;
    // small delay so the Excalidraw canvas is ready before we apply incoming
    const t = setTimeout(() => {
      const req: WhiteboardSyncMessage = {
        type: 'whiteboard_scene',
        data: { action: 'sync_request', senderId: userId, senderName: userName },
      };
      try {
        call.sendAppMessage(req, '*');
      } catch {
        // ignore — remote sync is best-effort
      }
    }, 400);
    return () => clearTimeout(t);
  }, [isActive, callRef, userId, userName]);

  // ── Broadcast our current scene ───────────────────────────────────────
  const broadcastScene = useCallback(
    (force = false) => {
      const call = callRef.current;
      const api = excalidrawRef.current;
      if (!call || !api) return;

      const elements = api.getSceneElements?.() ?? [];
      if (!Array.isArray(elements)) return;
      if (elements.length > 500) return; // rail — not a power canvas

      // Throttle: max 8 snapshots/second unless forced (sync_request reply).
      const now = Date.now();
      if (!force && now - lastBroadcastRef.current.at < 125) return;

      // Skip redundant snapshots — elements with same count + last versionNonce.
      const sig =
        `${elements.length}:` +
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (elements as any[])
          .slice(-5)
          .map((e) => e?.versionNonce ?? e?.version ?? '')
          .join(',');
      if (!force && sig === lastBroadcastRef.current.sig) return;
      lastBroadcastRef.current = { at: now, sig };

      const message: WhiteboardSyncMessage = {
        type: 'whiteboard_scene',
        data: {
          action: 'scene',
          senderId: userId,
          senderName: userName,
          elements,
        },
      };
      try {
        call.sendAppMessage(message, '*');
      } catch {
        // ignore
      }
    },
    [callRef, userId, userName],
  );

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-40 bg-gradient-to-b from-cg-ink via-foreground/95 to-cg-ink flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 bg-cg-ink/90 backdrop-blur-sm border-b border-cg-sage/10">
        <div className="flex items-center space-x-3">
          <span
            className="text-cg-sage text-sm font-semibold px-3 py-1 bg-cg-sage/10 rounded-lg border border-cg-sage/20"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Whiteboard
          </span>
          {remoteActive && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
              <Users className="h-3.5 w-3.5" />
              <span>Drawing together</span>
            </div>
          )}
        </div>
        <button
          onClick={onExit}
          className="flex items-center space-x-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">Exit</span>
        </button>
      </div>

      <div className="flex-1 overflow-hidden bg-white">
        <Excalidraw
          excalidrawAPI={(api: unknown) => {
            excalidrawRef.current = api;
          }}
          onChange={() => {
            if (applyingRemoteRef.current) return;
            broadcastScene(false);
          }}
          initialData={{ appState: { viewBackgroundColor: '#ffffff' } }}
          UIOptions={{
            canvasActions: {
              // Keep it kid-friendly. No "load from file" or "export image"
              // controls — they confuse young users and break call focus.
              loadScene: false,
              saveAsImage: true,
              saveToActiveFile: false,
              export: false,
              toggleTheme: false,
            },
          }}
        />
      </div>
    </div>
  );
}
