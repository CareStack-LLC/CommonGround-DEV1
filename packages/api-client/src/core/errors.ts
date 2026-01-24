/**
 * API Error handling
 */

/**
 * Custom API Error class
 */
export class APIError extends Error {
  public readonly status: number;
  public readonly data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;

    // Maintains proper stack trace for where our error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }

  /**
   * Check if error is an authentication error
   */
  isAuthError(): boolean {
    return this.status === 401;
  }

  /**
   * Check if error is a forbidden error
   */
  isForbiddenError(): boolean {
    return this.status === 403;
  }

  /**
   * Check if error is a not found error
   */
  isNotFoundError(): boolean {
    return this.status === 404;
  }

  /**
   * Check if error is a validation error
   */
  isValidationError(): boolean {
    return this.status === 422;
  }

  /**
   * Check if error is a server error
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Check if error is a network error (no response)
   */
  isNetworkError(): boolean {
    return this.status === 0;
  }
}

/**
 * Create an APIError from a fetch Response
 */
export async function createErrorFromResponse(
  response: Response,
  url: string
): Promise<APIError> {
  let errorData: unknown;

  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      errorData = await response.json();
    } else {
      errorData = await response.text();
    }
  } catch {
    errorData = 'Unknown error';
  }

  const message =
    typeof errorData === 'object' && errorData !== null
      ? (errorData as { detail?: string; message?: string }).detail ||
        (errorData as { detail?: string; message?: string }).message ||
        `HTTP ${response.status}: ${response.statusText}`
      : `HTTP ${response.status}: ${response.statusText}`;

  // Log for debugging
  console.error('API Error:', {
    url,
    status: response.status,
    statusText: response.statusText,
    errorData,
  });

  return new APIError(message, response.status, errorData);
}
