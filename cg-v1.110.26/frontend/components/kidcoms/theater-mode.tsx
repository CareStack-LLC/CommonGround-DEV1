'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAccessToken } from '@/lib/api';
import { DailyCall } from '@daily-co/daily-js';
import {
  X,
  Library,
  Mic,
  MicOff,
  Video,
  VideoOff,
} from 'lucide-react';
import { TheaterVideoPlayer } from './theater-video-player';
import { TheaterPdfViewer } from './theater-pdf-viewer';
import { TheaterYoutubePlayer, extractYoutubeId } from './theater-youtube-player';
import { ContentLibrary } from './content-library';
import {
  TheaterSyncMessage,
  createTheaterMessage,
} from '@/lib/theater-content';

type ContentType = 'video' | 'pdf' | 'youtube';

interface TheaterContent {
  type: ContentType;
  url: string;
  title: string;
}

interface TheaterState {
  isPlaying: boolean;
  currentTime: number;
  currentPage?: number;
  duration?: number;
}

interface VideoParticipant {
  odId: string;
  odName: string;
  isLocal: boolean;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  videoOn: boolean;
  audioOn: boolean;
}

interface TheaterModeProps {
  isActive: boolean;
  userId: string;
  userName: string;
  callRef: React.RefObject<DailyCall | null>;
  participants: Map<string, VideoParticipant>;
  isVideoOn: boolean;
  isAudioOn: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onExit: () => void;
  /** KidComs session ID — used for server-side audit log of theater events. */
  sessionId?: string;
  /** Bearer token for authenticated audit calls. Falls back to localStorage. */
  authToken?: string;
}

