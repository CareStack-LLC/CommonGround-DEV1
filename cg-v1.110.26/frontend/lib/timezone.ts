/**
 * Centralized timezone utilities for CommonGround frontend.
 *
 * Architecture:
 * - Backend stores/returns naive UTC datetimes with "Z" suffix
 * - Frontend converts to/from user's profile timezone for display
 * - User's timezone is stored in their profile
 */

import { format, parseISO } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

/**
 * Supported US timezones
 */
export const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
] as const;

export type TimezoneValue = (typeof TIMEZONE_OPTIONS)[number]["value"];

export const DEFAULT_TIMEZONE: TimezoneValue = "America/Los_Angeles";

/**
 * Get short timezone abbreviation for display
 */
export function getTimezoneAbbr(timezone: string): string {
  const abbrevMap: Record<string, string> = {
    "America/New_York": "ET",
    "America/Chicago": "CT",
    "America/Denver": "MT",
    "America/Los_Angeles": "PT",
    "America/Anchorage": "AKT",
    "Pacific/Honolulu": "HT",
  };
  return abbrevMap[timezone] || timezone;
}

/**
 * Format a UTC datetime string for display in the user's timezone.
 *
 * @param utcString - ISO 8601 UTC datetime string (e.g., "2024-01-15T02:30:00Z")
 * @param timezone - IANA timezone identifier (e.g., "America/Los_Angeles")
 * @param formatStr - date-fns format string
 * @returns Formatted string in user's local time
 *
 * @example
 * formatInUserTimezone("2024-01-16T02:30:00Z", "America/Los_Angeles", "PPp")
 * // Returns: "Jan 15, 2024, 6:30 PM"
 */
export function formatInUserTimezone(
  utcString: string | null | undefined,
  timezone: string,
  formatStr: string = "PPp"
): string {
  if (!utcString) return "";

  try {
    const utcDate = parseISO(utcString);
    const zonedDate = toZonedTime(utcDate, timezone);
    return format(zonedDate, formatStr);
  } catch (error) {
    console.error("Error formatting date:", error);
    return utcString;
  }
}

/**
 * Format time for schedule display with timezone indicator.
 *
 * @param utcString - ISO 8601 UTC datetime string
 * @param timezone - IANA timezone identifier
 * @returns Formatted string like "6:30 PM PT"
 *
 * @example
 * formatScheduleTime("2024-01-16T02:30:00Z", "America/Los_Angeles")
 * // Returns: "6:30 PM PT"
 */
export function formatScheduleTime(
  utcString: string | null | undefined,
  timezone: string
): string {
  if (!utcString) return "";

  try {
    const timeStr = formatInUserTimezone(utcString, timezone, "h:mm a");
    const tzAbbr = getTimezoneAbbr(timezone);
    return `${timeStr} ${tzAbbr}`;
  } catch (error) {
    console.error("Error formatting schedule time:", error);
    return utcString;
  }
}

/**
 * Format full datetime for detailed display.
 *
 * @param utcString - ISO 8601 UTC datetime string
 * @param timezone - IANA timezone identifier
 * @returns Formatted string like "Monday, January 15, 2024 at 6:30 PM PT"
 *
 * @example
 * formatFullDateTime("2024-01-16T02:30:00Z", "America/Los_Angeles")
 * // Returns: "Monday, January 15, 2024 at 6:30 PM PT"
 */
export function formatFullDateTime(
  utcString: string | null | undefined,
  timezone: string
): string {
  if (!utcString) return "";

  try {
    const dateStr = formatInUserTimezone(utcString, timezone, "EEEE, MMMM d, yyyy 'at' h:mm a");
    const tzAbbr = getTimezoneAbbr(timezone);
    return `${dateStr} ${tzAbbr}`;
  } catch (error) {
    console.error("Error formatting full datetime:", error);
    return utcString;
  }
}

/**
 * Format date only (no time) for display.
 *
 * @param utcString - ISO 8601 UTC datetime string
 * @param timezone - IANA timezone identifier
 * @returns Formatted string like "January 15, 2024"
 */
export function formatDate(
  utcString: string | null | undefined,
  timezone: string
): string {
  if (!utcString) return "";

  try {
    return formatInUserTimezone(utcString, timezone, "MMMM d, yyyy");
  } catch (error) {
    console.error("Error formatting date:", error);
    return utcString;
  }
}

/**
 * Format short date for compact display.
 *
 * @param utcString - ISO 8601 UTC datetime string
 * @param timezone - IANA timezone identifier
 * @returns Formatted string like "Jan 15"
 */
export function formatShortDate(
  utcString: string | null | undefined,
  timezone: string
): string {
  if (!utcString) return "";

  try {
    return formatInUserTimezone(utcString, timezone, "MMM d");
  } catch (error) {
    console.error("Error formatting short date:", error);
    return utcString;
  }
}

