/**
 * Authentication token management
 */

import { getStorage, TOKEN_KEYS } from './storage';
import type { User } from '@commonground/types';

/**
 * Get the parent/main access token
 */
export async function getAccessToken(): Promise<string | null> {
  const storage = getStorage();
  return storage.getToken(TOKEN_KEYS.ACCESS_TOKEN);
}

/**
 * Get the refresh token
 */
export async function getRefreshToken(): Promise<string | null> {
  const storage = getStorage();
  return storage.getToken(TOKEN_KEYS.REFRESH_TOKEN);
}

/**
 * Get the child authentication token
 */
export async function getChildToken(): Promise<string | null> {
  const storage = getStorage();
  return storage.getToken(TOKEN_KEYS.CHILD_TOKEN);
}

/**
 * Get the circle contact authentication token
 */
export async function getCircleToken(): Promise<string | null> {
  const storage = getStorage();
  return storage.getToken(TOKEN_KEYS.CIRCLE_TOKEN);
}

/**
 * Set authentication tokens
 */
export async function setAuthTokens(
  accessToken: string,
  refreshToken?: string
): Promise<void> {
  const storage = getStorage();
  await storage.setToken(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
  if (refreshToken) {
    await storage.setToken(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
  }
}

/**
 * Set child authentication token
 */
export async function setChildToken(token: string): Promise<void> {
  const storage = getStorage();
  await storage.setToken(TOKEN_KEYS.CHILD_TOKEN, token);
}

/**
 * Set circle contact authentication token
 */
export async function setCircleToken(token: string): Promise<void> {
  const storage = getStorage();
  await storage.setToken(TOKEN_KEYS.CIRCLE_TOKEN, token);
}

/**
 * Clear all authentication tokens
 */
export async function clearAuthTokens(): Promise<void> {
  const storage = getStorage();
  await Promise.all([
    storage.removeToken(TOKEN_KEYS.ACCESS_TOKEN),
    storage.removeToken(TOKEN_KEYS.REFRESH_TOKEN),
    storage.removeToken(TOKEN_KEYS.USER),
  ]);
}

/**
 * Clear child authentication token
 */
export async function clearChildToken(): Promise<void> {
  const storage = getStorage();
  await storage.removeToken(TOKEN_KEYS.CHILD_TOKEN);
}

/**
 * Clear circle authentication token
 */
export async function clearCircleToken(): Promise<void> {
  const storage = getStorage();
  await storage.removeToken(TOKEN_KEYS.CIRCLE_TOKEN);
}

/**
 * Store user data
 */
export async function setUser(user: User): Promise<void> {
  const storage = getStorage();
  await storage.setToken(TOKEN_KEYS.USER, JSON.stringify(user));
}

/**
 * Get stored user data
 */
export async function getUser(): Promise<User | null> {
  const storage = getStorage();
  const userStr = await storage.getToken(TOKEN_KEYS.USER);
  if (!userStr) return null;

  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated (has valid access token)
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return !!token;
}

/**
 * Check if child is authenticated
 */
export async function isChildAuthenticated(): Promise<boolean> {
  const token = await getChildToken();
  return !!token;
}

/**
 * Check if circle contact is authenticated
 */
export async function isCircleAuthenticated(): Promise<boolean> {
  const token = await getCircleToken();
  return !!token;
}
