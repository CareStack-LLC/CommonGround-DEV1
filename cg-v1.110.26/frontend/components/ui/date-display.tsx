'use client';

/**
 * Timezone-aware date display components.
 *
 * These components automatically convert UTC dates from the API
 * to the user's timezone for display.
 */

import { useAuth } from '@/lib/auth-context';
import {
  formatInUserTimezone,
  formatScheduleTime,
  formatFullDateTime,
  formatDate,
  formatShortDate,
  getTimezoneAbbr,
} from '@/lib/timezone';

type DateFormat = 'short' | 'medium' | 'long' | 'time' | 'full' | 'date';

interface DateDisplayProps {
  /** UTC datetime string from API (e.g., "2024-01-15T02:30:00Z") */
  date: string | null | undefined;
  /** Display format */
  format?: DateFormat;
  /** Custom format string (overrides format prop) */
  customFormat?: string;
  /** Show timezone indicator */
  showTimezone?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Fallback text when date is null/undefined */
  fallback?: string;
}

/**
 * Generic date display component with multiple format options.
 *
 * @example
 * <DateDisplay date="2024-01-16T02:30:00Z" format="short" />
 * // Displays: "Jan 15" (in user's timezone)
 *
 * <DateDisplay date="2024-01-16T02:30:00Z" format="medium" />
 * // Displays: "Jan 15, 2024, 6:30 PM"
 *
 * <DateDisplay date="2024-01-16T02:30:00Z" format="full" showTimezone />
 * // Displays: "Monday, January 15, 2024 at 6:30 PM PT"
 */
export function DateDisplay({
  date,
  format = 'medium',
  customFormat,
  showTimezone = false,
  className = '',
  fallback = '—',
}: DateDisplayProps) {
  const { timezone } = useAuth();

  if (!date) {
    return <span className={className}>{fallback}</span>;
  }

  let displayText: string;

  if (customFormat) {
    displayText = formatInUserTimezone(date, timezone, customFormat);
  } else {
    switch (format) {
      case 'short':
        displayText = formatShortDate(date, timezone);
        break;
      case 'date':
        displayText = formatDate(date, timezone);
        break;
      case 'time':
        displayText = formatScheduleTime(date, timezone);
        break;
      case 'full':
        displayText = formatFullDateTime(date, timezone);
        break;
      case 'long':
        displayText = formatInUserTimezone(date, timezone, 'PPPp');
        break;
      case 'medium':
      default:
        displayText = formatInUserTimezone(date, timezone, 'PPp');
        break;
    }
  }

  if (showTimezone && format !== 'time' && format !== 'full') {
    displayText = `${displayText} ${getTimezoneAbbr(timezone)}`;
  }

  return <span className={className}>{displayText}</span>;
}

interface ScheduleTimeDisplayProps {
  /** UTC datetime string from API */
  date: string | null | undefined;
  /** Additional CSS classes */
  className?: string;
  /** Fallback text when date is null/undefined */
  fallback?: string;
}

/**
 * Specialized time display for schedules with timezone indicator.
 *
 * @example
 * <ScheduleTimeDisplay date="2024-01-16T02:30:00Z" />
 * // Displays: "6:30 PM PT"
 */
export function ScheduleTimeDisplay({
  date,
  className = '',
  fallback = '—',
}: ScheduleTimeDisplayProps) {
  const { timezone } = useAuth();

  if (!date) {
    return <span className={className}>{fallback}</span>;
  }

  const displayText = formatScheduleTime(date, timezone);

  return <span className={className}>{displayText}</span>;
}

interface DateRangeDisplayProps {
  /** UTC datetime string for start */
  startDate: string | null | undefined;
  /** UTC datetime string for end */
  endDate: string | null | undefined;
  /** Additional CSS classes */
  className?: string;
  /** Fallback text when dates are null/undefined */
  fallback?: string;
}

/**
 * Display a date range with timezone.
 *
 * @example
 * <DateRangeDisplay
 *   startDate="2024-01-16T02:30:00Z"
 *   endDate="2024-01-16T04:30:00Z"
 * />
 * // Displays: "6:30 PM - 8:30 PM PT"
 */
export function DateRangeDisplay({
  startDate,
  endDate,
  className = '',
  fallback = '—',
}: DateRangeDisplayProps) {
  const { timezone } = useAuth();

  if (!startDate || !endDate) {
    return <span className={className}>{fallback}</span>;
  }

  const startTime = formatInUserTimezone(startDate, timezone, 'h:mm a');
  const endTime = formatInUserTimezone(endDate, timezone, 'h:mm a');
  const tzAbbr = getTimezoneAbbr(timezone);

  return (
    <span className={className}>
      {startTime} - {endTime} {tzAbbr}
    </span>
  );
}

interface RelativeTimeDisplayProps {
  /** UTC datetime string from API */
  date: string | null | undefined;
  /** Additional CSS classes */
  className?: string;
  /** Fallback text when date is null/undefined */
  fallback?: string;
}

/**
 * Display relative time (e.g., "in 2 hours", "3 days ago").
 *
 * @example
 * <RelativeTimeDisplay date="2024-01-16T02:30:00Z" />
 * // Displays: "in 2 hours" or "3 days ago"
 */
export function RelativeTimeDisplay({
  date,
  className = '',
  fallback = '—',
}: RelativeTimeDisplayProps) {
  if (!date) {
    return <span className={className}>{fallback}</span>;
  }

  const now = new Date();
  const targetDate = new Date(date);
  const diffMs = targetDate.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  let displayText: string;

  if (Math.abs(diffMins) < 1) {
    displayText = 'just now';
  } else if (Math.abs(diffMins) < 60) {
    displayText = diffMins > 0
      ? `in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`
      : `${Math.abs(diffMins)} minute${Math.abs(diffMins) !== 1 ? 's' : ''} ago`;
  } else if (Math.abs(diffHours) < 24) {
    displayText = diffHours > 0
      ? `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`
      : `${Math.abs(diffHours)} hour${Math.abs(diffHours) !== 1 ? 's' : ''} ago`;
  } else {
    displayText = diffDays > 0
      ? `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`
      : `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
  }

  return <span className={className}>{displayText}</span>;
}
