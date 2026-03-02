/**
 * Watch Progress Tracking Utility
 * Manages video watch history, progress, and favorites in localStorage
 */

export interface WatchProgress {
  videoId: string;
  progress: number; // 0-100 percentage
  currentTime: number; // seconds
  duration: number; // total seconds
  lastWatched: Date;
  completed: boolean;
  watchedWith?: string; // Contact name or 'alone'
}

export interface VideoStats {
  totalWatched: number;
  totalCompleted: number;
  totalMinutes: number;
  favorites: string[];
}

const STORAGE_KEY_PREFIX = 'kidcom_watch_';
const FAVORITES_KEY = 'kidcom_favorites';
const STATS_KEY = 'kidcom_video_stats';

/**
 * Save watch progress for a video
 */
export function saveWatchProgress(
  videoId: string,
  currentTime: number,
  duration: number,
  watchedWith?: string
): void {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const completed = progress >= 90; // Consider 90%+ as completed

  // Get existing progress to preserve watchedWith if not provided
  const existingProgress = getWatchProgress(videoId);

  const watchProgress: WatchProgress = {
    videoId,
    progress,
    currentTime,
    duration,
    lastWatched: new Date(),
    completed,
    watchedWith: watchedWith || existingProgress?.watchedWith || 'alone',
  };

  localStorage.setItem(
    `${STORAGE_KEY_PREFIX}${videoId}`,
    JSON.stringify(watchProgress)
  );

  // Update stats
  updateVideoStats(videoId, completed);
}

/**
 * Get watch progress for a video
 */
export function getWatchProgress(videoId: string): WatchProgress | null {
  const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${videoId}`);
  if (!data) return null;

  try {
    const progress = JSON.parse(data) as WatchProgress;
    progress.lastWatched = new Date(progress.lastWatched);
    return progress;
  } catch {
    return null;
  }
}

/**
 * Get all watch progress entries
 */
export function getAllWatchProgress(): WatchProgress[] {
  const entries: WatchProgress[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const progress = JSON.parse(data) as WatchProgress;
          progress.lastWatched = new Date(progress.lastWatched);
          entries.push(progress);
        } catch {
          // Skip invalid entries
        }
      }
    }
  }

  return entries.sort(
    (a, b) => b.lastWatched.getTime() - a.lastWatched.getTime()
  );
}

/**
 * Get recently watched videos (last 5)
 */
export function getRecentlyWatched(): WatchProgress[] {
  return getAllWatchProgress().slice(0, 5);
}

/**
 * Get continue watching (videos with progress > 0 and < 90%)
 */
export function getContinueWatching(): WatchProgress[] {
  return getAllWatchProgress().filter(
    (p) => p.progress > 0 && p.progress < 90
  );
}

/**
 * Toggle favorite status for a video
 */
export function toggleFavorite(videoId: string): boolean {
  const favorites = getFavorites();
  const index = favorites.indexOf(videoId);

  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(videoId);
  }

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return index === -1; // Return true if added, false if removed
}

/**
 * Check if video is favorited
 */
export function isFavorite(videoId: string): boolean {
  return getFavorites().includes(videoId);
}

/**
 * Get all favorite video IDs
 */
export function getFavorites(): string[] {
  const data = localStorage.getItem(FAVORITES_KEY);
  if (!data) return [];

  try {
    return JSON.parse(data) as string[];
  } catch {
    return [];
  }
}

/**
 * Update video watching statistics
 */
function updateVideoStats(videoId: string, completed: boolean): void {
  const stats = getVideoStats();

  // Track unique videos watched
  const allProgress = getAllWatchProgress();
  stats.totalWatched = allProgress.length;
  stats.totalCompleted = allProgress.filter((p) => p.completed).length;

  // Calculate total watch time
  stats.totalMinutes = Math.round(
    allProgress.reduce((sum, p) => sum + p.currentTime / 60, 0)
  );

  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

/**
 * Get video watching statistics
 */
export function getVideoStats(): VideoStats {
  const data = localStorage.getItem(STATS_KEY);

  if (data) {
    try {
      return JSON.parse(data) as VideoStats;
    } catch {
      // Fall through to default
    }
  }

  return {
    totalWatched: 0,
    totalCompleted: 0,
    totalMinutes: 0,
    favorites: getFavorites(),
  };
}

/**
 * Clear all watch progress
 */
export function clearAllProgress(): void {
  const keys: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      keys.push(key);
    }
  }

  keys.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(STATS_KEY);
}

/**
 * Format duration in seconds to MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
