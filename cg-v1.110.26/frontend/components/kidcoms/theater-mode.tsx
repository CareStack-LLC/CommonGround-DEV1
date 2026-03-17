'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
}: TheaterModeProps) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [content, setContent] = useState<TheaterContent | null>(null);
  const [theaterState, setTheaterState] = useState<TheaterState>({
    isPlaying: false,
    currentTime: 0,
  });

  const lastActionRef = useRef<string>('');
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
          break;

        case 'stop':
          setContent(null);
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

        case 'sync_request':
          if (content && callRef.current) {
            console.log('Theater: Responding to sync_request with current content');
            const syncMessage = createTheaterMessage(
              'start',
              content.type,
              content.url,
              userId,
              {
                contentTitle: content.title,
                currentTime: theaterState.currentTime,
                currentPage: theaterState.currentPage,
                isPlaying: theaterState.isPlaying,
                senderName: userName,
              }
            );
            callRef.current.sendAppMessage(syncMessage, '*');
          }
          break;
      }
    };

    call.on('app-message', handleAppMessage);

    return () => {
      call.off('app-message', handleAppMessage);
    };
  }, [callRef, userId, content]);

  // Request sync when entering theater mode
  useEffect(() => {
    if (isActive && callRef.current) {
      setTimeout(() => {
        const syncRequest = createTheaterMessage(
          'sync_request',
          'video',
          '',
          userId,
          { senderName: userName }
        );
        callRef.current?.sendAppMessage(syncRequest, '*');
      }, 500);
    }
  }, [isActive, userId, userName, callRef]);

  // Broadcast current state
  const broadcastState = useCallback((action: TheaterSyncMessage['data']['action']) => {
    const call = callRef.current;
    if (!call || !content) return;

    const message = createTheaterMessage(
      action,
      content.type,
      content.url,
      userId,
      {
        contentTitle: content.title,
        currentTime: theaterState.currentTime,
        currentPage: theaterState.currentPage,
        isPlaying: theaterState.isPlaying,
        senderName: userName,
      }
    );

    call.sendAppMessage(message, '*');
  }, [callRef, content, userId, userName, theaterState]);

  // Periodic sync while playing (every 2 seconds for smoother sync)
  useEffect(() => {
    if (content && theaterState.isPlaying) {
      syncIntervalRef.current = setInterval(() => {
        broadcastState('seek');
      }, 2000);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [content, theaterState.isPlaying, broadcastState]);

  const handleContentSelect = (selected: { type: ContentType; url: string; title: string }) => {
    setContent(selected);
    setShowLibrary(false);
    setTheaterState({ isPlaying: false, currentTime: 0, currentPage: 1 });

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
    setContent(null);
    setTheaterState({ isPlaying: false, currentTime: 0 });
    onExit();
  };

  if (!isActive) return null;

  const participantList = Array.from(participants.values());
  const localParticipant = participantList.find((p) => p.isLocal);
  const remoteParticipants = participantList.filter((p) => !p.isLocal);

  return (
    <div className="fixed inset-0 z-40 bg-gradient-to-b from-[#0D1B24] via-[#1E3A4A]/95 to-[#0D1B24] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0D1B24]/90 backdrop-blur-sm border-b border-[#3DAA8A]/10">
        <div className="flex items-center space-x-3">
          <span
            className="text-[#3DAA8A] text-sm font-semibold px-3 py-1 bg-[#3DAA8A]/10 rounded-lg border border-[#3DAA8A]/20"
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
            className="flex items-center space-x-2 px-3 py-1.5 bg-[#3DAA8A] hover:bg-[#3DAA8A]/90 text-white rounded-lg transition-colors text-sm font-medium"
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
              className="w-24 h-32 rounded-xl overflow-hidden shadow-2xl border-2 border-[#3DAA8A]/50 bg-[#1E3A4A]"
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
              className="w-40 h-28 rounded-xl overflow-hidden shadow-2xl border-2 border-[#3DAA8A]/50 bg-[#1E3A4A]"
            >
              <PiPVideoTile participant={participant} />
            </div>
          ))}

          {localParticipant && (
            <div className="w-40 h-28 rounded-xl overflow-hidden shadow-2xl border-2 border-[#2D6A8F]/50 bg-[#1E3A4A]">
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
                  <div className="absolute inset-0 bg-[#3DAA8A] rounded-full blur-2xl opacity-10" />
                  <Library className="relative h-16 w-16 md:h-20 md:w-20 text-[#3DAA8A] mx-auto" />
                </div>
                <h2
                  className="text-lg md:text-xl text-white mb-2 font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Choose something to watch together
                </h2>
                <p className="text-[#CBD8E0]/60 mb-6 text-sm md:text-base" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Select a video or storybook from the library
                </p>
                <button
                  onClick={() => setShowLibrary(true)}
                  className="px-6 py-3 bg-[#3DAA8A] hover:bg-[#3DAA8A]/90 text-white rounded-xl font-semibold transition-all shadow-lg shadow-[#3DAA8A]/20 hover:shadow-[#3DAA8A]/30"
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
      <div className="px-4 py-3 bg-[#0D1B24] safe-area-bottom border-t border-[#3DAA8A]/10 shadow-lg">
        <div className="flex items-center justify-center space-x-3">
          <button
            onClick={onToggleAudio}
            className={`p-3 rounded-full transition-all duration-200 ${
              isAudioOn
                ? 'bg-[#1E3A4A] hover:bg-[#1E3A4A]/80 text-white hover:scale-105'
                : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
            }`}
          >
            {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <button
            onClick={onToggleVideo}
            className={`p-3 rounded-full transition-all duration-200 ${
              isVideoOn
                ? 'bg-[#1E3A4A] hover:bg-[#1E3A4A]/80 text-white hover:scale-105'
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
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#3DAA8A] to-[#2D6A8F]">
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
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0D1B24]/90 to-transparent px-2 py-1">
        <span className="text-white text-xs truncate block drop-shadow-lg" style={{ fontFamily: "'Inter', sans-serif" }}>
          {participant.odName}
          {participant.isLocal && <span className="text-[#F5A623]"> (You)</span>}
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