export function TheaterMode({
  isActive,
  userId,
  userName,
  callRef,
  participants,
  isVideoOn,
  isAudioOn,
  onToggleVideo,
  onToggleAudio,
  onExit,
  sessionId,
  authToken,
}: TheaterModeProps) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [content, setContent] = useState<TheaterContent | null>(null);
  const [theaterState, setTheaterState] = useState<TheaterState>({
    isPlaying: false,
    currentTime: 0,
  });
  const [presenterDisconnected, setPresenterDisconnected] = useState(false);
  // The presenter is whoever started the current content. Only the presenter
  // broadcasts the periodic clock, so the two players never drift-fight by
  // echoing each other's timestamps.
  const [isPresenter, setIsPresenter] = useState(false);

  const presenterIdRef = useRef<string | null>(null);
  // Live mirrors so the periodic-sync interval and sync replies can read the
  // latest state without being torn down on every timeupdate.
  const theaterStateRef = useRef(theaterState);
  useEffect(() => {
    theaterStateRef.current = theaterState;
  }, [theaterState]);
  const contentRef = useRef(content);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Server-side audit trail (Wave 2 B5). Non-blocking — localStorage and
  // peer-to-peer sync remain the source of truth for live playback; the
  // server log is evidence and safety review.
  const reportTheaterEvent = useCallback(
    (action: string, extra: Record<string, unknown> = {}) => {
      if (!sessionId) return;
      const token =
        authToken ||
        (typeof window !== 'undefined'
          ? getAccessToken() || localStorage.getItem('authToken')
          : null);
      if (!token) return;
      const payload = {
        session_id: sessionId,
        action,
        content_type: content?.type,
        content_url: content?.url,
        content_title: content?.title,
        current_time: theaterState.currentTime,
        current_page: theaterState.currentPage,
        is_playing: theaterState.isPlaying,
        ...extra,
      };
      // Fire-and-forget. Don't block UI on audit.
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/kidcoms/theater/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.warn('theater audit: POST failed', err);
      });
    },
    [sessionId, authToken, content, theaterState.currentTime, theaterState.currentPage, theaterState.isPlaying],
  );

  // Handle incoming theater messages from other participant
  useEffect(() => {
    const call = callRef.current;
    if (!call) return;

    const handleAppMessage = (event: { data: TheaterSyncMessage; fromId: string }) => {
      const message = event.data;
      if (message.type !== 'theater_control') return;
      if (message.data.senderId === userId) return;

      const { action, contentType, contentUrl, currentTime, currentPage, isPlaying, contentTitle } = message.data;

      console.log('Theater message received:', action, { contentType, contentUrl, currentTime, isPlaying });

      switch (action) {
        case 'start':
          setContent({
            type: contentType,
            url: contentUrl,
            title: contentTitle || 'Theater',
          });
          setTheaterState({
            isPlaying: isPlaying ?? false,
            currentTime: currentTime ?? 0,
            currentPage: currentPage,
          });
          // Remember the presenter so we can detect when they drop (B6).
          presenterIdRef.current = message.data.senderId;
          setIsPresenter(false); // content came from the peer — we follow
          setPresenterDisconnected(false);
          break;

        case 'stop':
          setContent(null);
          setIsPresenter(false);
          setTheaterState({ isPlaying: false, currentTime: 0 });
          break;

        case 'play':
          setTheaterState((prev) => ({
            ...prev,
            isPlaying: true,
            currentTime: currentTime ?? prev.currentTime,
          }));
          break;

        case 'pause':
          setTheaterState((prev) => ({
            ...prev,
            isPlaying: false,
            currentTime: currentTime ?? prev.currentTime,
          }));
          break;

        case 'seek':
          if (currentTime !== undefined) {
            setTheaterState((prev) => ({
              ...prev,
              currentTime: currentTime,
              isPlaying: isPlaying ?? prev.isPlaying,
            }));
          }
          break;

        case 'page':
          setTheaterState((prev) => ({
            ...prev,
            currentPage: currentPage,
          }));
          break;

        case 'sync_request': {
          // Only the presenter answers, with the latest snapshot from refs.
          const c = contentRef.current;
          const st = theaterStateRef.current;
          if (c && callRef.current) {
            const syncMessage = createTheaterMessage(
              'start',
              c.type,
              c.url,
              userId,
              {
                contentTitle: c.title,
                currentTime: st.currentTime,
                currentPage: st.currentPage,
                isPlaying: st.isPlaying,
                senderName: userName,
              }
            );
            callRef.current.sendAppMessage(syncMessage, '*');
          }
          break;
        }
      }
    };

    // B6: disconnect recovery. If the remote presenter leaves the call while
    // theater is active, auto-pause and surface a banner so the local user
    // isn't left staring at a frozen frame.
    const handleParticipantLeft = (evt: { participant?: { user_id?: string; session_id?: string } }) => {
      const leftId =
        evt?.participant?.user_id || evt?.participant?.session_id;
      if (!leftId) return;
      if (presenterIdRef.current && leftId === presenterIdRef.current) {
        setTheaterState((prev) => ({ ...prev, isPlaying: false }));
        setPresenterDisconnected(true);
        reportTheaterEvent('presenter_left', { presenter_id: leftId });
      } else {
        reportTheaterEvent('participant_left', { participant_id: leftId });
      }
    };

    call.on('app-message', handleAppMessage);
    call.on('participant-left', handleParticipantLeft as Parameters<typeof call.on>[1]);

    return () => {
      call.off('app-message', handleAppMessage);
      call.off('participant-left', handleParticipantLeft as Parameters<typeof call.on>[1]);
    };
  }, [callRef, userId, content, reportTheaterEvent]);

  // Request current state on entry, retrying until content arrives. This fixes
  // the "joined late / first request dropped" case where a follower would never
  // catch up with a single 500ms one-shot request.
  useEffect(() => {
    if (!isActive || content) return;
    const send = () =>
      callRef.current?.sendAppMessage(
        createTheaterMessage('sync_request', 'video', '', userId, { senderName: userName }),
        '*',
      );
    const first = setTimeout(send, 400);
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      if (contentRef.current || tries > 5) {
        clearInterval(id);
        return;
      }
      send();
    }, 1200);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [isActive, content, userId, userName, callRef]);

  // Periodic clock sync — ONLY the presenter broadcasts, so the two players
  // can't drift-fight by echoing each other's times. Reads from refs with a
  // stable interval (not recreated on every timeupdate, which is the bug that
  // previously kept the 2s interval from ever firing).
  useEffect(() => {
    if (!isPresenter || !content || !theaterState.isPlaying) return;
    const id = setInterval(() => {
      const call = callRef.current;
      const c = contentRef.current;
      const st = theaterStateRef.current;
      if (!call || !c) return;
      call.sendAppMessage(
        createTheaterMessage('seek', c.type, c.url, userId, {
          contentTitle: c.title,
          currentTime: st.currentTime,
          currentPage: st.currentPage,
          isPlaying: st.isPlaying,
          senderName: userName,
        }),
        '*',
      );
    }, 2000);
    return () => clearInterval(id);
  }, [isPresenter, content, theaterState.isPlaying, callRef, userId, userName]);

  const handleContentSelect = (selected: { type: ContentType; url: string; title: string }) => {
    setContent(selected);
    setShowLibrary(false);
    setTheaterState({ isPlaying: false, currentTime: 0, currentPage: 1 });
    presenterIdRef.current = userId; // we are now the presenter
    setIsPresenter(true);
    setPresenterDisconnected(false);

    if (callRef.current) {
      const message = createTheaterMessage(
        'start',
        selected.type,
        selected.url,
        userId,
        {
          contentTitle: selected.title,
          currentTime: 0,
          currentPage: 1,
          isPlaying: false,
          senderName: userName,
        }
      );
      callRef.current.sendAppMessage(message, '*');
    }
    reportTheaterEvent('content_selected', {
      content_type: selected.type,
      content_url: selected.url,
      content_title: selected.title,
    });
  };

  const handlePlay = () => {
    setTheaterState((prev) => ({ ...prev, isPlaying: true }));
    const call = callRef.current;
    if (call && content) {
      const message = createTheaterMessage(
        'play',
        content.type,
        content.url,
        userId,
        {
          contentTitle: content.title,
          currentTime: theaterState.currentTime,
          isPlaying: true,
          senderName: userName,
        }
      );
      call.sendAppMessage(message, '*');
    }
    reportTheaterEvent('play');
  };

  const handlePause = () => {
    setTheaterState((prev) => ({ ...prev, isPlaying: false }));
    const call = callRef.current;
    if (call && content) {
      const message = createTheaterMessage(
        'pause',
        content.type,
        content.url,
        userId,
        {
          contentTitle: content.title,
          currentTime: theaterState.currentTime,
          isPlaying: false,
          senderName: userName,
        }
      );
      call.sendAppMessage(message, '*');
    }
    reportTheaterEvent('pause');
  };

  const handleSeek = (time: number) => {
    setTheaterState((prev) => ({ ...prev, currentTime: time }));
    const call = callRef.current;
    if (call && content) {
      const message = createTheaterMessage(
        'seek',
        content.type,
        content.url,
        userId,
        {
          contentTitle: content.title,
          currentTime: time,
          isPlaying: theaterState.isPlaying,
          senderName: userName,
        }
      );
      call.sendAppMessage(message, '*');
    }
  };

  const handlePageChange = (page: number) => {
    setTheaterState((prev) => ({ ...prev, currentPage: page }));
    const call = callRef.current;
    if (call && content) {
      const message = createTheaterMessage(
        'page',
        content.type,
        content.url,
        userId,
        {
          contentTitle: content.title,
          currentPage: page,
          senderName: userName,
        }
      );
      call.sendAppMessage(message, '*');
    }
  };

  const handleTimeUpdate = (time: number, duration: number) => {
    setTheaterState((prev) => ({ ...prev, currentTime: time, duration }));
  };

  const handleExit = () => {
    if (callRef.current) {
      const message = createTheaterMessage('stop', 'video', '', userId, { senderName: userName });
      callRef.current.sendAppMessage(message, '*');
    }
    reportTheaterEvent('stop');
    presenterIdRef.current = null;
    setIsPresenter(false);
    setPresenterDisconnected(false);
    setContent(null);
    setTheaterState({ isPlaying: false, currentTime: 0 });
    onExit();
  };

  if (!isActive) return null;

  const participantList = Array.from(participants.values());
  const localParticipant = participantList.find((p) => p.isLocal);
  const remoteParticipants = participantList.filter((p) => !p.isLocal);

  return (
    <div className="fixed inset-0 z-40 bg-gradient-to-b from-cg-ink via-foreground/95 to-cg-ink flex flex-col">
      {presenterDisconnected && (
        <div
          className="bg-amber-500/95 text-cg-ink text-sm font-medium px-4 py-2 text-center"
          style={{ fontFamily: "'Inter', sans-serif" }}
          role="status"
        >
          The presenter disconnected — playback paused. Pick a new video from the Library or exit theater mode.
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-cg-ink/90 backdrop-blur-sm border-b border-cg-sage/10">
        <div className="flex items-center space-x-3">
          <span
            className="text-cg-sage text-sm font-semibold px-3 py-1 bg-cg-sage/10 rounded-lg border border-cg-sage/20"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Theater Mode
          </span>
          {content && (
            <span className="text-white/80 font-medium hidden sm:inline text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
              {content.title}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowLibrary(true)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-cg-sage hover:bg-cg-sage/90 text-white rounded-lg transition-colors text-sm font-medium"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <Library className="h-4 w-4" />
            <span className="hidden sm:inline">Library</span>
          </button>
          <button
            onClick={handleExit}
            className="flex items-center space-x-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Mobile: Only show remote participant PiP */}
        <div className="md:hidden absolute top-2 right-2 z-10">
          {remoteParticipants.slice(0, 1).map((participant) => (
            <div
              key={participant.odId}
              className="w-24 h-32 rounded-xl overflow-hidden shadow-2xl border-2 border-cg-sage/50 bg-foreground"
            >
              <PiPVideoTile participant={participant} />
            </div>
          ))}
        </div>

        {/* Desktop: Show both PiP windows */}
        <div className="hidden md:flex absolute top-4 right-4 z-10 flex-col space-y-2">
          {remoteParticipants.slice(0, 1).map((participant) => (
            <div
              key={participant.odId}
              className="w-40 h-28 rounded-xl overflow-hidden shadow-2xl border-2 border-cg-sage/50 bg-foreground"
            >
              <PiPVideoTile participant={participant} />
            </div>
          ))}

          {localParticipant && (
            <div className="w-40 h-28 rounded-xl overflow-hidden shadow-2xl border-2 border-cg-slate/50 bg-foreground">
              <PiPVideoTile participant={localParticipant} />
            </div>
          )}
        </div>

        {/* Content Player */}
        <div className="h-full flex flex-col p-2 md:p-4 md:pr-48">
          {!content ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-center px-4">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-cg-sage rounded-full blur-2xl opacity-10" />
                  <Library className="relative h-16 w-16 md:h-20 md:w-20 text-cg-sage mx-auto" />
                </div>
                <h2
                  className="text-lg md:text-xl text-white mb-2 font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Choose something to watch together
                </h2>
                <p className="text-cg-mist/60 mb-6 text-sm md:text-base" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Select a video or storybook from the library
                </p>
                <button
                  onClick={() => setShowLibrary(true)}
                  className="px-6 py-3 bg-cg-sage hover:bg-cg-sage/90 text-white rounded-xl font-semibold transition-all shadow-lg shadow-cg-sage/20 hover:shadow-cg-sage/30"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Open Library
                </button>
              </div>
            </div>
          ) : content.type === 'video' ? (
            <div className="flex-1 min-h-0">
              <TheaterVideoPlayer
                src={content.url}
                title={content.title}
                isController={true}
                currentTime={theaterState.currentTime}
                isPlaying={theaterState.isPlaying}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onTimeUpdate={handleTimeUpdate}
              />
            </div>
          ) : content.type === 'youtube' ? (
            <div className="flex-1 min-h-0">
              <TheaterYoutubePlayer
                videoId={extractYoutubeId(content.url) || content.url}
                title={content.title}
                currentTime={theaterState.currentTime}
                isPlaying={theaterState.isPlaying}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onTimeUpdate={handleTimeUpdate}
              />
            </div>
          ) : content.type === 'pdf' ? (
            <div className="flex-1 min-h-0">
              <TheaterPdfViewer
                src={content.url}
                title={content.title}
                currentPage={theaterState.currentPage}
                onPageChange={handlePageChange}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="px-4 py-3 bg-cg-ink safe-area-bottom border-t border-cg-sage/10 shadow-lg">
        <div className="flex items-center justify-center space-x-3">
          <button aria-label="Toggle microphone"
            onClick={onToggleAudio}
            className={`p-3 rounded-full transition-all duration-200 ${
              isAudioOn
                ? 'bg-foreground hover:bg-foreground/80 text-white hover:scale-105'
                : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
            }`}
          >
            {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <button aria-label="Toggle camera"
            onClick={onToggleVideo}
            className={`p-3 rounded-full transition-all duration-200 ${
              isVideoOn
                ? 'bg-foreground hover:bg-foreground/80 text-white hover:scale-105'
                : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
            }`}
          >
            {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Content Library Modal */}
      <ContentLibrary
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={handleContentSelect}
      />
    </div>
  );
}

// Small PiP video tile component
function PiPVideoTile({ participant }: { participant: VideoParticipant }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (participant.videoTrack) {
      const stream = new MediaStream([participant.videoTrack]);
      video.srcObject = stream;
      video.play().catch(console.error);
    } else {
      video.srcObject = null;
    }
  }, [participant.videoTrack]);

  useEffect(() => {
    if (participant.isLocal) return;

    if (participant.audioTrack && audioRef.current) {
      const stream = new MediaStream([participant.audioTrack]);
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(console.error);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }
    };
  }, [participant.audioTrack, participant.isLocal]);

  return (
    <div className="relative h-full w-full">
      {participant.videoOn && participant.videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cg-sage to-cg-slate">
          <div
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold shadow-lg"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {participant.odName[0]?.toUpperCase() || '?'}
          </div>
        </div>
      )}

      {!participant.isLocal && <audio ref={audioRef} />}

      {/* Name label */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cg-ink/90 to-transparent px-2 py-1">
        <span className="text-white text-xs truncate block drop-shadow-lg" style={{ fontFamily: "'Inter', sans-serif" }}>
          {participant.odName}
          {participant.isLocal && <span className="text-cg-amber"> (You)</span>}
        </span>
      </div>

      {/* Mute indicator */}
      {!participant.audioOn && (
        <div className="absolute top-1 right-1 p-1 bg-red-500/90 rounded-full">
          <MicOff className="h-2.5 w-2.5 text-white" />
        </div>
      )}
    </div>
  );
}