/**
 * Convert a local datetime input value to UTC ISO string for API.
 *
 * When a user enters "6:30 PM" in their timezone, this converts it
 * to the equivalent UTC time for storage.
 *
 * @param localDateTimeString - Local datetime string from input (e.g., "2024-01-15T18:30")
 * @param timezone - User's IANA timezone identifier
 * @returns UTC ISO 8601 string (e.g., "2024-01-16T02:30:00.000Z")
 *
 * @example
 * // User in LA enters 6:30 PM on Jan 15
 * localInputToUTC("2024-01-15T18:30", "America/Los_Angeles")
 * // Returns: "2024-01-16T02:30:00.000Z" (next day in UTC)
 */
export function localInputToUTC(
  localDateTimeString: string | null | undefined,
  timezone: string
): string | null {
  if (!localDateTimeString) return null;

  try {
    // Parse the local input as a date in the user's timezone
    const localDate = new Date(localDateTimeString);
    // Convert from the user's timezone to UTC
    const utcDate = fromZonedTime(localDate, timezone);
    return utcDate.toISOString();
  } catch (error) {
    console.error("Error converting local to UTC:", error);
    return null;
  }
}

/**
 * Convert a UTC datetime string to local input format for form editing.
 *
 * When displaying a stored UTC time in a form input, this converts it
 * to the user's local time.
 *
 * @param utcString - ISO 8601 UTC datetime string
 * @param timezone - User's IANA timezone identifier
 * @returns Local datetime string for input (e.g., "2024-01-15T18:30")
 *
 * @example
 * utcToLocalInput("2024-01-16T02:30:00.000Z", "America/Los_Angeles")
 * // Returns: "2024-01-15T18:30"
 */
export function utcToLocalInput(
  utcString: string | null | undefined,
  timezone: string
): string {
  if (!utcString) return "";

  try {
    const utcDate = parseISO(utcString);
    const zonedDate = toZonedTime(utcDate, timezone);
    // Format for datetime-local input: YYYY-MM-DDTHH:MM
    return format(zonedDate, "yyyy-MM-dd'T'HH:mm");
  } catch (error) {
    console.error("Error converting UTC to local:", error);
    return "";
  }
}

/**
 * Convert a local date input value to UTC ISO string for API.
 *
 * For date-only fields (no time component), sets to start of day in the timezone.
 *
 * @param localDateString - Local date string from input (e.g., "2024-01-15")
 * @param timezone - User's IANA timezone identifier
 * @returns UTC ISO 8601 string
 */
export function localDateToUTC(
  localDateString: string | null | undefined,
  timezone: string
): string | null {
  if (!localDateString) return null;

  try {
    // Parse as start of day in the user's timezone
    const localDate = new Date(`${localDateString}T00:00:00`);
    const utcDate = fromZonedTime(localDate, timezone);
    return utcDate.toISOString();
  } catch (error) {
    console.error("Error converting local date to UTC:", error);
    return null;
  }
}

/**
 * Convert a UTC datetime string to local date input format.
 *
 * @param utcString - ISO 8601 UTC datetime string
 * @param timezone - User's IANA timezone identifier
 * @returns Local date string for input (e.g., "2024-01-15")
 */
export function utcToLocalDate(
  utcString: string | null | undefined,
  timezone: string
): string {
  if (!utcString) return "";

  try {
    const utcDate = parseISO(utcString);
    const zonedDate = toZonedTime(utcDate, timezone);
    return format(zonedDate, "yyyy-MM-dd");
  } catch (error) {
    console.error("Error converting UTC to local date:", error);
    return "";
  }
}

/**
 * Get the current time in the user's timezone.
 *
 * @param timezone - IANA timezone identifier
 * @returns Current Date object in the user's timezone
 */
export function getNowInTimezone(timezone: string): Date {
  return toZonedTime(new Date(), timezone);
}

/**
 * Check if a date string is today in the user's timezone.
 *
 * @param utcString - ISO 8601 UTC datetime string
 * @param timezone - IANA timezone identifier
 * @returns true if the date is today in the user's timezone
 */
export function isToday(
  utcString: string | null | undefined,
  timezone: string
): boolean {
  if (!utcString) return false;

  try {
    const utcDate = parseISO(utcString);
    const zonedDate = toZonedTime(utcDate, timezone);
    const now = getNowInTimezone(timezone);

    return (
      zonedDate.getFullYear() === now.getFullYear() &&
      zonedDate.getMonth() === now.getMonth() &&
      zonedDate.getDate() === now.getDate()
    );
  } catch (error) {
    console.error("Error checking if today:", error);
    return false;
  }
}

/**
 * Get timezone label by value
 */
export function getTimezoneLabel(value: string): string {
  const option = TIMEZONE_OPTIONS.find((opt) => opt.value === value);
  return option?.label || value;
}
