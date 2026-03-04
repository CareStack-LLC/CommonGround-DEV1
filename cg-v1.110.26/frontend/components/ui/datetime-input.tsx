'use client';

/**
 * Timezone-aware datetime input components.
 *
 * These components handle the conversion between:
 * - Local time (what the user sees/enters in the input)
 * - UTC time (what gets sent to the API)
 */

import { useAuth } from '@/lib/auth-context';
import {
  localInputToUTC,
  utcToLocalInput,
  localDateToUTC,
  utcToLocalDate,
  getTimezoneAbbr,
} from '@/lib/timezone';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateTimeInputProps {
  /** Field label */
  label: string;
  /** Current value in UTC (from API/state) */
  value: string | null | undefined;
  /** Called with UTC value when input changes */
  onChange: (utcValue: string | null) => void;
  /** Input ID */
  id?: string;
  /** Is this field required? */
  required?: boolean;
  /** Is the input disabled? */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Additional class for the wrapper */
  className?: string;
  /** Show timezone indicator in label */
  showTimezone?: boolean;
  /** Minimum datetime (in UTC) */
  min?: string;
  /** Maximum datetime (in UTC) */
  max?: string;
}

/**
 * Timezone-aware datetime input.
 *
 * Shows the local time in the input and converts to/from UTC
 * when reading/writing the value.
 *
 * @example
 * const [startTime, setStartTime] = useState<string | null>("2024-01-16T02:30:00Z");
 *
 * <DateTimeInput
 *   label="Start Time"
 *   value={startTime}
 *   onChange={setStartTime}
 *   showTimezone
 * />
 * // Shows: "Start Time (PT)" with input value "2024-01-15T18:30" (local LA time)
 * // onChange receives: "2024-01-16T02:30:00.000Z" (UTC)
 */
export function DateTimeInput({
  label,
  value,
  onChange,
  id,
  required = false,
  disabled = false,
  error,
  className = '',
  showTimezone = true,
  min,
  max,
}: DateTimeInputProps) {
  const { timezone } = useAuth();
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  // Convert UTC value to local for display in input
  const localValue = utcToLocalInput(value, timezone);

  // Convert min/max from UTC to local
  const localMin = min ? utcToLocalInput(min, timezone) : undefined;
  const localMax = max ? utcToLocalInput(max, timezone) : undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const localString = e.target.value;
    if (!localString) {
      onChange(null);
      return;
    }

    // Convert local input to UTC for storage
    const utcValue = localInputToUTC(localString, timezone);
    onChange(utcValue);
  };

  const displayLabel = showTimezone
    ? `${label} (${getTimezoneAbbr(timezone)})`
    : label;

  return (
    <div className={`space-y-1 ${className}`}>
      <Label htmlFor={inputId}>
        {displayLabel}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        type="datetime-local"
        id={inputId}
        value={localValue}
        onChange={handleChange}
        required={required}
        disabled={disabled}
        min={localMin}
        max={localMax}
        className={error ? 'border-red-500' : ''}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

interface DateInputProps {
  /** Field label */
  label: string;
  /** Current value in UTC or YYYY-MM-DD format */
  value: string | null | undefined;
  /** Called with UTC value when input changes */
  onChange: (utcValue: string | null) => void;
  /** Input ID */
  id?: string;
  /** Is this field required? */
  required?: boolean;
  /** Is the input disabled? */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Additional class for the wrapper */
  className?: string;
  /** Show timezone indicator in label */
  showTimezone?: boolean;
  /** Minimum date */
  min?: string;
  /** Maximum date */
  max?: string;
}

/**
 * Timezone-aware date input (no time component).
 *
 * @example
 * <DateInput
 *   label="Event Date"
 *   value={eventDate}
 *   onChange={setEventDate}
 * />
 */
export function DateInput({
  label,
  value,
  onChange,
  id,
  required = false,
  disabled = false,
  error,
  className = '',
  showTimezone = false,
  min,
  max,
}: DateInputProps) {
  const { timezone } = useAuth();
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  // Convert UTC value to local date for display
  const localValue = value
    ? value.includes('T')
      ? utcToLocalDate(value, timezone)
      : value
    : '';

  // Convert min/max if they're full UTC strings
  const localMin = min
    ? min.includes('T')
      ? utcToLocalDate(min, timezone)
      : min
    : undefined;
  const localMax = max
    ? max.includes('T')
      ? utcToLocalDate(max, timezone)
      : max
    : undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const localDateString = e.target.value;
    if (!localDateString) {
      onChange(null);
      return;
    }

    // Convert local date to UTC for storage
    const utcValue = localDateToUTC(localDateString, timezone);
    onChange(utcValue);
  };

  const displayLabel = showTimezone
    ? `${label} (${getTimezoneAbbr(timezone)})`
    : label;

  return (
    <div className={`space-y-1 ${className}`}>
      <Label htmlFor={inputId}>
        {displayLabel}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        type="date"
        id={inputId}
        value={localValue}
        onChange={handleChange}
        required={required}
        disabled={disabled}
        min={localMin}
        max={localMax}
        className={error ? 'border-red-500' : ''}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

interface TimeInputProps {
  /** Field label */
  label: string;
  /** Current value as HH:MM string */
  value: string | null | undefined;
  /** Called when time changes */
  onChange: (timeValue: string | null) => void;
  /** Input ID */
  id?: string;
  /** Is this field required? */
  required?: boolean;
  /** Is the input disabled? */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Additional class for the wrapper */
  className?: string;
  /** Show timezone indicator in label */
  showTimezone?: boolean;
}

/**
 * Time-only input with timezone indicator.
 *
 * Note: This doesn't do timezone conversion - it just displays
 * the timezone in the label for clarity. Use this when the time
 * value will be stored as-is (e.g., a recurring time).
 *
 * @example
 * <TimeInput
 *   label="Pickup Time"
 *   value="18:30"
 *   onChange={setPickupTime}
 *   showTimezone
 * />
 * // Shows: "Pickup Time (PT)" with input value "18:30"
 */
export function TimeInput({
  label,
  value,
  onChange,
  id,
  required = false,
  disabled = false,
  error,
  className = '',
  showTimezone = true,
}: TimeInputProps) {
  const { timezone } = useAuth();
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeString = e.target.value;
    onChange(timeString || null);
  };

  const displayLabel = showTimezone
    ? `${label} (${getTimezoneAbbr(timezone)})`
    : label;

  return (
    <div className={`space-y-1 ${className}`}>
      <Label htmlFor={inputId}>
        {displayLabel}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        type="time"
        id={inputId}
        value={value || ''}
        onChange={handleChange}
        required={required}
        disabled={disabled}
        className={error ? 'border-red-500' : ''}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
