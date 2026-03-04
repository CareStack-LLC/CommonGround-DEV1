/**
 * Validation utilities for CommonGround
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (US format)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if password is strong enough
 */
export function isStrongPassword(password: string): boolean {
  return validatePassword(password).valid;
}

/**
 * Validate a PIN (4-6 digits)
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

/**
 * Validate access code format
 */
export function isValidAccessCode(code: string): boolean {
  // Access codes are typically 6-8 alphanumeric characters
  return /^[A-Z0-9]{6,8}$/i.test(code);
}

/**
 * Validate date of birth (must be in past and reasonable age)
 */
export function isValidDateOfBirth(
  dateString: string,
  minAge: number = 0,
  maxAge: number = 120
): boolean {
  const date = new Date(dateString);
  const now = new Date();

  if (isNaN(date.getTime())) {
    return false;
  }

  if (date > now) {
    return false;
  }

  const age = Math.floor(
    (now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  return age >= minAge && age <= maxAge;
}

/**
 * Validate child age (typically 0-17)
 */
export function isValidChildAge(dateOfBirth: string): boolean {
  return isValidDateOfBirth(dateOfBirth, 0, 17);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate image URL (checks for common image extensions)
 */
export function isValidImageUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const urlLower = url.toLowerCase();

  return imageExtensions.some(
    (ext) => urlLower.includes(ext) || urlLower.includes('image')
  );
}

/**
 * Sanitize user input (remove dangerous characters)
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim();
}

/**
 * Check if string is empty or whitespace only
 */
export function isEmpty(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === '';
}

/**
 * Check if string is not empty
 */
export function isNotEmpty(value: string | null | undefined): value is string {
  return !isEmpty(value);
}

/**
 * Validate required fields in an object
 */
export function validateRequired<T extends Record<string, unknown>>(
  data: T,
  requiredFields: (keyof T)[]
): { valid: boolean; missingFields: (keyof T)[] } {
  const missingFields = requiredFields.filter((field) => {
    const value = data[field];
    if (typeof value === 'string') {
      return isEmpty(value);
    }
    return value === null || value === undefined;
  });

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Validate form data with custom rules
 */
export type ValidationRule<T> = (value: T) => string | null;

export function validateField<T>(
  value: T,
  rules: ValidationRule<T>[]
): string | null {
  for (const rule of rules) {
    const error = rule(value);
    if (error) {
      return error;
    }
  }
  return null;
}

/**
 * Common validation rules
 */
export const rules = {
  required: (message: string = 'This field is required') => {
    return (value: string | null | undefined): string | null => {
      return isEmpty(value) ? message : null;
    };
  },

  minLength: (min: number, message?: string) => {
    return (value: string): string | null => {
      return value.length < min
        ? message || `Must be at least ${min} characters`
        : null;
    };
  },

  maxLength: (max: number, message?: string) => {
    return (value: string): string | null => {
      return value.length > max
        ? message || `Must be at most ${max} characters`
        : null;
    };
  },

  email: (message: string = 'Invalid email address') => {
    return (value: string): string | null => {
      return isValidEmail(value) ? null : message;
    };
  },

  phone: (message: string = 'Invalid phone number') => {
    return (value: string): string | null => {
      return isValidPhoneNumber(value) ? null : message;
    };
  },

  pattern: (regex: RegExp, message: string) => {
    return (value: string): string | null => {
      return regex.test(value) ? null : message;
    };
  },
};
