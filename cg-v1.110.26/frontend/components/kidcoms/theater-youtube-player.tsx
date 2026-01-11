'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Users,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  destroy: () => void;
}

interface TheaterYoutubePlayerProps {
  videoId: string;
  title?: string;
  currentTime?: number;
  isPlaying?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onTimeUpdate?: (time: number, duration: number) => void;
}

// Extract YouTube video ID from various URL formats
export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function TheaterYoutubePlayer({
  videoId,
  title,
  currentTime: syncedTime,
  isPlaying: syncedIsPlaying,
  onPlay,
  onPause,
  onSeek,
  onTimeUpdate,
}: TheaterYoutubePlayerProps) {
  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const playerIdRef = useRef(`youtube-player-${Date.now()}`);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    // Load the API script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      initPlayer();
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoId]);

  function initPlayer() {
    if (!containerRef.current || playerRef.current) return;

    try {
      playerRef.current = new window.YT.Player(playerIdRef.current, {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 0, // We'll use our own controls
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
          enablejsapi: 1,
          playsinline: 1,
        },
        events: {
          onReady: handlePlayerReady,
          onStateChange: handleStateChange,
          onError: handleError,
        },
      });
    } catch (err) {
      console.error('YouTube player init error:', err);
      setError('Failed to initialize YouTube player');
      setIsLoading(false);
    }
  }

  function handlePlayerReady(event: { target: YTPlayer }) {
    setIsReady(true);
    setIsLoading(false);
    setDuration(event.target.getDuration());
  }

  function handleStateChange(event: { data: number; target: YTPlayer }) {
    const state = event.data;

    if (state === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
    } else if (state === window.YT.PlayerState.PAUSED) {
      setIsPlaying(false);
    } else if (state === window.YT.PlayerState.ENDED) {
      setIsPlaying(false);
    }
  }

  function handleError(event: { data: number }) {
    console.error('YouTube player error:', event.data);
    const errorMessages: Record<number, string> = {
      2: 'Invalid video ID',
      5: 'Video cannot be played in embedded player',
      100: 'Video not found or private',
      101: 'Video owner does not allow embedding',
      150: 'Video owner does not allow embedding',
    };
    setError(errorMessages[event.data] || 'Video playback error');
    setIsLoading(false);
  }

  // Update time periodically when playing
  useEffect(() => {
    if (!isReady || !isPlaying) return;

    const interval = setInterval(() => {
      if (playerRef.current) {
        const time = playerRef.current.getCurrentTime();
        const dur = playerRef.current.getDuration();
        setCurrentTime(time);
        setDuration(dur);
        onTimeUpdate?.(time, dur);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isReady, isPlaying, onTimeUpdate]);

  // Sync to shared playback state
  useEffect(() => {
    if (!isReady || !playerRef.current) return;

    const player = playerRef.current;
    const now = Date.now();

    // Sync time if difference is more than 2 seconds
    if (syncedTime !== undefined && Math.abs(player.getCurrentTime() - syncedTime) > 2) {
      if (now - lastSyncTimeRef.current > 500) {
        console.log('YouTube: Syncing time', { local: player.getCurrentTime(), remote: syncedTime });
        player.seekTo(syncedTime, true);
        lastSyncTimeRef.current = now;
      }
    }

    // Sync play/pause state
    if (syncedIsPlaying !== undefined) {
      const currentState = player.getPlayerState();
      const isCurrentlyPlaying = currentState === window.YT?.PlayerState?.PLAYING;

      if (syncedIsPlaying && !isCurrentlyPlaying) {
        console.log('YouTube: Remote play received');
        player.playVideo();
      } else if (!syncedIsPlaying && isCurrentlyPlaying) {
        console.log('YouTube: Remote pause received');
        player.pauseVideo();
      }
    }
  }, [syncedTime, syncedIsPlaying, isReady]);

  // Auto-hide controls
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  // Format time
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Control handlers
  const handlePlayPause = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
      onPause?.();
    } else {
      playerRef.current.playVideo();
      onPlay?.();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;

    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
    onSeek?.(newTime);
  };

  const handleSkip = (seconds: number) => {
    if (!playerRef.current) return;

    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
    onSeek?.(newTime);
  };

  const handleMuteToggle = () => {
    if (!playerRef.current) return;

    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-900 rounded-xl">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-white mb-2">{error}</p>
          <p className="text-gray-400 text-sm">Please try a different video</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-black rounded-xl overflow-hidden group"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* YouTube Player Container */}
      <div className="absolute inset-0">
        <div id={playerIdRef.current} className="w-full h-full" />
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading video...</p>
          </div>
        </div>
      )}

      {/* Click overlay for play/pause */}
      {isReady && (
        <div
          className="absolute inset-0 z-10"
          onClick={handlePlayPause}
        />
      )}

      {/* Title Overlay */}
      {title && showControls && (
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-20">
          <h3 className="text-white font-medium">{title}</h3>
        </div>
      )}

      {/* Controls Overlay */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Progress Bar */}
        <div
          className="mx-4 h-1 bg-white/30 rounded-full cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-red-500 rounded-full relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow" />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={(e) => { e.stopPropagation(); handleSkip(-10); }}
                className="p-2 text-white hover:text-red-300 transition-colors"
                title="Rewind 10s"
              >
                <SkipBack className="h-5 w-5" />
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
                className="p-3 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-0.5" />
                )}
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); handleSkip(10); }}
                className="p-2 text-white hover:text-red-300 transition-colors"
                title="Forward 10s"
              >
                <SkipForward className="h-5 w-5" />
              </button>

              {/* Time Display */}
              <span className="text-white text-sm tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Synced Indicator */}
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                <Users className="h-3.5 w-3.5" />
                <span>Synced</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Volume */}
              <button
                onClick={(e) => { e.stopPropagation(); handleMuteToggle(); }}
                className="p-2 text-white hover:text-red-300 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>

              {/* Fullscreen */}
              <button
                onClick={(e) => { e.stopPropagation(); handleFullscreen(); }}
                className="p-2 text-white hover:text-red-300 transition-colors"
              >
                <Maximize className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Big Play Button Overlay (when paused) */}
      {isReady && !isPlaying && (
        <button
          onClick={handlePlayPause}
          className="absolute inset-0 flex items-center justify-center bg-black/30 z-10"
        >
          <div className="p-6 bg-red-600/90 rounded-full hover:bg-red-700/90 transition-colors">
            <Play className="h-12 w-12 text-white ml-1" />
          </div>
        </button>
      )}
    </div>
  );
}
