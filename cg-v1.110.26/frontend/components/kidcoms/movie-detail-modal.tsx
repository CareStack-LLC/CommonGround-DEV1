'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Users, Star, Clock, Tag, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { OriginalsBadge } from '@/components/kidcoms/originals-badge';
import type { VideoContent, VideoCategory, videoCategories as VideoCategoriesType } from '@/lib/theater-content';
import { videoCategories } from '@/lib/theater-content';
import type { WatchProgress } from '@/lib/watch-progress';

interface MovieDetailModalProps {
  video: VideoContent | null;
  onClose: () => void;
  onWatchNow: (video: VideoContent) => void;
  onWatchTogether?: (video: VideoContent) => void;
  progress?: WatchProgress | null;
  rating?: number;
  ratingCount?: number;
}

export function MovieDetailModal({
  video,
  onClose,
  onWatchNow,
  onWatchTogether,
  progress,
  rating = 4.5,
  ratingCount = 2400,
}: MovieDetailModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Reset play state when video changes
  useEffect(() => {
    setIsPlaying(false);
  }, [video?.id]);

  if (!video) return null;

  const category = videoCategories[video.category];

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const progressPercent = progress ? Math.round(progress.progress) : 0;

  return (
    <Dialog open={!!video} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        {/* Trailer / Video Preview */}
        <div className="relative aspect-video w-full overflow-hidden">
          <video
            ref={videoRef}
            src={video.url}
            poster={video.thumbnail}
            className="w-full h-full object-cover"
            muted
            playsInline
            onEnded={() => setIsPlaying(false)}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

          {/* Play/Pause overlay */}
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center group cursor-pointer"
            aria-label={isPlaying ? 'Pause trailer' : 'Play trailer'}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
              isPlaying
                ? 'bg-black/40 opacity-0 group-hover:opacity-100'
                : 'bg-gradient-to-br from-cg-sage to-cg-slate-light shadow-lg shadow-cg-sage/30'
            }`}>
              {isPlaying ? (
                <Pause className="w-7 h-7 text-white" />
              ) : (
                <Play className="w-7 h-7 text-white fill-white ml-1" />
              )}
            </div>
          </button>

          {/* Originals badge */}
          <div className="absolute top-4 left-4">
            <OriginalsBadge size="md" />
          </div>

          {/* Progress bar if in progress */}
          {progress && progressPercent > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, var(--cg-sage), var(--cg-slate-light))',
                }}
              />
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-5 space-y-4">
          {/* Title */}
          <DialogTitle
            className="text-2xl font-black"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {video.title}
          </DialogTitle>

          {/* Metadata Row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Star Rating */}
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span
                className="text-sm font-bold"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--portal-text-heading)' }}
              >
                {rating.toFixed(1)}
              </span>
              <span className="text-xs" style={{ color: 'var(--portal-muted)' }}>
                ({ratingCount >= 1000 ? `${(ratingCount / 1000).toFixed(1)}k` : ratingCount})
              </span>
            </div>

            {/* Duration */}
            {video.duration && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: 'var(--portal-background)' }}>
                <Clock className="w-3.5 h-3.5" style={{ color: 'var(--portal-muted)' }} />
                <span className="text-xs font-semibold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--portal-text)' }}>
                  {video.duration}
                </span>
              </div>
            )}

            {/* Age Range */}
            {video.ageRange && (
              <div className="px-2.5 py-1 rounded-full" style={{ background: 'var(--portal-background)' }}>
                <span className="text-xs font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-text)' }}>
                  Ages {video.ageRange}
                </span>
              </div>
            )}

            {/* Genre */}
            {category && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: 'var(--portal-background)' }}>
                <Tag className="w-3.5 h-3.5" style={{ color: 'var(--portal-muted)' }} />
                <span className="text-xs font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-text)' }}>
                  {category.emoji} {category.name}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <DialogDescription
            className="text-sm leading-relaxed"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {video.description || `Enjoy ${video.title} — a great ${category?.name?.toLowerCase() || ''} pick for the whole family!`}
          </DialogDescription>

          {/* Progress indicator */}
          {progress && progressPercent > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--portal-border)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(90deg, var(--cg-sage), var(--cg-slate-light))',
                  }}
                />
              </div>
              <span className="text-xs font-semibold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--portal-muted)' }}>
                {progressPercent}%
              </span>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => onWatchNow(video)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                background: 'linear-gradient(135deg, var(--cg-sage), var(--cg-slate-light))',
                boxShadow: '0 4px 14px rgba(61, 170, 138, 0.3)',
              }}
            >
              <Play className="w-5 h-5 fill-white" />
              {progress && progressPercent > 0 ? 'Continue Watching' : 'Watch Now'}
            </button>

            {onWatchTogether && (
              <button
                onClick={() => onWatchTogether(video)}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  background: 'var(--portal-background)',
                  color: 'var(--portal-text-heading)',
                  border: '1px solid var(--portal-border)',
                }}
              >
                <Users className="w-5 h-5" />
                Together
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
