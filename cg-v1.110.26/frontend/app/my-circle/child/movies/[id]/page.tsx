'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OriginalsBadge } from '@/components/kidcoms/originals-badge';

// MuxPlayer ships its own media element (Web Components) — dynamic import
// so it never runs at SSR time, and bundle stays off the critical path
// until the theater page actually mounts.
const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-black flex items-center justify-center text-white">
      Loading player…
    </div>
  ),
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiMovie {
  id: string;
  title: string;
  description: string;
  video_url: string;
  poster_url: string;
  duration_minutes: number;
  is_featured: boolean;
  playback_provider?: 'direct' | 'mux' | 'archive';
  mux_playback_id?: string | null;
}

interface ChildUserData {
  userId: string;
  childId: string;
  childName: string;
  avatarId?: string;
  familyFileId: string;
}

export default function MoviePlayerPage() {
  const router = useRouter();
  const params = useParams();
  const videoId = params.id as string;
  const videoRef = useRef<HTMLVideoElement>(null);

  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Fetch video from API
  const [video, setVideo] = useState<{
    id: string;
    title: string;
    url: string;
    thumbnail: string;
    description: string;
    playbackProvider: 'direct' | 'mux' | 'archive';
    muxPlaybackId: string | null;
  } | null>(null);

  useEffect(() => {
    validateAndLoadUser();
    // Fetch movie from API
    const fetchMovie = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/kidspace/movies?limit=50`);
        if (res.ok) {
          const data = await res.json();
          const items = data.movies || data || [];
          const found = items.find((m: ApiMovie) => m.id === videoId);
          if (found) {
            setVideo({
              id: found.id,
              title: found.title,
              url: found.video_url || '',
              thumbnail: found.poster_url || '',
              description: found.description || '',
              playbackProvider: found.playback_provider || 'direct',
              muxPlaybackId: found.mux_playback_id ?? null,
            });
          }
        }
      } catch {
        // API unavailable
      }
    };
    fetchMovie();
  }, [videoId]);

  function validateAndLoadUser() {
    try {
      const token = localStorage.getItem('child_token');
      const userStr = localStorage.getItem('child_user');

      if (!token || !userStr) {
        router.push('/my-circle/child');
        return;
      }

      const user = JSON.parse(userStr) as ChildUserData;

      if (!user.familyFileId) {
        console.error('Missing family file ID');
        localStorage.clear();
        router.push('/my-circle/child');
        return;
      }

      setUserData(user);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.clear();
      router.push('/my-circle/child');
    }
  }

  function togglePlay() {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }

  function toggleMute() {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!videoRef.current) return;
    const newVolume = parseFloat(e.target.value);
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    if (!videoRef.current) return;
    const newTime = parseFloat(e.target.value);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }

  function toggleFullscreen() {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Video not found</h1>
          <button
            onClick={() => router.push('/my-circle/child/movies')}
            className="bg-[#2D6A8F] hover:bg-[#349878] text-white px-6 py-3 rounded-full font-bold"
          >
            Back to Movies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/my-circle/child/movies')}
            className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Back to movies"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-white text-lg font-bold truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{video.title}</h1>
              <OriginalsBadge size="sm" />
            </div>
            {video.description && (
              <p className="text-gray-300 text-xs truncate" style={{ fontFamily: 'Inter, sans-serif' }}>{video.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Video Player */}
      <div className="relative h-screen flex items-center justify-center">
        {video.playbackProvider === 'mux' && video.muxPlaybackId ? (
          // Mux player handles HLS/adaptive bitrate, Safari iOS, analytics,
          // and the play/mute/fullscreen controls natively. We hide the
          // custom controls below in this branch to avoid double UI.
          <MuxPlayer
            playbackId={video.muxPlaybackId}
            streamType="on-demand"
            accentColor="#3DAA8A"
            poster={video.thumbnail || undefined}
            metadata={{
              video_id: video.id,
              video_title: video.title,
              viewer_user_id: userData?.childId,
            }}
            style={{
              width: '100%',
              height: '100%',
              aspectRatio: '16 / 9',
              maxWidth: '100vw',
              maxHeight: '100vh',
            }}
          />
        ) : (
          <video
            ref={videoRef}
            src={video.url}
            className="max-w-full max-h-full"
            onTimeUpdate={(e) => {
              setCurrentTime(e.currentTarget.currentTime);
              setDuration(e.currentTarget.duration);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        )}

        {/* Custom controls only apply to the fallback <video> element —
            MuxPlayer renders its own play button + scrubber + volume.
            Render nothing over Mux so we don't double up the UI. */}
        {video.playbackProvider !== 'mux' && !isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={togglePlay}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3DAA8A] to-[#4BA8C8] flex items-center justify-center shadow-2xl shadow-[#3DAA8A]/30 transition-all hover:scale-110 active:scale-95"
              aria-label="Play video"
            >
              <Play className="w-10 h-10 text-white ml-1" fill="white" />
            </button>
          </div>
        )}

        {/* Controls */}
        {video.playbackProvider !== 'mux' && <div
          className={cn(
            'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 transition-opacity duration-300',
            showControls ? 'opacity-100' : 'opacity-0'
          )}
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3DAA8A 0%, #4BA8C8 ${
                  (currentTime / duration) * 100
                }%, #4B5563 ${(currentTime / duration) * 100}%, #4B5563 100%)`,
              }}
            />
            <div className="flex justify-between text-white text-sm mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="text-white hover:text-[#4BA8C8] transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8" />
                )}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-[#4BA8C8] transition-colors"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-6 h-6" />
                  ) : (
                    <Volume2 className="w-6 h-6" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-[#4BA8C8] transition-colors"
                aria-label="Fullscreen"
              >
                <Maximize className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
}
