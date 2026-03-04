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
} from 'lucide-react';

interface TheaterVideoPlayerProps {
  src: string;
  title?: string;
  isController: boolean;  // Only parent can control
  currentTime?: number;   // Synced time from parent
  isPlaying?: boolean;    // Synced play state
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onTimeUpdate?: (time: number, duration: number) => void;
}

export function TheaterVideoPlayer({
  src,
  title,
  isController,
  currentTime: syncedTime,
  isPlaying: syncedIsPlaying,
  onPlay,
  onPause,
  onSeek,
  onTimeUpdate,
}: TheaterVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isSynced, setIsSynced] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  // Always sync to shared playback state (from either caller)
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const now = Date.now();

    // Sync time if difference is more than 1 second (tighter sync)
    if (syncedTime !== undefined && Math.abs(video.currentTime - syncedTime) > 1) {
      // Only sync if we haven't just synced (debounce)
      if (now - lastSyncTimeRef.current > 500) {
        console.log('Theater: Syncing time', { local: video.currentTime, remote: syncedTime });
        video.currentTime = syncedTime;
        lastSyncTimeRef.current = now;
        setIsSynced(true);
      }
    }

    // Sync play/pause state
    if (syncedIsPlaying !== undefined) {
      if (syncedIsPlaying && video.paused) {
        console.log('Theater: Remote play received, starting playback');
        video.play().catch(console.error);
        setIsSynced(true);
      } else if (!syncedIsPlaying && !video.paused) {
        console.log('Theater: Remote pause received, pausing playback');
        video.pause();
        setIsSynced(true);
      }
    }
  }, [syncedTime, syncedIsPlaying]);

  // Handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (isController && onTimeUpdate) {
        onTimeUpdate(video.currentTime, video.duration);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [isController, onTimeUpdate]);

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

  // Format time as MM:SS
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Control actions - both callers can control
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(console.error);
      onPlay?.();
    } else {
      video.pause();
      onPause?.();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !videoRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;

    videoRef.current.currentTime = newTime;
    onSeek?.(newTime);
  };

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;

    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    onSeek?.(newTime);
  };

  const handleVolumeToggle = () => {
    if (!videoRef.current) return;

    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="relative bg-black rounded-xl overflow-hidden group h-full w-full"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element - use aspect ratio for mobile, fill for desktop */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain absolute inset-0"
        playsInline
        onClick={handlePlayPause}
      />

      {/* Title Overlay */}
      {title && showControls && (
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
          <h3 className="text-white font-medium">{title}</h3>
        </div>
      )}

      {/* Controls Overlay */}
      <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Progress Bar - both callers can seek */}
        <div
          ref={progressRef}
          className="mx-4 h-1 bg-white/30 rounded-full cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-purple-500 rounded-full relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow" />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Play/Pause - Available to both callers */}
              <button
                onClick={() => handleSkip(-10)}
                className="p-2 text-white hover:text-purple-300 transition-colors"
                title="Rewind 10s"
              >
                <SkipBack className="h-5 w-5" />
              </button>

              <button
                onClick={handlePlayPause}
                className="p-3 bg-purple-600 hover:bg-purple-700 rounded-full text-white transition-colors"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-0.5" />
                )}
              </button>

              <button
                onClick={() => handleSkip(10)}
                className="p-2 text-white hover:text-purple-300 transition-colors"
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
                onClick={handleVolumeToggle}
                className="p-2 text-white hover:text-purple-300 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>

              {/* Fullscreen */}
              <button
                onClick={handleFullscreen}
                className="p-2 text-white hover:text-purple-300 transition-colors"
              >
                <Maximize className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Big Play Button Overlay (when paused) - both callers can click */}
      {!isPlaying && (
        <button
          onClick={handlePlayPause}
          className="absolute inset-0 flex items-center justify-center bg-black/30"
        >
          <div className="p-6 bg-purple-600/90 rounded-full hover:bg-purple-700/90 transition-colors">
            <Play className="h-12 w-12 text-white ml-1" />
          </div>
        </button>
      )}
    </div>
  );
}
