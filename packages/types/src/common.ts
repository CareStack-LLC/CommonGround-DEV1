/**
 * Common types used across CommonGround
 */

/**
 * API Error class for consistent error handling
 */
export interface APIErrorData {
  message: string;
  status: number;
  data?: unknown;
}

/**
 * Pagination response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  per_page?: number;
  has_more?: boolean;
}

/**
 * Generic API response
 */
export interface APIResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

/**
 * Storage adapter interface for cross-platform token storage
 */
export interface TokenStorage {
  getToken(key: string): Promise<string | null>;
  setToken(key: string, value: string): Promise<void>;
  removeToken(key: string): Promise<void>;
}

/**
 * Token types used in authentication
 */
export type TokenType = 'access_token' | 'refresh_token' | 'child_token' | 'circle_token';

/**
 * API configuration options
 */
export interface APIConfig {
  baseUrl: string;
  storage: TokenStorage;
  onUnauthorized?: () => void;
  onError?: (error: APIErrorData) => void;
}

/**
 * Date range for filtering
 */
export interface DateRange {
  start: string;
  end: string;
}

/**
 * Sort options
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Filter options for list queries
 */
export interface ListOptions {
  page?: number;
  per_page?: number;
  sort?: SortOptions;
  search?: string;
  date_range?: DateRange;
}
