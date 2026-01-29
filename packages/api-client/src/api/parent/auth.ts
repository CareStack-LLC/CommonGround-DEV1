/**
 * Parent authentication API
 */

import type {
  User,
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  Subscription,
  OAuthLoginRequest,
  MFAVerifyRequest,
  PushTokenRegistration,
} from '@commonground/types';
import { fetchPublic, fetchWithParentAuth, setAuthTokens, setUser, clearAuthTokens } from '../../core';

// Re-export types for convenience
export type { Subscription, OAuthLoginRequest, MFAVerifyRequest, PushTokenRegistration };

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
  // TODO: Add clearUser function to storage
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
 * Change password (when logged in)
 */
export async function changePassword(data: {
  current_password: string;
  new_password: string;
}): Promise<{ message: string; success: boolean }> {
  return fetchWithParentAuth('/users/me/password', {
    method: 'PUT',
    body: data,
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

// ============================================================================
// OAuth Authentication
// ============================================================================

/**
 * Login with OAuth provider (Google, Apple)
 */
export async function loginWithOAuth(data: OAuthLoginRequest): Promise<AuthResponse> {
  const response = await fetchPublic<AuthResponse>('/auth/oauth', {
    method: 'POST',
    body: data,
  });

  await setAuthTokens(response.access_token, response.refresh_token);
  if (response.user) {
    await setUser(response.user);
  }

  return response;
}

// ============================================================================
// MFA (Multi-Factor Authentication)
// ============================================================================

/**
 * Verify MFA code during login
 */
export async function verifyMFA(data: MFAVerifyRequest): Promise<AuthResponse> {
  const response = await fetchPublic<AuthResponse>('/auth/mfa/verify', {
    method: 'POST',
    body: data,
  });

  await setAuthTokens(response.access_token, response.refresh_token);
  if (response.user) {
    await setUser(response.user);
  }

  return response;
}

/**
 * Enroll in MFA (TOTP)
 */
export async function enrollMFA(): Promise<{ qr_code: string; secret: string; factor_id: string }> {
  return fetchWithParentAuth('/auth/mfa/enroll', { method: 'POST' });
}

/**
 * Confirm MFA enrollment with verification code
 */
export async function confirmMFAEnrollment(factorId: string, code: string): Promise<void> {
  await fetchWithParentAuth('/auth/mfa/confirm', {
    method: 'POST',
    body: { factor_id: factorId, code },
  });
}

/**
 * Disable MFA
 */
export async function disableMFA(code: string): Promise<void> {
  await fetchWithParentAuth('/auth/mfa/disable', {
    method: 'POST',
    body: { code },
  });
}

// ============================================================================
// Subscription
// ============================================================================

/**
 * Get current user's subscription details
 */
export async function getSubscription(): Promise<Subscription> {
  return fetchWithParentAuth<Subscription>('/users/me/subscription');
}

/**
 * Check if user has mobile access
 */
export async function checkMobileAccess(): Promise<{
  has_access: boolean;
  subscription: Subscription;
  upgrade_url?: string;
}> {
  return fetchWithParentAuth('/users/me/mobile-access');
}

// ============================================================================
// Push Notifications
// ============================================================================

/**
 * Register push notification token
 */
export async function registerPushToken(data: PushTokenRegistration): Promise<void> {
  await fetchWithParentAuth('/users/me/push-tokens', {
    method: 'POST',
    body: data,
  });
}

/**
 * Unregister push notification token
 */
export async function unregisterPushToken(token: string): Promise<void> {
  await fetchWithParentAuth('/users/me/push-tokens', {
    method: 'DELETE',
    body: { token },
  });
}

// ============================================================================
// Token Management
// ============================================================================

/**
 * Refresh authentication tokens
 */
export async function refreshTokens(): Promise<AuthResponse> {
  const response = await fetchPublic<AuthResponse>('/auth/refresh', {
    method: 'POST',
  });

  await setAuthTokens(response.access_token, response.refresh_token);
  if (response.user) {
    await setUser(response.user);
  }

  return response;
}
