/**
 * Professional Authentication API
 *
 * Authentication endpoints for legal professionals
 */

import { fetchPublic, fetchWithParentAuth, setAuthTokens, clearAuthTokens } from '../../core';

export interface ProfessionalLoginRequest {
  email: string;
  password: string;
}

export interface ProfessionalRegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  professional_type: ProfessionalType;
  license_number?: string;
  license_state?: string;
  firm_name?: string;
}

export type ProfessionalType = 'attorney' | 'mediator' | 'parenting_coordinator' | 'paralegal' | 'intake_coordinator' | 'administrator';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ProfessionalUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'professional';
  professional_profile?: {
    id: string;
    professional_type: ProfessionalType;
    license_number?: string;
    license_state?: string;
    license_verified: boolean;
    is_active: boolean;
  };
}

export interface AuthResponse {
  tokens: AuthTokens;
  user: ProfessionalUser;
}

/**
 * Login as a professional
 */
export async function login(data: ProfessionalLoginRequest): Promise<AuthResponse> {
  const response = await fetchPublic<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      user_type: 'professional',
    }),
  });

  // Store tokens
  await setAuthTokens(response.tokens.access_token, response.tokens.refresh_token);

  return response;
}

/**
 * Register as a professional
 */
export async function register(data: ProfessionalRegisterRequest): Promise<AuthResponse> {
  const response = await fetchPublic<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      role: 'professional',
    }),
  });

  // Store tokens
  await setAuthTokens(response.tokens.access_token, response.tokens.refresh_token);

  return response;
}

/**
 * Logout - clear stored tokens
 */
export async function logout(): Promise<void> {
  try {
    await fetchWithParentAuth('/auth/logout', {
      method: 'POST',
    });
  } catch {
    // Ignore logout errors
  } finally {
    await clearAuthTokens();
  }
}

/**
 * Get current professional user info
 */
export async function getCurrentUser(): Promise<ProfessionalUser> {
  return fetchWithParentAuth<ProfessionalUser>('/auth/me');
}

/**
 * Request password reset
 */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  return fetchPublic('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, new_password: string): Promise<{ message: string }> {
  return fetchPublic('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password }),
  });
}
