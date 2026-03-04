/**
 * API Client Configuration
 */

export interface APIClientConfig {
  baseUrl: string;
  apiVersion: string;
  timeout: number;
  onUnauthorized?: () => void;
  onError?: (error: Error) => void;
}

const defaultConfig: APIClientConfig = {
  baseUrl: 'http://localhost:8000',
  apiVersion: 'v1',
  timeout: 30000,
};

let currentConfig: APIClientConfig = { ...defaultConfig };

/**
 * Configure the API client
 */
export function configure(config: Partial<APIClientConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Get the current configuration
 */
export function getConfig(): APIClientConfig {
  return currentConfig;
}

/**
 * Get the full API URL
 */
export function getApiUrl(): string {
  let url = currentConfig.baseUrl;

  // Ensure URL doesn't end with slash
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  // Append /api/v1 if not present
  if (!url.endsWith(`/api/${currentConfig.apiVersion}`)) {
    url += `/api/${currentConfig.apiVersion}`;
  }

  return url;
}

/**
 * Get the base URL (without API prefix)
 */
export function getBaseUrl(): string {
  return getApiUrl().replace(`/api/${currentConfig.apiVersion}`, '');
}

/**
 * Get full URL for uploaded images
 * Handles relative paths like /uploads/children/photo.jpg
 */
export function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  // If already absolute URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Prepend base URL for relative paths
  return `${getBaseUrl()}${path}`;
}
