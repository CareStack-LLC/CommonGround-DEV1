/**
 * Reading Progress Tracking Utility
 * Manages book reading history, progress, and bookmarks in localStorage
 */

export interface ReadingProgress {
  bookId: string;
  currentPage: number;
  totalPages: number;
  lastRead: Date;
  completed: boolean;
  bookmarks: number[]; // Array of page numbers
  readWith?: string; // Contact name or 'alone'
}

export interface ReadingStats {
  booksRead: number;
  booksCompleted: number;
  pagesRead: number;
  streak: number; // Days reading streak
  lastReadDate: Date | null;
}

const STORAGE_KEY_PREFIX = 'kidcom_reading_';
const BOOKMARKS_KEY_PREFIX = 'kidcom_bookmarks_';
const STATS_KEY = 'kidcom_reading_stats';

/**
 * Save reading progress for a book
 */
export function saveReadingProgress(
  bookId: string,
  currentPage: number,
  totalPages: number,
  readWith?: string
): void {
  const completed = currentPage >= totalPages;

  // Get existing bookmarks and readWith
  const existingProgress = getReadingProgress(bookId);
  const bookmarks = existingProgress?.bookmarks ?? [];

  const readingProgress: ReadingProgress = {
    bookId,
    currentPage,
    totalPages,
    lastRead: new Date(),
    completed,
    bookmarks,
    readWith: readWith || existingProgress?.readWith || 'alone',
  };

  localStorage.setItem(
    `${STORAGE_KEY_PREFIX}${bookId}`,
    JSON.stringify(readingProgress)
  );

  // Update stats
  updateReadingStats(bookId, currentPage, completed);
}

/**
 * Get reading progress for a book
 */
export function getReadingProgress(bookId: string): ReadingProgress | null {
  const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${bookId}`);
  if (!data) return null;

  try {
    const progress = JSON.parse(data) as ReadingProgress;
    progress.lastRead = new Date(progress.lastRead);
    return progress;
  } catch {
    return null;
  }
}

/**
 * Get all reading progress entries
 */
export function getAllReadingProgress(): ReadingProgress[] {
  const entries: ReadingProgress[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const progress = JSON.parse(data) as ReadingProgress;
          progress.lastRead = new Date(progress.lastRead);
          entries.push(progress);
        } catch {
          // Skip invalid entries
        }
      }
    }
  }

  return entries.sort(
    (a, b) => b.lastRead.getTime() - a.lastRead.getTime()
  );
}

/**
 * Get currently reading books (have progress but not completed)
 */
export function getCurrentlyReading(): ReadingProgress[] {
  return getAllReadingProgress().filter(
    (p) => p.currentPage > 0 && !p.completed
  );
}

/**
 * Get recently read books (last 5)
 */
export function getRecentlyRead(): ReadingProgress[] {
  return getAllReadingProgress().slice(0, 5);
}

/**
 * Toggle bookmark for a page
 */
export function toggleBookmark(bookId: string, page: number): boolean {
  const progress = getReadingProgress(bookId);
  if (!progress) {
    // Create new progress entry with bookmark
    const newProgress: ReadingProgress = {
      bookId,
      currentPage: page,
      totalPages: page,
      lastRead: new Date(),
      completed: false,
      bookmarks: [page],
    };
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${bookId}`,
      JSON.stringify(newProgress)
    );
    return true;
  }

  const bookmarks = progress.bookmarks ?? [];
  const index = bookmarks.indexOf(page);

  if (index > -1) {
    bookmarks.splice(index, 1);
  } else {
    bookmarks.push(page);
    bookmarks.sort((a, b) => a - b);
  }

  progress.bookmarks = bookmarks;
  localStorage.setItem(
    `${STORAGE_KEY_PREFIX}${bookId}`,
    JSON.stringify(progress)
  );

  return index === -1; // Return true if added, false if removed
}

/**
 * Check if page is bookmarked
 */
export function isBookmarked(bookId: string, page: number): boolean {
  const progress = getReadingProgress(bookId);
  return progress?.bookmarks?.includes(page) ?? false;
}

/**
 * Get all bookmarks for a book
 */
export function getBookmarks(bookId: string): number[] {
  const progress = getReadingProgress(bookId);
  return progress?.bookmarks ?? [];
}

/**
 * Update reading statistics
 */
function updateReadingStats(
  bookId: string,
  currentPage: number,
  completed: boolean
): void {
  const stats = getReadingStats();

  // Track unique books
  const allProgress = getAllReadingProgress();
  stats.booksRead = allProgress.length;
  stats.booksCompleted = allProgress.filter((p) => p.completed).length;

  // Calculate total pages read (sum of current pages)
  stats.pagesRead = allProgress.reduce((sum, p) => sum + p.currentPage, 0);

  // Update streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (stats.lastReadDate) {
    const lastRead = new Date(stats.lastReadDate);
    lastRead.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (today.getTime() - lastRead.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 0) {
      // Same day, maintain streak
    } else if (daysDiff === 1) {
      // Next day, increment streak
      stats.streak += 1;
    } else {
      // Break in streak, reset to 1
      stats.streak = 1;
    }
  } else {
    // First time reading
    stats.streak = 1;
  }

  stats.lastReadDate = new Date();

  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

/**
 * Get reading statistics
 */
export function getReadingStats(): ReadingStats {
  const data = localStorage.getItem(STATS_KEY);

  if (data) {
    try {
      const stats = JSON.parse(data) as ReadingStats;
      stats.lastReadDate = stats.lastReadDate ? new Date(stats.lastReadDate) : null;
      return stats;
    } catch {
      // Fall through to default
    }
  }

  return {
    booksRead: 0,
    booksCompleted: 0,
    pagesRead: 0,
    streak: 0,
    lastReadDate: null,
  };
}

/**
 * Clear all reading progress
 */
export function clearAllProgress(): void {
  const keys: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY_PREFIX) || key?.startsWith(BOOKMARKS_KEY_PREFIX)) {
      keys.push(key);
    }
  }

  keys.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(STATS_KEY);
}
