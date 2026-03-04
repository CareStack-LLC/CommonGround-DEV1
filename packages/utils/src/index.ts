/**
 * @commonground/utils
 *
 * Shared utilities for CommonGround applications.
 * Provides date formatting, text formatting, and validation utilities.
 */

// Date utilities
export {
  parseDate,
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  formatSmartDate,
  formatDuration,
  formatCallDuration,
  calculateAge,
  isPast,
  isFuture,
  isDateInRange,
  getTodayRange,
  getThisWeekRange,
  // Re-exported from date-fns
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
} from './date';

// Format utilities
export {
  formatPhoneNumber,
  formatName,
  getInitials,
  formatFullName,
  truncate,
  formatFileSize,
  formatNumber,
  formatPercentage,
  formatCurrency,
  pluralize,
  formatCount,
  capitalize,
  toTitleCase,
  caseToTitleCase,
  maskEmail,
  maskPhone,
} from './format';

// Validation utilities
export {
  isValidEmail,
  isValidPhoneNumber,
  validatePassword,
  isStrongPassword,
  isValidPin,
  isValidAccessCode,
  isValidDateOfBirth,
  isValidChildAge,
  isValidUrl,
  isValidImageUrl,
  sanitizeInput,
  isEmpty,
  isNotEmpty,
  validateRequired,
  validateField,
  rules,
  type ValidationRule,
} from './validation';
