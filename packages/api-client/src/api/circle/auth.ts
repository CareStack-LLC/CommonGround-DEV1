/**
 * Circle contact authentication API for My Circle app
 */

import { fetchPublic, setCircleToken, clearCircleToken, fetchWithCircleAuth } from '../../core';

export interface CircleLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  circle_contact_id: string;
  contact_name: string;
  family_file_id: string;
  child_ids: string[];
}

export interface CircleUserProfile {
  id: string;
  circle_contact_id: string;
  email: string;
  contact_name: string;
  relationship_type: string;
  family_file_id: string;
  room_number?: number;
  email_verified: boolean;
  is_active: boolean;
  last_login?: string;
  children: Array<{
    id: string;
    name: string;
    avatar_url?: string;
    age?: number;
  }>;
  permissions: Array<{
    child_id: string;
    can_video_call: boolean;
    can_voice_call: boolean;
    can_chat: boolean;
    can_theater: boolean;
  }>;
  created_at: string;
}

export interface ConnectedChild {
  id: string;
  name: string;
  avatar_url?: string;
  age?: number;
  is_online: boolean;
  family_file_id: string;
  can_video_call: boolean;
  can_voice_call: boolean;
  can_chat: boolean;
  can_theater: boolean;
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<CircleLoginResponse> {
  const response = await fetchPublic<CircleLoginResponse>('/my-circle/circle-users/login', {
    method: 'POST',
    body: { email, password },
  });

  // Store circle token
  await setCircleToken(response.access_token);

  return response;
}

/**
 * Accept circle invitation and set password
 */
export async function acceptInvitation(
  inviteToken: string,
  password: string,
  confirmPassword: string
): Promise<CircleLoginResponse> {
  const response = await fetchPublic<CircleLoginResponse>('/my-circle/circle-users/accept-invite', {
    method: 'POST',
    body: {
      invite_token: inviteToken,
      password,
      confirm_password: confirmPassword,
    },
  });

  // Store circle token
  await setCircleToken(response.access_token);

  return response;
}

/**
 * Get invite info before accepting
 */
export async function getInviteInfo(inviteToken: string): Promise<{
  email: string;
  contact_name: string;
  relationship_type: string;
  invite_expires_at: string;
}> {
  return fetchPublic(`/my-circle/circle-users/${inviteToken}/info`);
}

/**
 * Logout circle contact
 */
export async function logout(): Promise<void> {
  await clearCircleToken();
}

/**
 * Get current user profile
 */
export async function getProfile(): Promise<CircleUserProfile> {
  return fetchWithCircleAuth<CircleUserProfile>('/my-circle/circle-users/me/profile');
}

/**
 * Get connected children
 */
export async function getConnectedChildren(): Promise<{ items: ConnectedChild[]; total: number }> {
  return fetchWithCircleAuth<{ items: ConnectedChild[]; total: number }>(
    '/my-circle/circle-users/me/children'
  );
}

/**
 * Get child profile
 */
export async function getChildProfile(childId: string): Promise<{
  id: string;
  first_name: string;
  display_name: string;
  avatar_url?: string;
  age?: number;
  family_file_id: string;
}> {
  return fetchWithCircleAuth(`/my-circle/circle-users/me/children/${childId}`);
}

/**
 * Check child availability for call
 */
export async function checkChildAvailability(childId: string): Promise<{
  available: boolean;
  reason?: string;
}> {
  return fetchWithCircleAuth(`/my-circle/circle-users/me/children/${childId}/availability`);
}

/**
 * Get current user permissions
 */
export async function getPermissions(): Promise<{
  items: Array<{
    id: string;
    child_id: string;
    child_name: string;
    can_video_call: boolean;
    can_voice_call: boolean;
    can_chat: boolean;
    can_theater: boolean;
  }>;
  total: number;
}> {
  return fetchWithCircleAuth('/my-circle/circle-users/me/permissions');
}

/**
 * Check if circle session is still valid
 */
export async function validateSession(): Promise<{
  valid: boolean;
  profile?: CircleUserProfile;
}> {
  try {
    const profile = await getProfile();
    return { valid: true, profile };
  } catch {
    return { valid: false };
  }
}
