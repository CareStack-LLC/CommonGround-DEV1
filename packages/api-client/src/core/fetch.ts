/**
 * Core fetch wrapper with authentication and error handling
 */

import { getApiUrl, getConfig } from './config';
import { APIError, createErrorFromResponse } from './errors';
import {
  getAccessToken,
  getChildToken,
  getCircleToken,
  setAuthTokens,
  clearAuthTokens,
} from './auth';

export type AuthType = 'parent' | 'child' | 'circle' | 'none';

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  authType?: AuthType;
  skipAuth?: boolean;
}

/**
 * Get the appropriate auth token based on auth type
 */
async function getAuthToken(authType: AuthType): Promise<string | null> {
  switch (authType) {
    case 'parent':
      return getAccessToken();
    case 'child':
      return getChildToken();
    case 'circle':
      return getCircleToken();
    case 'none':
    default:
      return null;
  }
}

/**
 * Base fetch wrapper with error handling
 */
export async function fetchAPI<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { body, authType = 'parent', skipAuth = false, ...fetchOptions } = options;
  const config = getConfig();
  const url = `${getApiUrl()}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Add auth token if not skipped
  if (!skipAuth && authType !== 'none') {
    const token = await getAuthToken(authType);
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    } else if (authType !== 'parent') {
      // For child and circle auth, token is required
      throw new APIError(`${authType} not authenticated`, 401);
    }
  }

  const requestConfig: RequestInit = {
    ...fetchOptions,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  try {
    const response = await fetch(url, requestConfig);

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const isJSON = contentType?.includes('application/json');

    if (!response.ok) {
      // Handle 401 Unauthorized - try to refresh token for parent auth
      if (
        response.status === 401 &&
        authType === 'parent' &&
        !endpoint.includes('/auth/')
      ) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          // Retry the original request with new token
          return fetchAPI<T>(endpoint, options);
        }

        // Refresh failed - trigger unauthorized callback
        config.onUnauthorized?.();
      }

      throw await createErrorFromResponse(response, url);
    }

    // Return empty object for 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return (isJSON ? await response.json() : await response.text()) as T;
  } catch (error) {
    if (error instanceof APIError) {
      config.onError?.(error);
      throw error;
    }

    // Network or other errors
    const apiError = new APIError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
    config.onError?.(apiError);
    throw apiError;
  }
}

/**
 * Try to refresh the access token
 */
async function tryRefreshToken(): Promise<boolean> {
  try {
    const { getRefreshToken } = await import('./auth');
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      return false;
    }

    const response = await fetchAPI<{ access_token: string; token_type: string }>(
      '/auth/refresh',
      {
        method: 'POST',
        body: { refresh_token: refreshToken },
        skipAuth: true,
      }
    );

    await setAuthTokens(response.access_token);
    return true;
  } catch {
    // Refresh failed - clear tokens
    await clearAuthTokens();
    return false;
  }
}

/**
 * Fetch with parent authentication (default)
 */
export async function fetchWithParentAuth<T>(
  endpoint: string,
  options: Omit<FetchOptions, 'authType'> = {}
): Promise<T> {
  return fetchAPI<T>(endpoint, { ...options, authType: 'parent' });
}

/**
 * Fetch with child authentication
 */
export async function fetchWithChildAuth<T>(
  endpoint: string,
  options: Omit<FetchOptions, 'authType'> = {}
): Promise<T> {
  return fetchAPI<T>(endpoint, { ...options, authType: 'child' });
}

/**
 * Fetch with circle contact authentication
 */
export async function fetchWithCircleAuth<T>(
  endpoint: string,
  options: Omit<FetchOptions, 'authType'> = {}
): Promise<T> {
  return fetchAPI<T>(endpoint, { ...options, authType: 'circle' });
}

/**
 * Fetch without authentication
 */
export async function fetchPublic<T>(
  endpoint: string,
  options: Omit<FetchOptions, 'authType' | 'skipAuth'> = {}
): Promise<T> {
  return fetchAPI<T>(endpoint, { ...options, authType: 'none', skipAuth: true });
}

/**
 * Upload a file with multipart/form-data
 */
export async function uploadFile<T>(
  endpoint: string,
  formData: FormData,
  authType: AuthType = 'parent'
): Promise<T> {
  const config = getConfig();
  const url = `${getApiUrl()}${endpoint}`;

  const headers: Record<string, string> = {};

  // Add auth token
  const token = await getAuthToken(authType);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw await createErrorFromResponse(response, url);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof APIError) {
      config.onError?.(error);
      throw error;
    }

    const apiError = new APIError(
      error instanceof Error ? error.message : 'Upload failed',
      0
    );
    config.onError?.(apiError);
    throw apiError;
  }
}
