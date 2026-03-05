/**
 * Date utilities for CommonGround
 */

import {
  format,
  formatDistance,
  parseISO,
  isToday,
  isYesterday,
  isTomorrow,
  isThisWeek,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInYears,
  addDays,
  addWeeks,
  addMonths,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  isBefore,
  isAfter,
  isWithinInterval,
} from 'date-fns';

/**
 * Parse a date string or return the Date object
 */
export function parseDate(date: string | Date): Date {
  return typeof date === 'string' ? parseISO(date) : date;
}

/**
 * Format a date for display
 */
export function formatDate(
  date: string | Date,
  formatString: string = 'MMM d, yyyy'
): string {
  return format(parseDate(date), formatString);
}

/**
 * Format a date with time
 */
export function formatDateTime(
  date: string | Date,
  formatString: string = 'MMM d, yyyy h:mm a'
): string {
  return format(parseDate(date), formatString);
}

/**
 * Format time only
 */
export function formatTime(
  date: string | Date,
  formatString: string = 'h:mm a'
): string {
  return format(parseDate(date), formatString);
}

/**
 * Get relative time (e.g., "5 minutes ago", "in 2 hours")
 */
export function formatRelativeTime(date: string | Date): string {
  return formatDistance(parseDate(date), new Date(), { addSuffix: true });
}

/**
 * Format date in a smart way based on how recent it is
 */
export function formatSmartDate(date: string | Date): string {
  const parsed = parseDate(date);

  if (isToday(parsed)) {
    return `Today at ${formatTime(parsed)}`;
  }

  if (isYesterday(parsed)) {
    return `Yesterday at ${formatTime(parsed)}`;
  }

  if (isTomorrow(parsed)) {
    return `Tomorrow at ${formatTime(parsed)}`;
  }

  if (isThisWeek(parsed)) {
    return format(parsed, "EEEE 'at' h:mm a");
  }

  return formatDateTime(parsed);
}

/**
 * Format a duration in seconds to human readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

/**
 * Format call duration for display
 */
export function formatCallDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string | Date): number {
  return differenceInYears(new Date(), parseDate(dateOfBirth));
}

/**
 * Check if a date is in the past
 */
export function isPast(date: string | Date): boolean {
  return isBefore(parseDate(date), new Date());
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: string | Date): boolean {
  return isAfter(parseDate(date), new Date());
}

/**
 * Check if a date is within a range
 */
export function isDateInRange(
  date: string | Date,
  start: string | Date,
  end: string | Date
): boolean {
  return isWithinInterval(parseDate(date), {
    start: parseDate(start),
    end: parseDate(end),
  });
}

/**
 * Get the start and end of today
 */
export function getTodayRange(): { start: Date; end: Date } {
  const today = new Date();
  return {
    start: startOfDay(today),
    end: endOfDay(today),
  };
}

/**
 * Get the start and end of this week
 */
export function getThisWeekRange(): { start: Date; end: Date } {
  const today = new Date();
  return {
    start: startOfWeek(today),
    end: endOfWeek(today),
  };
}

// Re-export commonly used date-fns functions
export {
  parseISO,
  isToday,
  isYesterday,
  isTomorrow,
  isThisWeek,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  addDays,
  addWeeks,
  addMonths,
  startOfDay,
  endOfDay,
  isBefore,
  isAfter,
};
