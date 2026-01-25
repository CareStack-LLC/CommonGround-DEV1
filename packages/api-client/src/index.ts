/**
 * @commonground/api-client
 *
 * Shared API client for CommonGround applications.
 * Supports web (Next.js), iOS (Expo), and Android (Expo) platforms.
 *
 * Usage:
 * 1. Initialize with platform-specific storage adapter
 * 2. Configure API URL
 * 3. Use typed API methods
 *
 * @example
 * // Web app initialization
 * import { configure, createWebStorage } from '@commonground/api-client';
 * import { createWebStorage } from '@commonground/api-client/adapters';
 *
 * configure({
 *   apiUrl: process.env.NEXT_PUBLIC_API_URL,
 *   storage: createWebStorage(),
 *   onUnauthorized: () => router.push('/login'),
 * });
 *
 * @example
 * // Mobile app initialization
 * import { configure } from '@commonground/api-client';
 * import { createNativeStorage } from '@commonground/api-client/adapters';
 *
 * configure({
 *   apiUrl: process.env.EXPO_PUBLIC_API_URL,
 *   storage: createNativeStorage(),
 *   onUnauthorized: () => router.replace('/login'),
 * });
 *
 * @example
 * // Using parent API
 * import { parent } from '@commonground/api-client';
 *
 * await parent.auth.login({ email, password });
 * const familyFiles = await parent.familyFile.getFamilyFiles();
 *
 * @example
 * // Using child API (Kidscom app)
 * import { child } from '@commonground/api-client';
 *
 * await child.auth.loginWithCode(accessCode);
 * const contacts = await child.kidcoms.getAvailableContacts();
 *
 * @example
 * // Using circle API (My Circle app)
 * import { circle } from '@commonground/api-client';
 *
 * await circle.auth.loginWithCode(accessCode);
 * const children = await circle.children.getAccessibleChildren();
 */

// Core exports
export {
  // Storage
  type TokenStorage,
  TOKEN_KEYS,
  MemoryStorage,
  setStorageAdapter,
  getStorageAdapter,
  // Configuration
  configure,
  getConfig,
  getApiUrl,
  type APIClientConfig,
  // Errors
  APIError,
  createErrorFromResponse,
  isAPIError,
  // Authentication
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
  clearAllTokens,
  getUser,
  setUser,
  clearUser,
  isAuthenticated,
  isChildAuthenticated,
  isCircleAuthenticated,
  // Fetch utilities
  type AuthType,
  type FetchOptions,
  fetchAPI,
  fetchWithParentAuth,
  fetchWithChildAuth,
  fetchWithCircleAuth,
  fetchPublic,
  uploadFile,
} from './core';

// API modules
export { parent, child, circle, video } from './api';

// Re-export adapters for convenience
export { createWebStorage, WebStorage } from './adapters/web-storage';
export { createNativeStorage, NativeStorage, isNativePlatform } from './adapters/native-storage';
