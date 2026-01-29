/**
 * Core API client modules
 */

// Storage
export {
  type TokenStorage,
  TOKEN_KEYS,
  MemoryStorage,
  setStorage,
  getStorage,
} from './storage';

// Configuration
export { configure, getConfig, getApiUrl, type APIClientConfig } from './config';

// Errors
export { APIError, createErrorFromResponse } from './errors';

// Authentication
export {
  getAccessToken,
  getRefreshToken,
  getChildToken,
  getCircleToken,
  setAuthTokens,
  setChildToken,
  setCircleToken,
  clearAuthTokens,
  clearChildToken,
  clearCircleToken,
  getUser,
  setUser,
  isAuthenticated,
  isChildAuthenticated,
  isCircleAuthenticated,
} from './auth';

// Fetch utilities
export {
  type AuthType,
  type FetchOptions,
  fetchAPI,
  fetchWithParentAuth,
  fetchWithChildAuth,
  fetchWithCircleAuth,
  fetchPublic,
  uploadFile,
} from './fetch';
