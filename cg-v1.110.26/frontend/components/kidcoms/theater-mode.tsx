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

  // Track if we're the one who initiated the last action (to avoid echo)
  const lastActionRef = useRef<string>('');

  // Sync interval for periodic state updates
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle incoming theater messages from other participant
  useEffect(() => {
    const call = callRef.current;
    if (!call) return;

    const handleAppMessage = (event: { data: TheaterSyncMessage; fromId: string }) => {
      const message = event.data;
      if (message.type !== 'theater_control') return;

      // Ignore messages from ourselves
      if (message.data.senderId === userId) return;

      const { action, contentType, contentUrl, currentTime, currentPage, isPlaying, contentTitle } = message.data;

      console.log('Theater message received:', action, { contentType, contentUrl, currentTime, isPlaying });

      switch (action) {
        case 'start':
          // Other person selected content - load it
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
          // Other person exited theater
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
          // Sync to other person's position
          if (currentTime !== undefined) {
            setTheaterState((prev) => ({
              ...prev,
              currentTime: currentTime,
              isPlaying: isPlaying ?? prev.isPlaying,
            }));
          }
          break;

        case 'page':
          // PDF page change
          setTheaterState((prev) => ({
            ...prev,
            currentPage: currentPage,
          }));
          break;

        case 'sync_request':
          // Other person requesting current state - send full content info
          if (content && callRef.current) {
            console.log('Theater: Responding to sync_request with current content');
            const syncMessage = createTheaterMessage(
              'start', // Use 'start' so receiver loads the content
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
      // Small delay to let other participant know we're here
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

  // Broadcast current state to other participant
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

  // Periodic sync while playing (every 3 seconds)
  useEffect(() => {
    if (content && theaterState.isPlaying) {
      syncIntervalRef.current = setInterval(() => {
        broadcastState('seek');
      }, 3000);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [content, theaterState.isPlaying, broadcastState]);

  // Content selection handler - either caller can select
  const handleContentSelect = (selected: { type: ContentType; url: string; title: string }) => {
    setContent(selected);
    setShowLibrary(false);
    setTheaterState({ isPlaying: false, currentTime: 0, currentPage: 1 });

    // Broadcast to other participant
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

  // Playback control handlers - either caller can control
  const handlePlay = () => {
    setTheaterState((prev) => ({ ...prev, isPlaying: true }));
    // Broadcast immediately with current time
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
    // Broadcast immediately with current time
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
    // Broadcast the seek immediately
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

  // Handle PDF page change - broadcast to sync
  const handlePageChange = (page: number) => {
    setTheaterState((prev) => ({ ...prev, currentPage: page }));
    // Broadcast the page change
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

  // Exit theater - notify other participant
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

  // Get participants for PiP
  const participantList = Array.from(participants.values());
  const localParticipant = participantList.find((p) => p.isLocal);
  const remoteParticipants = participantList.filter((p) => !p.isLocal);

  return (
    <div className="fixed inset-0 z-40 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50">
        <div className="flex items-center space-x-3">
          <span className="text-purple-400 text-sm font-medium px-2 py-1 bg-purple-500/20 rounded">
            Theater Mode
          </span>
          {content && (
            <span className="text-white font-medium hidden sm:inline">{content.title}</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowLibrary(true)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Library className="h-4 w-4" />
            <span className="text-sm hidden sm:inline">Library</span>
          </button>
          <button
            onClick={handleExit}
            className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="text-sm hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Mobile: Only show remote participant PiP (to see their reactions) */}
        <div className="md:hidden absolute top-2 right-2 z-10">
          {remoteParticipants.slice(0, 1).map((participant) => (
            <div
              key={participant.odId}
              className="w-24 h-32 rounded-xl overflow-hidden shadow-2xl border-2 border-purple-500/50 bg-gray-800"
            >
              <PiPVideoTile participant={participant} />
            </div>
          ))}
        </div>

        {/* Desktop: Show both PiP windows */}
        <div className="hidden md:flex absolute top-4 right-4 z-10 flex-col space-y-2">
          {/* Remote participant(s) PiP */}
          {remoteParticipants.slice(0, 1).map((participant) => (
            <div
              key={participant.odId}
              className="w-40 h-28 rounded-xl overflow-hidden shadow-2xl border-2 border-purple-500/50 bg-gray-800"
            >
              <PiPVideoTile participant={participant} />
            </div>
          ))}

          {/* Local participant PiP */}
          {localParticipant && (
            <div className="w-40 h-28 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700 bg-gray-800">
              <PiPVideoTile participant={localParticipant} />
            </div>
          )}
        </div>

        {/* Content Player - full height container */}
        <div className="h-full flex flex-col p-2 md:p-4 md:pr-48">
          {!content ? (
            // No content selected - show prompt
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-center px-4">
                <Library className="h-16 w-16 md:h-20 md:w-20 text-gray-600 mx-auto mb-4" />
                <h2 className="text-lg md:text-xl text-white mb-2">
                  Choose something to watch together
                </h2>
                <p className="text-gray-400 mb-6 text-sm md:text-base">
                  Select a video or storybook from the library
                </p>
                <button
                  onClick={() => setShowLibrary(true)}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
                >
                  Open Library
                </button>
              </div>
            </div>
          ) : content.type === 'video' ? (
            // Video player - both callers can control (flex-1 ensures full height)
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
            // YouTube player - synced between callers
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
            // PDF storybook viewer - synced page navigation
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
      <div className="px-4 py-3 bg-gray-800/90 safe-area-bottom">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={onToggleAudio}
            className={`p-3 rounded-full transition-colors ${
              isAudioOn
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <button
            onClick={onToggleVideo}
            className={`p-3 rounded-full transition-colors ${
              isVideoOn
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
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
        <div className="w-full h-full flex items-center justify-center bg-gray-700">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white text-lg font-semibold">
            {participant.odName[0]?.toUpperCase() || '?'}
          </div>
        </div>
      )}

      {/* Hidden audio element for remote participant */}
      {!participant.isLocal && <audio ref={audioRef} />}

      {/* Name label */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-0.5">
        <span className="text-white text-xs truncate block">
          {participant.odName}
          {participant.isLocal && ' (You)'}
        </span>
      </div>

      {/* Mute indicator */}
      {!participant.audioOn && (
        <div className="absolute top-1 right-1 p-1 bg-red-500 rounded-full">
          <MicOff className="h-2.5 w-2.5 text-white" />
        </div>
      )}
    </div>
  );
}
