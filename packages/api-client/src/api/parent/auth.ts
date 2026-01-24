/**
 * Parent authentication API
 */

import type {
  User,
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
} from '@commonground/types';
import { fetchPublic, fetchWithParentAuth, setAuthTokens, setUser, clearAuthTokens, clearUser } from '../../core';

/**
 * Login with email and password
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetchPublic<AuthResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
  });

  // Store tokens and user
  await setAuthTokens(response.access_token, response.refresh_token);
  if (response.user) {
    await setUser(response.user);
  }

  return response;
}

/**
 * Register a new parent account
 */
export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  const response = await fetchPublic<AuthResponse>('/auth/register', {
    method: 'POST',
    body: credentials,
  });

  // Store tokens and user
  await setAuthTokens(response.access_token, response.refresh_token);
  if (response.user) {
    await setUser(response.user);
  }

  return response;
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  try {
    await fetchWithParentAuth('/auth/logout', { method: 'POST' });
  } catch {
    // Ignore errors - clear tokens anyway
  }

  await clearAuthTokens();
  await clearUser();
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<User> {
  return fetchWithParentAuth<User>('/users/me');
}

/**
 * Update current user profile
 */
export async function updateProfile(data: Partial<User>): Promise<User> {
  const user = await fetchWithParentAuth<User>('/users/me', {
    method: 'PATCH',
    body: data,
  });

  await setUser(user);
  return user;
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await fetchPublic('/auth/password-reset', {
    method: 'POST',
    body: { email },
  });
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await fetchPublic('/auth/password-reset/confirm', {
    method: 'POST',
    body: { token, password: newPassword },
  });
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<void> {
  await fetchPublic(`/auth/verify-email/${token}`, {
    method: 'POST',
  });
}
